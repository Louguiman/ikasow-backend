import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body of the public `POST /auth/register` endpoint.
 *
 * `role` is deliberately absent. This endpoint is `@Public()`, so any field it
 * accepts is attacker-controlled: a caller could previously post
 * `role: 'platform-admin'` and receive an account that bypasses both the
 * `RolesGuard` and the `AgencyScopeGuard` agency check. New public registrations
 * are always created as `UserRole.TENANT` by `AuthService.register`; granting any
 * other role is an authenticated, agency-scoped operation (`POST /users`).
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@immomali.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description:
      'Agency the tenant is registering with. Optional: the public portal is ' +
      'expected to resolve the agency from the subdomain instead. Must reference ' +
      'an existing, active agency when supplied.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  agencyId?: string;
}
