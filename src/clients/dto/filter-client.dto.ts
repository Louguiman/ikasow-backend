import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchFilterDto } from '../../common/dto/filter.dto';
import { ClientStatus } from '../entities/client.entity';

export class FilterClientDto extends SearchFilterDto {
  @ApiPropertyOptional({ enum: ClientStatus, description: 'Lifecycle status' })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
