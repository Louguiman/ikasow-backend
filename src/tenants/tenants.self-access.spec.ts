import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { PaymentsService } from '../payments/payments.service';
import { UserRole } from '../users/entities/user.entity';

/**
 * Covers the per-tenant routes that `UserRole.TENANT` is allowed to reach.
 *
 * Every tenant of an agency shares one `agencyId`, so agency scoping alone lets
 * any tenant read any other tenant's rows by id. The guard under test is
 * `assertTenantSelfOrStaff`, which both the payment history and the two lease
 * routes now go through.
 */
describe('TenantsService — per-tenant self access', () => {
  let service: TenantsService;
  let tenantRepo: Record<string, jest.Mock>;
  let paymentsService: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';
  const TENANT = 'tenant-1';
  const USER = 'user-1';
  const OTHER_USER = 'user-2';

  beforeEach(async () => {
    tenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: TENANT, userId: USER }),
      save: jest.fn(async (e) => e),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    paymentsService = {
      findByTenant: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('assertTenantSelfOrStaff', () => {
    it('lets a tenant read their own record', async () => {
      await expect(
        service.assertTenantSelfOrStaff(TENANT, AGENCY, {
          userId: USER,
          role: UserRole.TENANT,
        }),
      ).resolves.toBeUndefined();
    });

    it('404s a tenant reading another tenant of the same agency', async () => {
      // Same agency on purpose: agency scope cannot catch this one.
      await expect(
        service.assertTenantSelfOrStaff(TENANT, AGENCY, {
          userId: OTHER_USER,
          role: UserRole.TENANT,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s a tenant whose own record has no linked user', async () => {
      tenantRepo.findOne.mockResolvedValue({ id: TENANT, userId: null });
      await expect(
        service.assertTenantSelfOrStaff(TENANT, AGENCY, {
          userId: USER,
          role: UserRole.TENANT,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not read the tenant at all for a staff role', async () => {
      await service.assertTenantSelfOrStaff(TENANT, AGENCY, {
        userId: OTHER_USER,
        role: UserRole.ADMIN,
      });
      expect(tenantRepo.findOne).not.toHaveBeenCalled();
    });

    for (const role of [
      UserRole.PLATFORM_ADMIN,
      UserRole.ACCOUNTANT,
      UserRole.AGENT,
    ]) {
      it(`lets ${role} read any tenant of the agency`, async () => {
        await expect(
          service.assertTenantSelfOrStaff(TENANT, AGENCY, {
            userId: OTHER_USER,
            role,
          }),
        ).resolves.toBeUndefined();
      });
    }
  });

  describe('getPaymentHistory', () => {
    it('delegates to PaymentsService for a staff caller', async () => {
      await service.getPaymentHistory(TENANT, AGENCY, 1, 20, {
        userId: OTHER_USER,
        role: UserRole.ACCOUNTANT,
      });
      expect(paymentsService.findByTenant).toHaveBeenCalledWith(
        TENANT,
        AGENCY,
        1,
        20,
      );
    });

    it('refuses a tenant before the payment query is issued', async () => {
      await expect(
        service.getPaymentHistory(TENANT, AGENCY, 1, 20, {
          userId: OTHER_USER,
          role: UserRole.TENANT,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(paymentsService.findByTenant).not.toHaveBeenCalled();
    });

    it('still serves a tenant their own payments', async () => {
      await service.getPaymentHistory(TENANT, AGENCY, 1, 20, {
        userId: USER,
        role: UserRole.TENANT,
      });
      expect(paymentsService.findByTenant).toHaveBeenCalled();
    });
  });
});
