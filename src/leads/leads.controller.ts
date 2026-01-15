import {
  Controller,
  Get,
  Post,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) { }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Get all leads for the current agency' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of leads',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  findAll(
    @Query() query: PaginationQueryDto,
    @CurrentAgencyId() agencyId: string,
  ) {
    return this.leadsService.findAll(
      agencyId,
      query.page || 1,
      query.limit || 10,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Get a lead by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the lead details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or cross-agency access',
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
  })
  findOne(@Param('id') id: string, @CurrentAgencyId() agencyId: string) {
    return this.leadsService.findOne(id, agencyId);
  }

  @Post(':id/convert-to-client')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Convert a lead to a client' })
  @ApiResponse({
    status: 201,
    description: 'Lead converted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Lead already converted or invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
  })
  convertToClient(@Param('id') id: string, @CurrentAgencyId() agencyId: string) {
    return this.leadsService.convertToClient(id, agencyId);
  }
}
