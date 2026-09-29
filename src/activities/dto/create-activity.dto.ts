import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '../entities/activity.entity';

/**
 * `userId` is not a field: the activity is attributed to the caller from the
 * request context, so nobody can log an interaction as themselves while naming
 * a colleague.
 */
export class CreateActivityDto {
  @ApiProperty({
    description: 'Client the interaction is with (must be in the agency)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({
    description: 'Related property, when the interaction is about one',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({ enum: ActivityType, description: 'Kind of interaction' })
  @IsNotEmpty()
  @IsEnum(ActivityType)
  type: ActivityType;

  @ApiPropertyOptional({
    description: 'When it happened (ISO); defaults to now',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: 'Free-form notes about the interaction',
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  notes: string;
}
