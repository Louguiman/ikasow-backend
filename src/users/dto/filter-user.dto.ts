import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AgencyFilterDto } from '../../common/dto/filter.dto';
import { UserRole } from '../entities/user.entity';

/**
 * `agencyId` and `search` come from `AgencyFilterDto`; only `role` is added here.
 */
export class FilterUserDto extends AgencyFilterDto {
  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
