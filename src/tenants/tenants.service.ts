import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { UserRole } from '../users/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentsService } from '../payments/payments.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ErrorHandler } from '../common/utils/error-handler';
import { FilterTenantDto } from './dto/filter-tenant.dto';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { BaseService } from '../common/services';

/** Who is asking, for the per-tenant routes that a `TENANT` may also reach. */
export interface Caller {
  userId: string;
  role: UserRole;
}

@Injectable()
export class TenantsService extends BaseService<Tenant> {
  constructor(
    @InjectRepository(Tenant)
    tenantRepository: Repository<Tenant>,
    private readonly paymentsService: PaymentsService,
  ) {
    super(tenantRepository);
  }

  protected getEntityName(): string {
    return 'Tenant';
  }

  // The lease-date check that used to live here is gone with the columns: the
  // terms are in `leases` now, and `CreateLeaseDto`/`LeasesService.activate`
  // own the ordering rule.
  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    try {
      return await this.baseCreate(createTenantDto);
    } catch (error) {
      ErrorHandler.handle(error, 'TenantsService.create');
    }
  }

  // Agency-scoped findAll (custom signature)
  async findAll(
    agencyId: string,
    filter: FilterTenantDto = {},
  ): Promise<PaginatedResponse<Tenant>> {
    try {
      const { page = 1, limit = 20, status, search, propertyId } = filter;

      // Enforce maximum limit
      const effectiveLimit = Math.min(limit, 100);
      const skip = (page - 1) * effectiveLimit;

      const query = this.repository
        .createQueryBuilder('tenant')
        .leftJoinAndSelect('tenant.property', 'property')
        .leftJoinAndSelect('tenant.user', 'user')
        .where('tenant.agencyId = :agencyId', { agencyId });

      if (status) {
        query.andWhere('tenant.status = :status', { status });
      }

      if (propertyId) {
        query.andWhere('tenant.propertyId = :propertyId', { propertyId });
      }

      if (search) {
        // Wildcards are escaped here so a search for "100%" is a literal search
        // rather than a match-everything one.
        const term = search.trim().replace(/[%_]/g, (c) => `\\${c}`);
        query.andWhere(
          `(tenant.firstName ILIKE :term OR tenant.lastName ILIKE :term
            OR tenant.email ILIKE :term
            OR (tenant.firstName || ' ' || tenant.lastName) ILIKE :term)`,
          { term: `%${term}%` },
        );
      }

      const [tenants, total] = await query
        .skip(skip)
        .take(effectiveLimit)
        .orderBy('tenant.createdAt', 'DESC')
        .getManyAndCount();

      return new PaginatedResponse(tenants, total, page, effectiveLimit);
    } catch (error) {
      ErrorHandler.handle(error, 'TenantsService.findAll');
    }
  }

  // Agency-scoped findOne (custom signature)
  async findOne(id: string, agencyId: string): Promise<Tenant> {
    try {
      const tenant = await this.repository.findOne({
        where: { id, agencyId },
        relations: ['property', 'user'],
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant with ID ${id} not found`);
      }

      return tenant;
    } catch (error) {
      ErrorHandler.handle(error, 'TenantsService.findOne');
    }
  }

  // Agency-scoped update (custom signature)
  async update(
    id: string,
    agencyId: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<Tenant> {
    try {
      const tenant = await this.findOne(id, agencyId);

      Object.assign(tenant, updateTenantDto);
      return await this.repository.save(tenant);
    } catch (error) {
      ErrorHandler.handle(error, 'TenantsService.update');
    }
  }

  // Agency-scoped remove (custom signature)
  async remove(id: string, agencyId: string): Promise<void> {
    try {
      const tenant = await this.findOne(id, agencyId);
      await this.repository.remove(tenant);
    } catch (error) {
      ErrorHandler.handle(error, 'TenantsService.remove');
    }
  }

  /**
   * Delegates to `PaymentsService` rather than querying the payment repository
   * here. This used to `find({ where: { tenantId } })` with no agency predicate:
   * the tenant was checked first, which is sound for a consistent database, but
   * it relied on a relation instead of the payment's own `agency_id`, and it
   * returned a bare array while every other list endpoint returns the
   * `PaginatedResponse` envelope the frontend pager needs.
   */
  /**
   * `caller` is required rather than optional, so a caller that forgets to pass
   * it fails the `if` below into a 403 instead of quietly skipping the check.
   *
   * The role list on the route includes `TENANT`, and agency scope alone is not
   * enough for a tenant: every tenant of an agency shares one `agencyId`, so
   * `GET /tenants/<another tenant id>/payments` used to return another
   * household's payments to any tenant in the same agency. Staff roles are
   * trusted to read any tenant of the agency; a tenant is only ever themselves.
   */
  async getPaymentHistory(
    tenantId: string,
    agencyId: string,
    page = 1,
    limit = 20,
    caller: Caller,
  ): Promise<PaginatedResponse<Payment>> {
    try {
      await this.assertTenantSelfOrStaff(tenantId, agencyId, caller);
      return await this.paymentsService.findByTenant(
        tenantId,
        agencyId,
        page,
        limit,
      );
    } catch (error) {
      ErrorHandler.handle(error, 'TenantsService.getPaymentHistory');
    }
  }

  /**
   * Every per-tenant route on this controller goes through here, so a new
   * `:id/...` route added later is in the same family.
   *
   * The role list on those routes includes `TENANT`, and agency scope alone is
   * not enough for a tenant: every tenant of an agency shares one `agencyId`, so
   * `GET /tenants/<another tenant id>/payments` used to hand one household's
   * payments to any tenant in the same agency. Staff may read any tenant of the
   * agency; a tenant is only ever themselves.
   *
   * 404 rather than 403, because a tenant has no business confirming that some
   * other tenant record exists in their agency.
   *
   * `caller` is required, not optional: an optional one would let a route that
   * forgets to pass it skip the check silently, which is the exact shape of bug
   * this is fixing. The compiler is the thing that makes that safe.
   */
  async assertTenantSelfOrStaff(
    tenantId: string,
    agencyId: string,
    caller: Caller,
  ): Promise<void> {
    if (caller.role !== UserRole.TENANT) {
      return;
    }

    const tenant = await this.findOne(tenantId, agencyId);

    if (tenant.userId !== caller.userId) {
      throw new NotFoundException(
        `Tenant with ID ${tenantId} not found in this agency`,
      );
    }
  }
}
