import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';

/**
 * `invoices.agency_id` is NOT NULL with no default. `InvoicesService.create` used to
 * take no agency at all, so every POST /invoices failed with
 *   null value in column "agency_id" of relation "invoices" violates not-null constraint
 * and the tenant could not be billed. These tests pin the tenant scoping.
 */
describe('InvoicesService.create - agency scoping', () => {
  let service: InvoicesService;
  let manager: { create: jest.Mock; save: jest.Mock };

  const AGENCY = '11111111-1111-1111-1111-111111111111';
  const OTHER_AGENCY = '22222222-2222-2222-2222-222222222222';
  const TENANT = '33333333-3333-3333-3333-333333333333';

  const dto: any = {
    tenantId: TENANT,
    issueDate: '2026-09-26',
    dueDate: '2026-10-01',
    items: [{ description: 'Rent', quantity: 1, unitPrice: 150000 }],
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

    // generateInvoiceNumberInTransaction queries the highest existing number in the
    // month through the transaction manager's query builder.
    const numberQb = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };

    manager = {
      create: jest.fn().mockImplementation((_entity, data) => data),
      save: jest
        .fn()
        .mockImplementation(async (data) => ({ id: 'inv-1', ...data })),
      createQueryBuilder: jest.fn().mockReturnValue(numberQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: repo },
        { provide: getRepositoryToken(InvoiceItem), useValue: repo },
        {
          provide: DataSource,
          // The injection token is the DataSource class, not the string 'DataSource'.
          useValue: {
            transaction: jest
              .fn()
              .mockImplementation(async (cb) => cb(manager)),
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn().mockResolvedValue(null),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  it('persists the agency from the request context', async () => {
    const invoice = await service.create(dto, AGENCY);

    expect(manager.create).toHaveBeenCalledWith(
      Invoice,
      expect.objectContaining({ agencyId: AGENCY }),
    );
    expect(invoice.agencyId).toBe(AGENCY);
  });

  it('cannot have its agency overridden by the request body', async () => {
    // CreateInvoiceDto has no agencyId, and the global ValidationPipe rejects
    // undeclared fields, so a body-supplied agency never reaches the service. The
    // spread order below is what enforces it a second time.
    const hostile = { ...dto, agencyId: OTHER_AGENCY } as any;

    await service.create(hostile, AGENCY);

    const persisted = manager.create.mock.calls[0][1];
    expect(persisted.agencyId).toBe(AGENCY);
    expect(persisted.agencyId).not.toBe(OTHER_AGENCY);
  });

  it('calculates totals from the line items', async () => {
    const invoice = await service.create(dto, AGENCY);

    expect(invoice.subtotal).toBe(150000);
    expect(invoice.tax).toBe(0);
    expect(invoice.total).toBe(150000);
    expect(invoice.status).toBe(InvoiceStatus.DRAFT);
  });

  describe('tax is a rate, not an amount', () => {
    it('adds a percentage of the subtotal rather than the raw number', async () => {
      // subtotal is 150000, so 10% is 15000 and the total is 165000. This used
      // to be `subtotal + tax`, which produced 150010.
      const invoice = await service.create({ ...dto, tax: 10 }, AGENCY);

      expect(invoice.subtotal).toBe(150000);
      // The column keeps the rate, as the 0-100 DTO bound and the "Taxe (%)"
      // form label both describe.
      expect(invoice.tax).toBe(10);
      expect(invoice.total).toBe(165000);
    });

    it('applies an 18% rate', async () => {
      const invoice = await service.create({ ...dto, tax: 18 }, AGENCY);

      expect(invoice.total).toBe(177000);
    });

    it('rounds the tax amount to two decimals, matching numeric(10,2)', async () => {
      const invoice = await service.create(
        {
          ...dto,
          tax: 18,
          items: [{ description: 'Commission', quantity: 1, unitPrice: 333.33 }],
        },
        AGENCY,
      );

      // 18% of 333.33 is 59.9994; it must not be stored as more precision than
      // the column holds.
      expect(invoice.total).toBe(393.33);
    });

    it('treats a missing or zero rate as no tax', async () => {
      const withoutTax = await service.create({ ...dto, tax: undefined }, AGENCY);
      const withZeroTax = await service.create({ ...dto, tax: 0 }, AGENCY);

      expect(withoutTax.total).toBe(150000);
      expect(withZeroTax.total).toBe(150000);
    });
  });

  it('still requires a tenant or a client', async () => {
    await expect(
      service.create({ ...dto, tenantId: undefined }, AGENCY),
    ).rejects.toThrow(BadRequestException);
  });

  it('keeps the generated invoice number', async () => {
    const invoice = await service.create(dto, AGENCY);

    expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
  });

  it('saves the invoice line items alongside the invoice', async () => {
    await service.create(dto, AGENCY);

    const persisted = manager.create.mock.calls[0][1];
    expect(persisted.items).toHaveLength(1);
    // Asserted on the data, not `instanceof`: the repository is mocked, so the
    // entity constructor is never involved.
    expect(persisted.items[0]).toEqual(
      expect.objectContaining({
        description: 'Rent',
        quantity: 1,
        unitPrice: 150000,
        total: 150000,
      }),
    );
  });
});
