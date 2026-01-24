import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType, PropertyOperation } from '../entities/property.entity';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreatePropertyDto {
  @ApiProperty({
    description: 'Agency ID that owns the property',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  agencyId: string;

  @ApiProperty({
    description: 'Property title',
    example: 'Beautiful 3-bedroom apartment in Bamako',
    minLength: 5,
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @Sanitize()
  title: string;

  @ApiProperty({
    description: 'Detailed property description',
    example:
      'Spacious apartment with modern amenities, close to schools and shopping centers',
    minLength: 20,
    maxLength: 5000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  @Sanitize()
  description: string;

  @ApiProperty({
    description: 'Property type',
    enum: PropertyType,
    example: PropertyType.APARTMENT,
  })
  @IsNotEmpty()
  @IsEnum(PropertyType)
  type: PropertyType;

  @ApiProperty({
    description: 'Property operation type',
    enum: PropertyOperation,
    example: PropertyOperation.SALE,
  })
  @IsNotEmpty()
  @IsEnum(PropertyOperation)
  operationType: PropertyOperation;

  @ApiProperty({
    description: 'Property address',
    example: '123 Avenue de la Liberté',
    minLength: 5,
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  @Sanitize()
  address: string;

  @ApiProperty({
    description: 'City where property is located',
    example: 'Bamako',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Sanitize()
  city: string;

  @ApiProperty({
    description: 'Postal code',
    example: 'BP 1234',
    minLength: 3,
    maxLength: 20,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Sanitize()
  postalCode: string;

  @ApiProperty({
    description: 'Property price',
    example: 75000,
    minimum: 0,
    maximum: 100000000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  price: number;

  @ApiProperty({
    description: 'Property size in square meters',
    example: 120,
    minimum: 1,
    maximum: 100000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(100000)
  size: number;

  @ApiProperty({
    description: 'Total number of rooms',
    example: 5,
    minimum: 1,
    maximum: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(100)
  rooms: number;

  @ApiProperty({
    description: 'Number of bedrooms',
    example: 3,
    minimum: 0,
    maximum: 50,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(50)
  bedrooms: number;

  @ApiProperty({
    description: 'Number of bathrooms',
    example: 2,
    minimum: 0,
    maximum: 50,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(50)
  bathrooms: number;

  @ApiPropertyOptional({
    description: 'SEO title for property listing',
    example: '3BR Apartment in Bamako - Modern & Spacious',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Sanitize()
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO description for property listing',
    example:
      'Find your dream home in this beautiful 3-bedroom apartment located in the heart of Bamako',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Sanitize()
  seoDescription?: string;

  @ApiPropertyOptional({
    description: 'SEO keywords for property listing',
    example: ['apartment', 'bamako', '3 bedroom', 'modern'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  seoKeywords?: string[];
}
