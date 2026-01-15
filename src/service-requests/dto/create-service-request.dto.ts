import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceRequestStatus,
  ServiceRequestPriority,
} from '../entities/service-request.entity';

export class CreateServiceRequestDto {
  @ApiProperty({
    description: 'Tenant ID who is making the request',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  tenantId: string;

  @ApiProperty({
    description: 'Property ID where the service is needed',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    description: 'Service request title',
    example: 'Leaking faucet in bathroom',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the service request',
    example: 'The bathroom faucet has been leaking for 2 days',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: 'Service request status',
    enum: ServiceRequestStatus,
    example: ServiceRequestStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @ApiPropertyOptional({
    description: 'Service request priority',
    enum: ServiceRequestPriority,
    example: ServiceRequestPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(ServiceRequestPriority)
  priority?: ServiceRequestPriority;
}
