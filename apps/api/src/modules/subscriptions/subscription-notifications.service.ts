import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../config/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

interface SubscriptionNotificationData {
  subscriptionId: string;
  planName: string;
  daysRemaining: number;
  expiresAt: Date;
}

@Injectable()
export class SubscriptionNotificationsService {
  private readonly logger = new Logger(SubscriptionNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Run daily at 8:00 AM to send subscription expiration warnings.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyNotifications(): Promise<void> {
    this.logger.log('Starting daily subscription notification process');

    try {
      // Send 7-day warnings
      const sevenDayWarnings = await this.sendExpirationWarnings(7);
      this.logger.log(`Sent ${sevenDayWarnings} 7-day expiration warnings`);

      // Send 1-day urgent warnings
      const oneDayWarnings = await this.sendExpirationWarnings(1);
      this.logger.log(`Sent ${oneDayWarnings} 1-day expiration warnings`);

      // Send expired notifications (for subscriptions that expired yesterday)
      const expiredNotifications = await this.sendExpiredNotifications();
      this.logger.log(`Sent ${expiredNotifications} expired notifications`);
    } catch (error) {
      this.logger.error('Error in daily notification process', error);
    }
  }

  /**
   * Send expiration warning emails and in-app notifications.
   */
  async sendExpirationWarnings(daysUntilExpiration: number): Promise<number> {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysUntilExpiration);

    // Start of day and end of day for the target date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find subscriptions expiring on the target day that haven't been notified yet
    const expiringSubscriptions = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        // Only include if we haven't already sent this warning
        NOT: {
          user: {
            notifications: {
              some: {
                title: { contains: 'истекает' },
                data: {
                  path: ['daysRemaining'],
                  equals: daysUntilExpiration,
                },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              },
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
        plan: {
          select: {
            name: true,
          },
        },
      },
    });

    let sent = 0;

    for (const subscription of expiringSubscriptions) {
      try {
        await this.sendExpirationNotification({
          subscriptionId: subscription.id,
          planName: subscription.plan.name,
          daysRemaining: daysUntilExpiration,
          expiresAt: subscription.expiresAt,
        }, {
          userId: subscription.user.id,
          email: subscription.user.email,
          firstName: subscription.user.firstName || 'Пользователь',
        });
        sent++;
      } catch (error) {
        this.logger.error(
          `Failed to send expiration warning for subscription ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return sent;
  }

  /**
   * Send notification for subscriptions that expired yesterday.
   */
  async sendExpiredNotifications(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Find subscriptions that expired yesterday
    const expiredSubscriptions = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.EXPIRED,
        expiresAt: {
          gte: startOfYesterday,
          lte: endOfYesterday,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
        plan: {
          select: {
            name: true,
          },
        },
      },
    });

    let sent = 0;

    for (const subscription of expiredSubscriptions) {
      try {
        // Send email notification
        await this.emailService.sendSubscriptionExpiredEmail(
          subscription.user.email,
          subscription.user.firstName || 'Пользователь',
          subscription.plan.name,
        );

        // Create in-app notification via centralized service
        await this.notificationsService.sendNotification({
          userId: subscription.user.id,
          title: 'Подписка истекла',
          body: `Ваша подписка "${subscription.plan.name}" истекла. Продлите подписку, чтобы продолжить смотреть контент.`,
          data: {
            type: 'SUBSCRIPTION',
            subscriptionId: subscription.id,
            planName: subscription.plan.name,
          },
        });

        sent++;
      } catch (error) {
        this.logger.error(
          `Failed to send expired notification for subscription ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return sent;
  }

  /**
   * Send expiration warning via email and in-app notification.
   */
  private async sendExpirationNotification(
    data: SubscriptionNotificationData,
    user: { userId: string; email: string; firstName: string },
  ): Promise<void> {
    // Send email
    await this.emailService.sendSubscriptionExpiringEmail(
      user.email,
      user.firstName,
      data.planName,
      data.daysRemaining,
      data.expiresAt,
      data.subscriptionId,
    );

    // Create in-app notification via centralized service
    const title = data.daysRemaining <= 1
      ? 'Подписка истекает завтра!'
      : `Подписка истекает через ${data.daysRemaining} дней`;

    const body = data.daysRemaining <= 1
      ? `Ваша подписка "${data.planName}" истекает завтра. Продлите сейчас, чтобы не потерять доступ.`
      : `Ваша подписка "${data.planName}" истекает ${data.expiresAt.toLocaleDateString('ru-RU')}. Продлите заранее.`;

    await this.notificationsService.sendNotification({
      userId: user.userId,
      title,
      body,
      data: {
        type: 'SUBSCRIPTION',
        subscriptionId: data.subscriptionId,
        planName: data.planName,
        daysRemaining: data.daysRemaining,
        expiresAt: data.expiresAt.toISOString(),
      },
    });
  }

  /**
   * Send renewal success notification.
   */
  async sendRenewalSuccessNotification(
    userId: string,
    subscriptionId: string,
    planName: string,
    newExpiresAt: Date,
    amount: number,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) return;

    // Send email
    await this.emailService.sendSubscriptionRenewedEmail(
      user.email,
      user.firstName || 'Пользователь',
      planName,
      newExpiresAt,
      amount,
    );

    // Create in-app notification via centralized service
    await this.notificationsService.sendNotification({
      userId,
      title: 'Подписка продлена',
      body: `Ваша подписка "${planName}" успешно продлена до ${newExpiresAt.toLocaleDateString('ru-RU')}.`,
      data: {
        type: 'SUBSCRIPTION',
        subscriptionId,
        planName,
        newExpiresAt: newExpiresAt.toISOString(),
        amount,
      },
    });
  }

  /**
   * Send renewal failure notification.
   */
  async sendRenewalFailedNotification(
    userId: string,
    subscriptionId: string,
    planName: string,
    expiresAt: Date,
    errorReason?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) return;

    // Send email
    await this.emailService.sendSubscriptionRenewalFailedEmail(
      user.email,
      user.firstName || 'Пользователь',
      planName,
      expiresAt,
      errorReason,
    );

    // Create in-app notification via centralized service
    await this.notificationsService.sendNotification({
      userId,
      title: 'Не удалось продлить подписку',
      body: `Автоматическое продление подписки "${planName}" не удалось. Пожалуйста, обновите способ оплаты.`,
      data: {
        type: 'SUBSCRIPTION',
        subscriptionId,
        planName,
        expiresAt: expiresAt.toISOString(),
        errorReason,
      },
    });
  }

  /**
   * Send payment success notification.
   */
  async sendPaymentSuccessNotification(
    userId: string,
    transactionId: string,
    amount: number,
    description: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) return;

    // Send email
    await this.emailService.sendPaymentSuccessfulEmail(
      user.email,
      user.firstName || 'Пользователь',
      transactionId,
      amount,
      description,
    );

    // Create in-app notification via centralized service
    await this.notificationsService.sendNotification({
      userId,
      title: 'Платёж успешно выполнен',
      body: `Оплата на сумму ${amount} ₽ прошла успешно.`,
      data: {
        type: 'PAYMENT',
        transactionId,
        amount,
        description,
      },
    });
  }

  /**
   * Send payment failed notification.
   */
  async sendPaymentFailedNotification(
    userId: string,
    amount: number,
    description: string,
    errorReason?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) return;

    // Send email
    await this.emailService.sendPaymentFailedEmail(
      user.email,
      user.firstName || 'Пользователь',
      amount,
      description,
      errorReason,
    );

    // Create in-app notification via centralized service
    await this.notificationsService.sendNotification({
      userId,
      title: 'Платёж не прошёл',
      body: `Не удалось выполнить платёж на сумму ${amount} ₽. ${errorReason || 'Попробуйте ещё раз.'}`,
      data: {
        type: 'PAYMENT',
        amount,
        description,
        errorReason,
      },
    });
  }
}
