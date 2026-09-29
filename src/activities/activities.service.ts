import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { FilterActivityDto } from './dto/filter-activity.dto';
import { Client } from '../clients/entities/client.entity';
import { Property } from '../properties/entities/property.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * A CRM interaction log keyed to a client (calls, emails, viewings, meetings),
 * which is what the schema declares: `client_id` and `user_id` are NOT NULL and
 * there is no `entity_type`/`entity_id` pair, so it cannot double as a change
 * audit trail. Scope comes from the activity's own `agency_id`.
 */
@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly repository: Repository<Activity>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async create(
    createActivityDto: CreateActivityDto,
    agencyId: string,
    userId: string,
  ): Promise<Activity> {
    await this.assertRelationsInAgency(
      createActivityDto.clientId,
      createActivityDto.propertyId,
      agencyId,
    );

    const activity = this.repository.create({
      ...createActivityDto,
      date: createActivityDto.date
        ? new Date(createActivityDto.date)
        : new Date(),
      agencyId,
      userId,
    });

    return this.repository.save(activity);
  }

  async findAll(
    agencyId: string,
    filter: FilterActivityDto = {},
  ): Promise<PaginatedResponse<Activity>> {
    const {
      page = 1,
      limit = 20,
      clientId,
      type,
      fromDate,
      toDate,
      search,
    } = filter;
    const effectiveLimit = Math.min(limit, 100);
    const skip = (page - 1) * effectiveLimit;

    const query = this.repository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.client', 'client')
      .leftJoinAndSelect('activity.property', 'property')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.agencyId = :agencyId', { agencyId });

    if (clientId) {
      query.andWhere('activity.clientId = :clientId', { clientId });
    }

    if (type) {
      query.andWhere('activity.type = :type', { type });
    }

    if (fromDate || toDate) {
      const [from, to] = this.resolveBounds(fromDate, toDate);
      // `activity.date` is the property; `date` is the column.
      query.andWhere('activity.date BETWEEN :from AND :to', { from, to });
    }

    if (search) {
      // Escaped so a search for "%" is a literal search.
      const term = search.trim().replace(/[%_]/g, (c) => `\\${c}`);
      query.andWhere('activity.notes ILIKE :term', { term: `%${term}%` });
    }

    const [activities, total] = await query
      .orderBy('activity.date', 'DESC')
      .addOrderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(effectiveLimit)
      .getManyAndCount();

    return new PaginatedResponse(activities, total, page, effectiveLimit);
  }

  async findOne(id: string, agencyId: string): Promise<Activity> {
    const activity = await this.repository.findOne({
      where: { id, agencyId },
      relations: ['client', 'property', 'user'],
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activity;
  }

  async update(
    id: string,
    agencyId: string,
    updateActivityDto: UpdateActivityDto,
  ): Promise<Activity> {
    await this.findOne(id, agencyId);

    if (updateActivityDto.clientId || updateActivityDto.propertyId) {
      await this.assertRelationsInAgency(
        updateActivityDto.clientId,
        updateActivityDto.propertyId,
        agencyId,
      );
    }

    // `agencyId` and `userId` cannot appear in the body (`forbidNonWhitelisted`),
    // so a caller cannot retarget either; the `where` clause keeps the row in
    // this agency.
    const safe: Partial<Activity> = {
      ...updateActivityDto,
    } as Partial<Activity>;
    if (updateActivityDto.date) {
      safe.date = new Date(updateActivityDto.date);
    }

    await this.repository.update({ id, agencyId }, safe);

    return this.findOne(id, agencyId);
  }

  async remove(id: string, agencyId: string): Promise<void> {
    await this.findOne(id, agencyId);

    await this.repository.delete({ id, agencyId });
  }

  private resolveBounds(
    from: string | undefined,
    to: string | undefined,
  ): [Date, Date] {
    return [
      new Date(from ?? '1970-01-01'),
      new Date(to ?? '2099-12-31'),
    ];
  }

  private async assertRelationsInAgency(
    clientId: string | undefined,
    propertyId: string | undefined,
    agencyId: string,
  ): Promise<void> {
    if (clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: clientId, agencyId },
        select: ['id'],
      });
      if (!client) {
        throw new NotFoundException(
          `Client with ID ${clientId} not found in this agency`,
        );
      }
    }

    if (propertyId) {
      const property = await this.propertyRepository.findOne({
        where: { id: propertyId, agencyId },
        select: ['id'],
      });
      if (!property) {
        throw new NotFoundException(
          `Property with ID ${propertyId} not found in this agency`,
        );
      }
    }
  }
}
