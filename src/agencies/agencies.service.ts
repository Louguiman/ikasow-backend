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
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private cacheService: CacheService,
  ) { }

  async create(createAgencyDto: CreateAgencyDto): Promise<Agency> {
    try {
      // Check if email already exists
      await this.checkEmailUniqueness(createAgencyDto.email);

      // Check if subdomain already exists (if provided)
      if (createAgencyDto.subdomain) {
        await this.checkSubdomainUniqueness(createAgencyDto.subdomain);
      }

      const agency = this.agencyRepository.create(createAgencyDto);
      return await this.agencyRepository.save(agency);
    } catch (error) {
      ErrorHandler.handle(error, 'AgenciesService.create');
    }
  }

  async findAll(
    isActive?: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Agency[]; total: number; page: number; limit: number }> {
    try {
      const where = isActive !== undefined ? { isActive } : {};
      const skip = (page - 1) * limit;

      const [data, total] = await this.agencyRepository.findAndCount({
        where,
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });

      return {
        data,
        total,
        page,
        limit,
      };
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
      if (updateAgencyDto.subdomain && updateAgencyDto.subdomain !== agency.subdomain) {
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
