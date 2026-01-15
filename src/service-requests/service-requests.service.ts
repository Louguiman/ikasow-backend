import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from './entities/service-request.entity';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
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
        const serviceRequest = manager.create(
          ServiceRequest,
          createServiceRequestDto,
        );
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
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<ServiceRequest>> {
    try {
      // Enforce maximum limit
      const effectiveLimit = Math.min(limit, 100);
      const skip = (page - 1) * effectiveLimit;

      const queryBuilder = this.repository
        .createQueryBuilder('serviceRequest')
        .leftJoinAndSelect('serviceRequest.tenant', 'tenant')
        .leftJoinAndSelect('serviceRequest.property', 'property');

      // Filter by agency through property relationship
      if (agencyId) {
        queryBuilder.andWhere('property.agencyId = :agencyId', { agencyId });
      }

      queryBuilder
        .skip(skip)
        .take(effectiveLimit)
        .orderBy('serviceRequest.createdAt', 'DESC');

      const [serviceRequests, total] = await queryBuilder.getManyAndCount();

      return new PaginatedResponse(serviceRequests, total, page, effectiveLimit);
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
