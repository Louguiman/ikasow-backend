import { IsEmail, IsNotEmpty, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body of `PATCH /users/profile` — the self-service profile update.
 *
 * This is intentionally NOT `UpdateUserDto`. `UpdateUserDto` is
 * `PartialType(CreateUserDto)` and therefore also carries `role`, `agencyId` and
 * `isActive`; the profile route accepted it unfiltered, so any authenticated user
 * could PATCH themselves into `role: 'platform-admin'` (or move themselves into
 * another agency) and the `RolesGuard` / `AgencyScopeGuard` would honour it.
 *
 * Because the global `ValidationPipe` runs with `forbidNonWhitelisted: true`,
 * posting `role` to the profile route is now a 400 rather than a silent promotion.
 * Role, agency membership and activation are managed by an agency admin through
 * `PATCH /users/:id`, which is role-guarded and checks the role hierarchy.
 */
export class UpdateProfileDto {
  @ApiProperty({ example: 'john.doe@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'newpassword123', minLength: 8, required: false })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  lastName?: string;
}
