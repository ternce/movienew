import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../config/prisma.service';
import { CacheService, CACHE_TTL, CACHE_KEYS } from '../../common/cache/cache.service';
import {
  CreateSubscriptionPlanDto,
  SubscriptionPlanDto,
  SubscriptionPlanQueryDto,
  UpdateSubscriptionPlanDto,
} from './dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get all active subscription plans.
   */
  async getActivePlans(query: SubscriptionPlanQueryDto = {}): Promise<SubscriptionPlanDto[]> {
    const cacheKey = CACHE_KEYS.subscription.plans() +
      ':' + CacheService.createKeyFromParams({ type: query.type, contentId: query.contentId });

    return this.cache.getOrSet(cacheKey, async () => {
      const where: Prisma.SubscriptionPlanWhereInput = {
        isActive: query.isActive !== false,
      };

      if (query.type) where.type = query.type;
      if (query.contentId) where.contentId = query.contentId;

      const plans = await this.prisma.subscriptionPlan.findMany({
        where,
        orderBy: [{ type: 'asc' }, { price: 'asc' }],
      });

      return plans.map(this.mapToDto);
    }, { ttl: CACHE_TTL.LONG });
  }

  /**
   * Get a single plan by ID.
   */
  async getPlanById(planId: string): Promise<SubscriptionPlanDto> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Тарифный план не найден');
    }

    return this.mapToDto(plan);
  }

  /**
   * Get plan by content ID (for individual content subscriptions).
   */
  async getPlanByContentId(contentId: string): Promise<SubscriptionPlanDto | null> {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { contentId, isActive: true },
    });

    return plan ? this.mapToDto(plan) : null;
  }

  /**
   * Create a new subscription plan (admin).
   */
  async createPlan(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanDto> {
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        contentId: dto.contentId,
        price: dto.price,
        durationDays: dto.durationDays,
        features: dto.features || [],
        isActive: true,
      },
    });

    await this.cache.invalidatePattern('subscription:plans*');
    return this.mapToDto(plan);
  }

  /**
   * Update a subscription plan (admin).
   */
  async updatePlan(planId: string, dto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlanDto> {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      throw new NotFoundException('Тарифный план не найден');
    }

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        durationDays: dto.durationDays,
        features: dto.features,
        isActive: dto.isActive,
      },
    });

    await this.cache.invalidatePattern('subscription:plans*');
    return this.mapToDto(plan);
  }

  /**
   * Deactivate a plan (soft delete).
   */
  async deactivatePlan(planId: string): Promise<void> {
    await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });
    await this.cache.invalidatePattern('subscription:plans*');
  }

  /**
   * Map Prisma model to DTO.
   */
  private mapToDto(plan: any): SubscriptionPlanDto {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      type: plan.type,
      contentId: plan.contentId || undefined,
      price: Number(plan.price),
      currency: plan.currency,
      durationDays: plan.durationDays,
      features: (plan.features as string[]) || [],
      isActive: plan.isActive,
      createdAt: plan.createdAt,
    };
  }
}
