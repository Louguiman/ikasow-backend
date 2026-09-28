import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { LeasesService } from '../leases/leases.service';
import { FilterTenantDto } from './dto/filter-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly leasesService: LeasesService,
  ) {}

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
    @Query() filter: FilterTenantDto,
  ) {
    return this.tenantsService.findAll(agencyId, filter);
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
    description: 'Tenant not found, or another tenant of the same agency',
  })
  getPaymentHistory(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
    @Query() pagination: PaginationDto,
    @Req() req: any,
  ) {
    return this.tenantsService.getPaymentHistory(
      id,
      agencyId,
      pagination.page,
      pagination.limit,
      { userId: req.user.sub, role: req.user.role },
    );
  }

  /**
   * The tenant's contracts, newest term first. This is the history the four
   * dropped `tenants` columns could not express: one row per signed lease, so a
   * renewal adds a lease rather than overwriting the last one.
   */
  @Get(':id/leases')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.ACCOUNTANT, UserRole.TENANT)
  @ApiOperation({ summary: "Get the tenant's lease history" })
  @ApiResponse({ status: 200, description: 'Leases, newest term first' })
  @ApiResponse({ status: 404, description: 'Tenant not found in this agency' })
  getLeaseHistory(@Param('id') id: string, @Req() req: any) {
    return this.withSelfCheck(id, req, (agencyId) =>
      this.leasesService.findByTenant(id, agencyId),
    );
  }

  /**
   * The lease in force for this tenant, or `null`. Separate from the history
   * because the forms need "the one that is running" and a 200 with an empty
   * array is not the same answer as "no contract at all".
   */
  @Get(':id/leases/current')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.ACCOUNTANT, UserRole.TENANT)
  @ApiOperation({ summary: "Get the tenant's lease in force, or null" })
  @ApiResponse({ status: 200, description: 'The active lease, or null' })
  @ApiResponse({ status: 404, description: 'Tenant not found in this agency' })
  getCurrentLease(@Param('id') id: string, @Req() req: any) {
    return this.withSelfCheck(id, req, async (agencyId) => {
      const lease = await this.leasesService.findCurrentForTenant(id, agencyId);
      return lease ?? null;
    });
  }

  /**
   * Runs the shared "a tenant may only read itself" check, then the route's own
   * work. The check lives in `TenantsService.assertTenantSelfOrStaff` because it
   * has to hit the database; this only sequences it so the lease service does not
   * have to repeat it.
   */
  private async withSelfCheck<T>(
    tenantId: string,
    req: any,
    work: (agencyId: string) => Promise<T>,
  ): Promise<T> {
    const agencyId = req.agencyId;
    await this.tenantsService.assertTenantSelfOrStaff(tenantId, agencyId, {
      userId: req.user.sub,
      role: req.user.role,
    });
    return work(agencyId);
  }
}

