import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '../../properties/entities/property.entity';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class MatchPropertiesDto {
  @ApiPropertyOptional({
    description: 'Property type to match',
    enum: PropertyType,
    example: PropertyType.APARTMENT,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({
    description: 'City to match',
    example: 'Bamako',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Sanitize()
  city?: string;

  @ApiPropertyOptional({
    description: 'Maximum price to match',
    example: 100000,
    minimum: 0,
    maximum: 100000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  @Type(() => Number)
  price?: number;
}
