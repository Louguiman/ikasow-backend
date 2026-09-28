import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agency } from './entities/agency.entity';
import { User } from '../users/entities/user.entity';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { ErrorHandler } from '../common/utils/error-handler';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private cacheService: CacheService,
  ) {}

  async create(createAgencyDto: CreateAgencyDto): Promise<Agency> {
    try {
      // Check if email already exists
      await this.checkEmailUniqueness(createAgencyDto.email);

      // The subdomain is the agency's public portal identity, so it is derived rather
      // than left null. It used to be optional and simply never set, which produced an
      // agency with no reachable portal at all: the resolver has no other way in.
      const requested = createAgencyDto.subdomain?.toLowerCase().trim();
      if (requested) {
        await this.checkSubdomainUniqueness(requested);
      }
      const subdomain =
        requested ??
        (await this.generateAvailableSubdomain(createAgencyDto.name));

      const agency = this.agencyRepository.create({
        ...createAgencyDto,
        subdomain,
      });
      return await this.agencyRepository.save(agency);
    } catch (error) {
      ErrorHandler.handle(error, 'AgenciesService.create');
    }
  }

  /**
   * Slugify the agency name and add a numeric suffix until it is free. The unique
   * index is the authority here — a concurrent create can still take the name between
   * this check and the insert, and that surfaces as a 23505 which ErrorHandler maps to
   * a ConflictException rather than being silently ignored.
   */
  private async generateAvailableSubdomain(name: string): Promise<string> {
    const base = AgenciesService.slugify(name);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const taken = await this.agencyRepository.exists({
        where: { subdomain: candidate },
      });
      if (!taken) {
        return candidate;
      }
    }
    // 50 collisions on one name means something is wrong upstream, not that we should
    // hand back a duplicate.
    throw new ConflictException(
      'Could not allocate a unique subdomain; please provide one',
    );
  }

  /**
   * Lowercase, strip accents, collapse anything that is not a letter or digit to a
   * single hyphen. Names that slugify to nothing (e.g. "***") fall back to `agency`,
   * which the suffix loop still disambiguates.
   */
  private static slugify(name: string): string {
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
      .replace(/-+$/g, '');
    return slug.length >= 2 ? slug : 'agency';
  }

  async findAll(
    isActive?: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Agency>> {
    try {
      const where = isActive !== undefined ? { isActive } : {};
      const skip = (page - 1) * limit;

      const [data, total] = await this.agencyRepository.findAndCount({
        where,
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });

      return new PaginatedResponse(data, total, page, limit);
    } catch (error) {
      ErrorHandler.handle(error, 'AgenciesService.findAll');
    }
  }

  async findOne(id: string): Promise<Agency> {
    const agency = await this.agencyRepository.findOne({ where: { id } });

    if (!agency) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }

    return agency;
  }

  async update(id: string, updateAgencyDto: UpdateAgencyDto): Promise<Agency> {
    try {
      const agency = await this.findOne(id);

      // Check if email is being updated and if it already exists
      if (updateAgencyDto.email && updateAgencyDto.email !== agency.email) {
        await this.checkEmailUniqueness(updateAgencyDto.email);
      }

      // Check if subdomain is being updated and if it already exists
      if (
        updateAgencyDto.subdomain &&
        updateAgencyDto.subdomain !== agency.subdomain
      ) {
        await this.checkSubdomainUniqueness(updateAgencyDto.subdomain);
      }

      Object.assign(agency, updateAgencyDto);
      const updatedAgency = await this.agencyRepository.save(agency);

      // Invalidate agency info cache on updates
      await this.cacheService.invalidateAgencyInfo(agency.id);

      return updatedAgency;
    } catch (error) {
      ErrorHandler.handle(error, 'AgenciesService.update');
    }
  }

  async remove(id: string): Promise<void> {
    const agency = await this.findOne(id);
    await this.agencyRepository.remove(agency);
  }

  async activate(id: string): Promise<Agency> {
    try {
      const agency = await this.findOne(id);
      agency.isActive = true;
      return await this.agencyRepository.save(agency);
    } catch (error) {
      ErrorHandler.handle(error, 'AgenciesService.activate');
    }
  }

  async deactivate(id: string): Promise<Agency> {
    try {
      const agency = await this.findOne(id);

      // Check if agency has active users
      const activeUsersCount = await this.userRepository.count({
        where: { agencyId: id, isActive: true },
      });

      if (activeUsersCount > 0) {
        throw new BadRequestException(
          'Cannot deactivate agency with active users',
        );
      }

      agency.isActive = false;
      return await this.agencyRepository.save(agency);
    } catch (error) {
      ErrorHandler.handle(error, 'AgenciesService.deactivate');
    }
  }

  /**
   * Check if email is already taken by another agency
   * @param email - The email to check
   * @throws ConflictException if email already exists
   */
  private async checkEmailUniqueness(email: string): Promise<void> {
    const existingAgency = await this.agencyRepository.findOne({
      where: { email },
    });

    if (existingAgency) {
      throw new ConflictException('Agency with this email already exists');
    }
  }

  /**
   * Check if subdomain is already taken by another agency
   * @param subdomain - The subdomain to check
   * @throws ConflictException if subdomain already exists
   */
  private async checkSubdomainUniqueness(subdomain: string): Promise<void> {
    const existingAgency = await this.agencyRepository.findOne({
      where: { subdomain },
    });

    if (existingAgency) {
      throw new ConflictException('Agency with this subdomain already exists');
    }
  }

  /**
   * Find agency by subdomain
   * @param subdomain - The subdomain to search for
   * @returns Agency if found, undefined otherwise
   */
  async findBySubdomain(subdomain: string): Promise<Agency | undefined> {
    const agency = await this.agencyRepository.findOne({
      where: { subdomain, isActive: true },
    });
    return agency ?? undefined;
  }
}
