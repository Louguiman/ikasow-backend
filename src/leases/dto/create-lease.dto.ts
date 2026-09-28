import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateAfter } from '../../common/validators';

/**
 * `agencyId` is accepted so that sending it is not a 400, and is then
 * overwritten by the controller from the request context — the same pattern
 * `CreatePaymentDto` and `CreateTenantDto` document.
 *
 * `status` is **not** accepted on create: a lease is signed as a `draft` and
 * activated deliberately, so an insert cannot arrive pre-activated. The partial
 * unique index would reject a second `active` lease for the same tenant anyway,
 * but the failure would be a 500 from Postgres rather than a clear 400.
 */
export class CreateLeaseDto {
  @ApiPropertyOptional({
    description:
      'Ignored when present: the controller always overwrites it with the ' +
      "caller's agency from the request context.",
  })
  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsNotEmpty()
  @IsUUID()
  tenantId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174003' })
  @IsNotEmpty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Must be after `startDate`; also enforced by a CHECK constraint.',
  })
  @IsDateString()
  // `IsDateAfter('startDate')`, not `IsDateBefore`: the decorator compares the
  // decorated field against the named one, so on `endDate` the requirement is
  // that it comes *after* the start.
  @IsDateAfter('startDate', {
    message: 'lease end date must be after lease start date',
  })
  endDate: string;

  @ApiProperty({ example: 750 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'monthlyRent must not be negative' })
  @Max(99999999.99)
  monthlyRent: number;

  @ApiPropertyOptional({ example: 750, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'depositAmount must not be negative' })
  @Max(99999999.99)
  depositAmount?: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
