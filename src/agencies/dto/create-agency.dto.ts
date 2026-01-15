import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgencyDto {
  @ApiProperty({
    description: 'Agency name',
    example: 'ImmoMali Real Estate',
    minLength: 2,
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Agency email address',
    example: 'contact@immomali.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Agency phone number',
    example: '+223 20 22 33 44',
    minLength: 5,
    maxLength: 20,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  phone: string;

  @ApiProperty({
    description: 'Agency physical address',
    example: '123 Avenue de la Liberté',
    minLength: 5,
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address: string;

  @ApiProperty({
    description: 'City where agency is located',
    example: 'Bamako',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
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
  postalCode: string;

  @ApiPropertyOptional({
    description: 'Agency website URL',
    example: 'https://www.immomali.com',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({
    description: 'Agency logo URL or path',
    example: '/uploads/logos/agency-logo.png',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  @ApiPropertyOptional({
    description: 'Subdomain for agency public portal',
    example: 'immomali',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  subdomain?: string;

  @ApiPropertyOptional({
    description: 'Primary brand color',
    example: '#1a2b4b',
  })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Secondary brand color',
    example: '#c5a059',
  })
  @IsOptional()
  @IsString()
  secondaryColor?: string;
}
