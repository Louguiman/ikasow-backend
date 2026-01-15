import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ServiceRequestsService } from './service-requests.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';

@ApiTags('service-requests')
@ApiBearerAuth()
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) { }

  @Post()
  @Roles(UserRole.TENANT, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Create a new service request' })
  @ApiResponse({
    status: 201,
    description: 'Service request successfully created',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  create(
    @Body() createServiceRequestDto: CreateServiceRequestDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.serviceRequestsService.create(
      createServiceRequestDto,
      agencyId,
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Get all service requests with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of service requests',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  findAll(
    @CurrentAgencyId() agencyId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.serviceRequestsService.findAll(agencyId, page || 1, limit || 10);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.TENANT)
  @ApiOperation({ summary: 'Get a service request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the service request details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or cross-agency access',
  })
  @ApiResponse({
    status: 404,
    description: 'Service request not found',
  })
  findOne(@Param('id') id: string, @CurrentAgencyId() agencyId: string) {
    return this.serviceRequestsService.findOne(id, agencyId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Update a service request' })
  @ApiResponse({
    status: 200,
    description: 'Service request successfully updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or cross-agency access',
  })
  @ApiResponse({
    status: 404,
    description: 'Service request not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateServiceRequestDto: UpdateServiceRequestDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.serviceRequestsService.update(
      id,
      updateServiceRequestDto,
      agencyId,
    );
  }

  @Get('tenant/:tenantId')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.TENANT)
  @ApiOperation({ summary: 'Get all service requests for a tenant' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of service requests for the tenant',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or cross-agency access',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  findByTenant(
    @Param('tenantId') tenantId: string,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.serviceRequestsService.findByTenant(tenantId, agencyId);
  }
}

