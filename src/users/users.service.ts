import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { ErrorHandler } from '../common/utils/error-handler';
import { AuthUtils } from '../common/utils/auth-utils';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    try {
      const { email, password, ...rest } = createUserDto;

      this.logger.log(
        `Creating user`,
        JSON.stringify({
          email,
          role: createUserDto.role,
          agencyId: createUserDto.agencyId,
          operation: 'create',
        }),
      );

      // Check if user already exists
      await this.checkEmailUniqueness(email);

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Create new user
      const user = this.userRepository.create({
        email,
        password: hashedPassword,
        ...rest,
      });

      const savedUser = await this.userRepository.save(user);

      this.logger.log(
        `User created successfully`,
        JSON.stringify({
          userId: savedUser.id,
          email: savedUser.email,
          role: savedUser.role,
          agencyId: savedUser.agencyId,
          operation: 'create',
        }),
      );

      // Return user without password
      return AuthUtils.removePassword(savedUser);
    } catch (error) {
      ErrorHandler.handle(error, 'UsersService.create', { email: createUserDto.email });
    }
  }

  async findAll(
    agencyId?: string,
    filter: FilterUserDto = {},
  ): Promise<PaginatedResponse<Omit<User, 'password'>>> {
    try {
      const { page = 1, limit = 20, role, search } = filter;
      const effectiveLimit = Math.min(limit, 100);
      const skip = (page - 1) * effectiveLimit;

      const query = this.userRepository
        .createQueryBuilder('user')
        .where('1=1');

      if (agencyId) {
        query.andWhere('user.agencyId = :agencyId', { agencyId });
      }

      if (role) {
        query.andWhere('user.role = :role', { role });
      }

      if (search) {
        // Wildcards are escaped here so a search for "100%" is a literal search
        // rather than a match-everything one.
        const term = search.trim().replace(/[%_]/g, (c) => `\\${c}`);
        // No phone column on User — referencing `user.phone` here produced
        // "syntax error at or near '.'" and a 500 on every search.
        query.andWhere(
          `(user.firstName ILIKE :term OR user.lastName ILIKE :term
            OR user.email ILIKE :term
            OR (user.firstName || ' ' || user.lastName) ILIKE :term)`,
          { term: `%${term}%` },
        );
      }

      const users = await query
        .skip(skip)
        .take(effectiveLimit)
        .orderBy('user.createdAt', 'DESC')
        .getMany();

      // getMany + a separate getCount, rather than getManyAndCount, because
      // getCount ignores skip/take and counts the whole filtered set — which is
      // what `total` is supposed to be. The password column is still selected and
      // then stripped below, as it always was.
      const total = await query.getCount();

      // Remove password from all users
      const usersWithoutPassword = AuthUtils.removePasswordFromArray(users);

      return new PaginatedResponse(
        usersWithoutPassword,
        total,
        page,
        effectiveLimit,
      );
    } catch (error) {
      ErrorHandler.handle(error, 'UsersService.findAll');
    }
  }

  async findOne(
    id: string,
    agencyId?: string,
  ): Promise<Omit<User, 'password'>> {
    const where: any = { id };
    if (agencyId) {
      where.agencyId = agencyId;
    }

    const user = await this.userRepository.findOne({ where });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Return user without password
    return AuthUtils.removePassword(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    agencyId?: string,
    isPlatformAdmin: boolean = false,
  ): Promise<Omit<User, 'password'>> {
    try {
      const where: any = { id };
      if (agencyId) {
        where.agencyId = agencyId;
      }

      const user = await this.userRepository.findOne({ where });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // A user row is what grants access to a tenant, so moving one between
      // agencies hands a stranger that tenant's login. The role hierarchy
      // guards `role` (see UsersController.update); `agencyId` needs its own
      // rule because hierarchy says nothing about tenancy.
      this.assertAgencyMoveAllowed(updateUserDto, agencyId, isPlatformAdmin);

      // Check if email is being updated and if it's already taken
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        await this.checkEmailUniqueness(updateUserDto.email);
      }

      // Hash password if provided
      if (updateUserDto.password) {
        updateUserDto.password = await AuthUtils.hashPassword(updateUserDto.password);
      }

      // Update user
      Object.assign(user, updateUserDto);
      const updatedUser = await this.userRepository.save(user);

      // Return user without password
      return AuthUtils.removePassword(updatedUser);
    } catch (error) {
      ErrorHandler.handle(error, 'UsersService.update');
    }
  }

  /**
   * Refuses a cross-agency move for anyone but a platform admin, and drops a
   * same-agency echo so the write cannot touch the column at all.
   *
   * This mirrors `create`, where `UsersController` overwrites `agencyId` with
   * the caller's agency for every non-platform caller. It lives in the service
   * rather than the controller because the controller's hierarchy check covers
   * `role` and knows nothing about tenancy — `canManageRole(admin, admin)` is
   * true, so an agency `ADMIN` passes it while naming a different tenant.
   *
   * `FK_users_agency` is `ON DELETE RESTRICT` but is not a substitute: it
   * rejects a *non-existent* agency with a 400, while accepting a perfectly
   * valid sibling one. Verified live before the fix — an agency-A admin PATCHed
   * a user with `{"agencyId": "<agency B>"}` and the row moved, handing a
   * stranger a login to that tenant.
   *
   * Keyed on the role rather than on whether an agency is present, because
   * `AgencyScopeGuard` returns early for a platform admin — `agencyId` is
   * `undefined` for them, and keying on its absence would lock them out of the
   * one legitimate use of this field.
   */
  private assertAgencyMoveAllowed(
    updateUserDto: UpdateUserDto,
    agencyId?: string,
    isPlatformAdmin: boolean = false,
  ): void {
    // `UpdateUserDto` is `PartialType(CreateUserDto)`, whose mapped type drops
    // the property types, so read through `CreateUserDto` to get a real one.
    const requested = (updateUserDto as Partial<CreateUserDto>).agencyId;

    if (isPlatformAdmin || !requested) {
      return;
    }

    if (requested !== agencyId) {
      throw new ForbiddenException(
        'Only a platform admin can move a user to another agency',
      );
    }

    // Same agency, so this is a no-op rather than a move. Dropping it keeps the
    // column out of the write entirely.
    delete updateUserDto.agencyId;
  }

  async remove(id: string, agencyId?: string): Promise<void> {
    const where: any = { id };
    if (agencyId) {
      where.agencyId = agencyId;
    }

    const user = await this.userRepository.findOne({ where });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(
      `Deleting user`,
      JSON.stringify({
        userId: id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
        operation: 'delete',
      }),
    );

    await this.userRepository.remove(user);

    this.logger.log(
      `User deleted successfully`,
      JSON.stringify({
        userId: id,
        agencyId: user.agencyId,
        operation: 'delete',
      }),
    );
  }

  async findAgencyStaff(agencyId: string): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: [
          { agencyId, role: UserRole.ADMIN },
          { agencyId, role: UserRole.AGENT },
        ],
      });
    } catch (error) {
      ErrorHandler.handle(error, 'UsersService.findAgencyStaff');
    }
  }

  /**
   * Check if email is already taken by another user
   * @param email - The email to check
   * @throws ConflictException if email already exists
   */
  private async checkEmailUniqueness(email: string): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
  }
}
