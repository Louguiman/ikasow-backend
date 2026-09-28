import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';

/**
 * Free-text search over a person's name and email.
 *
 * Kept as its own base because "search a person" recurs on clients, tenants and
 * users, and the previous DTOs all declared it slightly differently.
 */
export class SearchFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

/**
 * `agencyId` as a *filter* is not the same thing as the agency scope.
 *
 * `@CurrentAgencyId()` is what confines a request to one agency, and it is applied
 * on top of whatever this filter says. Honouring this for a caller who is not a
 * platform admin would let any agency admin list another agency's users, so
 * `UsersController.findAll` rejects it for everyone else.
 */
export class AgencyFilterDto extends SearchFilterDto {
  @ApiPropertyOptional({
    description:
      'Platform admin only. Every other caller is already confined to its own ' +
      'agency by @CurrentAgencyId() and gets a 403 if it passes this.',
  })
  @IsOptional()
  @IsUUID()
  agencyId?: string;
}
