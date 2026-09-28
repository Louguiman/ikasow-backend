import { IsEnum, IsOptional, IsUUID, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { LeaseStatus } from '../entities/lease.entity';

/**
 * Extends `PaginationDto` rather than `SearchFilterDto`: a lease has no name, so
 * `search` matches the tenant's name and the notes here.
 *
 * No `agencyId`: the agency comes from the request context.
 */
export class FilterLeaseDto extends PaginationDto {
  @ApiPropertyOptional({ enum: LeaseStatus, description: 'Lifecycle status' })
  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @ApiPropertyOptional({ description: 'Restrict to one tenant' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Restrict to one property' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'Free text over the tenant name, email and lease notes',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
