import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Invoice } from '../invoices/entities/invoice.entity';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: Record<string, jest.Mock>;
  let tenantRepo: Record<string, jest.Mock>;
  let invoiceRepo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;

  const AGENCY = 'agency-1';
  const OTHER_AGENCY = 'agency-2';
  const TENANT = 'tenant-1';
  const INVOICE = 'invoice-1';

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
      'select',
      'addSelect',
      'groupBy',
      'having',
    ]) {
      q[m] = jest.fn().mockReturnThis();
    }
    return q;
  };

  beforeEach(async () => {
    qb = chainable();
    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    qb.getRawMany = jest.fn().mockResolvedValue([]);
    qb.getRawOne = jest.fn().mockResolvedValue({ total: '0' });

    paymentRepo = {
      create: jest.fn((data) => ({ id: 'payment-1', ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => qb),
    };
    tenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: TENANT }),
    };
    invoiceRepo = {
      findOne: jest.fn().mockResolvedValue({ id: INVOICE }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('takes the agency from the argument, never from the body', async () => {
      await service.create(
        {
          tenantId: TENANT,
          amount: 750,
          paymentDate: '2026-01-31',
          paymentMethod: 'bank-transfer',
          agencyId: OTHER_AGENCY,
        } as never,
        AGENCY,
      );

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ agencyId: AGENCY }),
      );
    });

    it('always creates as pending, whatever the body asked for', async () => {
      await service.create(
        {
          tenantId: TENANT,
          amount: 750,
          paymentDate: '2026-01-31',
          paymentMethod: 'cash',
          status: PaymentStatus.PAID,
        } as never,
        AGENCY,
      );

      // Settling is `mark-paid`; accepting `paid` here would put the transition
      // in two places and skip the cancelled check.
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.PENDING }),
      );
    });

    it('converts the ISO paymentDate to a Date for the date column', async () => {
      await service.create(
        {
          tenantId: TENANT,
          amount: 750,
          paymentDate: '2026-01-31',
          paymentMethod: 'cash',
        } as never,
        AGENCY,
      );

      const arg = paymentRepo.create.mock.calls[0][0];
      expect(arg.paymentDate).toBeInstanceOf(Date);
    });

    it('looks the tenant up with the agency in the same query', async () => {
      await service.create(
        {
          tenantId: TENANT,
          amount: 750,
          paymentDate: '2026-01-31',
          paymentMethod: 'cash',
        } as never,
        AGENCY,
      );

      expect(tenantRepo.findOne).toHaveBeenCalledWith({
        where: { id: TENANT, agencyId: AGENCY },
        select: ['id'],
      });
    });

    it('writes nothing when the tenant belongs to another agency', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            tenantId: TENANT,
            amount: 750,
            paymentDate: '2026-01-31',
            paymentMethod: 'cash',
          } as never,
          AGENCY,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(paymentRepo.save).not.toHaveBeenCalled();
    });

    it('writes nothing when the named invoice is another agency’s', async () => {
      invoiceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            tenantId: TENANT,
            invoiceId: INVOICE,
            amount: 750,
            paymentDate: '2026-01-31',
            paymentMethod: 'cash',
          } as never,
          AGENCY,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(paymentRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('scopes on the payment own agency_id', async () => {
      await service.findAll(AGENCY);

      expect(qb.where).toHaveBeenCalledWith(
        'payment.agencyId = :agencyId',
        { agencyId: AGENCY },
      );
    });

    it('returns the flat PaginatedResponse envelope', async () => {
      qb.getManyAndCount.mockResolvedValue([[{ id: 'p1' }], 1]);

      const result = await service.findAll(AGENCY, { limit: 20 });

      expect(result).toEqual({
        data: [{ id: 'p1' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(result).toHaveProperty('totalPages');
    });

    it('caps the limit at 100 whatever the DTO allowed', async () => {
      await service.findAll(AGENCY, { limit: 5000, page: 2 });

      expect(qb.take).toHaveBeenCalledWith(100);
      expect(qb.skip).toHaveBeenCalledWith(100);
    });

    it('applies the date range as an inclusive comparison', async () => {
      await service.findAll(AGENCY, {
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'payment.paymentDate >= :fromDate',
        { fromDate: '2026-01-01' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'payment.paymentDate <= :toDate',
        { toDate: '2026-01-31' },
      );
    });

    it('escapes wildcards in search', async () => {
      await service.findAll(AGENCY, { search: '100%' });

      // An unescaped `%` would match every row and the filter would look like it
      // worked while returning the whole list.
      const call = qb.andWhere.mock.calls.find((c) =>
        String(c[0]).includes('ILIKE'),
      );
      expect(call?.[1]).toEqual({ term: '%100\\%%' });
    });
  });

  describe('findOne', () => {
    it('scopes the lookup on the agency', async () => {
      paymentRepo.findOne.mockResolvedValue({ id: 'p1', agencyId: AGENCY });

      await service.findOne('p1', AGENCY);

      expect(paymentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1', agencyId: AGENCY } }),
      );
    });

    it('404s for another agency payment', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('p1', AGENCY)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    beforeEach(() => paymentRepo.findOne.mockResolvedValue({ id: 'p1', agencyId: AGENCY }));

    it('ignores status in the body', async () => {
      await service.update('p1', AGENCY, {
        status: PaymentStatus.PAID,
      } as never);

      expect(paymentRepo.update).toHaveBeenCalledWith(
        { id: 'p1', agencyId: AGENCY },
        expect.not.objectContaining({ status: PaymentStatus.PAID }),
      );
    });

    it('ignores agencyId in the body', async () => {
      await service.update('p1', AGENCY, {
        agencyId: OTHER_AGENCY,
        amount: 900,
      } as never);

      expect(paymentRepo.update).toHaveBeenCalledWith(
        { id: 'p1', agencyId: AGENCY },
        expect.not.objectContaining({ agencyId: OTHER_AGENCY }),
      );
    });

    it('converts paymentDate when it is supplied', async () => {
      await service.update('p1', AGENCY, { paymentDate: '2026-02-01' } as never);

      const [, patch] = paymentRepo.update.mock.calls[0];
      expect(patch.paymentDate).toBeInstanceOf(Date);
    });

    it('rejects a move to another agency tenant before writing', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('p1', AGENCY, { tenantId: TENANT } as never),
      ).rejects.toThrow(NotFoundException);

      expect(paymentRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('markAsPaid', () => {
    it('settles a pending payment', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: 'p1',
        agencyId: AGENCY,
        status: PaymentStatus.PENDING,
      });

      await service.markAsPaid('p1', AGENCY);

      expect(paymentRepo.update).toHaveBeenCalledWith(
        { id: 'p1', agencyId: AGENCY },
        { status: PaymentStatus.PAID },
      );
    });

    it('is idempotent and does not write again', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: 'p1',
        agencyId: AGENCY,
        status: PaymentStatus.PAID,
      });

      const result = await service.markAsPaid('p1', AGENCY);

      expect(paymentRepo.update).not.toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.PAID);
    });

    it('refuses to settle a cancelled payment', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: 'p1',
        agencyId: AGENCY,
        status: PaymentStatus.CANCELLED,
      });

      // Silently flipping it back would erase the fact that it was cancelled.
      await expect(service.markAsPaid('p1', AGENCY)).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentRepo.update).not.toHaveBeenCalled();
    });

    it('404s for another agency payment', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.markAsPaid('p1', AGENCY)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes scoped to the agency', async () => {
      paymentRepo.findOne.mockResolvedValue({ id: 'p1' });

      await service.remove('p1', AGENCY);

      expect(paymentRepo.delete).toHaveBeenCalledWith({
        id: 'p1',
        agencyId: AGENCY,
      });
    });

    it('404s rather than deleting another agency payment', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('p1', AGENCY)).rejects.toThrow(
        NotFoundException,
      );
      expect(paymentRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('totals by status', async () => {
      qb.getRawMany.mockResolvedValue([
        { status: PaymentStatus.PAID, total: '1200.00' },
        { status: PaymentStatus.PENDING, total: '300.50' },
      ]);

      const result = await service.getSummary(AGENCY);

      expect(result).toEqual({
        pending: '300.50',
        paid: '1200.00',
        cancelled: '0',
      });
    });

    it('does not filter on status, since it is totalling every status', async () => {
      await service.getSummary(AGENCY, { status: PaymentStatus.PAID });

      const statusCall = qb.andWhere.mock.calls.find((c) =>
        String(c[0]).includes('payment.status'),
      );
      expect(statusCall).toBeUndefined();
    });

    it('still scopes on the agency', async () => {
      await service.getSummary(AGENCY);

      expect(qb.where).toHaveBeenCalledWith('payment.agencyId = :agencyId', {
        agencyId: AGENCY,
      });
    });
  });

  describe('findOverdue', () => {
    it('only reports pending payments older than the cutoff', async () => {
      await service.findOverdue(AGENCY, 30);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'payment.status = :status',
        { status: PaymentStatus.PENDING },
      );
      const cutoff = qb.andWhere.mock.calls.find((c) =>
        String(c[0]).includes('cutoff'),
      );
      expect(cutoff).toBeDefined();
    });
  });

  describe('getTotalPaid', () => {
    it('sums only paid payments', async () => {
      qb.getRawOne.mockResolvedValue({ total: '4500.00' });

      const total = await service.getTotalPaid(AGENCY);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'payment.status = :status',
        { status: PaymentStatus.PAID },
      );
      expect(total).toBe('4500.00');
    });

    it('returns zero rather than null when there is nothing', async () => {
      qb.getRawOne.mockResolvedValue({ total: null });

      await expect(service.getTotalPaid(AGENCY)).resolves.toBe('0');
    });
  });

  describe('getSettledInvoiceIds', () => {
    it('skips the query entirely for an empty id list', async () => {
      // `IN (:...ids)` with an empty array is a syntax error in Postgres.
      const result = await service.getSettledInvoiceIds(AGENCY, []);

      expect(result).toEqual([]);
      expect(paymentRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
