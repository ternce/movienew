import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PaymentMethodType,
  SubscriptionStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

import { PrismaService } from '../../config/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { UserSubscriptionsService } from './user-subscriptions.service';

interface RenewalAttempt {
  subscriptionId: string;
  userId: string;
  planId: string;
  attempts: number;
  lastError?: string;
}

@Injectable()
export class SubscriptionRenewalScheduler {
  private readonly logger = new Logger(SubscriptionRenewalScheduler.name);
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RENEWAL_WINDOW_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly userSubscriptionsService: UserSubscriptionsService,
  ) {}

  /**
   * Run daily at 3:00 AM to process subscription renewals.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyRenewalProcess(): Promise<void> {
    this.logger.log('Starting daily subscription renewal process');

    try {
      // Process expired subscriptions first
      const expiredCount = await this.userSubscriptionsService.processExpiredSubscriptions();
      this.logger.log(`Processed ${expiredCount} expired subscriptions`);

      // Process auto-renewals
      const renewalResults = await this.processAutoRenewals();
      this.logger.log(
        `Renewal process complete: ${renewalResults.successful} successful, ${renewalResults.failed} failed`,
      );
    } catch (error) {
      this.logger.error('Error in daily renewal process', error);
    }
  }

  /**
   * Process subscriptions that are due for auto-renewal.
   * Finds subscriptions expiring within 24 hours with autoRenew=true.
   */
  async processAutoRenewals(): Promise<{ successful: number; failed: number }> {
    const now = new Date();
    const renewalDeadline = new Date(now.getTime() + this.RENEWAL_WINDOW_HOURS * 60 * 60 * 1000);

    // Find subscriptions due for renewal
    const subscriptionsToRenew = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        expiresAt: {
          gte: now,
          lte: renewalDeadline,
        },
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (subscriptionsToRenew.length === 0) {
      this.logger.log('No subscriptions due for renewal');
      return { successful: 0, failed: 0 };
    }

    this.logger.log(`Found ${subscriptionsToRenew.length} subscriptions due for renewal`);

    let successful = 0;
    let failed = 0;

    for (const subscription of subscriptionsToRenew) {
      try {
        // Check if a renewal payment is already pending
        const pendingRenewal = await this.prisma.transaction.findFirst({
          where: {
            userId: subscription.userId,
            type: TransactionType.SUBSCRIPTION,
            status: TransactionStatus.PENDING,
            metadata: {
              path: ['subscriptionRenewalId'],
              equals: subscription.id,
            },
          },
        });

        if (pendingRenewal) {
          this.logger.log(
            `Skipping subscription ${subscription.id} - renewal payment already pending`,
          );
          continue;
        }

        // Initiate renewal payment
        await this.initiateRenewalPayment(subscription);
        successful++;
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to process renewal for subscription ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );

        // Record the failed attempt for potential retry
        await this.recordFailedRenewalAttempt(subscription.id, String(error));
      }
    }

    return { successful, failed };
  }

  /**
   * Initiate a renewal payment for a subscription.
   */
  private async initiateRenewalPayment(subscription: {
    id: string;
    userId: string;
    planId: string;
    plan: { id: string; price: any; name: string };
  }): Promise<void> {
    const price = Number(subscription.plan.price);

    // Get user's preferred payment method (default to CARD)
    const lastTransaction = await this.prisma.transaction.findFirst({
      where: {
        userId: subscription.userId,
        type: TransactionType.SUBSCRIPTION,
        status: TransactionStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
    });

    const paymentMethod = lastTransaction?.paymentMethod || PaymentMethodType.CARD;

    // Initiate the payment
    const paymentResult = await this.paymentsService.initiatePayment(subscription.userId, {
      type: TransactionType.SUBSCRIPTION,
      amount: price,
      paymentMethod,
      referenceId: subscription.planId,
      metadata: {
        subscriptionPlanId: subscription.planId,
        subscriptionRenewalId: subscription.id,
        autoRenew: true,
        isRenewal: true,
      },
    });

    this.logger.log(
      `Renewal payment initiated for subscription ${subscription.id}: transaction ${paymentResult.transactionId}`,
    );
  }

  /**
   * Record a failed renewal attempt for later retry.
   */
  private async recordFailedRenewalAttempt(
    subscriptionId: string,
    errorMessage: string,
  ): Promise<void> {
    // Use audit log to track renewal failures
    await this.prisma.auditLog.create({
      data: {
        action: 'SUBSCRIPTION_RENEWAL_FAILED',
        entityType: 'UserSubscription',
        entityId: subscriptionId,
        newValue: {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Retry failed renewals (called separately, e.g., every 4 hours).
   */
  @Cron('0 */4 * * *') // Every 4 hours
  async handleRetryFailedRenewals(): Promise<void> {
    this.logger.log('Checking for failed renewals to retry');

    // Find subscriptions that failed renewal in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const failedRenewals = await this.prisma.auditLog.findMany({
      where: {
        action: 'SUBSCRIPTION_RENEWAL_FAILED',
        entityType: 'UserSubscription',
        createdAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by subscription ID and count attempts
    const attemptsBySubscription = new Map<string, RenewalAttempt>();

    for (const log of failedRenewals) {
      const subscriptionId = log.entityId;
      if (!subscriptionId) continue;

      const existing = attemptsBySubscription.get(subscriptionId);

      if (existing) {
        existing.attempts++;
      } else {
        attemptsBySubscription.set(subscriptionId, {
          subscriptionId,
          userId: '',
          planId: '',
          attempts: 1,
          lastError: (log.newValue as any)?.error,
        });
      }
    }

    let retried = 0;

    for (const [subscriptionId, attempt] of attemptsBySubscription) {
      // Skip if max retries reached
      if (attempt.attempts >= this.MAX_RETRY_ATTEMPTS) {
        this.logger.warn(
          `Subscription ${subscriptionId} has reached max retry attempts (${this.MAX_RETRY_ATTEMPTS})`,
        );
        continue;
      }

      // Check if subscription is still active and due for renewal
      const subscription = await this.prisma.userSubscription.findFirst({
        where: {
          id: subscriptionId,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: true,
        },
        include: { plan: true },
      });

      if (!subscription) {
        continue;
      }

      // Check if renewal was already successful
      const successfulRenewal = await this.prisma.transaction.findFirst({
        where: {
          userId: subscription.userId,
          type: TransactionType.SUBSCRIPTION,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: twentyFourHoursAgo },
          metadata: {
            path: ['subscriptionRenewalId'],
            equals: subscriptionId,
          },
        },
      });

      if (successfulRenewal) {
        continue;
      }

      // Retry the renewal
      try {
        await this.initiateRenewalPayment(subscription);
        retried++;
        this.logger.log(`Retry successful for subscription ${subscriptionId}`);
      } catch (error) {
        this.logger.error(`Retry failed for subscription ${subscriptionId}`, error);
        await this.recordFailedRenewalAttempt(subscriptionId, String(error));
      }
    }

    this.logger.log(`Retried ${retried} failed renewals`);
  }

  /**
   * Process payments that have been completed to extend subscriptions.
   * This is called by the webhook handler when a payment is successful.
   */
  async processSuccessfulRenewalPayment(transactionId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    const metadata = transaction.metadata as any;

    if (!metadata?.isRenewal || !metadata?.subscriptionRenewalId) {
      return; // Not a renewal payment
    }

    const subscriptionId = metadata.subscriptionRenewalId;

    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    // Extend the subscription
    const newExpiresAt = new Date(
      subscription.expiresAt.getTime() + subscription.plan.durationDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        expiresAt: newExpiresAt,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // Log the renewal
    await this.prisma.auditLog.create({
      data: {
        userId: subscription.userId,
        action: 'SUBSCRIPTION_RENEWED',
        entityType: 'UserSubscription',
        entityId: subscriptionId,
        newValue: {
          transactionId,
          previousExpiresAt: subscription.expiresAt.toISOString(),
          newExpiresAt: newExpiresAt.toISOString(),
        },
      },
    });

    this.logger.log(
      `Subscription ${subscriptionId} renewed until ${newExpiresAt.toISOString()}`,
    );
  }
}
