import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ActivityType } from '../entities/activity.entity';

/**
 * The back-end of a calendar-adjacent view: filter by client, type, or a date
 * range. No `agencyId`: the agency comes from the request context.
 */
export class FilterActivityDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Restrict to one client' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    enum: ActivityType,
    description: 'Kind of interaction',
  })
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @ApiPropertyOptional({
    description: 'Only interactions on or after this date (ISO)',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Only interactions on or before this date (ISO)',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Free text over the notes',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
