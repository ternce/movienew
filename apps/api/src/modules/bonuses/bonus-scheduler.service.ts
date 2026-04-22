import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../../config/prisma.service';
import { BonusesService } from './bonuses.service';
import { BONUS_CONFIG } from '@movie-platform/shared';

@Injectable()
export class BonusSchedulerService {
  private readonly logger = new Logger(BonusSchedulerService.name);

  constructor(
    private readonly bonusesService: BonusesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Process expired bonuses - runs daily at 3:00 AM.
   * Deducts expired bonus amounts from user balances.
   */
  @Cron('0 3 * * *') // Every day at 3:00 AM
  async handleBonusExpiration(): Promise<void> {
    this.logger.log('Starting bonus expiration processing...');

    try {
      const result = await this.bonusesService.processExpiringBonuses();
      this.logger.log(
        `Bonus expiration completed: ${result.expired} bonuses expired, ${result.notified} users affected`,
      );
    } catch (error) {
      this.logger.error('Error processing bonus expiration:', error);
    }
  }

  /**
   * Send expiration warnings - runs daily at 9:00 AM.
   * Creates notifications for users with bonuses expiring in 30, 7, or 1 days.
   */
  @Cron('0 9 * * *') // Every day at 9:00 AM
  async sendExpirationWarnings(): Promise<void> {
    this.logger.log('Starting expiration warning notifications...');

    try {
      const warningDays = BONUS_CONFIG.EXPIRATION_WARNING_DAYS; // [30, 7, 1]

      for (const days of warningDays) {
        await this.sendWarningForDays(days);
      }

      this.logger.log('Expiration warnings sent successfully');
    } catch (error) {
      this.logger.error('Error sending expiration warnings:', error);
    }
  }

  /**
   * Send warning notifications for bonuses expiring in N days.
   */
  private async sendWarningForDays(days: number): Promise<void> {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    // Find users with bonuses expiring on the target date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get distinct users with expiring bonuses
    const expiringTransactions = await this.prisma.bonusTransaction.groupBy({
      by: ['userId'],
      where: {
        type: 'EARNED',
        expiresAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    });

    if (expiringTransactions.length === 0) {
      return;
    }

    // Create notifications for each user
    const notificationPromises = expiringTransactions.map(async (tx) => {
      const amount = Number(tx._sum.amount) || 0;
      if (amount <= 0) return;

      const title = this.getWarningTitle(days);
      const body = this.getWarningBody(days, amount);

      // Check if notification was already sent for this period
      const existingNotification = await this.prisma.userNotification.findFirst({
        where: {
          userId: tx.userId,
          title,
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (existingNotification) {
        return; // Already notified
      }

      // Create in-app notification
      await this.prisma.userNotification.create({
        data: {
          userId: tx.userId,
          title,
          body,
          data: {
            type: 'BONUS_EXPIRING',
            days,
            amount,
          },
        },
      });
    });

    await Promise.all(notificationPromises);

    this.logger.log(
      `Sent ${expiringTransactions.length} warning notifications for bonuses expiring in ${days} days`,
    );
  }

  /**
   * Get notification title based on days until expiration.
   */
  private getWarningTitle(days: number): string {
    if (days === 1) {
      return 'Ваши бонусы истекают завтра!';
    } else if (days === 7) {
      return 'Ваши бонусы истекают через неделю';
    } else {
      return 'Ваши бонусы скоро истекут';
    }
  }

  /**
   * Get notification body based on days and amount.
   */
  private getWarningBody(days: number, amount: number): string {
    const formattedAmount = Math.round(amount);

    if (days === 1) {
      return `${formattedAmount} бонусов истекут завтра. Используйте их при следующей покупке!`;
    } else if (days === 7) {
      return `${formattedAmount} бонусов истекут через 7 дней. Не упустите возможность их использовать!`;
    } else {
      return `${formattedAmount} бонусов истекут через ${days} дней. Рекомендуем использовать их при следующей покупке.`;
    }
  }

  /**
   * Manual trigger for testing expiration processing.
   * Should only be called by admin endpoints.
   */
  async manualProcessExpiration(): Promise<{ expired: number; notified: number }> {
    this.logger.log('Manual expiration processing triggered');
    return this.bonusesService.processExpiringBonuses();
  }

  /**
   * Manual trigger for testing warning notifications.
   * Should only be called by admin endpoints.
   */
  async manualSendWarnings(): Promise<void> {
    this.logger.log('Manual warning notifications triggered');
    await this.sendExpirationWarnings();
  }

  /**
   * Get scheduler status (for health checks).
   */
  getSchedulerStatus(): { isRunning: boolean; lastRun?: Date } {
    return {
      isRunning: true,
    };
  }
}
