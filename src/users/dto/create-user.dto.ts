import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  @IsOptional()
  agencyId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
