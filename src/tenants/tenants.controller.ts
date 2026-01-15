import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: 201,
    description: 'Tenant successfully created',
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
    @Body() createTenantDto: CreateTenantDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    // Override agencyId with the effective agency ID
    createTenantDto.agencyId = agencyId;
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all tenants with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of tenants',
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
    return this.tenantsService.findAll(agencyId, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.ACCOUNTANT, UserRole.TENANT)
  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the tenant details',
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
  findOne(@Param('id') id: string, @CurrentAgencyId() agencyId: string) {
    return this.tenantsService.findOne(id, agencyId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant successfully updated',
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
    description: 'Tenant not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.tenantsService.update(id, agencyId, updateTenantDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant successfully deleted',
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
  remove(@Param('id') id: string, @CurrentAgencyId() agencyId: string) {
    return this.tenantsService.remove(id, agencyId);
  }

  @Get(':id/payments')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.ACCOUNTANT, UserRole.TENANT)
  @ApiOperation({ summary: 'Get payment history for a tenant' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of payments for the tenant',
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
  getPaymentHistory(@Param('id') id: string, @CurrentAgencyId() agencyId: string) {
    return this.tenantsService.getPaymentHistory(id, agencyId);
  }
}

