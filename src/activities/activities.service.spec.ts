import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivitiesService } from './activities.service';
import { Activity, ActivityType } from './entities/activity.entity';
import { Client } from '../clients/entities/client.entity';
import { Property } from '../properties/entities/property.entity';

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let activityRepo: Record<string, jest.Mock>;
  let clientRepo: Record<string, jest.Mock>;
  let propertyRepo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';
  const CLIENT = 'client-1';
  const PROPERTY = 'property-1';
  const USER = 'user-1';
  const DTO = {
    clientId: CLIENT,
    type: ActivityType.PHONE_CALL,
    notes: 'Follow-up call',
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

    activityRepo = {
      create: jest.fn((data) => ({ id: 'activity-1', ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => qb),
    };
    clientRepo = {
      findOne: jest.fn().mockResolvedValue({ id: CLIENT }),
    };
    propertyRepo = {
      findOne: jest.fn().mockResolvedValue({ id: PROPERTY }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: getRepositoryToken(Activity), useValue: activityRepo },
        { provide: getRepositoryToken(Client), useValue: clientRepo },
        { provide: getRepositoryToken(Property), useValue: propertyRepo },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  const activity = (overrides: Partial<Activity> = {}): Activity =>
    ({
      id: 'activity-1',
      agencyId: AGENCY,
      clientId: CLIENT,
      userId: USER,
      type: ActivityType.PHONE_CALL,
      date: new Date('2026-05-01'),
      notes: 'Follow-up call',
      ...overrides,
    }) as Activity;

  describe('create', () => {
    it('attributes the activity to the caller, not the body', async () => {
      const result = await service.create(DTO, AGENCY, USER);
      expect(activityRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...DTO,
          agencyId: AGENCY,
          userId: USER,
        }),
      );
      expect(result.userId).toBe(USER);
    });

    it('defaults the date to now when not supplied', async () => {
      await service.create(DTO, AGENCY, USER);
      const call = activityRepo.create.mock.calls[0][0];
      expect(call.date).toBeInstanceOf(Date);
    });

    it('refuses a client that is not in the agency', async () => {
      clientRepo.findOne.mockResolvedValue(null);
      await expect(service.create(DTO, AGENCY, USER)).rejects.toThrow(
        NotFoundException,
      );
      expect(activityRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('scopes on the activity own agency_id and applies the filters', async () => {
      await service.findAll(AGENCY, {
        clientId: CLIENT,
        type: ActivityType.EMAIL,
        fromDate: '2026-01-01',
        toDate: '2026-06-30',
        search: 'legacy',
      });
      expect(qb.where).toHaveBeenCalledWith('activity.agencyId = :agencyId', {
        agencyId: AGENCY,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'activity.clientId = :clientId',
        { clientId: CLIENT },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('activity.type = :type', {
        type: ActivityType.EMAIL,
      });
      expect(qb.orderBy).toHaveBeenCalledWith('activity.date', 'DESC');
    });

    it('escapes wildcards in the search term', async () => {
      await service.findAll(AGENCY, { search: '100%_done' });
      const [, params] = qb.andWhere.mock.calls.find(([sql]: [string]) =>
        sql.includes('ILIKE'),
      );
      // The `%` and `_` in the search term are escaped into literals, so the
      // term is `%100\%\_done%`, not an anything-matches wildcard pattern.
      expect(params.term).toBe('%100\\%\\_done%');
    });
  });

  describe('findOne', () => {
    it('throws 404 when the id belongs to another agency', async () => {
      await expect(service.findOne('other', AGENCY)).rejects.toThrow(
        NotFoundException,
      );
      expect(activityRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'other', agencyId: AGENCY },
        relations: ['client', 'property', 'user'],
      });
    });
  });

  describe('update', () => {
    it('scopes the row to the agency and converts the date', async () => {
      activityRepo.findOne.mockResolvedValueOnce(activity());
      activityRepo.findOne.mockResolvedValueOnce(activity());
      await service.update('activity-1', AGENCY, {
        date: '2026-02-02',
      } as never);
      expect(activityRepo.update).toHaveBeenCalledWith(
        { id: 'activity-1', agencyId: AGENCY },
        expect.objectContaining({ date: new Date('2026-02-02') }),
      );
    });
  });

  describe('remove', () => {
    it('deletes only within the agency', async () => {
      activityRepo.findOne.mockResolvedValueOnce(activity());
      await service.remove('activity-1', AGENCY);
      expect(activityRepo.delete).toHaveBeenCalledWith({
        id: 'activity-1',
        agencyId: AGENCY,
      });
    });
  });
});
