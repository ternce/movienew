import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../../config/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      userNotification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      newsletterPreferences: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };

    gateway = {
      sendToUser: jest.fn(),
      updateUnreadCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // =========================================================================
  // getUserNotifications
  // =========================================================================

  describe('getUserNotifications', () => {
    const userId = 'user-1';

    it('should return paginated notifications with mapped fields', async () => {
      const now = new Date();
      const mockItems = [
        {
          id: 'n1',
          userId,
          templateId: null,
          title: 'Test Notification',
          body: 'Test body',
          data: { type: 'PAYMENT', link: '/payments' },
          readAt: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'n2',
          userId,
          templateId: null,
          title: 'Read Notification',
          body: 'Read body',
          data: { type: 'SYSTEM' },
          readAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ];

      prisma.userNotification.findMany.mockResolvedValue(mockItems);
      prisma.userNotification.count
        .mockResolvedValueOnce(2) // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await service.getUserNotifications(userId, 1, 20);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.unreadCount).toBe(1);

      // Verify mapping
      expect(result.items[0].isRead).toBe(false);
      expect(result.items[0].type).toBe('PAYMENT');
      expect(result.items[0].link).toBe('/payments');
      expect(result.items[1].isRead).toBe(true);
      expect(result.items[1].type).toBe('SYSTEM');
    });

    it('should return empty list when no notifications', async () => {
      prisma.userNotification.findMany.mockResolvedValue([]);
      prisma.userNotification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getUserNotifications(userId, 1, 20);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.unreadCount).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      prisma.userNotification.findMany.mockResolvedValue([]);
      prisma.userNotification.count
        .mockResolvedValueOnce(55) // total
        .mockResolvedValueOnce(10); // unreadCount

      const result = await service.getUserNotifications(userId, 1, 20);

      expect(result.totalPages).toBe(3);
    });

    it('should apply type filter when provided', async () => {
      prisma.userNotification.findMany.mockResolvedValue([]);
      prisma.userNotification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.getUserNotifications(userId, 1, 20, 'PAYMENT');

      expect(prisma.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            data: { path: ['type'], string_contains: 'PAYMENT' },
          },
        }),
      );
    });

    it('should not apply type filter when not provided', async () => {
      prisma.userNotification.findMany.mockResolvedValue([]);
      prisma.userNotification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.getUserNotifications(userId, 1, 20);

      expect(prisma.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        }),
      );
    });

    it('should map notification without data to SYSTEM type', async () => {
      const now = new Date();
      prisma.userNotification.findMany.mockResolvedValue([
        {
          id: 'n1',
          userId,
          templateId: null,
          title: 'No data notification',
          body: 'Body',
          data: null,
          readAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      prisma.userNotification.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await service.getUserNotifications(userId, 1, 20);

      expect(result.items[0].type).toBe('SYSTEM');
      expect(result.items[0].link).toBeNull();
    });
  });

  // =========================================================================
  // getUnreadCount
  // =========================================================================

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      prisma.userNotification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(prisma.userNotification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null },
      });
    });

    it('should return 0 when all notifications are read', async () => {
      prisma.userNotification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(0);
    });
  });

  // =========================================================================
  // markAsRead
  // =========================================================================

  describe('markAsRead', () => {
    const userId = 'user-1';
    const notificationId = 'n1';

    it('should mark notification as read and update WebSocket count', async () => {
      const now = new Date();
      const notification = {
        id: notificationId,
        userId,
        templateId: null,
        title: 'Test',
        body: 'Body',
        data: { type: 'SYSTEM' },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      };

      prisma.userNotification.findFirst.mockResolvedValue(notification);
      prisma.userNotification.update.mockResolvedValue({
        ...notification,
        readAt: now,
      });
      prisma.userNotification.count.mockResolvedValue(2);

      const result = await service.markAsRead(userId, notificationId);

      expect(result.isRead).toBe(true);
      expect(prisma.userNotification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { readAt: expect.any(Date) },
      });
      expect(gateway.updateUnreadCount).toHaveBeenCalledWith(userId, 2);
    });

    it('should throw NotFoundException when notification not found', async () => {
      prisma.userNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead(userId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for notification of another user', async () => {
      prisma.userNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead('other-user', notificationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // markAllAsRead
  // =========================================================================

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      prisma.userNotification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(result.count).toBe(5);
      expect(prisma.userNotification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(gateway.updateUnreadCount).toHaveBeenCalledWith('user-1', 0);
    });

    it('should return 0 count when no unread notifications', async () => {
      prisma.userNotification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead('user-1');

      expect(result.count).toBe(0);
      expect(gateway.updateUnreadCount).toHaveBeenCalledWith('user-1', 0);
    });
  });

  // =========================================================================
  // sendNotification
  // =========================================================================

  describe('sendNotification', () => {
    it('should create notification and broadcast via WebSocket', async () => {
      const now = new Date();
      const created = {
        id: 'n-new',
        userId: 'user-1',
        templateId: null,
        title: 'New notification',
        body: 'Hello',
        data: { type: 'PAYMENT', link: '/pay' },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      };

      prisma.userNotification.create.mockResolvedValue(created);
      prisma.userNotification.count.mockResolvedValue(3);

      const result = await service.sendNotification({
        userId: 'user-1',
        title: 'New notification',
        body: 'Hello',
        data: { type: 'PAYMENT', link: '/pay' },
      });

      expect(result.id).toBe('n-new');
      expect(gateway.sendToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          id: 'n-new',
          type: 'PAYMENT',
          isRead: false,
        }),
      );
      expect(gateway.updateUnreadCount).toHaveBeenCalledWith('user-1', 3);
    });

    it('should handle notification without data', async () => {
      const now = new Date();
      prisma.userNotification.create.mockResolvedValue({
        id: 'n-new',
        userId: 'user-1',
        templateId: null,
        title: 'Test',
        body: 'Body',
        data: null,
        readAt: null,
        createdAt: now,
        updatedAt: now,
      });
      prisma.userNotification.count.mockResolvedValue(1);

      await service.sendNotification({
        userId: 'user-1',
        title: 'Test',
        body: 'Body',
      });

      expect(gateway.sendToUser).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // deleteNotification
  // =========================================================================

  describe('deleteNotification', () => {
    it('should delete notification and update WebSocket count', async () => {
      prisma.userNotification.findFirst.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
      });
      prisma.userNotification.delete.mockResolvedValue({});
      prisma.userNotification.count.mockResolvedValue(2);

      const result = await service.deleteNotification('user-1', 'n1');

      expect(result).toEqual({ success: true });
      expect(prisma.userNotification.delete).toHaveBeenCalledWith({
        where: { id: 'n1' },
      });
      expect(gateway.updateUnreadCount).toHaveBeenCalledWith('user-1', 2);
    });

    it('should throw NotFoundException when notification not found', async () => {
      prisma.userNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNotification('user-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for notification of another user', async () => {
      prisma.userNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNotification('other-user', 'n1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // deleteAllNotifications
  // =========================================================================

  describe('deleteAllNotifications', () => {
    it('should delete all notifications for user', async () => {
      prisma.userNotification.deleteMany.mockResolvedValue({ count: 10 });

      const result = await service.deleteAllNotifications('user-1');

      expect(result.count).toBe(10);
      expect(prisma.userNotification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(gateway.updateUnreadCount).toHaveBeenCalledWith('user-1', 0);
    });

    it('should return 0 count when no notifications to delete', async () => {
      prisma.userNotification.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.deleteAllNotifications('user-1');

      expect(result.count).toBe(0);
    });
  });

  // =========================================================================
  // getPreferences
  // =========================================================================

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const prefs = {
        id: 'pref-1',
        userId: 'user-1',
        emailMarketing: true,
        emailUpdates: false,
        pushNotifications: true,
      };

      prisma.newsletterPreferences.findUnique.mockResolvedValue(prefs);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(prefs);
      expect(prisma.newsletterPreferences.create).not.toHaveBeenCalled();
    });

    it('should create default preferences when none exist', async () => {
      const defaultPrefs = {
        id: 'pref-new',
        userId: 'user-1',
        emailMarketing: true,
        emailUpdates: true,
        pushNotifications: true,
      };

      prisma.newsletterPreferences.findUnique.mockResolvedValue(null);
      prisma.newsletterPreferences.create.mockResolvedValue(defaultPrefs);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(defaultPrefs);
      expect(prisma.newsletterPreferences.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          emailMarketing: true,
          emailUpdates: true,
          pushNotifications: true,
        },
      });
    });
  });

  // =========================================================================
  // updatePreferences
  // =========================================================================

  describe('updatePreferences', () => {
    it('should update specific preferences', async () => {
      const updated = {
        id: 'pref-1',
        userId: 'user-1',
        emailMarketing: false,
        emailUpdates: true,
        pushNotifications: true,
      };

      prisma.newsletterPreferences.upsert.mockResolvedValue(updated);

      const result = await service.updatePreferences('user-1', {
        emailMarketing: false,
      });

      expect(result).toEqual(updated);
      expect(prisma.newsletterPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { emailMarketing: false },
        create: {
          userId: 'user-1',
          emailMarketing: false,
          emailUpdates: true,
          pushNotifications: true,
        },
      });
    });

    it('should handle partial update with multiple fields', async () => {
      prisma.newsletterPreferences.upsert.mockResolvedValue({});

      await service.updatePreferences('user-1', {
        emailMarketing: false,
        pushNotifications: false,
      });

      expect(prisma.newsletterPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { emailMarketing: false, pushNotifications: false },
        create: expect.objectContaining({
          emailMarketing: false,
          pushNotifications: false,
        }),
      });
    });

    it('should create preferences via upsert for new user', async () => {
      prisma.newsletterPreferences.upsert.mockResolvedValue({
        emailMarketing: true,
        emailUpdates: true,
        pushNotifications: false,
      });

      await service.updatePreferences('new-user', {
        pushNotifications: false,
      });

      expect(prisma.newsletterPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: 'new-user',
            pushNotifications: false,
          }),
        }),
      );
    });
  });
});
