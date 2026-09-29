import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MandateStatus, MandateType } from '../entities/mandate.entity';

/**
 * No `agencyId`: the agency comes from the request context.
 */
export class FilterMandateDto extends PaginationDto {
  @ApiPropertyOptional({ enum: MandateStatus, description: 'Lifecycle status' })
  @IsOptional()
  @IsEnum(MandateStatus)
  status?: MandateStatus;

  @ApiPropertyOptional({ enum: MandateType, description: 'Kind of mandate' })
  @IsOptional()
  @IsEnum(MandateType)
  type?: MandateType;

  @ApiPropertyOptional({ description: 'Restrict to one property' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}
