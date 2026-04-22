import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../config/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Get paginated notifications for a user, optionally filtered by type.
   * Maps readAt → isRead for the frontend.
   */
  async getUserNotifications(
    userId: string,
    page: number,
    limit: number,
    type?: string,
  ) {
    const where: Prisma.UserNotificationWhereInput = { userId };

    if (type) {
      where.data = { path: ['type'], string_contains: type };
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.userNotification.count({ where }),
      this.prisma.userNotification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      items: items.map((n) => this.mapNotification(n)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Get unread notification count.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.userNotification.count({
      where: { userId, readAt: null },
    });
  }

  /**
   * Mark a notification as read and update unread count via WebSocket.
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.userNotification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Уведомление не найдено');
    }

    const updated = await this.prisma.userNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    const count = await this.getUnreadCount(userId);
    this.gateway.updateUnreadCount(userId, count);

    return this.mapNotification(updated);
  }

  /**
   * Mark all notifications as read and update unread count via WebSocket.
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.userNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    this.gateway.updateUnreadCount(userId, 0);

    return { count: result.count };
  }

  /**
   * Send a notification: create in-app record and broadcast via WebSocket.
   */
  async sendNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.userNotification.create({
      data: {
        userId: dto.userId,
        templateId: dto.templateId,
        title: dto.title,
        body: dto.body,
        data: (dto.data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    const mapped = this.mapNotification(notification);
    this.gateway.sendToUser(dto.userId, mapped);

    const count = await this.getUnreadCount(dto.userId);
    this.gateway.updateUnreadCount(dto.userId, count);

    return notification;
  }

  /**
   * Delete a single notification.
   */
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.userNotification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Уведомление не найдено');
    }

    await this.prisma.userNotification.delete({
      where: { id: notificationId },
    });

    const count = await this.getUnreadCount(userId);
    this.gateway.updateUnreadCount(userId, count);

    return { success: true };
  }

  /**
   * Delete all notifications for a user.
   */
  async deleteAllNotifications(userId: string) {
    const result = await this.prisma.userNotification.deleteMany({
      where: { userId },
    });

    this.gateway.updateUnreadCount(userId, 0);

    return { count: result.count };
  }

  /**
   * Get user notification preferences.
   */
  async getPreferences(userId: string) {
    let prefs = await this.prisma.newsletterPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.newsletterPreferences.create({
        data: {
          userId,
          emailMarketing: true,
          emailUpdates: true,
          pushNotifications: true,
        },
      });
    }

    return prefs;
  }

  /**
   * Update user notification preferences.
   */
  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const updateData: Record<string, boolean> = {};
    if (dto.emailMarketing !== undefined) updateData.emailMarketing = dto.emailMarketing;
    if (dto.emailUpdates !== undefined) updateData.emailUpdates = dto.emailUpdates;
    if (dto.pushNotifications !== undefined) updateData.pushNotifications = dto.pushNotifications;

    return this.prisma.newsletterPreferences.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        emailMarketing: dto.emailMarketing ?? true,
        emailUpdates: dto.emailUpdates ?? true,
        pushNotifications: dto.pushNotifications ?? true,
      },
    });
  }

  /**
   * Map a raw DB notification to the frontend shape.
   */
  private mapNotification(n: {
    id: string;
    userId: string;
    templateId: string | null;
    title: string;
    body: string;
    data: Prisma.JsonValue;
    readAt: Date | null;
    createdAt: Date;
  }) {
    const data = (n.data ?? {}) as Record<string, unknown>;
    return {
      id: n.id,
      type: (data.type as string) ?? 'SYSTEM',
      title: n.title,
      body: n.body,
      isRead: !!n.readAt,
      link: (data.link as string) ?? null,
      metadata: data,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
