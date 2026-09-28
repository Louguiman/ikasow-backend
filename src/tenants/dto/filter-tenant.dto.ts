import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchFilterDto } from '../../common/dto/filter.dto';
import { TenantStatus } from '../entities/tenant.entity';

export class FilterTenantDto extends SearchFilterDto {
  @ApiPropertyOptional({ enum: TenantStatus, description: 'Lifecycle status' })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ description: 'Restrict to one property' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}
