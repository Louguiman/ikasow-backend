import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

/**
 * Notifications are per **user**, not per agency: the table has `user_id` and no
 * `agency_id`. Every read and every read-receipt is therefore filtered on
 * `userId`, which comes from the token, never from a query parameter — otherwise
 * one user could list another's notifications by guessing an id.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create(
      createNotificationDto,
    );
    return await this.notificationRepository.save(notification);
  }

  async createBulk(
    createNotificationDtos: CreateNotificationDto[],
    manager?: EntityManager,
  ): Promise<Notification[]> {
    // When a manager is supplied (the service-request create path), the rows are
    // written inside that transaction. Otherwise they used an independent
    // connection/call, so a notification could commit while the service request
    // they describe rolled back.
    const repository = manager
      ? manager.getRepository(Notification)
      : this.notificationRepository;
    const notifications = repository.create(createNotificationDtos);
    return await repository.save(notifications);
  }

  /**
   * Newest first. `unreadOnly` exists for the bell's badge, which only ever
   * needs the unread count, and it is applied in the query rather than by
   * filtering in JS so `total` stays meaningful.
   */
  async findAllForUser(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ): Promise<{ data: Notification[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId });

    if (options.unreadOnly) {
      qb.andWhere('notification.is_read = false');
    }

    const [data, total] = await qb
      .orderBy('notification.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Marks one notification read. Scoped on `userId` as well as `id`, so a
   * request for somebody else's notification is a 404 rather than a silent
   * success — otherwise the endpoint would confirm ids exist.
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Already read: return it untouched so `readAt` keeps the original moment
    // instead of moving every time the bell is opened.
    if (notification.isRead) {
      return notification;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const { affected } = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return affected ?? 0;
  }
}
