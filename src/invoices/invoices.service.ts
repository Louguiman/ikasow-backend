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

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    try {
      // Validate that at least one of tenantId or clientId is provided
      if (!createInvoiceDto.tenantId && !createInvoiceDto.clientId) {
        throw new BadRequestException(
          'Either tenantId or clientId must be provided',
        );
      }

      // Use transaction to ensure invoice number generation and creation are atomic
      return await this.dataSource.transaction(async (manager) => {
        // Generate unique invoice number within transaction
        const invoiceNumber = await this.generateInvoiceNumberInTransaction(manager);

        // Calculate totals from items
        const { subtotal, items } = this.calculateTotals(createInvoiceDto.items);
        const tax = createInvoiceDto.tax || 0;
        const total = subtotal + tax;

        // Create invoice
        const invoice = manager.create(Invoice, {
          invoiceNumber,
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
    } catch (error) {
      ErrorHandler.handle(error, 'InvoicesService.create');
    }
  }

  async findAll(
    agencyId: string,
    page: number = 1,
    limit: number = 20,
    tenantId?: string,
    clientId?: string,
  ): Promise<PaginatedResponse<Invoice>> {
    try {
      // Enforce maximum limit
      const effectiveLimit = Math.min(limit, 100);
      const skip = (page - 1) * effectiveLimit;

      const queryBuilder = this.repository
        .createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.items', 'items')
        .leftJoinAndSelect('invoice.tenant', 'tenant')
        .leftJoinAndSelect('invoice.client', 'client')
        .where('1=1');

      // Filter by tenant if provided
      if (tenantId) {
        queryBuilder.andWhere('invoice.tenantId = :tenantId', { tenantId });
      }

      // Filter by client if provided
      if (clientId) {
        queryBuilder.andWhere('invoice.clientId = :clientId', { clientId });
      }

      // Filter by agency through tenant or client
      queryBuilder.andWhere(
        '(tenant.agencyId = :agencyId OR client.agencyId = :agencyId)',
        { agencyId },
      );

      queryBuilder
        .skip(skip)
        .take(effectiveLimit)
        .orderBy('invoice.createdAt', 'DESC');

      const [invoices, total] = await queryBuilder.getManyAndCount();

      return new PaginatedResponse(invoices, total, page, effectiveLimit);
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
          const tax = updateInvoiceDto.tax !== undefined ? updateInvoiceDto.tax : invoice.tax;
          const total = subtotal + tax;

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

  private async generateInvoiceNumberInTransaction(manager: any): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Find the last invoice number for this month within transaction
    const lastInvoice = await manager
      .createQueryBuilder(Invoice, 'invoice')
      .where('invoice.invoiceNumber LIKE :prefix', {
        prefix: `INV-${year}${month}%`,
      })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
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
