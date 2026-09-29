import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InvoicesService } from '../../invoices/invoices.service';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { InvoiceItem } from '../../invoices/entities/invoice-item.entity';
import { ClientsService } from '../../clients/clients.service';
import { Client } from '../../clients/entities/client.entity';
import { ServiceRequestsService } from '../../service-requests/service-requests.service';
import { ServiceRequest } from '../../service-requests/entities/service-request.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Every entity here shares one `agency_id` per agency, so agency scoping alone
 * cannot tell a tenant's row from a neighbour's. These routes are the ones that
 * grant `UserRole.TENANT` / `UserRole.CLIENT` on a by-id read, and the guarantee
 * under test is that the self-service caller only ever sees their own row.
 *
 * The query builder is mocked, so each test asserts on the predicates that were
 * pushed into it rather than on a returned entity: the object-scoping lives in a
 * `andWhere`, and a mock cannot execute SQL.
 */
describe('object-level authorization for self-service by-id reads', () => {
  const AGENCY = 'agency-1';
  const USER = 'user-1';
  const OTHER_USER = 'user-2';

  describe('InvoicesService.findOne', () => {
    let service: InvoicesService;
    let qb: Record<string, jest.Mock>;

    const build = async (row: unknown): Promise<void> => {
      qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(row),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InvoicesService,
          {
            provide: getRepositoryToken(Invoice),
            useValue: { createQueryBuilder: () => qb },
          },
          { provide: getRepositoryToken(InvoiceItem), useValue: {} },
          { provide: DataSource, useValue: { transaction: jest.fn() } },
        ],
      }).compile();
      service = module.get<InvoicesService>(InvoicesService);
    };

    beforeEach(async () => {
      await build({ id: 'inv-1', agencyId: AGENCY });
    });

    afterEach(() => jest.clearAllMocks());

    it("scopes on the invoice's own agency_id, not through its relations", async () => {
      await service.findOne('inv-1', AGENCY, {
        userId: USER,
        role: UserRole.ADMIN,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('invoice.agencyId = :agencyId', {
        agencyId: AGENCY,
      });
      // The old predicate leaked across the OR: an invoice whose tenant belonged
      // to another agency matched on `client.agencyId`, and one with neither
      // relation loaded matched nothing at all.
      const predicates = qb.andWhere.mock.calls.map((c) => c[0]);
      expect(predicates.join(' ')).not.toMatch(
        /tenant\.agencyId|client\.agencyId/,
      );
    });

    it('binds a tenant caller to the tenant the invoice is addressed to', async () => {
      await service.findOne('inv-1', AGENCY, {
        userId: USER,
        role: UserRole.TENANT,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'tenant.userId = :callerUserId',
        {
          callerUserId: USER,
        },
      );
    });

    it('binds a client caller to the client the invoice is addressed to', async () => {
      await service.findOne('inv-1', AGENCY, {
        userId: USER,
        role: UserRole.CLIENT,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'client.userId = :callerUserId',
        {
          callerUserId: USER,
        },
      );
    });

    it('does not object-scope a staff caller', async () => {
      await service.findOne('inv-1', AGENCY, {
        userId: OTHER_USER,
        role: UserRole.ACCOUNTANT,
      });

      const predicates = qb.andWhere.mock.calls.map((c) => c[0]);
      expect(predicates.join(' ')).not.toMatch(/callerUserId/);
    });

    it('404s when the object-scoping predicate excludes the row', async () => {
      await build(null);
      await expect(
        service.findOne('inv-1', AGENCY, {
          userId: OTHER_USER,
          role: UserRole.TENANT,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('ClientsService.findOne', () => {
    let service: ClientsService;
    let repo: Record<string, jest.Mock>;

    const build = async (row: unknown): Promise<void> => {
      repo = { findOne: jest.fn().mockResolvedValue(row) };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClientsService,
          { provide: getRepositoryToken(Client), useValue: repo },
        ],
      }).compile();
      service = module.get<ClientsService>(ClientsService);
    };

    beforeEach(async () => {
      await build({ id: 'client-1', agencyId: AGENCY, userId: USER });
    });

    afterEach(() => jest.clearAllMocks());

    it('lets a client read their own record', async () => {
      await expect(
        service.findOne('client-1', AGENCY, {
          userId: USER,
          role: UserRole.CLIENT,
        }),
      ).resolves.toMatchObject({ id: 'client-1' });
    });

    it('404s a client reading another client of the same agency', async () => {
      // Same agency on purpose: agency scope cannot catch this one.
      await expect(
        service.findOne('client-1', AGENCY, {
          userId: OTHER_USER,
          role: UserRole.CLIENT,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets staff read any client of the agency', async () => {
      await expect(
        service.findOne('client-1', AGENCY, {
          userId: OTHER_USER,
          role: UserRole.AGENT,
        }),
      ).resolves.toMatchObject({ id: 'client-1' });
    });
  });

  describe('ServiceRequestsService', () => {
    let service: ServiceRequestsService;
    let qb: Record<string, jest.Mock>;

    const build = async (row: unknown): Promise<void> => {
      qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(row),
        getMany: jest.fn().mockResolvedValue(row ? [row] : []),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ServiceRequestsService,
          {
            provide: getRepositoryToken(ServiceRequest),
            useValue: { createQueryBuilder: () => qb },
          },
          {
            provide: NotificationsService,
            useValue: { createBulk: jest.fn() },
          },
          {
            provide: UsersService,
            useValue: { findAgencyStaff: jest.fn().mockResolvedValue([]) },
          },
          { provide: DataSource, useValue: { transaction: jest.fn() } },
        ],
      }).compile();
      service = module.get<ServiceRequestsService>(ServiceRequestsService);
    };

    beforeEach(async () => {
      await build({ id: 'sr-1', agencyId: AGENCY });
    });

    afterEach(() => jest.clearAllMocks());

    it("findOne scopes on the request's own agency_id, not the property's", async () => {
      await service.findOne('sr-1', AGENCY, {
        userId: USER,
        role: UserRole.ADMIN,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'serviceRequest.agencyId = :agencyId',
        {
          agencyId: AGENCY,
        },
      );
      const predicates = qb.andWhere.mock.calls.map((c) => c[0]);
      expect(predicates.join(' ')).not.toMatch(/property\.agencyId/);
    });

    it('findOne binds a tenant caller to their own requests', async () => {
      await service.findOne('sr-1', AGENCY, {
        userId: USER,
        role: UserRole.TENANT,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'tenant.userId = :callerUserId',
        {
          callerUserId: USER,
        },
      );
    });

    it("findByTenant scopes on the request's own agency_id too", async () => {
      await service.findByTenant('tenant-1', AGENCY, {
        userId: USER,
        role: UserRole.AGENT,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'serviceRequest.agencyId = :agencyId',
        {
          agencyId: AGENCY,
        },
      );
      const predicates = qb.andWhere.mock.calls.map((c) => c[0]);
      expect(predicates.join(' ')).not.toMatch(/property\.agencyId/);
    });

    it("findByTenant binds a tenant caller, so they cannot list a neighbour's history", async () => {
      await service.findByTenant('tenant-1', AGENCY, {
        userId: USER,
        role: UserRole.TENANT,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'tenant.userId = :callerUserId',
        {
          callerUserId: USER,
        },
      );
    });

    it('findByTenant does not object-scope a staff caller', async () => {
      await service.findByTenant('tenant-1', AGENCY, {
        userId: OTHER_USER,
        role: UserRole.AGENT,
      });

      const predicates = qb.andWhere.mock.calls.map((c) => c[0]);
      expect(predicates.join(' ')).not.toMatch(/callerUserId/);
    });

    it('findOne 404s a tenant whose predicate excluded the row', async () => {
      await build(null);
      await expect(
        service.findOne('sr-1', AGENCY, {
          userId: OTHER_USER,
          role: UserRole.TENANT,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
