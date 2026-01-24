import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { ErrorHandler } from '../common/utils/error-handler';
import { AuthUtils } from '../common/utils/auth-utils';

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
    role?: UserRole,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Omit<User, 'password'>[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const where: any = {};
      if (agencyId) {
        where.agencyId = agencyId;
      }
      if (role) {
        where.role = role;
      }

      const [users, total] = await this.userRepository.findAndCount({
        where,
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });

      // Remove password from all users
      const usersWithoutPassword = AuthUtils.removePasswordFromArray(users);

      return {
        data: usersWithoutPassword,
        total,
        page,
        limit,
      };
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
