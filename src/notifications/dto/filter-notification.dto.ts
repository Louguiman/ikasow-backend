import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * `PaginationDto` rather than a bare `PaginationQueryDto`, so `page`/`limit` are
 * declared once and bounded (limit <= 100) for every caller.
 *
 * There is no `userId` here on purpose: the notifications table is keyed by
 * `user_id` and the identity comes from the token, so there is deliberately no
 * parameter with which to ask for somebody else's notifications.
 */
export class FilterNotificationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Only unread notifications (drives the bell badge)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unreadOnly?: boolean = false;
}
