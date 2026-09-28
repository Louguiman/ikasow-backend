import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentFrequency, TenantStatus } from '../entities/tenant.entity';

export class CreateTenantDto {
  @ApiPropertyOptional({
    description:
      'Agency that manages the tenant. Ignored when present: the controller always ' +
      'overwrites it with the caller\'s agency from the request context. Required here ' +
      'before, which meant a tenant could not be created from the UI at all unless the ' +
      'caller already knew the agency UUID.',
  })
  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @ApiPropertyOptional({
    description: 'User ID if tenant has a user account',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'Property ID that the tenant is renting',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsNotEmpty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    description: 'Tenant first name',
    example: 'John',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Tenant last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Tenant email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Tenant phone number',
    example: '+223 70 12 34 56',
    minLength: 5,
    maxLength: 20,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  phone: string;

  // leaseStartDate / leaseEndDate / monthlyRent / depositAmount are no longer
  // accepted here. They moved to `leases` (1764366900000); a tenant row cannot
  // hold a renewal, and the `Leases` page used to be a tenant list precisely
  // because of it. `whitelist` + `forbidNonWhitelisted` now answer 400 for a
  // body that still sends them, rather than silently dropping them.
  // paymentFrequency stays on the tenant: it says how the tenant is billed,
  // which the invoice flow reads directly.

  @ApiProperty({
    description: 'Payment frequency',
    enum: PaymentFrequency,
    example: PaymentFrequency.MONTHLY,
  })
  @IsNotEmpty()
  @IsEnum(PaymentFrequency)
  paymentFrequency: PaymentFrequency;

  @ApiPropertyOptional({
    description: 'Lifecycle status of the tenancy',
    enum: TenantStatus,
    example: TenantStatus.ACTIVE,
    default: TenantStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
