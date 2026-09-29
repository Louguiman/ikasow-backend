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
import { MandatesService } from './mandates.service';
import { CreateMandateDto } from './dto/create-mandate.dto';
import { UpdateMandateDto } from './dto/update-mandate.dto';
import { FilterMandateDto } from './dto/filter-mandate.dto';
import { Mandate } from './entities/mandate.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * Reads admit the accountant, writes do not — the same split as `leases`, since
 * a mandate is a contract like a lease.
 */
@ApiTags('mandates')
@ApiBearerAuth()
@Controller('mandates')
export class MandatesController {
  constructor(private readonly mandatesService: MandatesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Sign a mandate',
    description:
      'Created `active`; the status is not settable here and the only way out ' +
      'is through PATCH /mandates/:id/cancel or the expiry sweep.',
  })
  @ApiResponse({ status: 201, description: 'The created mandate' })
  @ApiResponse({
    status: 404,
    description: 'The property is not in this agency',
  })
  create(
    @Body() createMandateDto: CreateMandateDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Mandate> {
    return this.mandatesService.create(createMandateDto, agencyId);
  }

  @Get()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.AGENT,
  )
  @ApiOperation({ summary: 'List this agency mandates' })
  @ApiResponse({ status: 200, description: 'Paginated mandates' })
  findAll(
    @Query() filters: FilterMandateDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<PaginatedResponse<Mandate>> {
    return this.mandatesService.findAll(agencyId, filters);
  }

  @Get('expire')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Mark mandates that ran to term as expired',
    description:
      'Idempotent, and not a scheduler: a mandate past its end date reads as ' +
      '`expired` whether or not this has been called.',
  })
  @ApiResponse({ status: 200, description: 'How many were updated' })
  async expire(
    @CurrentAgencyId() agencyId: string,
  ): Promise<{ updated: number }> {
    return { updated: await this.mandatesService.expirePastMandates(agencyId) };
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.AGENT,
  )
  @ApiOperation({ summary: 'Get one mandate of this agency' })
  @ApiResponse({ status: 200, description: 'The mandate' })
  @ApiResponse({ status: 404, description: 'Not found, or another agency’s' })
  findOne(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Mandate> {
    return this.mandatesService.findOne(id, agencyId);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Edit a mandate’s terms',
    description: '`status` in the body is rejected; use cancel.',
  })
  @ApiResponse({ status: 200, description: 'The updated mandate' })
  update(
    @Param('id') id: string,
    @Body() updateMandateDto: UpdateMandateDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Mandate> {
    return this.mandatesService.update(id, agencyId, updateMandateDto);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'End a mandate early',
    description: 'Active only, so an already closed mandate is not rewritten.',
  })
  @ApiResponse({ status: 200, description: 'The cancelled mandate' })
  cancel(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Mandate> {
    return this.mandatesService.cancel(id, agencyId);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a mandate',
    description: 'Refused with a 400 while the mandate is in force.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<void> {
    return this.mandatesService.remove(id, agencyId);
  }
}
