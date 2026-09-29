import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent } from './entities/calendar-event.entity';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { FilterCalendarEventDto } from './dto/filter-calendar-event.dto';
import { Property } from '../properties/entities/property.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * `calendar_events` did not exist at all; the Calendar page was a "coming soon"
 * string. Scope comes from the event's own `agency_id`, and a property or
 * tenant named in a write is looked up with the agency in the same `where`.
 */
@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private readonly repository: Repository<CalendarEvent>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async create(
    createCalendarEventDto: CreateCalendarEventDto,
    agencyId: string,
    userId: string,
  ): Promise<CalendarEvent> {
    await this.assertRelationsInAgency(
      createCalendarEventDto.propertyId,
      createCalendarEventDto.tenantId,
      agencyId,
    );

    const event = this.repository.create({
      ...createCalendarEventDto,
      startsAt: new Date(createCalendarEventDto.startsAt),
      endsAt: createCalendarEventDto.endsAt
        ? new Date(createCalendarEventDto.endsAt)
        : undefined,
      agencyId,
      userId,
    });

    return this.repository.save(event);
  }

  async findAll(
    agencyId: string,
    filter: FilterCalendarEventDto = {},
  ): Promise<PaginatedResponse<CalendarEvent>> {
    const {
      page = 1,
      limit = 20,
      from,
      to,
      eventType,
      propertyId,
      tenantId,
    } = filter;
    const effectiveLimit = Math.min(limit, 100);
    const skip = (page - 1) * effectiveLimit;

    const query = this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.property', 'property')
      .leftJoinAndSelect('event.tenant', 'tenant')
      .leftJoinAndSelect('event.user', 'user')
      .where('event.agencyId = :agencyId', { agencyId });

    if (from || to) {
      const [fromInstant, toInstant] = this.resolveBounds(from, to);
      // `startsAt` is the property; `starts_at` (property name case → column
      // `starts_at`) is what TypeORM resolves; ordering is by property name.
      query.andWhere('event.startsAt BETWEEN :fromInstant AND :toInstant', {
        fromInstant,
        toInstant,
      });
    }

    if (eventType) {
      query.andWhere('event.eventType = :eventType', { eventType });
    }

    if (propertyId) {
      query.andWhere('event.propertyId = :propertyId', { propertyId });
    }

    if (tenantId) {
      query.andWhere('event.tenantId = :tenantId', { tenantId });
    }

    const [events, total] = await query
      .orderBy('event.startsAt', 'ASC')
      .skip(skip)
      .take(effectiveLimit)
      .getManyAndCount();

    return new PaginatedResponse(events, total, page, effectiveLimit);
  }

  async findOne(id: string, agencyId: string): Promise<CalendarEvent> {
    const event = await this.repository.findOne({
      where: { id, agencyId },
      relations: ['property', 'tenant', 'user'],
    });

    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }

    return event;
  }

  async update(
    id: string,
    agencyId: string,
    updateCalendarEventDto: UpdateCalendarEventDto,
  ): Promise<CalendarEvent> {
    await this.findOne(id, agencyId);

    if (updateCalendarEventDto.propertyId || updateCalendarEventDto.tenantId) {
      await this.assertRelationsInAgency(
        updateCalendarEventDto.propertyId,
        updateCalendarEventDto.tenantId,
        agencyId,
      );
    }

    // `agencyId` and `userId` cannot appear in the body (`forbidNonWhitelisted`),
    // so a caller cannot retarget either; the `where` clause keeps the row in
    // this agency.
    const safe: Partial<CalendarEvent> = {
      ...updateCalendarEventDto,
    } as Partial<CalendarEvent>;
    if (updateCalendarEventDto.startsAt) {
      safe.startsAt = new Date(updateCalendarEventDto.startsAt);
    }
    if (updateCalendarEventDto.endsAt) {
      safe.endsAt = new Date(updateCalendarEventDto.endsAt);
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
    propertyId: string | undefined,
    tenantId: string | undefined,
    agencyId: string,
  ): Promise<void> {
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

    if (tenantId) {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId, agencyId },
        select: ['id'],
      });
      if (!tenant) {
        throw new NotFoundException(
          `Tenant with ID ${tenantId} not found in this agency`,
        );
      }
    }
  }
}
