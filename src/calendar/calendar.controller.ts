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
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { FilterCalendarEventDto } from './dto/filter-calendar-event.dto';
import { CalendarEvent } from './entities/calendar-event.entity';
import { CurrentAgencyId } from '../common/decorators/current-agency-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Create a calendar event' })
  @ApiResponse({ status: 201, description: 'The created event' })
  @ApiResponse({
    status: 404,
    description: 'The property or tenant is not in this agency',
  })
  create(
    @Body() createCalendarEventDto: CreateCalendarEventDto,
    @CurrentAgencyId() agencyId: string,
    @CurrentUser() user: { id: string },
  ): Promise<CalendarEvent> {
    return this.calendarService.create(
      createCalendarEventDto,
      agencyId,
      user.id,
    );
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'List this agency calendar events',
    description: 'Filter by `from`/`to` to get a slice of the calendar.',
  })
  @ApiResponse({ status: 200, description: 'Paginated events' })
  findAll(
    @Query() filters: FilterCalendarEventDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<PaginatedResponse<CalendarEvent>> {
    return this.calendarService.findAll(agencyId, filters);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Get one event of this agency' })
  @ApiResponse({ status: 200, description: 'The event' })
  @ApiResponse({ status: 404, description: 'Not found, or another agency’s' })
  findOne(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<CalendarEvent> {
    return this.calendarService.findOne(id, agencyId);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Edit an event',
    description: 'Attribution (`created_by`) cannot be changed.',
  })
  @ApiResponse({ status: 200, description: 'The updated event' })
  update(
    @Param('id') id: string,
    @Body() updateCalendarEventDto: UpdateCalendarEventDto,
    @CurrentAgencyId() agencyId: string,
  ): Promise<CalendarEvent> {
    return this.calendarService.update(id, agencyId, updateCalendarEventDto);
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.AGENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(
    @Param('id') id: string,
    @CurrentAgencyId() agencyId: string,
  ): Promise<void> {
    return this.calendarService.remove(id, agencyId);
  }
}
