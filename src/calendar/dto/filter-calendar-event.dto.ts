import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CalendarEventType } from '../entities/calendar-event.entity';

/**
 * The calendar view is a range: `from`/`to` bound `startsAt`. Extends
 * `PaginationDto` so a very busy month cannot return everything.
 *
 * No `agencyId`: the agency comes from the request context.
 */
export class FilterCalendarEventDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Only events starting on or after this instant (ISO)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Only events starting on or before this instant (ISO)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    enum: CalendarEventType,
    description: 'Kind of event',
  })
  @IsOptional()
  @IsEnum(CalendarEventType)
  eventType?: CalendarEventType;

  @ApiPropertyOptional({ description: 'Restrict to one property' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Restrict to one tenant' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
