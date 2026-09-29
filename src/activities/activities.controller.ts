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
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { FilterActivityDto } from './dto/filter-activity.dto';
import { Activity } from './entities/activity.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

/**
 * The activity is attributed to the caller (`req.user.id`), never to a
 * body-supplied user. Clients are staff-only, so the whole module is
 * `ADMIN, AGENT`.
 */
@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Log an interaction with a client' })
  @ApiResponse({ status: 201, description: 'The created activity' })
  @ApiResponse({
    status: 404,
    description: 'The client or property is not in this agency',
  })
  create(
    @Body() createActivityDto: CreateActivityDto,
    @CurrentAgencyId() agencyId: string,
    @CurrentUser() user: { id: string },
  ): Promise<Activity> {
    return this.activitiesService.create(createActivityDto, agencyId, user.id);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'List this agency activities' })
  @ApiResponse({ status: 200, description: 'Paginated activities' })
  findAll(
    @Query() filters: FilterActivityDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<PaginatedResponse<Activity>> {
    return this.activitiesService.findAll(agencyId, filters);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Get one activity of this agency' })
  @ApiResponse({ status: 200, description: 'The activity' })
  @ApiResponse({ status: 404, description: 'Not found, or another agency’s' })
  findOne(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Activity> {
    return this.activitiesService.findOne(id, agencyId);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Edit an activity',
    description: 'Attribution (`userId`) cannot be changed.',
  })
  @ApiResponse({ status: 200, description: 'The updated activity' })
  update(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<Activity> {
    return this.activitiesService.update(id, agencyId, updateActivityDto);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an activity' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<void> {
    return this.activitiesService.remove(id, agencyId);
  }
}
