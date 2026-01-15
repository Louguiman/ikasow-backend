import {
  IsUUID,
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreateLeadDto {
  @ApiProperty({
    description: 'Property ID that the lead is interested in',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    description: 'Lead first name',
    example: 'John',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Sanitize()
  firstName: string;

  @ApiProperty({
    description: 'Lead last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Sanitize()
  lastName: string;

  @ApiProperty({
    description: 'Lead email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Lead phone number',
    example: '+223 70 12 34 56',
    minLength: 5,
    maxLength: 20,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^[\d\s\+\-\(\)]+$/, {
    message: 'Phone number must contain only digits, spaces, +, -, (, )',
  })
  phone: string;

  @ApiProperty({
    description: 'Message from the lead',
    example: 'I am interested in viewing this property',
    minLength: 10,
    maxLength: 1000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @Sanitize()
  message: string;
}
