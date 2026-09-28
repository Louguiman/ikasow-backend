import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeasesService } from './leases.service';
import { Lease, LeaseStatus } from './entities/lease.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Property } from '../properties/entities/property.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

describe('LeasesService', () => {
  let service: LeasesService;
  let leaseRepo: Record<string, jest.Mock>;
  let tenantRepo: Record<string, jest.Mock>;
  let propertyRepo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';
  const OTHER_AGENCY = 'agency-2';
  const TENANT = 'tenant-1';
  const PROPERTY = 'property-1';

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

  const futureEnd = (): Date => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  };

  const makeLease = (over: Partial<Lease> = {}): Lease =>
    ({
      id: 'lease-1',
      agencyId: AGENCY,
      tenantId: TENANT,
      propertyId: PROPERTY,
      startDate: new Date('2026-01-01'),
      endDate: futureEnd(),
      monthlyRent: 750,
      depositAmount: 750,
      status: LeaseStatus.DRAFT,
      ...over,
    }) as Lease;

  beforeEach(async () => {
    qb = chainable();
    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

    leaseRepo = {
      create: jest.fn((data) => ({ id: 'lease-1', ...data })),
      save: jest.fn(async (entity) => entity),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => qb),
    };
    tenantRepo = { findOne: jest.fn().mockResolvedValue({ id: TENANT }) };
    propertyRepo = { findOne: jest.fn().mockResolvedValue({ id: PROPERTY }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeasesService,
        { provide: getRepositoryToken(Lease), useValue: leaseRepo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: getRepositoryToken(Property), useValue: propertyRepo },
      ],
    }).compile();

    service = module.get<LeasesService>(LeasesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const dto = {
      tenantId: TENANT,
      propertyId: PROPERTY,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthlyRent: 750,
    };

    it('takes the agency from the argument, never from the body', async () => {
      await service.create({ ...dto, agencyId: OTHER_AGENCY }, AGENCY);
      expect(leaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ agencyId: AGENCY }),
      );
    });

    it('always creates a draft, ignoring any status in the body', async () => {
      await service.create({ ...dto, agencyId: OTHER_AGENCY }, AGENCY);
      expect(leaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: LeaseStatus.DRAFT }),
      );
    });

    it('defaults the deposit to 0 rather than writing null', async () => {
      await service.create(dto, AGENCY);
      expect(leaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ depositAmount: 0 }),
      );
    });

    it('refuses a tenant from another agency and writes no row', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto, AGENCY)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(leaseRepo.save).not.toHaveBeenCalled();
    });

    it('refuses a property from another agency and writes no row', async () => {
      propertyRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto, AGENCY)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(leaseRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('scopes on the lease agency_id in the query itself', async () => {
      await service.findAll(AGENCY);
      expect(leaseRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith(
        'lease.agencyId = :agencyId',
        { agencyId: AGENCY },
      );
    });

    it('applies the status, tenant and property filters', async () => {
      await service.findAll(AGENCY, {
        status: LeaseStatus.ACTIVE,
        tenantId: TENANT,
        propertyId: PROPERTY,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('lease.status = :status', {
        status: LeaseStatus.ACTIVE,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('lease.tenantId = :tenantId', {
        tenantId: TENANT,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('lease.propertyId = :propertyId', {
        propertyId: PROPERTY,
      });
    });

    it('escapes % and _ so a search is a literal search', async () => {
      await service.findAll(AGENCY, { search: '100%_a' });
      const call = qb.andWhere.mock.calls.find((c) => String(c[0]).includes('ILIKE'));
      expect(call?.[1]).toEqual({ term: '%100\\%\\_a%' });
    });

    it('returns the flat PaginatedResponse envelope', async () => {
      qb.getManyAndCount.mockResolvedValue([[makeLease()], 1]);
      const result = await service.findAll(AGENCY);
      expect(result).toBeInstanceOf(PaginatedResponse);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('orders by property names, not column names', async () => {
      // `orderBy('lease.end_date')` compiles, passes every mock-based test, and
      // then 500s live inside TypeORM. Assert the property spelling.
      await service.findAll(AGENCY);
      expect(qb.orderBy).toHaveBeenCalledWith('lease.endDate', 'DESC');
      expect(qb.orderBy).not.toHaveBeenCalledWith('lease.end_date', 'DESC');
    });

    it('caps the page size at 100', async () => {
      await service.findAll(AGENCY, { limit: 5000 });
      expect(qb.take).toHaveBeenCalledWith(100);
    });
  });

  describe('findOne', () => {
    it('scopes on both id and agency', async () => {
      leaseRepo.findOne.mockResolvedValue(makeLease());
      await service.findOne('lease-1', AGENCY);
      expect(leaseRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'lease-1', agencyId: AGENCY } }),
      );
    });

    it('404s another agency lease instead of returning it', async () => {
      leaseRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('lease-1', AGENCY)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByTenant', () => {
    it('404s when the tenant is not in this agency', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(service.findByTenant(TENANT, AGENCY)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(leaseRepo.find).not.toHaveBeenCalled();
    });

    it('scopes the lease query on the agency as well as the tenant', async () => {
      await service.findByTenant(TENANT, AGENCY);
      expect(leaseRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT, agencyId: AGENCY } }),
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      leaseRepo.findOne.mockResolvedValue(makeLease());
    });

    it('refuses to let a body retarget the agency', async () => {
      await service.update('lease-1', AGENCY, { agencyId: OTHER_AGENCY });
      expect(leaseRepo.update).toHaveBeenCalledWith(
        { id: 'lease-1', agencyId: AGENCY },
        expect.not.objectContaining({ agencyId: OTHER_AGENCY }),
      );
    });

    it('404s an update aimed at another agency', async () => {
      leaseRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('lease-1', AGENCY, { monthlyRent: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(leaseRepo.update).not.toHaveBeenCalled();
    });

    it('re-checks the agency when the tenant is changed', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('lease-1', AGENCY, { tenantId: 'other-tenant' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(leaseRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('moves a draft to active', async () => {
      // `activate` reads the lease three times: the row itself, the "does this
      // tenant already have an active lease" probe, and the re-read after the
      // update. The middle one must answer null or the activate looks like a
      // conflict with itself.
      leaseRepo.findOne
        .mockResolvedValueOnce(makeLease({ status: LeaseStatus.DRAFT }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeLease({ status: LeaseStatus.ACTIVE }));
      await service.activate('lease-1', AGENCY);
      expect(leaseRepo.update).toHaveBeenCalledWith(
        { id: 'lease-1', agencyId: AGENCY },
        { status: LeaseStatus.ACTIVE },
      );
    });

    it('refuses anything that is not a draft', async () => {
      leaseRepo.findOne.mockResolvedValue(makeLease({ status: LeaseStatus.TERMINATED }));
      await expect(service.activate('lease-1', AGENCY)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(leaseRepo.update).not.toHaveBeenCalled();
    });

    it('refuses a lease whose end date has already passed', async () => {
      leaseRepo.findOne.mockResolvedValue(
        makeLease({
          status: LeaseStatus.DRAFT,
          endDate: new Date('2020-01-01'),
        }),
      );
      await expect(service.activate('lease-1', AGENCY)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(leaseRepo.update).not.toHaveBeenCalled();
    });

    it('409s when the tenant already has an active lease', async () => {
      leaseRepo.findOne
        .mockResolvedValueOnce(makeLease({ status: LeaseStatus.DRAFT }))
        .mockResolvedValueOnce(makeLease({ id: 'lease-2' }));
      await expect(service.activate('lease-1', AGENCY)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(leaseRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('terminate', () => {
    it('ends an active lease', async () => {
      leaseRepo.findOne
        .mockResolvedValueOnce(makeLease({ status: LeaseStatus.ACTIVE }))
        .mockResolvedValueOnce(makeLease({ status: LeaseStatus.TERMINATED }));
      await service.terminate('lease-1', AGENCY);
      expect(leaseRepo.update).toHaveBeenCalledWith(
        { id: 'lease-1', agencyId: AGENCY },
        { status: LeaseStatus.TERMINATED },
      );
    });

    it('refuses to rewrite a lease that is already closed', async () => {
      leaseRepo.findOne.mockResolvedValue(
        makeLease({ status: LeaseStatus.TERMINATED }),
      );
      await expect(service.terminate('lease-1', AGENCY)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(leaseRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('refuses to delete a lease in force', async () => {
      leaseRepo.findOne.mockResolvedValue(makeLease({ status: LeaseStatus.ACTIVE }));
      await expect(service.remove('lease-1', AGENCY)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(leaseRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes a closed lease, scoped on the agency', async () => {
      leaseRepo.findOne.mockResolvedValue(makeLease({ status: LeaseStatus.EXPIRED }));
      await service.remove('lease-1', AGENCY);
      expect(leaseRepo.delete).toHaveBeenCalledWith({
        id: 'lease-1',
        agencyId: AGENCY,
      });
    });
  });

  describe('expirePastLeases', () => {
    it('only sweeps leases whose end date has arrived', async () => {
      // Without the date in the criteria this also expires a lease signed
      // yesterday for a term ending next year, un-letting a property whose
      // contract has not run out.
      leaseRepo.update.mockResolvedValue({ affected: 3 });
      await expect(service.expirePastLeases(AGENCY)).resolves.toBe(3);

      const [criteria] = leaseRepo.update.mock.calls[0];
      expect(criteria.agencyId).toBe(AGENCY);
      expect(criteria.status).toBe(LeaseStatus.ACTIVE);
      // A `FindOperator`, not a raw date: TypeORM turns it into a bound
      // parameter. The property name it was given is not retained on the
      // operator (it becomes SQL at build time), so the key in the criteria is
      // what pins it to `endDate` rather than some other column.
      expect(criteria).toHaveProperty('endDate');
      expect(criteria.endDate._type).toBe('lessThanOrEqual');
      expect(criteria.endDate._value).toBeInstanceOf(Date);
      expect(leaseRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        { status: LeaseStatus.EXPIRED },
      );
    });

    it('reports zero when nothing ran out', async () => {
      leaseRepo.update.mockResolvedValue({ affected: 0 });
      await expect(service.expirePastLeases(AGENCY)).resolves.toBe(0);
    });
  });
});
