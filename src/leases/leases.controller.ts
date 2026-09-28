import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { FilterLeaseDto } from './dto/filter-lease.dto';
import { Lease } from './entities/lease.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

@ApiTags('leases')
@ApiBearerAuth()
@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Sign a lease, as a draft',
    description:
      'Created as `draft`; the status is not settable here so a lease enters force ' +
      'only through POST /leases/:id/activate.',
  })
  @ApiResponse({ status: 201, description: 'The created lease' })
  @ApiResponse({
    status: 404,
    description: 'The tenant or property is not in this agency',
  })
  create(
    @Body() createLeaseDto: CreateLeaseDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Lease> {
    return this.leasesService.create(createLeaseDto, agencyId);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.AGENT)
  @ApiOperation({ summary: 'List this agency leases' })
  @ApiResponse({ status: 200, description: 'Paginated leases' })
  findAll(
    @Query() filters: FilterLeaseDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<PaginatedResponse<Lease>> {
    return this.leasesService.findAll(agencyId, filters);
  }

  @Get('expire')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Mark leases that ran to term as expired',
    description:
      'Idempotent, and not a scheduler: a lease past its end date reads as ' +
      '`expired` in the list whether or not this has been called.',
  })
  @ApiResponse({ status: 200, description: 'How many were updated' })
  async expire(@CurrentAgencyId() agencyId: string) {
    return { updated: await this.leasesService.expirePastLeases(agencyId) };
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.AGENT)
  @ApiOperation({ summary: 'Get one lease of this agency' })
  @ApiResponse({ status: 200, description: 'The lease' })
  @ApiResponse({ status: 404, description: 'Not found, or another agency’s' })
  findOne(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Lease> {
    return this.leasesService.findOne(id, agencyId);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Edit a lease’s terms',
    description: '`status` in the body is ignored; use activate or terminate.',
  })
  @ApiResponse({ status: 200, description: 'The updated lease' })
  update(
    @Param('id') id: string,
    @Body() updateLeaseDto: UpdateLeaseDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Lease> {
    return this.leasesService.update(id, agencyId, updateLeaseDto);
  }

  @Patch(':id/activate')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Put a signed lease into force',
    description:
      'Draft only. Refused with a 409 when the tenant already has an active ' +
      'lease, and with a 400 when the end date has already passed.',
  })
  @ApiResponse({ status: 200, description: 'The activated lease' })
  activate(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Lease> {
    return this.leasesService.activate(id, agencyId);
  }

  @Patch(':id/terminate')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'End a lease early',
    description: 'Active only, so an already closed lease is not rewritten.',
  })
  @ApiResponse({ status: 200, description: 'The terminated lease' })
  terminate(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Lease> {
    return this.leasesService.terminate(id, agencyId);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a lease',
    description: 'Refused with a 400 while the lease is in force.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<void> {
    return this.leasesService.remove(id, agencyId);
  }
}
