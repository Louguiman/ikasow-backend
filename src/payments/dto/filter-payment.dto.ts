import { IsEnum, IsOptional, IsUUID, IsDateString, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaymentMethod, PaymentStatus } from '../entities/payment.entity';

/**
 * Extends `PaginationDto` rather than `SearchFilterDto`: that base is documented
 * as searching *a person's* name and email, and a payment row has neither. Here
 * `search` covers the free-text fields it does have.
 *
 * A single declared filter DTO rather than a scatter of `@Query('x')` params, so
 * `forbidNonWhitelisted` rejects a typo (`?statuss=paid`) as a 400 instead of
 * silently returning an unfiltered list.
 *
 * There is no `agencyId` here: the agency comes from the request context.
 */
export class FilterPaymentDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Settlement status' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Restrict to one tenant' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Restrict to one invoice' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payments on or after this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Payments on or before this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Free text over the payment reference and notes',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
