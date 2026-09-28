import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';

const AGENCY = '11111111-1111-1111-1111-111111111111';
const TENANT = '55555555-5555-4555-8555-555555555555';

/**
 * `findAll` used to scope with `(tenant.agencyId = :agencyId OR
 * client.agencyId = :agencyId)`. That is both too narrow and, in principle, too
 * wide: an invoice whose counterparty belonged to a different agency was hidden
 * from its own agency, and an invoice with neither counterparty loaded matched
 * nothing at all. `invoices.agency_id` is NOT NULL, so it is the scope.
 */
describe('InvoicesService.findAll - agency scope and filters', () => {
  let service: InvoicesService;
  let qb: Record<string, jest.Mock>;

  beforeEach(async () => {
    qb = {};
    for (const m of ['leftJoinAndSelect', 'andWhere', 'skip', 'take', 'orderBy']) {
      qb[m] = jest.fn().mockReturnValue(qb);
    }
    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

    const repo = { create: jest.fn().mockImplementation((...a: unknown[]) => a[a.length - 1]) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: { createQueryBuilder: jest.fn().mockReturnValue(qb) } },
        { provide: getRepositoryToken(InvoiceItem), useValue: repo },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  const conditions = (): string[] =>
    qb.andWhere.mock.calls.map((c) => c[0] as string);

  const bound = (fragment: string): unknown =>
    qb.andWhere.mock.calls.find((c) => (c[0] as string).includes(fragment))?.[1];

  it('scopes on its own agency_id column, never through tenant/client', async () => {
    await service.findAll(AGENCY);

    expect(qb.andWhere).toHaveBeenCalledWith('invoice.agencyId = :agencyId', {
      agencyId: AGENCY,
    });
    const sql = conditions().join(' ');
    expect(sql).not.toContain('tenant.agencyId');
    expect(sql).not.toContain('client.agencyId');
  });

  it('applies status, tenantId and clientId', async () => {
    const filter: FilterInvoiceDto = {
      status: 'paid',
      tenantId: TENANT,
      clientId: TENANT,
    };

    await service.findAll(AGENCY, filter);

    const sql = conditions().join('\n');
    expect(sql).toContain('invoice.status = :status');
    expect(sql).toContain('invoice.tenantId = :tenantId');
    expect(sql).toContain('invoice.clientId = :clientId');
    expect(bound('invoice.status = :status')).toEqual({ status: 'paid' });
  });

  describe('issue-date bounds', () => {
    it('uses issueDate, and treats fromDate as inclusive', async () => {
      await service.findAll(AGENCY, { fromDate: '2026-02-01' });

      expect(conditions().join(' ')).toContain('invoice.issueDate >= :fromDate');
      expect(bound('invoice.issueDate >= :fromDate')).toEqual({
        fromDate: '2026-02-01',
      });
    });

    it('makes toDate inclusive by comparing against the next day', async () => {
      await service.findAll(AGENCY, { toDate: '2026-12-31' });

      // `invoice.issueDate <= toDate` would be wrong: issueDate is a date column,
      // but a caller sending a full timestamp would silently lose same-day rows.
      expect(conditions().join(' ')).toContain('invoice.issueDate < :endExclusive');
      expect(bound('invoice.issueDate < :endExclusive')).toEqual({
        endExclusive: '2027-01-01',
      });
    });

    it('rolls the exclusive bound over a month end', async () => {
      await service.findAll(AGENCY, { toDate: '2026-01-31' });
      expect(bound('invoice.issueDate < :endExclusive')).toEqual({
        endExclusive: '2026-02-01',
      });
    });

    it('rolls the exclusive bound over a leap day', async () => {
      await service.findAll(AGENCY, { toDate: '2028-02-28' });
      expect(bound('invoice.issueDate < :endExclusive')).toEqual({
        endExclusive: '2028-02-29',
      });
    });
  });

  it('omits bounds that were not supplied', async () => {
    await service.findAll(AGENCY);

    const sql = conditions().join(' ');
    expect(sql).not.toContain('issueDate');
    expect(sql).not.toContain('invoice.status');
  });

  it('clamps the page size to 100', async () => {
    await service.findAll(AGENCY, { page: 2, limit: 999 });

    expect(qb.take).toHaveBeenCalledWith(100);
    expect(qb.skip).toHaveBeenCalledWith(100);
  });
});
