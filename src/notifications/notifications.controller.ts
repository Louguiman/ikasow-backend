import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { FilterNotificationDto } from './dto/filter-notification.dto';
import { Notification } from './entities/notification.entity';

/**
 * The user is taken from the token (`req.user.sub`, what `JwtStrategy.validate`
 * puts on the request and what `/users/profile` reads) and never from the body
 * or the query, so there is no route parameter that could reach another user's
 * notifications.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List the current user notifications, newest first',
    description:
      'Previously socket-only, so the bell could never show history. Reads are ' +
      'scoped to req.user.sub; the table is keyed by user_id and has no agency_id.',
  })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() filters: FilterNotificationDto, @Req() req: any) {
    return this.notificationsService.findAllForUser(req.user.sub, {
      page: filters.page,
      limit: filters.limit,
      unreadOnly: filters.unreadOnly,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number of unread notifications, for the bell badge' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async unreadCount(@Req() req: any) {
    return { count: await this.notificationsService.countUnread(req.user.sub) };
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark one notification as read',
    description:
      'Scoped on userId as well as id, so another user’s notification is a 404 ' +
      'rather than a silent success that would confirm the id exists.',
  })
  @ApiResponse({ status: 200, description: 'The updated notification' })
  @ApiResponse({ status: 404, description: 'Not found, or not this user’s' })
  markAsRead(@Param('id') id: string, @Req() req: any): Promise<Notification> {
    return this.notificationsService.markAsRead(id, req.user.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  @ApiResponse({ status: 200, description: 'How many were updated' })
  async markAllAsRead(@Req() req: any) {
    const updated = await this.notificationsService.markAllAsRead(req.user.sub);
    return { updated };
  }
}
