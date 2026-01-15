import {
  IsDateString,
  IsOptional,
  IsUUID,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceItemDto } from './invoice-item.dto';
import { InvoiceStatus } from '../entities/invoice.entity';
import { IsDateBefore } from '../../common/validators';

export class CreateInvoiceDto {
  @ApiPropertyOptional({
    description: 'Tenant ID if invoice is for a tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Client ID if invoice is for a client',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({
    description: 'Invoice issue date (ISO 8601 format)',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  @IsDateBefore('dueDate', {
    message: 'Invoice issue date must be before due date',
  })
  issueDate: string;

  @ApiProperty({
    description: 'Invoice due date (ISO 8601 format)',
    example: '2024-02-15T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({
    description: 'Invoice status',
    enum: InvoiceStatus,
    example: InvoiceStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Tax percentage (0-100)',
    example: 18,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tax?: number;

  @ApiPropertyOptional({
    description: 'Additional notes for the invoice',
    example: 'Payment due by end of month',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    description: 'Invoice line items',
    type: [InvoiceItemDto],
    minItems: 1,
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
