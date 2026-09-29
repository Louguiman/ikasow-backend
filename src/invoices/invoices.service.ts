import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ErrorHandler } from '../common/utils/error-handler';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { BaseService } from '../common/services';

@Injectable()
export class InvoicesService extends BaseService<Invoice> {
  constructor(
    @InjectRepository(Invoice)
    invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    private readonly dataSource: DataSource,
  ) {
    super(invoiceRepository);
  }

  protected getEntityName(): string {
    return 'Invoice';
  }

  async create(
    createInvoiceDto: CreateInvoiceDto,
    agencyId: string,
  ): Promise<Invoice> {
    try {
      // Validate that at least one of tenantId or clientId is provided
      if (!createInvoiceDto.tenantId && !createInvoiceDto.clientId) {
        throw new BadRequestException(
          'Either tenantId or clientId must be provided',
        );
      }

      return await this.createWithRetry(createInvoiceDto, agencyId);
    } catch (error) {
      ErrorHandler.handle(error, 'InvoicesService.create');
    }
  }

  private async createWithRetry(
    createInvoiceDto: CreateInvoiceDto,
    agencyId: string,
  ): Promise<Invoice> {
    // Two concurrent invoices for the same agency can pick the same next
    // sequence number because the lookup for the highest existing number runs
    // first. The (agency_id, invoice_number) unique index is what makes the
    // second one fail; a short retry regenerates the number instead of 500ing.
    const MAX_ATTEMPTS = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await this.createInTransaction(createInvoiceDto, agencyId);
      } catch (error: unknown) {
        if (!this.isUniqueViolation(error)) {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === '23505'
    );
  }

  private async createInTransaction(
    createInvoiceDto: CreateInvoiceDto,
    agencyId: string,
  ): Promise<Invoice> {
    // Use transaction to ensure invoice number generation and creation are atomic
    return await this.dataSource.transaction(async (manager) => {
      // Generate unique invoice number within transaction
      const invoiceNumber = await this.generateInvoiceNumberInTransaction(
        manager,
        agencyId,
      );

      // Calculate totals from items
      const { subtotal, items } = this.calculateTotals(createInvoiceDto.items);
      // `tax` is a *rate*, not an amount: CreateInvoiceDto caps it at 100 and
      // the form labels it "Taxe (%)", so the rate is what gets stored and the
      // amount is derived. Adding the rate flat meant an invoice of 500 000
      // with tax 10 totalled 500 010 instead of 550 000.
      const tax = createInvoiceDto.tax || 0;
      const total = subtotal + this.calculateTaxAmount(subtotal, tax);

      // Create invoice
      const invoice = manager.create(Invoice, {
        invoiceNumber,
        // invoices.agency_id is NOT NULL with no default, and create() used to
        // leave it unset, so every POST /invoices failed with
        // "null value in column "agency_id" ... violates not-null constraint".
        agencyId,
        tenantId: createInvoiceDto.tenantId,
        clientId: createInvoiceDto.clientId,
        issueDate: createInvoiceDto.issueDate,
        dueDate: createInvoiceDto.dueDate,
        status: createInvoiceDto.status || InvoiceStatus.DRAFT,
        subtotal,
        tax,
        total,
        notes: createInvoiceDto.notes,
        items,
      });

      return await manager.save(invoice);
    });
  }

  async findAll(
    agencyId: string,
    filter: FilterInvoiceDto = {},
  ): Promise<PaginatedResponse<Invoice>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        tenantId,
        clientId,
        fromDate,
        toDate,
      } = filter;

      // Enforce maximum limit
      const effectiveLimit = Math.min(limit, 100);
      const skip = (page - 1) * effectiveLimit;

      const queryBuilder = this.repository
        .createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.items', 'items')
        .leftJoinAndSelect('invoice.tenant', 'tenant')
        .leftJoinAndSelect('invoice.client', 'client');

      // Scope on the invoice's own agency_id. It used to go through
      // `tenant.agencyId OR client.agencyId`, which both hid invoices whose
      // counterparty belonged to another agency and would have shown an invoice
      // with neither loaded. agency_id is NOT NULL, so the column is the truth.
      queryBuilder.andWhere('invoice.agencyId = :agencyId', { agencyId });

      if (status) {
        queryBuilder.andWhere('invoice.status = :status', { status });
      }

      // Filter by tenant if provided
      if (tenantId) {
        queryBuilder.andWhere('invoice.tenantId = :tenantId', { tenantId });
      }

      // Filter by client if provided
      if (clientId) {
        queryBuilder.andWhere('invoice.clientId = :clientId', { clientId });
      }

      // Issue date is a `date` column, so the bounds are compared as dates. The
      // end of `toDate` is inclusive, hence the exclusive next-day upper bound.
      if (fromDate) {
        queryBuilder.andWhere('invoice.issueDate >= :fromDate', { fromDate });
      }

      if (toDate) {
        const endExclusive = new Date(toDate);
        endExclusive.setDate(endExclusive.getDate() + 1);
        queryBuilder.andWhere('invoice.issueDate < :endExclusive', {
          endExclusive: endExclusive.toISOString().slice(0, 10),
        });
      }

      const [invoices, total] = await queryBuilder
        .skip(skip)
        .take(effectiveLimit)
        .orderBy('invoice.createdAt', 'DESC')
        .getManyAndCount();

      return new PaginatedResponse(
        invoices,
        total,
        page,
        effectiveLimit,
      );
    } catch (error) {
      ErrorHandler.handle(error, 'InvoicesService.findAll');
    }
  }

  async findOne(id: string, agencyId: string): Promise<Invoice> {
    const invoice = await this.repository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('invoice.tenant', 'tenant')
      .leftJoinAndSelect('invoice.client', 'client')
      .where('invoice.id = :id', { id })
      .andWhere(
        '(tenant.agencyId = :agencyId OR client.agencyId = :agencyId)',
        {
          agencyId,
        },
      )
      .getOne();

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async update(
    id: string,
    agencyId: string,
    updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    try {
      const invoice = await this.findOne(id, agencyId);

      // Validate that at least one of tenantId or clientId is provided
      this.validateInvoiceRelationships(updateInvoiceDto);

      // Use transaction when updating items to ensure atomicity
      if (updateInvoiceDto.items) {
        return await this.dataSource.transaction(async (manager) => {
          // Delete old items within transaction
          await manager.delete(InvoiceItem, { invoiceId: id });

          // Calculate new totals
          const { subtotal, items } = this.calculateTotals(updateInvoiceDto.items!);
          // `tax` is stored as the rate, so the stored value is the one to
          // re-apply when the caller does not send a new rate.
          const tax =
            updateInvoiceDto.tax !== undefined ? updateInvoiceDto.tax : invoice.tax;
          const total = subtotal + this.calculateTaxAmount(subtotal, tax);

          // Update invoice with new values
          Object.assign(invoice, {
            ...updateInvoiceDto,
            subtotal,
            tax,
            total,
            items,
          });

          return await manager.save(invoice);
        });
      } else {
        // Simple update without items - no transaction needed
        this.updateInvoiceWithoutItems(invoice, updateInvoiceDto);
        return await this.repository.save(invoice);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'InvoicesService.update');
    }
  }

  private validateInvoiceRelationships(updateDto: UpdateInvoiceDto): void {
    if (updateDto.tenantId === null && updateDto.clientId === null) {
      throw new BadRequestException(
        'Either tenantId or clientId must be provided',
      );
    }
  }

  private updateInvoiceWithoutItems(
    invoice: Invoice,
    updateDto: UpdateInvoiceDto,
  ): void {
    // If only tax is updated, recalculate total
    if (updateDto.tax !== undefined) {
      const total = invoice.subtotal + updateDto.tax;
      Object.assign(invoice, { ...updateDto, total });
    } else {
      Object.assign(invoice, updateDto);
    }
  }

  async remove(id: string, agencyId: string): Promise<void> {
    try {
      const invoice = await this.findOne(id, agencyId);
      await this.repository.remove(invoice);
    } catch (error) {
      ErrorHandler.handle(error, 'InvoicesService.remove');
    }
  }

  async markAsPaid(id: string, agencyId: string): Promise<Invoice> {
    try {
      const invoice = await this.findOne(id, agencyId);

      // Validate invoice is not already paid
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Invoice is already marked as paid');
      }

      // Update status and payment date
      invoice.status = InvoiceStatus.PAID;
      invoice.paidDate = new Date();

      return await this.repository.save(invoice);
    } catch (error) {
      ErrorHandler.handle(error, 'InvoicesService.markAsPaid');
    }
  }

  private async generateInvoiceNumberInTransaction(
    manager: any,
    agencyId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Find the last invoice number for this agency this month within the
    // transaction. The lookup used to be global, so one agency's invoices
    // consumed the sequence of every other agency's.
    const lastInvoice = await manager
      .createQueryBuilder(Invoice, 'invoice')
      .where('invoice.invoiceNumber LIKE :prefix', {
        prefix: `INV-${year}${month}%`,
      })
      .andWhere('invoice.agencyId = :agencyId', { agencyId })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Turns a tax *rate* into the amount to add to a subtotal.
   *
   * Rounding to two decimals matches the `numeric(10,2)` columns; without it
   * 18% of 333.33 lands as 59.9994 in the database.
   */
  private calculateTaxAmount(subtotal: number, rate?: number): number {
    if (!rate) {
      return 0;
    }
    return Math.round(subtotal * (rate / 100) * 100) / 100;
  }

  private calculateTotals(itemDtos: any[]): {
    subtotal: number;
    items: InvoiceItem[];
  } {
    let subtotal = 0;
    const items: InvoiceItem[] = [];

    for (const itemDto of itemDtos) {
      const lineTotal = itemDto.quantity * itemDto.unitPrice;
      subtotal += lineTotal;

      const item = this.invoiceItemRepository.create({
        description: itemDto.description,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        total: lineTotal,
      });

      items.push(item);
    }

    return { subtotal, items };
  }
}
