import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * There was no service for `payments` at all — only the entity — so nothing could
 * record or read a payment and the frontend's `PaymentForm` had no endpoint to
 * call.
 *
 * Scope comes from the entity's own `agency_id` column, never through a relation.
 * Every read and every write filters on it, so a payment belonging to another
 * tenant is a 404 rather than a row from the wrong agency.
 */
@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly repository: Repository<Payment>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  /**
   * Records a payment for a tenant of the caller's agency.
   *
   * The tenant is looked up with the agency in the same `where`, so naming another
   * agency's tenant writes no row rather than writing one that belongs to somebody
   * else. The invoice link is checked the same way when it is supplied.
   */
  async create(
    createPaymentDto: CreatePaymentDto,
    agencyId: string,
  ): Promise<Payment> {
    await this.assertTenantBelongsToAgency(
      createPaymentDto.tenantId,
      agencyId,
    );

    if (createPaymentDto.invoiceId) {
      await this.assertInvoiceBelongsToAgency(
        createPaymentDto.invoiceId,
        agencyId,
      );
    }

    // Computed rather than accepted: `status` is a default, not something a
    // client may set to `paid` on the way in. Settling goes through mark-paid so
    // the transition happens in exactly one place.
    const payment = this.repository.create({
      ...createPaymentDto,
      // The DTO types `paymentDate` as a string (IsDateString) because that is
      // what has to be validated; the column is a `date`, so it is converted here
      // rather than left for Postgres to reinterpret.
      paymentDate: new Date(createPaymentDto.paymentDate),
      agencyId,
      status: PaymentStatus.PENDING,
    });

    return this.repository.save(payment);
  }

  async findAll(
    agencyId: string,
    filter: FilterPaymentDto = {},
  ): Promise<PaginatedResponse<Payment>> {
    const {
      page = 1,
      limit = 20,
      status,
      tenantId,
      invoiceId,
      paymentMethod,
      fromDate,
      toDate,
      search,
    } = filter;

    const effectiveLimit = Math.min(limit, 100);
    const skip = (page - 1) * effectiveLimit;

    const query = this.repository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.tenant', 'tenant')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .where('payment.agencyId = :agencyId', { agencyId });

    if (status) {
      query.andWhere('payment.status = :status', { status });
    }

    if (tenantId) {
      query.andWhere('payment.tenantId = :tenantId', { tenantId });
    }

    if (invoiceId) {
      query.andWhere('payment.invoiceId = :invoiceId', { invoiceId });
    }

    if (paymentMethod) {
      query.andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod,
      });
    }

    if (fromDate) {
      query.andWhere('payment.paymentDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('payment.paymentDate <= :toDate', { toDate });
    }

    if (search) {
      // Escaped so a search for "100%" is a literal search rather than a
      // match-everything one.
      const term = search.trim().replace(/[%_]/g, (c) => `\\${c}`);
      query.andWhere(
        `(payment.reference ILIKE :term OR payment.notes ILIKE :term)`,
        { term: `%${term}%` },
      );
    }

    const [payments, total] = await query
      .orderBy('payment.paymentDate', 'DESC')
      .addOrderBy('payment.createdAt', 'DESC')
      .skip(skip)
      .take(effectiveLimit)
      .getManyAndCount();

    return new PaginatedResponse(payments, total, page, effectiveLimit);
  }

  /**
   * A tenant's payment history, for `GET /tenants/:id/payments`.
   *
   * The tenant is resolved with the agency in the same lookup, so a payment list
   * for another agency's tenant is a 404 and not an empty 200.
   */
  async findByTenant(
    tenantId: string,
    agencyId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Payment>> {
    await this.assertTenantBelongsToAgency(tenantId, agencyId);

    return this.findAll(agencyId, { page, limit, tenantId });
  }

  async findOne(id: string, agencyId: string): Promise<Payment> {
    const payment = await this.repository.findOne({
      where: { id, agencyId },
      relations: ['tenant', 'invoice'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(
    id: string,
    agencyId: string,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<Payment> {
    // Loads scoped to the agency first, so a PATCH for another tenant's payment
    // is a 404 before anything is written.
    await this.findOne(id, agencyId);

    if (updatePaymentDto.tenantId) {
      await this.assertTenantBelongsToAgency(
        updatePaymentDto.tenantId,
        agencyId,
      );
    }

    if (updatePaymentDto.invoiceId) {
      await this.assertInvoiceBelongsToAgency(
        updatePaymentDto.invoiceId,
        agencyId,
      );
    }

    // `status` is dropped from the body: settling is `mark-paid`, and cancelling
    // is a separate decision. Letting a PATCH flip the status would put the
    // transition in two places.
    const { status: _ignoredStatus, agencyId: _ignoredAgency, ...rest } =
      updatePaymentDto;

    // Built field by field rather than cast: `paymentDate` is a string in the DTO
    // and a `Date` on the entity, so a plain `Partial<Payment>` annotation would
    // have to be asserted away.
    const safe: Partial<Payment> = { ...rest } as Partial<Payment>;
    if (rest.paymentDate) {
      safe.paymentDate = new Date(rest.paymentDate);
    }

    await this.repository.update({ id, agencyId }, safe);

    return this.findOne(id, agencyId);
  }

  /**
   * Settles a payment. Idempotent, and a cancelled payment cannot be settled —
   * that is a mistake worth surfacing rather than silently reversing.
   */
  async markAsPaid(id: string, agencyId: string): Promise<Payment> {
    const payment = await this.findOne(id, agencyId);

    if (payment.status === PaymentStatus.CANCELLED) {
      throw new BadRequestException(
        'A cancelled payment cannot be marked as paid',
      );
    }

    if (payment.status === PaymentStatus.PAID) {
      return payment;
    }

    await this.repository.update({ id, agencyId }, { status: PaymentStatus.PAID });

    return this.findOne(id, agencyId);
  }

  async remove(id: string, agencyId: string): Promise<void> {
    await this.findOne(id, agencyId);
    await this.repository.delete({ id, agencyId });
  }

  /**
   * Totals per status for the current page of filters, minus the filters that
   * select a single row. The dashboard's payment tiles read this, so they cannot
   * be computed from one page of the list.
   */
  async getSummary(
    agencyId: string,
    filter: FilterPaymentDto = {},
  ): Promise<{ pending: string; paid: string; cancelled: string }> {
    const { tenantId, invoiceId, paymentMethod, fromDate, toDate, search } = filter;

    const base = this.repository
      .createQueryBuilder('payment')
      .select('payment.status', 'status')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.agencyId = :agencyId', { agencyId });

    if (tenantId) {
      base.andWhere('payment.tenantId = :tenantId', { tenantId });
    }
    if (invoiceId) {
      base.andWhere('payment.invoiceId = :invoiceId', { invoiceId });
    }
    if (paymentMethod) {
      base.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod });
    }
    if (fromDate) {
      base.andWhere('payment.paymentDate >= :fromDate', { fromDate });
    }
    if (toDate) {
      base.andWhere('payment.paymentDate <= :toDate', { toDate });
    }
    if (search) {
      const term = search.trim().replace(/[%_]/g, (c) => `\\${c}`);
      base.andWhere(
        `(payment.reference ILIKE :term OR payment.notes ILIKE :term)`,
        { term: `%${term}%` },
      );
    }

    // `status` is deliberately not a predicate here: the point is to total every
    // status for the same slice.
    const rows = await base.groupBy('payment.status').getRawMany<{
      status: PaymentStatus;
      total: string;
    }>();

    // Only the three real statuses. "overdue" is not one of them — it is
    // `pending` combined with a date, which is what `findOverdue` computes.
    const zero = { pending: '0', paid: '0', cancelled: '0' };
    const summary = { ...zero };

    for (const row of rows) {
      if (row.status in summary) {
        summary[row.status as keyof typeof summary] = row.total ?? '0';
      }
    }

    return summary;
  }

  /**
   * Tenants of this agency with a `pending` payment older than `days`. Backs the
   * `payment-overdue` notification type, which has existed in the enum since the
   * notifications table was created and had nothing to report on before.
   */
  async findOverdue(
    agencyId: string,
    days = 30,
  ): Promise<Array<{ tenantId: string; amount: string; paymentDate: string }>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.repository
      .createQueryBuilder('payment')
      .select('payment.tenantId', 'tenantId')
      .addSelect('SUM(payment.amount)', 'amount')
      .addSelect('MIN(payment.paymentDate)', 'paymentDate')
      .where('payment.agencyId = :agencyId', { agencyId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.paymentDate < :cutoff', { cutoff })
      .groupBy('payment.tenantId')
      .having('SUM(payment.amount) > 0')
      .getRawMany();
  }

  /** Total received, used by the dashboard and by the tenant balance. */
  async getTotalPaid(agencyId: string, tenantId?: string): Promise<string> {
    const qb = this.repository
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('payment.agencyId = :agencyId', { agencyId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PAID });

    if (tenantId) {
      qb.andWhere('payment.tenantId = :tenantId', { tenantId });
    }

    const row = await qb.getRawOne<{ total: string }>();
    return row?.total ?? '0';
  }

  /** Invoice ids already settled by a payment, for the invoice list's status column. */
  async getSettledInvoiceIds(
    agencyId: string,
    invoiceIds: string[],
  ): Promise<string[]> {
    if (invoiceIds.length === 0) {
      return [];
    }

    const rows = await this.repository
      .createQueryBuilder('payment')
      .select('DISTINCT payment.invoiceId', 'invoiceId')
      .where('payment.agencyId = :agencyId', { agencyId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PAID })
      .andWhere('payment.invoiceId IN (:...invoiceIds)', { invoiceIds })
      .getRawMany<{ invoiceId: string }>();

    return rows.map((row) => row.invoiceId);
  }

  private async assertTenantBelongsToAgency(
    tenantId: string,
    agencyId: string,
  ): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId, agencyId },
      select: ['id'],
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with ID ${tenantId} not found in this agency`,
      );
    }
  }

  private async assertInvoiceBelongsToAgency(
    invoiceId: string,
    agencyId: string,
  ): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, agencyId },
      select: ['id'],
    });

    if (!invoice) {
      throw new NotFoundException(
        `Invoice with ID ${invoiceId} not found in this agency`,
      );
    }
  }
}
