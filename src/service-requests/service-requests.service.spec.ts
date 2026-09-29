import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ServiceRequestsService } from './service-requests.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { ServiceRequest } from './entities/service-request.entity';

/**
 * `service_requests.agency_id` is NOT NULL with no default. The service accepted an
 * agencyId argument and used it to notify staff, but never assigned it to the entity,
 * so every POST /service-requests failed with
 *   null value in column "agency_id" of relation "service_requests" violates not-null constraint
 */
describe('ServiceRequestsService.create - agency scoping', () => {
  let service: ServiceRequestsService;
  let qb: { getOne: jest.Mock; andWhere?: jest.Mock };
  let manager: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let notificationsService: { createBulk: jest.Mock };
  let usersService: { findAgencyStaff: jest.Mock };

  const AGENCY = '11111111-1111-1111-1111-111111111111';
  const OTHER_AGENCY = '22222222-2222-2222-2222-222222222222';

  const dto: any = {
    title: 'Leaking tap',
    description: 'The kitchen tap has been dripping for two days now.',
    propertyId: '44444444-4444-4444-4444-444444444444',
    tenantId: '55555555-5555-5555-5555-555555555555',
    priority: 'high',
  };

  beforeEach(async () => {
    // BaseService needs a repository; create() only uses the transaction manager.
    const repo: any = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn(),
      update: jest.fn(),
      // Repository.create is called both as create(data) and create(Entity, data).
      create: jest
        .fn()
        .mockImplementation((...args: unknown[]) => args[args.length - 1]),
    };

    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'sr-1',
        title: 'Leaking tap',
        property: { address: 'ACI 2000' },
      }),
    };

    manager = {
      create: jest.fn().mockImplementation((_entity, data) => data),
      save: jest
        .fn()
        .mockImplementation(async (data) => ({ id: 'sr-1', ...data })),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    usersService = {
      findAgencyStaff: jest.fn().mockResolvedValue([]),
    };
    notificationsService = {
      createBulk: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestsService,
        { provide: getRepositoryToken(ServiceRequest), useValue: repo },
        {
          provide: DataSource,
          useValue: {
            transaction: jest
              .fn()
              .mockImplementation(async (cb) => cb(manager)),
          },
        },
        { provide: UsersService, useValue: usersService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<ServiceRequestsService>(ServiceRequestsService);
  });

  it('persists the agency from the request context', async () => {
    await service.create(dto, AGENCY);

    expect(manager.create).toHaveBeenCalledWith(
      ServiceRequest,
      expect.objectContaining({ agencyId: AGENCY }),
    );
  });

  it('cannot have its agency overridden by the request body', async () => {
    await service.create({ ...dto, agencyId: OTHER_AGENCY }, AGENCY);

    const persisted = manager.create.mock.calls[0][1];
    expect(persisted.agencyId).toBe(AGENCY);
    expect(persisted.agencyId).not.toBe(OTHER_AGENCY);
  });

  it('keeps the rest of the request payload intact', async () => {
    await service.create(dto, AGENCY);

    const persisted = manager.create.mock.calls[0][1];
    expect(persisted.title).toBe('Leaking tap');
    expect(persisted.priority).toBe('high');
    expect(persisted.tenantId).toBe(dto.tenantId);
    expect(persisted.propertyId).toBe(dto.propertyId);
  });

  describe('staff notifications', () => {
    const STAFF = '66666666-6666-6666-6666-666666666666';
    const OTHER_STAFF = '77777777-7777-7777-7777-777777777777';

    it('notifies agency staff inside the transaction manager', async () => {
      usersService.findAgencyStaff.mockResolvedValue([
        { id: STAFF },
        { id: OTHER_STAFF },
      ]);

      await service.create(dto, AGENCY);

      expect(notificationsService.createBulk).toHaveBeenCalledTimes(1);
      const [notifications, passingManager] =
        notificationsService.createBulk.mock.calls[0];
      expect(notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: STAFF,
            type: NotificationType.SERVICE_REQUEST,
            message: expect.stringContaining('Leaking tap'),
          }),
          expect.objectContaining({
            userId: OTHER_STAFF,
            type: NotificationType.SERVICE_REQUEST,
          }),
        ]),
      );
      // The manager must be the transaction manager, otherwise the rows would be
      // committed (or rolled back) independently of the service request.
      expect(passingManager).toBe(manager);
    });

    it('does not deref a nullable property', async () => {
      usersService.findAgencyStaff.mockResolvedValue([{ id: STAFF }]);
      qb.getOne.mockResolvedValue({
        id: 'sr-1',
        title: 'Floor collapse',
        property: null,
      });

      await expect(service.create(dto, AGENCY)).resolves.toBeDefined();

      const [notifications] = notificationsService.createBulk.mock.calls[0];
      expect(notifications[0].message).toBe(
        'A new service request has been submitted: Floor collapse',
      );
    });

    it('keeps the property address in the message when present', async () => {
      usersService.findAgencyStaff.mockResolvedValue([{ id: STAFF }]);

      await service.create(dto, AGENCY);

      const [notifications] = notificationsService.createBulk.mock.calls[0];
      expect(notifications[0].message).toBe(
        'A new service request has been submitted: Leaking tap at ACI 2000',
      );
    });
  });
});