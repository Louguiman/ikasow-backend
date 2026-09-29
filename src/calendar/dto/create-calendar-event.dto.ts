import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarEventType } from '../entities/calendar-event.entity';

/**
 * `endsAt` after `startsAt` is enforced by `CHK_calendar_events_date_order` in
 * the database, so a partial update cannot slip through a validator.
 */
export class CreateCalendarEventDto {
  @ApiProperty({ description: 'Event title', example: 'Visite T3 Bastide' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    enum: CalendarEventType,
    description: 'Kind of event',
    example: CalendarEventType.VIEWING,
  })
  @IsNotEmpty()
  @IsEnum(CalendarEventType)
  eventType: CalendarEventType;

  @ApiProperty({
    description: 'Start of the event (ISO 8601)',
    example: '2026-10-05T14:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional({
    description: 'End of the event (ISO 8601); optional for tasks',
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({
    description: 'All-day event, above the start timestamp',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({
    description: 'Related property (must be in the agency)',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'Related tenant (must be in the agency)',
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Free-form notes',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
