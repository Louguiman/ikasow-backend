import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import {
  CalendarEvent,
  CalendarEventType,
} from './entities/calendar-event.entity';
import { Property } from '../properties/entities/property.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

describe('CalendarService', () => {
  let service: CalendarService;
  let eventRepo: Record<string, jest.Mock>;
  let propertyRepo: Record<string, jest.Mock>;
  let tenantRepo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';
  const PROPERTY = 'property-1';
  const TENANT = 'tenant-1';
  const USER = 'user-1';
  const DTO = {
    title: 'Visite T3 Bastide',
    eventType: CalendarEventType.VIEWING,
    startsAt: '2026-10-05T14:00:00.000Z',
    propertyId: PROPERTY,
  };

  const chainable = () => {
    const q: Record<string, jest.Mock> = {};
    for (const m of [
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ]) {
      q[m] = jest.fn().mockReturnThis();
    }
    return q;
  };

  beforeEach(async () => {
    qb = chainable();
    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

    eventRepo = {
      create: jest.fn((data) => ({ id: 'event-1', ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => qb),
    };
    propertyRepo = {
      findOne: jest.fn().mockResolvedValue({ id: PROPERTY }),
    };
    tenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: TENANT }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: getRepositoryToken(CalendarEvent), useValue: eventRepo },
        { provide: getRepositoryToken(Property), useValue: propertyRepo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
  });

  const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent =>
    ({
      id: 'event-1',
      agencyId: AGENCY,
      title: 'Visite T3 Bastide',
      eventType: CalendarEventType.VIEWING,
      startsAt: new Date('2026-10-05T14:00:00.000Z'),
      endsAt: null,
      allDay: false,
      propertyId: PROPERTY,
      user: { firstName: 'A', lastName: 'B' },
      ...overrides,
    }) as CalendarEvent;

  describe('create', () => {
    it('writes the agency and the caller as attribution', async () => {
      const result = await service.create(DTO, AGENCY, USER);
      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...DTO,
          startsAt: new Date(DTO.startsAt),
          agencyId: AGENCY,
          userId: USER,
        }),
      );
      expect(result.userId).toBe(USER);
    });

    it('refuses a property that is not in the agency', async () => {
      propertyRepo.findOne.mockResolvedValue(null);
      await expect(service.create(DTO, AGENCY, USER)).rejects.toThrow(
        NotFoundException,
      );
      expect(eventRepo.create).not.toHaveBeenCalled();
    });

    it('checks a named tenant belongs to the agency too', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ ...DTO, tenantId: TENANT }, AGENCY, USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('scopes on the event own agency_id and bounds the range', async () => {
      await service.findAll(AGENCY, {
        from: '2026-10-01',
        to: '2026-10-31',
        eventType: CalendarEventType.MEETING,
        propertyId: PROPERTY,
        tenantId: TENANT,
      });
      expect(qb.where).toHaveBeenCalledWith('event.agencyId = :agencyId', {
        agencyId: AGENCY,
      });
      expect(qb.orderBy).toHaveBeenCalledWith('event.startsAt', 'ASC');
      const range = qb.andWhere.mock.calls.find(([sql]: [string]) =>
        sql.includes('BETWEEN'),
      );
      expect(range).toBeDefined();
      expect(range[1].fromInstant).toEqual(new Date('2026-10-01'));
      expect(qb.andWhere).toHaveBeenCalledWith('event.eventType = :eventType', {
        eventType: CalendarEventType.MEETING,
      });
    });
  });

  describe('findOne', () => {
    it('throws 404 when the id belongs to another agency', async () => {
      await expect(service.findOne('other', AGENCY)).rejects.toThrow(
        NotFoundException,
      );
      expect(eventRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'other', agencyId: AGENCY },
        relations: ['property', 'tenant', 'user'],
      });
    });
  });

  describe('update', () => {
    it('converts dates and scopes the row to the agency', async () => {
      eventRepo.findOne.mockResolvedValueOnce(event());
      eventRepo.findOne.mockResolvedValueOnce(event());
      await service.update('event-1', AGENCY, {
        endsAt: '2026-10-05T16:00:00.000Z',
      } as never);
      expect(eventRepo.update).toHaveBeenCalledWith(
        { id: 'event-1', agencyId: AGENCY },
        expect.objectContaining({
          endsAt: new Date('2026-10-05T16:00:00.000Z'),
        }),
      );
    });

    it('re-validates a changed property against the agency', async () => {
      eventRepo.findOne.mockResolvedValueOnce(event());
      propertyRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.update('event-1', AGENCY, { propertyId: 'other-property' }),
      ).rejects.toThrow(NotFoundException);
      expect(eventRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes only within the agency', async () => {
      eventRepo.findOne.mockResolvedValueOnce(event());
      await service.remove('event-1', AGENCY);
      expect(eventRepo.delete).toHaveBeenCalledWith({
        id: 'event-1',
        agencyId: AGENCY,
      });
    });
  });
});
