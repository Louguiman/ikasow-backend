import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipAgencyScope } from '../auth/decorators/skip-agency-scope.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('agencies')
@ApiBearerAuth()
@Controller('agencies')
@SkipAgencyScope()
@Roles(UserRole.PLATFORM_ADMIN)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new agency (Platform Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Agency successfully created',
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
    description: 'Forbidden - Platform Admin role required',
  })
  @ApiResponse({
    status: 409,
    description: 'Agency with this email or subdomain already exists',
  })
  create(@Body() createAgencyDto: CreateAgencyDto) {
    return this.agenciesService.create(createAgencyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all agencies with pagination and filters (Platform Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of agencies',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Platform Admin role required',
  })
  findAll(
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.agenciesService.findAll(isActive, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agency by ID (Platform Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the agency details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Platform Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Agency not found',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenciesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agency (Platform Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Agency successfully updated',
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
    description: 'Forbidden - Platform Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Agency not found',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAgencyDto: UpdateAgencyDto,
  ) {
    return this.agenciesService.update(id, updateAgencyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an agency (Platform Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Agency successfully deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Platform Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Agency not found',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenciesService.remove(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate an agency (Platform Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Agency successfully activated',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Platform Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Agency not found',
  })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenciesService.activate(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate an agency (Platform Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Agency successfully deactivated',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Platform Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Agency not found',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenciesService.deactivate(id);
  }
}
