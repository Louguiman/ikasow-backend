import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: Record<string, jest.Mock>;

  const ME = 'user-me';
  const SOMEONE_ELSE = 'user-other';

  // The query builder is stubbed as a chainable object; `where`/`andWhere` return
  // `this` so the calls can be asserted, and the terminal methods resolve.
  const qb: Record<string, jest.Mock> = {};

  beforeEach(async () => {
    qb.where = jest.fn().mockReturnThis();
    qb.andWhere = jest.fn().mockReturnThis();
    qb.orderBy = jest.fn().mockReturnThis();
    qb.skip = jest.fn().mockReturnThis();
    qb.take = jest.fn().mockReturnThis();
    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

    repo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => ({ id: 'notif-1', ...entity })),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
      createQueryBuilder: jest.fn(() => qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllForUser', () => {
    it('scopes the query to the user from the token', async () => {
      await service.findAllForUser(ME);

      expect(qb.where).toHaveBeenCalledWith('notification.user_id = :userId', {
        userId: ME,
      });
    });

    it('never puts userId in the ordering or the skip', async () => {
      await service.findAllForUser(ME, { page: 3, limit: 10 });

      expect(qb.orderBy).toHaveBeenCalledWith(
        'notification.created_at',
        'DESC',
      );
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('filters unread in the query, not in JS', async () => {
      await service.findAllForUser(ME, { unreadOnly: true });

      expect(qb.andWhere).toHaveBeenCalledWith('notification.is_read = false');
    });

    it('does not filter on is_read unless asked', async () => {
      await service.findAllForUser(ME);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('computes totalPages from the real total', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 45]);

      const result = await service.findAllForUser(ME, { limit: 20 });

      expect(result).toEqual({
        data: [],
        total: 45,
        page: 1,
        limit: 20,
        totalPages: 3,
      });
    });

    it('reports one page when there is nothing to show', async () => {
      const result = await service.findAllForUser(ME);

      // Math.ceil(0/20) is 0; a pager rendering "page 1 of 0" is worse than "of 1".
      expect(result.totalPages).toBe(1);
    });
  });

  describe('countUnread', () => {
    it('counts only the caller unread rows', async () => {
      repo.count.mockResolvedValue(4);

      const result = await service.countUnread(ME);

      expect(result).toBe(4);
      expect(repo.count).toHaveBeenCalledWith({
        where: { userId: ME, isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('stamps isRead and readAt', async () => {
      repo.findOne.mockResolvedValue({
        id: 'notif-1',
        userId: ME,
        isRead: false,
        readAt: null,
      });

      const result = await service.markAsRead('notif-1', ME);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeInstanceOf(Date);
      expect(repo.save).toHaveBeenCalled();
    });

    it('scopes the lookup on the user as well as the id', async () => {
      repo.findOne.mockResolvedValue({
        id: 'notif-1',
        userId: ME,
        isRead: false,
      });

      await service.markAsRead('notif-1', ME);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: ME },
      });
    });

    it('404s rather than confirming that another user id exists', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('notif-1', ME)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('leaves readAt alone when the notification was already read', async () => {
      const originalDate = new Date('2026-01-01T00:00:00.000Z');
      repo.findOne.mockResolvedValue({
        id: 'notif-1',
        userId: ME,
        isRead: true,
        readAt: originalDate,
      });

      const result = await service.markAsRead('notif-1', ME);

      // Re-opening the bell must not move the moment it was first read.
      expect(result.readAt).toBe(originalDate);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('updates only the caller unread rows', async () => {
      repo.update.mockResolvedValue({ affected: 3 });

      const updated = await service.markAllAsRead(ME);

      expect(updated).toBe(3);
      expect(repo.update).toHaveBeenCalledWith(
        { userId: ME, isRead: false },
        { isRead: true, readAt: expect.any(Date) },
      );
    });

    it('returns 0 when there is nothing unread', async () => {
      repo.update.mockResolvedValue({ affected: 0 });

      await expect(service.markAllAsRead(ME)).resolves.toBe(0);
    });
  });

  it('cannot be pointed at another user through any argument', async () => {
    // The service takes no filter object for the user, so the only way to read
    // SOMEONE_ELSE's rows is to pass their id as the first argument — which is
    // exactly what the controller never does.
    repo.count.mockResolvedValue(0);

    await service.countUnread(SOMEONE_ELSE);

    expect(repo.count).toHaveBeenCalledWith({
      where: { userId: SOMEONE_ELSE, isRead: false },
    });
  });
});
