import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentFrequency } from '../entities/tenant.entity';
import { IsDateBefore } from '../../common/validators';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Agency ID that manages the tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  agencyId: string;

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

  @ApiProperty({
    description: 'Lease start date (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  @IsDateBefore('leaseEndDate', {
    message: 'Lease start date must be before lease end date',
  })
  leaseStartDate: string;

  @ApiProperty({
    description: 'Lease end date (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsNotEmpty()
  @IsDateString()
  leaseEndDate: string;

  @ApiProperty({
    description: 'Monthly rent amount',
    example: 50000,
    minimum: 0,
    maximum: 100000000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  monthlyRent: number;

  @ApiProperty({
    description: 'Security deposit amount',
    example: 100000,
    minimum: 0,
    maximum: 100000000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  depositAmount: number;

  @ApiProperty({
    description: 'Payment frequency',
    enum: PaymentFrequency,
    example: PaymentFrequency.MONTHLY,
  })
  @IsNotEmpty()
  @IsEnum(PaymentFrequency)
  paymentFrequency: PaymentFrequency;
}
