import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsNotEmpty,
  Min,
  MaxLength,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '../entities/payment.entity';

/**
 * Neither `agencyId` nor a `tenantId` other than the body's is trusted: the
 * controller takes the agency from `@CurrentAgencyId()` and the tenant has to
 * belong to it. `agencyId` is accepted only so that sending it is not a 400, and
 * it is overwritten — the pattern `CreateTenantDto` already documents.
 */
export class CreatePaymentDto {
  @ApiPropertyOptional({
    description:
      'Ignored when present: the controller always overwrites it with the ' +
      "caller's agency from the request context.",
  })
  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @ApiProperty({
    description: 'Tenant the payment is for',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsNotEmpty()
  @IsUUID()
  tenantId: string;

  @ApiPropertyOptional({
    description: 'Invoice this payment settles. Optional: rent can be paid without one.',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiProperty({
    description: 'Amount received, in the agency currency',
    example: 750.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'amount must be greater than 0' })
  // numeric(10,2) tops out at 99,999,999.99; sending more is a 400 from the DTO
  // rather than a Postgres error at insert time.
  @Max(99999999.99)
  amount: number;

  @ApiProperty({
    description: 'Date the payment was made (YYYY-MM-DD)',
    example: '2026-01-31',
  })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({
    enum: PaymentMethod,
    description:
      'Enum value, not the display label: the legacy form posted ' +
      "'Virement bancaire', which is not a PaymentMethod.",
    example: PaymentMethod.BANK_TRANSFER,
  })
  @IsEnum(PaymentMethod, {
    message: `paymentMethod must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Settlement status. Defaults to pending; use mark-paid to settle.',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Bank or receipt reference', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional({ description: 'Free-form note', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
