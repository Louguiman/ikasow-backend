import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Lease, LeaseStatus } from './entities/lease.entity';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { FilterLeaseDto } from './dto/filter-lease.dto';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Property } from '../properties/entities/property.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * `leases` did not exist; the `Leases` page was a tenant list with lease columns
 * on it, which cannot express a renewal because a tenant has a single row.
 *
 * Scope comes from the lease's own `agency_id`. A tenant or property named in a
 * write is looked up with the agency in the same `where`, so another tenant's id
 * writes no row.
 */
@Injectable()
export class LeasesService {
  constructor(
    @InjectRepository(Lease)
    private readonly repository: Repository<Lease>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  /**
   * A lease is always created as a `draft`. Activating is a separate, deliberate
   * step, so an insert cannot arrive pre-activated — and the database's partial
   * unique index would otherwise answer a duplicate with a 500 rather than a
   * clear error.
   */
  async create(createLeaseDto: CreateLeaseDto, agencyId: string): Promise<Lease> {
    await this.assertTenantAndPropertyInAgency(
      createLeaseDto.tenantId,
      createLeaseDto.propertyId,
      agencyId,
    );

    const lease = this.repository.create({
      ...createLeaseDto,
      startDate: new Date(createLeaseDto.startDate),
      endDate: new Date(createLeaseDto.endDate),
      depositAmount: createLeaseDto.depositAmount ?? 0,
      agencyId,
      status: LeaseStatus.DRAFT,
    });

    return this.repository.save(lease);
  }

  async findAll(
    agencyId: string,
    filter: FilterLeaseDto = {},
  ): Promise<PaginatedResponse<Lease>> {
    const { page = 1, limit = 20, status, tenantId, propertyId, search } = filter;
    const effectiveLimit = Math.min(limit, 100);
    const skip = (page - 1) * effectiveLimit;

    const query = this.repository
      .createQueryBuilder('lease')
      .leftJoinAndSelect('lease.tenant', 'tenant')
      .leftJoinAndSelect('lease.property', 'property')
      .where('lease.agencyId = :agencyId', { agencyId });

    if (status) {
      query.andWhere('lease.status = :status', { status });
    }

    if (tenantId) {
      query.andWhere('lease.tenantId = :tenantId', { tenantId });
    }

    if (propertyId) {
      query.andWhere('lease.propertyId = :propertyId', { propertyId });
    }

    if (search) {
      // Escaped so a search for "100%" is a literal search.
      const term = search.trim().replace(/[%_]/g, (c) => `\\${c}`);
      query.andWhere(
        `(tenant.firstName ILIKE :term OR tenant.lastName ILIKE :term
          OR tenant.email ILIKE :term
          OR lease.notes ILIKE :term)`,
        { term: `%${term}%` },
      );
    }

    // Ordered by *property* name, never the column name: `orderBy('lease.end_date')`
    // leaves TypeORM with an alias it cannot resolve and it throws
    // `Cannot read properties of undefined (reading 'databaseName')` from inside
    // `createOrderByCombinedWithSelectExpression` — a 500 on the whole list page.
    // `lease.endDate` is the property; `end_date` is the column.
    const [leases, total] = await query
      .orderBy('lease.endDate', 'DESC')
      .addOrderBy('lease.createdAt', 'DESC')
      .skip(skip)
      .take(effectiveLimit)
      .getManyAndCount();

    return new PaginatedResponse(leases, total, page, effectiveLimit);
  }

  async findOne(id: string, agencyId: string): Promise<Lease> {
    const lease = await this.repository.findOne({
      where: { id, agencyId },
      relations: ['tenant', 'property'],
    });

    if (!lease) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    return lease;
  }

  /**
   * A tenant's lease history, newest term first. Used by `GET /tenants/:id/leases`
   * and by the tenant detail page.
   */
  async findByTenant(
    tenantId: string,
    agencyId: string,
  ): Promise<Lease[]> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId, agencyId },
      select: ['id'],
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with ID ${tenantId} not found in this agency`,
      );
    }

    return this.repository.find({
      where: { tenantId, agencyId },
      relations: ['property'],
      order: { startDate: 'DESC' },
    });
  }

  /** The lease in force for a tenant, or null when it has none. */
  async findCurrentForTenant(
    tenantId: string,
    agencyId: string,
  ): Promise<Lease | null> {
    return this.repository.findOne({
      where: { tenantId, agencyId, status: LeaseStatus.ACTIVE },
      relations: ['property', 'tenant'],
    });
  }

  async update(
    id: string,
    agencyId: string,
    updateLeaseDto: UpdateLeaseDto,
  ): Promise<Lease> {
    await this.findOne(id, agencyId);

    if (updateLeaseDto.tenantId || updateLeaseDto.propertyId) {
      await this.assertTenantAndPropertyInAgency(
        updateLeaseDto.tenantId,
        updateLeaseDto.propertyId,
        agencyId,
      );
    }

    // `status` is not on the DTO at all — `forbidNonWhitelisted` rejects it with
    // a 400, which is the point. Only `agencyId` is silently dropped, because a
    // body that names one is accepted and must not be able to retarget the row.
    const { agencyId: _ignoredAgency, ...rest } = updateLeaseDto;

    const safe: Partial<Lease> = { ...rest } as Partial<Lease>;
    if (rest.startDate) {
      safe.startDate = new Date(rest.startDate);
    }
    if (rest.endDate) {
      safe.endDate = new Date(rest.endDate);
    }

    await this.repository.update({ id, agencyId }, safe);

    return this.findOne(id, agencyId);
  }

  /**
   * Puts a signed lease into force.
   *
   * Refuses if the tenant already has an active lease — the database would reject
   * it too, but as a unique-violation 500, and the caller deserves to know which
   * lease is in the way. Refuses if the end date is already past, because
   * "active" on an elapsed term is a state nothing downstream can act on.
   */
  async activate(id: string, agencyId: string): Promise<Lease> {
    const lease = await this.findOne(id, agencyId);

    if (lease.status !== LeaseStatus.DRAFT) {
      throw new BadRequestException(
        `Only a draft lease can be activated; this one is ${lease.status}`,
      );
    }

    if (new Date(lease.endDate) < this.today()) {
      throw new BadRequestException(
        'A lease whose end date has passed cannot be activated',
      );
    }

    const existing = await this.repository.findOne({
      where: { tenantId: lease.tenantId, agencyId, status: LeaseStatus.ACTIVE },
    });

    if (existing) {
      throw new ConflictException(
        'This tenant already has an active lease; terminate it before activating another',
      );
    }

    await this.repository.update({ id, agencyId }, { status: LeaseStatus.ACTIVE });

    return this.findOne(id, agencyId);
  }

  /**
   * Ends a lease early. Only a lease in force can be terminated: closing out a
   * draft, or re-terminating one already over, would rewrite a decision that was
   * already recorded.
   */
  async terminate(id: string, agencyId: string): Promise<Lease> {
    const lease = await this.findOne(id, agencyId);

    if (lease.status !== LeaseStatus.ACTIVE) {
      throw new BadRequestException(
        `Only an active lease can be terminated; this one is ${lease.status}`,
      );
    }

    await this.repository.update(
      { id, agencyId },
      { status: LeaseStatus.TERMINATED },
    );

    return this.findOne(id, agencyId);
  }

  /**
   * Marks leases that ran to term as `expired`. Idempotent and driven by the
   * caller, not a scheduler: there is no cron in this app.
   *
   * **The end date is part of the criteria, not just the status.** Matching every
   * `active` lease would sweep up a lease signed yesterday for a term ending next
   * year, so the sweep would un-let properties whose contract has not run out. It
   * also means the status is only as fresh as the last call: nothing derives
   * `expired` on read, so a lease left `active` past its end date reads as
   * `active` until somebody calls this.
   */
  async expirePastLeases(agencyId: string): Promise<number> {
    // `endDate` is the property; `end_date` is the column.
    const { affected } = await this.repository.update(
      {
        agencyId,
        status: LeaseStatus.ACTIVE,
        endDate: LessThanOrEqual(this.today()),
      },
      { status: LeaseStatus.EXPIRED },
    );
    return affected ?? 0;
  }

  async remove(id: string, agencyId: string): Promise<void> {
    const lease = await this.findOne(id, agencyId);

    if (lease.status === LeaseStatus.ACTIVE) {
      // Deleting a lease in force would silently un-let a property while the
      // tenant record keeps claiming they live there.
      throw new BadRequestException(
        'A lease in force cannot be deleted; terminate it first',
      );
    }

    await this.repository.delete({ id, agencyId });
  }

  private today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private async assertTenantAndPropertyInAgency(
    tenantId: string | undefined,
    propertyId: string | undefined,
    agencyId: string,
  ): Promise<void> {
    if (tenantId) {
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

    if (propertyId) {
      const property = await this.propertyRepository.findOne({
        where: { id: propertyId, agencyId },
        select: ['id'],
      });
      if (!property) {
        throw new NotFoundException(
          `Property with ID ${propertyId} not found in this agency`,
        );
      }
    }
  }
}
