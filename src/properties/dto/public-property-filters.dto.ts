import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '../entities/property.entity';
import { Sanitize } from '../../common/decorators/sanitize.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * Query filters for the public property listing.
 *
 * Extends PaginationDto rather than redeclaring page/limit: the public portal used
 * to carry its own copy with a different default, which is how the two lists drifted
 * apart. The public routes are agency-scoped by the path, so there is deliberately
 * no agencyId here — a caller cannot ask for another agency's listings.
 */
export class PublicPropertyFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by property type',
    enum: PropertyType,
    example: PropertyType.APARTMENT,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Bamako',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Sanitize()
  city?: string;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 50000,
    minimum: 0,
    maximum: 100000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000000)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 150000,
    minimum: 0,
    maximum: 100000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000000)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum size filter (square meters)',
    example: 80,
    minimum: 0,
    maximum: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  minSize?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of rooms filter',
    example: 3,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minRooms?: number;

  @ApiPropertyOptional({
    description: 'Search query for property title, description or city',
    example: 'modern apartment',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Sanitize()
  search?: string;
}
