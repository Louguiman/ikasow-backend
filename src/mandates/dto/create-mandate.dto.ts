import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MandateType } from '../entities/mandate.entity';
import { IsDateBefore } from '../../common/validators';

/**
 * `status` is deliberately absent: a mandate is created `active` and only moves
 * through `PATCH /mandates/:id/cancel` and the expiry sweep, so the transition
 * is validated in one place.
 */
export class CreateMandateDto {
  @ApiProperty({
    description: 'Property ID for the mandate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    description: 'Type of mandate',
    enum: MandateType,
    example: MandateType.RENTAL,
  })
  @IsNotEmpty()
  @IsEnum(MandateType)
  type: MandateType;

  @ApiProperty({
    description: 'Mandate start date (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  @IsDateBefore('endDate', {
    message: 'Mandate start date must be before end date',
  })
  startDate: string;

  @ApiProperty({
    description: 'Mandate end date (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Commission percentage (0-100)',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage: number;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Exclusive mandate for 6 months',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
