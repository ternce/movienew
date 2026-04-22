import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';
import {
  AdminSubscriptionDto,
  AdminSubscriptionQueryDto,
  AdminSubscriptionListDto,
  AdminSubscriptionStatsDto,
  AdminExpiringSubscriptionDto,
  AdminSubscriptionPlanDto,
} from '../dto/subscription';

@Injectable()
export class AdminSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get subscriptions with filters and pagination.
   */
  async getSubscriptions(query: AdminSubscriptionQueryDto): Promise<AdminSubscriptionListDto> {
    const { status, planType, search, autoRenew, page = 1, limit = 20 } = query;

    const where: Prisma.UserSubscriptionWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (planType) {
      where.plan = { type: planType };
    }

    if (autoRenew !== undefined) {
      where.autoRenew = autoRenew;
    }

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, subscriptions] = await Promise.all([
      this.prisma.userSubscription.count({ where }),
      this.prisma.userSubscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { expiresAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              type: true,
              price: true,
              durationDays: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: subscriptions.map((s) => this.mapToDto(s)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get subscription by ID.
   */
  async getSubscriptionById(id: string): Promise<AdminSubscriptionDto> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            type: true,
            price: true,
            durationDays: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    return this.mapToDto(subscription);
  }

  /**
   * Get subscription statistics.
   */
  async getStats(): Promise<AdminSubscriptionStatsDto> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [active, cancelled, expired, paused, total, expiringIn7Days, mrrResult, avgDuration] =
      await Promise.all([
        this.prisma.userSubscription.count({
          where: { status: SubscriptionStatus.ACTIVE },
        }),
        this.prisma.userSubscription.count({
          where: { status: SubscriptionStatus.CANCELLED },
        }),
        this.prisma.userSubscription.count({
          where: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.userSubscription.count({
          where: { status: SubscriptionStatus.PAUSED },
        }),
        this.prisma.userSubscription.count(),
        this.prisma.userSubscription.count({
          where: {
            status: SubscriptionStatus.ACTIVE,
            expiresAt: { lte: sevenDaysFromNow },
          },
        }),
        // Calculate Monthly Recurring Revenue
        this.prisma.$queryRaw<[{ mrr: number }]>`
          SELECT COALESCE(SUM(p.price), 0)::numeric AS mrr
          FROM user_subscriptions s
          JOIN subscription_plans p ON s.plan_id = p.id
          WHERE s.status = 'ACTIVE' AND s.auto_renew = true
        `,
        // Calculate average subscription duration
        this.prisma.$queryRaw<[{ avg: number }]>`
          SELECT COALESCE(AVG(p.duration_days), 0)::numeric AS avg
          FROM user_subscriptions s
          JOIN subscription_plans p ON s.plan_id = p.id
          WHERE s.status = 'ACTIVE'
        `,
      ]);

    return {
      active,
      cancelled,
      expired,
      paused,
      total,
      monthlyRecurringRevenue: Math.round(Number(mrrResult[0]?.mrr || 0) * 100), // Convert to kopecks
      expiringIn7Days,
      avgDurationDays: Math.round(Number(avgDuration[0]?.avg || 0)),
    };
  }

  /**
   * Get subscriptions expiring soon.
   */
  async getExpiringSubscriptions(days: number = 7): Promise<AdminExpiringSubscriptionDto[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const subscriptions = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: { expiresAt: 'asc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            type: true,
            price: true,
            durationDays: true,
          },
        },
      },
    });

    return subscriptions.map((s) => {
      const dto = this.mapToDto(s) as AdminExpiringSubscriptionDto;
      dto.daysUntilExpiry = Math.ceil(
        (new Date(s.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return dto;
    });
  }

  /**
   * Extend a subscription by specified days.
   */
  async extendSubscription(
    id: string,
    days: number,
    reason: string | undefined,
    adminId: string
  ): Promise<AdminSubscriptionDto> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        `Подписка должна иметь статус ACTIVE для продления, текущий статус: ${subscription.status}`
      );
    }

    const newExpiresAt = new Date(subscription.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.userSubscription.update({
        where: { id },
        data: { expiresAt: newExpiresAt },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              type: true,
              price: true,
              durationDays: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'SUBSCRIPTION_EXTENDED',
          entityType: 'UserSubscription',
          entityId: id,
          oldValue: { expiresAt: subscription.expiresAt },
          newValue: { expiresAt: newExpiresAt, days, reason },
        },
      });

      return updatedSubscription;
    });

    return this.mapToDto(updated);
  }

  /**
   * Force cancel a subscription.
   */
  async cancelSubscription(
    id: string,
    reason: string,
    adminId: string
  ): Promise<AdminSubscriptionDto> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Подписка не найдена');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Подписка уже отменена');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.userSubscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
          autoRenew: false,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              type: true,
              price: true,
              durationDays: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'SUBSCRIPTION_CANCELLED_BY_ADMIN',
          entityType: 'UserSubscription',
          entityId: id,
          oldValue: { status: subscription.status },
          newValue: { status: SubscriptionStatus.CANCELLED, reason },
        },
      });

      return updatedSubscription;
    });

    return this.mapToDto(updated);
  }

  /**
   * Map subscription to DTO.
   */
  private mapToDto(subscription: any): AdminSubscriptionDto {
    const now = new Date();
    const expiresAt = new Date(subscription.expiresAt);
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const planDto: AdminSubscriptionPlanDto = {
      id: subscription.plan.id,
      name: subscription.plan.name,
      type: subscription.plan.type,
      price: Number(subscription.plan.price),
      durationDays: subscription.plan.durationDays,
    };

    return {
      id: subscription.id,
      userId: subscription.userId,
      userEmail: subscription.user.email,
      userFirstName: subscription.user.firstName,
      userLastName: subscription.user.lastName,
      plan: planDto,
      status: subscription.status,
      startedAt: subscription.startedAt,
      expiresAt: subscription.expiresAt,
      autoRenew: subscription.autoRenew,
      cancelledAt: subscription.cancelledAt,
      daysRemaining,
    };
  }
}
