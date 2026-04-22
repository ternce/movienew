import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SubscriptionStatus,
  TransactionType,
} from '@prisma/client';

import { PrismaService } from '../../config/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import {
  CancelSubscriptionDto,
  PurchaseSubscriptionDto,
  SubscriptionAccessDto,
  ToggleAutoRenewDto,
  UserSubscriptionDto,
  UserSubscriptionQueryDto,
} from './dto';
import { PaymentResultDto } from '../payments/dto';

@Injectable()
export class UserSubscriptionsService {
  private readonly logger = new Logger(UserSubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: SubscriptionPlansService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Purchase a subscription.
   */
  async purchase(
    userId: string,
    dto: PurchaseSubscriptionDto,
  ): Promise<PaymentResultDto> {
    // Get the plan
    const plan = await this.plansService.getPlanById(dto.planId);

    if (!plan.isActive) {
      throw new BadRequestException('Этот тарифный план недоступен');
    }

    // Check if user already has an active subscription of the same type
    const existingSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('У вас уже есть активная подписка на этот тариф');
    }

    // Initiate payment
    const paymentResult = await this.paymentsService.initiatePayment(userId, {
      type: TransactionType.SUBSCRIPTION,
      amount: plan.price,
      paymentMethod: dto.paymentMethod,
      bonusAmount: dto.bonusAmount,
      referenceId: plan.id,
      returnUrl: dto.returnUrl,
      metadata: {
        subscriptionPlanId: plan.id,
        autoRenew: dto.autoRenew !== false,
      },
    });

    return paymentResult;
  }

  /**
   * Activate a subscription after successful payment.
   */
  async activateSubscription(
    userId: string,
    planId: string,
    transactionId: string,
  ): Promise<UserSubscriptionDto> {
    const plan = await this.plansService.getPlanById(planId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.$transaction(async (tx) => {
      // Create subscription
      const sub = await tx.userSubscription.create({
        data: {
          userId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          startedAt: now,
          expiresAt,
          autoRenew: true,
        },
        include: { plan: true },
      });

      // Grant access to content if this is a content-specific plan
      if (plan.contentId) {
        await tx.subscriptionAccess.create({
          data: {
            subscriptionId: sub.id,
            contentId: plan.contentId,
          },
        });
      }

      // Log to audit
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SUBSCRIPTION_ACTIVATED',
          entityType: 'UserSubscription',
          entityId: sub.id,
          newValue: {
            planId,
            transactionId,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return sub;
    });

    this.logger.log(`Subscription activated: ${subscription.id} for user ${userId}`);

    return this.mapToDto(subscription);
  }

  /**
   * Get user's subscriptions.
   */
  async getUserSubscriptions(
    userId: string,
    query: UserSubscriptionQueryDto,
  ): Promise<{ items: UserSubscriptionDto[]; total: number; page: number; limit: number }> {
    const { status, page = 1, limit = 20 } = query;

    const where: Prisma.UserSubscriptionWhereInput = { userId };
    if (status) where.status = status;

    const [total, subscriptions] = await Promise.all([
      this.prisma.userSubscription.count({ where }),
      this.prisma.userSubscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: { plan: true },
      }),
    ]);

    return {
      items: subscriptions.map((sub) => this.mapToDto(sub)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get active subscription for a specific plan type.
   */
  async getActiveSubscription(userId: string, planId?: string): Promise<UserSubscriptionDto | null> {
    const where: Prisma.UserSubscriptionWhereInput = {
      userId,
      status: SubscriptionStatus.ACTIVE,
      expiresAt: { gte: new Date() },
    };

    if (planId) where.planId = planId;

    const subscription = await this.prisma.userSubscription.findFirst({
      where,
      include: { plan: true },
    });

    return subscription ? this.mapToDto(subscription) : null;
  }

  /**
   * Check if user has access to specific content.
   */
  async checkAccess(userId: string, contentId: string): Promise<SubscriptionAccessDto> {
    // First check if content is free
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, isFree: true },
    });

    if (!content) {
      return {
        contentId,
        hasAccess: false,
        reason: 'Content not found',
      };
    }

    if (content.isFree) {
      return {
        contentId,
        hasAccess: true,
        reason: 'Free content',
      };
    }

    // Check for premium subscription
    const premiumSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { gte: new Date() },
        plan: { type: 'PREMIUM' },
      },
    });

    if (premiumSubscription) {
      return {
        contentId,
        hasAccess: true,
        subscriptionId: premiumSubscription.id,
      };
    }

    // Check for specific content access
    const contentAccess = await this.prisma.subscriptionAccess.findFirst({
      where: {
        contentId,
        revokedAt: null,
        subscription: {
          userId,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: { gte: new Date() },
        },
      },
    });

    if (contentAccess) {
      return {
        contentId,
        hasAccess: true,
        subscriptionId: contentAccess.subscriptionId,
      };
    }

    return {
      contentId,
      hasAccess: false,
      reason: 'Subscription required',
    };
  }

  /**
   * Cancel a subscription.
   */
  async cancelSubscription(userId: string, dto: CancelSubscriptionDto): Promise<UserSubscriptionDto> {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        id: dto.subscriptionId,
        userId,
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Подписка не активна');
    }

    const updatedSubscription = await this.prisma.$transaction(async (tx) => {
      if (dto.immediate) {
        // Cancel immediately
        const sub = await tx.userSubscription.update({
          where: { id: dto.subscriptionId },
          data: {
            status: SubscriptionStatus.CANCELLED,
            cancelledAt: new Date(),
            autoRenew: false,
          },
          include: { plan: true },
        });

        // Revoke content access
        await tx.subscriptionAccess.updateMany({
          where: { subscriptionId: dto.subscriptionId, revokedAt: null },
          data: { revokedAt: new Date() },
        });

        return sub;
      } else {
        // Cancel at end of period
        return tx.userSubscription.update({
          where: { id: dto.subscriptionId },
          data: {
            autoRenew: false,
            cancelledAt: new Date(),
          },
          include: { plan: true },
        });
      }
    });

    this.logger.log(
      `Subscription ${dto.subscriptionId} cancelled ${dto.immediate ? 'immediately' : 'at end of period'}`,
    );

    return this.mapToDto(updatedSubscription);
  }

  /**
   * Toggle auto-renewal.
   */
  async toggleAutoRenew(userId: string, dto: ToggleAutoRenewDto): Promise<UserSubscriptionDto> {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        id: dto.subscriptionId,
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Активная подписка не найдена');
    }

    const updated = await this.prisma.userSubscription.update({
      where: { id: dto.subscriptionId },
      data: { autoRenew: dto.autoRenew },
      include: { plan: true },
    });

    return this.mapToDto(updated);
  }

  /**
   * Process expired subscriptions (called by scheduler).
   */
  async processExpiredSubscriptions(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Find expired active subscriptions
      const expiredSubscriptions = await tx.userSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          expiresAt: { lt: now },
        },
      });

      // Update their status
      await tx.userSubscription.updateMany({
        where: {
          id: { in: expiredSubscriptions.map((s) => s.id) },
        },
        data: { status: SubscriptionStatus.EXPIRED },
      });

      // Revoke access for all expired subscriptions
      await tx.subscriptionAccess.updateMany({
        where: {
          subscriptionId: { in: expiredSubscriptions.map((s) => s.id) },
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      return expiredSubscriptions.length;
    });

    if (result > 0) {
      this.logger.log(`Processed ${result} expired subscriptions`);
    }

    return result;
  }

  /**
   * Map subscription to DTO.
   */
  private mapToDto(subscription: any): UserSubscriptionDto {
    const now = new Date();
    const expiresAt = new Date(subscription.expiresAt);
    const daysRemaining = Math.max(
      0,
      Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );

    return {
      id: subscription.id,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        description: subscription.plan.description,
        type: subscription.plan.type,
        contentId: subscription.plan.contentId || undefined,
        price: Number(subscription.plan.price),
        currency: subscription.plan.currency,
        durationDays: subscription.plan.durationDays,
        features: subscription.plan.features || [],
        isActive: subscription.plan.isActive,
        createdAt: subscription.plan.createdAt,
      },
      status: subscription.status,
      startedAt: subscription.startedAt,
      expiresAt: subscription.expiresAt,
      autoRenew: subscription.autoRenew,
      cancelledAt: subscription.cancelledAt || undefined,
      daysRemaining,
    };
  }
}
