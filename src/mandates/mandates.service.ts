import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Mandate, MandateStatus } from './entities/mandate.entity';
import { CreateMandateDto } from './dto/create-mandate.dto';
import { UpdateMandateDto } from './dto/update-mandate.dto';
import { FilterMandateDto } from './dto/filter-mandate.dto';
import { Property } from '../properties/entities/property.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * The `mandates` table existed with an entity and DTOs but no module, so no
 * route could read or write it. This adds the lifecycle the enums already
 * promised and scopes every read and write from the mandate's own `agency_id`
 * — never through `property.agencyId`.
 */
@Injectable()
export class MandatesService {
  constructor(
    @InjectRepository(Mandate)
    private readonly repository: Repository<Mandate>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  /**
   * A mandate is always created `active`. There is no field on the DTO to ask
   * for another state, and the transitions run through `cancel` and the expiry
   * sweep so the rule lives in one place.
   */
  async create(
    createMandateDto: CreateMandateDto,
    agencyId: string,
  ): Promise<Mandate> {
    await this.assertPropertyInAgency(createMandateDto.propertyId, agencyId);

    const mandate = this.repository.create({
      ...createMandateDto,
      startDate: new Date(createMandateDto.startDate),
      endDate: new Date(createMandateDto.endDate),
      agencyId,
      status: MandateStatus.ACTIVE,
    });

    return this.repository.save(mandate);
  }

  async findAll(
    agencyId: string,
    filter: FilterMandateDto = {},
  ): Promise<PaginatedResponse<Mandate>> {
    const { page = 1, limit = 20, status, type, propertyId } = filter;
    const effectiveLimit = Math.min(limit, 100);
    const skip = (page - 1) * effectiveLimit;

    const query = this.repository
      .createQueryBuilder('mandate')
      .leftJoinAndSelect('mandate.property', 'property')
      .where('mandate.agencyId = :agencyId', { agencyId });

    if (status) {
      query.andWhere('mandate.status = :status', { status });
    }

    if (type) {
      query.andWhere('mandate.type = :type', { type });
    }

    if (propertyId) {
      query.andWhere('mandate.propertyId = :propertyId', { propertyId });
    }

    // Order by *property* name, never column name: `orderBy('mandate.end_date')`
    // leaves TypeORM with an alias it cannot resolve (see the leases module).
    const [mandates, total] = await query
      .orderBy('mandate.endDate', 'DESC')
      .addOrderBy('mandate.createdAt', 'DESC')
      .skip(skip)
      .take(effectiveLimit)
      .getManyAndCount();

    return new PaginatedResponse(mandates, total, page, effectiveLimit);
  }

  async findOne(id: string, agencyId: string): Promise<Mandate> {
    const mandate = await this.repository.findOne({
      where: { id, agencyId },
      relations: ['property'],
    });

    if (!mandate) {
      throw new NotFoundException(`Mandate with ID ${id} not found`);
    }

    return mandate;
  }

  async update(
    id: string,
    agencyId: string,
    updateMandateDto: UpdateMandateDto,
  ): Promise<Mandate> {
    await this.findOne(id, agencyId);

    if (updateMandateDto.propertyId) {
      await this.assertPropertyInAgency(updateMandateDto.propertyId, agencyId);
    }

    // `status` is not on the DTO at all — `forbidNonWhitelisted` rejects it,
    // and `agencyId` cannot appear either; the `where` clause keeps the row in
    // this agency.
    const safe: Partial<Mandate> = { ...updateMandateDto } as Partial<Mandate>;
    if (updateMandateDto.startDate) {
      safe.startDate = new Date(updateMandateDto.startDate);
    }
    if (updateMandateDto.endDate) {
      safe.endDate = new Date(updateMandateDto.endDate);
    }

    await this.repository.update({ id, agencyId }, safe);

    return this.findOne(id, agencyId);
  }

  /**
   * Ends a mandate early. Only one in force can be cancelled: cancelling a
   * mandate already over, or one never signed, would rewrite a decision that
   * was already recorded.
   */
  async cancel(id: string, agencyId: string): Promise<Mandate> {
    const mandate = await this.findOne(id, agencyId);

    if (mandate.status !== MandateStatus.ACTIVE) {
      throw new BadRequestException(
        `Only an active mandate can be cancelled; this one is ${mandate.status}`,
      );
    }

    await this.repository.update(
      { id, agencyId },
      { status: MandateStatus.CANCELLED },
    );

    return this.findOne(id, agencyId);
  }

  /**
   * Marks mandates that ran to term as `expired`. Idempotent and driven by the
   * caller, not a scheduler. The end date is part of the criteria, not just the
   * status: matching every `active` mandate would expire a mandate signed
   * yesterday for a term ending next year.
   */
  async expirePastMandates(agencyId: string): Promise<number> {
    // `endDate` is the property; `end_date` is the column.
    const { affected } = await this.repository.update(
      {
        agencyId,
        status: MandateStatus.ACTIVE,
        endDate: LessThanOrEqual(this.today()),
      },
      { status: MandateStatus.EXPIRED },
    );
    return affected ?? 0;
  }

  async remove(id: string, agencyId: string): Promise<void> {
    const mandate = await this.findOne(id, agencyId);

    if (mandate.status === MandateStatus.ACTIVE) {
      // Deleting a mandate in force would silently un-mandate a property while
      // the contract claims the agency represents it.
      throw new BadRequestException(
        'A mandate in force cannot be deleted; cancel it first',
      );
    }

    await this.repository.delete({ id, agencyId });
  }

  private today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private async assertPropertyInAgency(
    propertyId: string,
    agencyId: string,
  ): Promise<void> {
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
