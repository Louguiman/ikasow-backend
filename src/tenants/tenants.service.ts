import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ErrorHandler } from '../common/utils/error-handler';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { BaseService } from '../common/services';

@Injectable()
export class TenantsService extends BaseService<Tenant> {
  constructor(
    @InjectRepository(Tenant)
    tenantRepository: Repository<Tenant>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {
    super(tenantRepository);
  }

  protected getEntityName(): string {
    return 'Tenant';
  }

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    try {
      // Validate lease dates
      const startDate = new Date(createTenantDto.leaseStartDate);
      const endDate = new Date(createTenantDto.leaseEndDate);

      if (endDate <= startDate) {
        throw new BadRequestException(
          'Lease end date must be after lease start date',
        );
      }

      return await this.baseCreate(createTenantDto);
    } catch (error) {
      ErrorHandler.handle(error, 'TenantsService.create');
    }
  }

  // Agency-scoped findAll (custom signature)
  async findAll(
    agencyId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<Tenant>> {
    try {
      // Enforce maximum limit
      const effectiveLimit = Math.min(limit, 100);
      const skip = (page - 1) * effectiveLimit;

      const [tenants, total] = await this.repository.findAndCount({
        where: { agencyId },
        relations: ['property', 'user'],
        skip,
        take: effectiveLimit,
        order: { createdAt: 'DESC' },
      });

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

  // Agency-scoped update with lease date validation (custom signature)
  async update(
    id: string,
    agencyId: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<Tenant> {
    try {
      const tenant = await this.findOne(id, agencyId);

      // Validate lease dates if both are provided
      if (updateTenantDto.leaseStartDate && updateTenantDto.leaseEndDate) {
        const startDate = new Date(updateTenantDto.leaseStartDate);
        const endDate = new Date(updateTenantDto.leaseEndDate);

        if (endDate <= startDate) {
          throw new BadRequestException(
            'Lease end date must be after lease start date',
          );
        }
      }

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

  calculateNextPaymentDueDate(tenant: Tenant): Date {
    const startDate = new Date(tenant.leaseStartDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDueDate = new Date(startDate);

    // Calculate the next due date based on payment frequency
    this.advanceDateByFrequency(nextDueDate, today, tenant.paymentFrequency);

    return nextDueDate;
  }

  private advanceDateByFrequency(
    date: Date,
    targetDate: Date,
    frequency: string,
  ): void {
    switch (frequency) {
      case 'monthly':
        this.advanceMonthly(date, targetDate);
        break;
      case 'quarterly':
        this.advanceQuarterly(date, targetDate);
        break;
      case 'yearly':
        this.advanceYearly(date, targetDate);
        break;
    }
  }

  private advanceMonthly(date: Date, targetDate: Date): void {
    while (date <= targetDate) {
      date.setMonth(date.getMonth() + 1);
    }
  }

  private advanceQuarterly(date: Date, targetDate: Date): void {
    while (date <= targetDate) {
      date.setMonth(date.getMonth() + 3);
    }
  }

  private advanceYearly(date: Date, targetDate: Date): void {
    while (date <= targetDate) {
      date.setFullYear(date.getFullYear() + 1);
    }
  }

  async getPaymentHistory(
    tenantId: string,
    agencyId: string,
  ): Promise<Payment[]> {
    try {
      // Verify tenant exists and belongs to agency
      await this.findOne(tenantId, agencyId);

      return await this.paymentRepository.find({
        where: { tenantId },
        order: { paymentDate: 'DESC' },
      });
    } catch (error) {
      ErrorHandler.handle(error, 'TenantsService.getPaymentHistory');
    }
  }
}
