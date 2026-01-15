import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({
    description: 'Item description',
    example: 'Monthly rent for January 2024',
    minLength: 3,
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'Quantity of items',
    example: 1,
    minimum: 0.01,
    maximum: 10000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Max(10000)
  quantity: number;

  @ApiProperty({
    description: 'Unit price per item',
    example: 50000,
    minimum: 0,
    maximum: 100000000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  unitPrice: number;
}
