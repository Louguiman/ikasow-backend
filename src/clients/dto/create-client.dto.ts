import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
  ValidateIf,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    description: 'Agency ID that the client belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  agencyId: string;

  @ApiPropertyOptional({
    description: 'User ID if client has a user account',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'Client first name',
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
    description: 'Client last name',
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
    description: 'Client email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Client phone number',
    example: '+223 70 12 34 56',
    minLength: 5,
    maxLength: 20,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({
    description: 'Preferred property types',
    example: ['APARTMENT', 'HOUSE'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredPropertyType?: string[];

  @ApiPropertyOptional({
    description: 'Preferred locations/cities',
    example: ['Bamako', 'Sikasso'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocation?: string[];

  @ApiPropertyOptional({
    description: 'Minimum budget',
    example: 50000,
    minimum: 0,
    maximum: 100000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  budgetMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum budget',
    example: 150000,
    minimum: 0,
    maximum: 100000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  @ValidateIf((o) => o.budgetMin !== undefined && o.budgetMax !== undefined)
  budgetMax?: number;

  @ApiPropertyOptional({
    description: 'Additional notes about the client',
    example: 'Looking for a property near schools',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
