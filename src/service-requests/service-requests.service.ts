import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from './entities/service-request.entity';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { FilterServiceRequestDto } from './dto/filter-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { ErrorHandler } from '../common/utils/error-handler';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { BaseService } from '../common/services';

@Injectable()
export class ServiceRequestsService extends BaseService<ServiceRequest> {
  constructor(
    @InjectRepository(ServiceRequest)
    serviceRequestRepository: Repository<ServiceRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {
    super(serviceRequestRepository);
  }

  protected getEntityName(): string {
    return 'ServiceRequest';
  }

  async create(
    createServiceRequestDto: CreateServiceRequestDto,
    agencyId: string,
  ): Promise<ServiceRequest> {
    try {
      // Use transaction to ensure service request and notifications are created atomically
      return await this.dataSource.transaction(async (manager) => {
        // Create and save service request within transaction
        // The DTO is spread first so the caller cannot override agencyId, which the
        // method receives from the request context. It was previously accepted and
        // then dropped, leaving service_requests.agency_id NULL and failing the
        // not-null constraint.
        const serviceRequest = manager.create(ServiceRequest, {
          ...createServiceRequestDto,
          agencyId,
        });
        const savedServiceRequest = await manager.save(serviceRequest);

        // Load the service request with relations for notification details
        const serviceRequestWithRelations = await manager
          .createQueryBuilder(ServiceRequest, 'serviceRequest')
          .leftJoinAndSelect('serviceRequest.tenant', 'tenant')
          .leftJoinAndSelect('serviceRequest.property', 'property')
          .where('serviceRequest.id = :id', { id: savedServiceRequest.id })
          .getOne();

        if (!serviceRequestWithRelations) {
          throw new NotFoundException('Service request not found after creation');
        }

        // Create notifications for agency staff (agents and admins)
        const agencyStaff = await this.usersService.findAgencyStaff(agencyId);

        if (agencyStaff.length > 0) {
          const notifications = agencyStaff.map((staff) => ({
            userId: staff.id,
            title: 'New Service Request',
            message: `A new service request has been submitted: ${serviceRequestWithRelations.title} at ${serviceRequestWithRelations.property.address}`,
            type: NotificationType.SERVICE_REQUEST,
          }));

          await this.notificationsService.createBulk(notifications);
        }

        return serviceRequestWithRelations;
      });
    } catch (error) {
      ErrorHandler.handle(error, 'ServiceRequestsService.create');
    }
  }

  async findAll(
    agencyId?: string,
    filter: FilterServiceRequestDto = {},
  ): Promise<PaginatedResponse<ServiceRequest>> {
    try {
      const { page = 1, limit = 20, status, priority, tenantId, propertyId } =
        filter;

      // Enforce maximum limit
      const effectiveLimit = Math.min(limit, 100);
      const skip = (page - 1) * effectiveLimit;

      const queryBuilder = this.repository
        .createQueryBuilder('serviceRequest')
        .leftJoinAndSelect('serviceRequest.tenant', 'tenant')
        .leftJoinAndSelect('serviceRequest.property', 'property');

      // Scope on the service request's own agency_id, not on the property's.
      // It used to go through `property.agencyId`, which silently dropped every
      // request whose property was missing and let a request inherit the scope of
      // whichever property happened to be attached. agency_id is NOT NULL.
      if (agencyId) {
        queryBuilder.andWhere('serviceRequest.agencyId = :agencyId', {
          agencyId,
        });
      }

      if (status) {
        queryBuilder.andWhere('serviceRequest.status = :status', { status });
      }

      if (priority) {
        queryBuilder.andWhere('serviceRequest.priority = :priority', {
          priority,
        });
      }

      if (tenantId) {
        queryBuilder.andWhere('serviceRequest.tenantId = :tenantId', {
          tenantId,
        });
      }

      if (propertyId) {
        queryBuilder.andWhere('serviceRequest.propertyId = :propertyId', {
          propertyId,
        });
      }

      const [serviceRequests, total] = await queryBuilder
        .skip(skip)
        .take(effectiveLimit)
        .orderBy('serviceRequest.createdAt', 'DESC')
        .getManyAndCount();

      return new PaginatedResponse(
        serviceRequests,
        total,
        page,
        effectiveLimit,
      );
    } catch (error) {
      ErrorHandler.handle(error, 'ServiceRequestsService.findAll');
    }
  }

  async findOne(id: string, agencyId?: string): Promise<ServiceRequest> {
    const queryBuilder = this.repository
      .createQueryBuilder('serviceRequest')
      .leftJoinAndSelect('serviceRequest.tenant', 'tenant')
      .leftJoinAndSelect('serviceRequest.property', 'property')
      .where('serviceRequest.id = :id', { id });

    // Filter by agency through property relationship
    if (agencyId) {
      queryBuilder.andWhere('property.agencyId = :agencyId', { agencyId });
    }

    const serviceRequest = await queryBuilder.getOne();

    if (!serviceRequest) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    return serviceRequest;
  }

  async update(
    id: string,
    updateServiceRequestDto: UpdateServiceRequestDto,
    agencyId?: string,
  ): Promise<ServiceRequest> {
    try {
      const serviceRequest = await this.findOne(id, agencyId);

      // Track completion timestamp when status changes to completed
      if (
        updateServiceRequestDto.status === ServiceRequestStatus.COMPLETED &&
        serviceRequest.status !== ServiceRequestStatus.COMPLETED
      ) {
        serviceRequest.completedAt = new Date();
      }

      Object.assign(serviceRequest, updateServiceRequestDto);
      return await this.repository.save(serviceRequest);
    } catch (error) {
      ErrorHandler.handle(error, 'ServiceRequestsService.update');
    }
  }

  async findByTenant(
    tenantId: string,
    agencyId?: string,
  ): Promise<ServiceRequest[]> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('serviceRequest')
        .leftJoinAndSelect('serviceRequest.tenant', 'tenant')
        .leftJoinAndSelect('serviceRequest.property', 'property')
        .where('serviceRequest.tenantId = :tenantId', { tenantId });

      // Filter by agency through property relationship
      if (agencyId) {
        queryBuilder.andWhere('property.agencyId = :agencyId', { agencyId });
      }

      queryBuilder.orderBy('serviceRequest.createdAt', 'DESC');

      return await queryBuilder.getMany();
    } catch (error) {
      ErrorHandler.handle(error, 'ServiceRequestsService.findByTenant');
    }
  }
}
