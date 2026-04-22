import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  BonusCampaignStatus,
  BonusCampaignTargetType,
  BonusSource,
  BonusTransactionType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';
import { BonusesService } from '../../bonuses/bonuses.service';
import {
  AdminBonusStatsDto,
  AdjustBalanceDto,
  UserBonusDetailsDto,
  BonusCampaignDto,
  CampaignQueryDto,
  CreateBonusCampaignDto,
  UpdateBonusCampaignDto,
  CampaignExecutionResultDto,
  CreateBonusRateDto,
  UpdateBonusRateDto,
  BonusRateResponseDto,
} from '../../bonuses/dto';
import { BONUS_CONFIG } from '@movie-platform/shared';

@Injectable()
export class AdminBonusesService {
  private readonly logger = new Logger(AdminBonusesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bonusesService: BonusesService,
  ) {}

  /**
   * Get system-wide bonus statistics.
   */
  async getBonusStats(): Promise<AdminBonusStatsDto> {
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Run all queries in parallel
      const [
        totalBalance,
        todayStats,
        expiringSum,
        pendingWithdrawals,
        usersWithBalance,
      ] = await Promise.all([
        // Total bonuses in circulation (sum of all user balances)
        this.prisma.user.aggregate({
          _sum: { bonusBalance: true },
        }),

        // Today's earned and spent
        this.prisma.bonusTransaction.groupBy({
          by: ['type'],
          where: {
            createdAt: { gte: startOfDay },
          },
          _sum: { amount: true },
        }),

        // Bonuses expiring in next 30 days
        this.prisma.bonusTransaction.aggregate({
          where: {
            type: BonusTransactionType.EARNED,
            expiresAt: {
              gt: now,
              lte: thirtyDaysFromNow,
            },
            amount: { gt: 0 },
          },
          _sum: { amount: true },
        }),

        // Pending bonus withdrawals
        this.prisma.bonusWithdrawal.aggregate({
          where: { status: 'PENDING' },
          _sum: { bonusAmount: true },
        }),

        // Users with positive balance
        this.prisma.user.count({
          where: { bonusBalance: { gt: 0 } },
        }),
      ]);

      // Calculate today's earned and spent
      let earnedToday = 0;
      let spentToday = 0;
      for (const stat of todayStats) {
        const amount = Number(stat._sum.amount) || 0;
        if (stat.type === BonusTransactionType.EARNED) {
          earnedToday += amount;
        } else if (stat.type === BonusTransactionType.SPENT) {
          spentToday += Math.abs(amount);
        }
      }

      const totalInCirculation = Number(totalBalance._sum.bonusBalance) || 0;
      const averageBalance = usersWithBalance > 0 ? totalInCirculation / usersWithBalance : 0;

      return {
        totalInCirculation,
        earnedToday,
        spentToday,
        expiringIn30Days: Number(expiringSum._sum.amount) || 0,
        pendingWithdrawals: Number(pendingWithdrawals._sum.bonusAmount) || 0,
        usersWithBalance,
        averageBalance: Math.round(averageBalance * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get bonus stats', error);
      return {
        totalInCirculation: 0,
        earnedToday: 0,
        spentToday: 0,
        expiringIn30Days: 0,
        pendingWithdrawals: 0,
        usersWithBalance: 0,
        averageBalance: 0,
      };
    }
  }

  /**
   * Get user's bonus details for admin.
   */
  async getUserBonusDetails(userId: string): Promise<UserBonusDetailsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bonusBalance: true,
        _count: {
          select: { bonusTransactions: true },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    // Get statistics
    const [stats, expiring, lastTransaction] = await Promise.all([
      this.prisma.bonusTransaction.groupBy({
        by: ['type'],
        where: { userId },
        _sum: { amount: true },
      }),
      this.bonusesService.getExpiringBonuses(userId, 30),
      this.prisma.bonusTransaction.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    let lifetimeEarned = 0;
    let lifetimeSpent = 0;
    for (const stat of stats) {
      const amount = Number(stat._sum.amount) || 0;
      if (stat.type === BonusTransactionType.EARNED) {
        lifetimeEarned += amount;
      } else if (stat.type === BonusTransactionType.SPENT) {
        lifetimeSpent += Math.abs(amount);
      }
    }

    return {
      userId: user.id,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      balance: Number(user.bonusBalance),
      lifetimeEarned,
      lifetimeSpent,
      expiringIn30Days: expiring.totalExpiring,
      transactionCount: user._count.bonusTransactions,
      lastTransactionAt: lastTransaction?.createdAt,
    };
  }

  /**
   * Adjust user's bonus balance.
   */
  async adjustUserBalance(
    userId: string,
    dto: AdjustBalanceDto,
    adminId: string,
  ) {
    return this.bonusesService.adjustBalance(userId, dto.amount, dto.reason, adminId);
  }

  // ==================== RATE MANAGEMENT ====================

  /**
   * Get all bonus rates.
   */
  async getBonusRates(): Promise<BonusRateResponseDto[]> {
    const rates = await this.prisma.bonusRate.findMany({
      orderBy: [
        { isActive: 'desc' },
        { effectiveFrom: 'desc' },
      ],
    });

    return rates.map(this.mapToRateDto);
  }

  /**
   * Create a new bonus rate.
   */
  async createBonusRate(dto: CreateBonusRateDto, adminId: string): Promise<BonusRateResponseDto> {
    const rate = await this.prisma.bonusRate.create({
      data: {
        fromCurrency: dto.fromCurrency,
        toCurrency: dto.toCurrency,
        rate: dto.rate,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        isActive: true,
        createdById: adminId,
      },
    });

    // Log the action
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'BONUS_RATE_CREATED',
        entityType: 'BonusRate',
        entityId: rate.id,
        newValue: { rate: dto.rate, effectiveFrom: dto.effectiveFrom },
      },
    });

    return this.mapToRateDto(rate);
  }

  /**
   * Update a bonus rate.
   */
  async updateBonusRate(
    id: string,
    dto: UpdateBonusRateDto,
    adminId: string,
  ): Promise<BonusRateResponseDto> {
    const existing = await this.prisma.bonusRate.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Курс не найден');
    }

    const rate = await this.prisma.bonusRate.update({
      where: { id },
      data: {
        rate: dto.rate !== undefined ? dto.rate : undefined,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        isActive: dto.isActive,
      },
    });

    // Log the action
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'BONUS_RATE_UPDATED',
        entityType: 'BonusRate',
        entityId: rate.id,
        oldValue: { rate: Number(existing.rate), isActive: existing.isActive },
        newValue: { rate: Number(rate.rate), isActive: rate.isActive },
      },
    });

    return this.mapToRateDto(rate);
  }

  /**
   * Deactivate a bonus rate.
   */
  async deactivateRate(id: string, adminId: string): Promise<void> {
    const existing = await this.prisma.bonusRate.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Курс не найден');
    }

    await this.prisma.bonusRate.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'BONUS_RATE_DEACTIVATED',
        entityType: 'BonusRate',
        entityId: id,
      },
    });
  }

  // ==================== CAMPAIGN MANAGEMENT ====================

  /**
   * Get campaigns with pagination and filtering.
   */
  async getCampaigns(
    query: CampaignQueryDto,
  ): Promise<{ items: BonusCampaignDto[]; total: number; page: number; limit: number }> {
    const { status, page = 1, limit = 20 } = query;

    const where: Prisma.BonusCampaignWhereInput = {};
    if (status) {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      this.prisma.bonusCampaign.count({ where }),
      this.prisma.bonusCampaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map(this.mapToCampaignDto),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single campaign by ID.
   */
  async getCampaignById(id: string): Promise<BonusCampaignDto> {
    const campaign = await this.prisma.bonusCampaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new BadRequestException('Кампания не найдена');
    }
    return this.mapToCampaignDto(campaign);
  }

  /**
   * Create a new campaign.
   */
  async createCampaign(dto: CreateBonusCampaignDto, adminId: string): Promise<BonusCampaignDto> {
    const campaign = await this.prisma.bonusCampaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        bonusAmount: dto.bonusAmount,
        targetType: dto.targetType,
        targetCriteria: (dto.targetCriteria ?? {}) as unknown as Prisma.InputJsonValue,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        expiryDays: dto.expiryDays,
        usageLimit: dto.usageLimit,
        status: BonusCampaignStatus.DRAFT,
        createdById: adminId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'BONUS_CAMPAIGN_CREATED',
        entityType: 'BonusCampaign',
        entityId: campaign.id,
        newValue: { name: campaign.name, bonusAmount: Number(campaign.bonusAmount) },
      },
    });

    return this.mapToCampaignDto(campaign);
  }

  /**
   * Update a campaign.
   */
  async updateCampaign(
    id: string,
    dto: UpdateBonusCampaignDto,
    adminId: string,
  ): Promise<BonusCampaignDto> {
    const existing = await this.prisma.bonusCampaign.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Кампания не найдена');
    }

    // Can't update executed or completed campaigns
    if (existing.status === BonusCampaignStatus.COMPLETED) {
      throw new BadRequestException('Невозможно обновить завершённую кампанию');
    }

    const campaign = await this.prisma.bonusCampaign.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        bonusAmount: dto.bonusAmount,
        targetType: dto.targetType,
        targetCriteria: dto.targetCriteria as unknown as Prisma.InputJsonValue,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        expiryDays: dto.expiryDays,
        usageLimit: dto.usageLimit,
        status: dto.status,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'BONUS_CAMPAIGN_UPDATED',
        entityType: 'BonusCampaign',
        entityId: campaign.id,
        oldValue: { name: existing.name, status: existing.status },
        newValue: { name: campaign.name, status: campaign.status },
      },
    });

    return this.mapToCampaignDto(campaign);
  }

  /**
   * Execute a campaign - grant bonuses to target users.
   */
  async executeCampaign(campaignId: string, adminId: string): Promise<CampaignExecutionResultDto> {
    const campaign = await this.prisma.bonusCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      throw new BadRequestException('Кампания не найдена');
    }

    if (campaign.status !== BonusCampaignStatus.ACTIVE) {
      throw new BadRequestException('Кампания должна иметь статус ACTIVE для выполнения');
    }

    // Check date constraints
    const now = new Date();
    if (campaign.startDate > now) {
      throw new BadRequestException('Кампания ещё не началась');
    }
    if (campaign.endDate && campaign.endDate < now) {
      throw new BadRequestException('Кампания уже завершена');
    }

    // Get target users based on targetType
    const targetUsers = await this.getTargetUsers(campaign);

    // Apply usage limit
    const usersToProcess = campaign.usageLimit
      ? targetUsers.slice(0, campaign.usageLimit - campaign.usedCount)
      : targetUsers;

    if (usersToProcess.length === 0) {
      throw new BadRequestException('Подходящие пользователи не найдены или лимит использования исчерпан');
    }

    const bonusAmount = Number(campaign.bonusAmount);
    const expiryDays = campaign.expiryDays || BONUS_CONFIG.DEFAULT_EXPIRY_DAYS;

    let usersAwarded = 0;

    // Process users in batches
    const batchSize = 100;
    for (let i = 0; i < usersToProcess.length; i += batchSize) {
      const batch = usersToProcess.slice(i, i + batchSize);

      await this.prisma.$transaction(async (tx) => {
        for (const user of batch) {
          await this.bonusesService.earnBonuses(
            {
              userId: user.id,
              amount: bonusAmount,
              source: BonusSource.PROMO,
              referenceId: campaignId,
              referenceType: 'BonusCampaign',
              description: `Campaign bonus: ${campaign.name}`,
              expiryDays,
              metadata: {
                campaignId,
                campaignName: campaign.name,
              },
            },
            tx,
          );
          usersAwarded++;
        }

        // Update campaign used count
        await tx.bonusCampaign.update({
          where: { id: campaignId },
          data: {
            usedCount: { increment: batch.length },
          },
        });
      });
    }

    // Mark campaign as completed if usage limit reached
    const updatedCampaign = await this.prisma.bonusCampaign.findUnique({ where: { id: campaignId } });
    if (updatedCampaign && campaign.usageLimit && updatedCampaign.usedCount >= campaign.usageLimit) {
      await this.prisma.bonusCampaign.update({
        where: { id: campaignId },
        data: {
          status: BonusCampaignStatus.COMPLETED,
          executedAt: new Date(),
        },
      });
    } else if (!campaign.executedAt) {
      await this.prisma.bonusCampaign.update({
        where: { id: campaignId },
        data: { executedAt: new Date() },
      });
    }

    // Log the execution
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'BONUS_CAMPAIGN_EXECUTED',
        entityType: 'BonusCampaign',
        entityId: campaignId,
        newValue: {
          usersAwarded,
          totalAmount: usersAwarded * bonusAmount,
        },
      },
    });

    this.logger.log(`Campaign ${campaignId} executed: ${usersAwarded} users, ${usersAwarded * bonusAmount} bonuses`);

    return {
      usersAwarded,
      totalAmount: usersAwarded * bonusAmount,
      campaignId,
    };
  }

  /**
   * Cancel a campaign.
   */
  async cancelCampaign(campaignId: string, adminId: string): Promise<void> {
    const campaign = await this.prisma.bonusCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      throw new BadRequestException('Кампания не найдена');
    }

    if (campaign.status === BonusCampaignStatus.COMPLETED) {
      throw new BadRequestException('Невозможно отменить завершённую кампанию');
    }

    await this.prisma.bonusCampaign.update({
      where: { id: campaignId },
      data: { status: BonusCampaignStatus.CANCELLED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'BONUS_CAMPAIGN_CANCELLED',
        entityType: 'BonusCampaign',
        entityId: campaignId,
      },
    });
  }

  /**
   * Export bonus report (CSV).
   */
  async exportBonusReport(query: {
    fromDate?: string;
    toDate?: string;
    format?: 'csv' | 'xlsx';
  }): Promise<Buffer> {
    const where: Prisma.BonusTransactionWhereInput = {};

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) {
        where.createdAt.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.createdAt.lte = new Date(query.toDate);
      }
    }

    const transactions = await this.prisma.bonusTransaction.findMany({
      where,
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to 10k records
    });

    // Generate CSV
    const headers = ['ID', 'User Email', 'User Name', 'Type', 'Amount', 'Source', 'Description', 'Created At'];
    const rows = transactions.map((t) => [
      t.id,
      t.user.email,
      `${t.user.firstName} ${t.user.lastName}`,
      t.type,
      Number(t.amount).toString(),
      t.source,
      t.description,
      t.createdAt.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return Buffer.from(csv, 'utf-8');
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Get target users for a campaign.
   */
  private async getTargetUsers(
    campaign: { targetType: BonusCampaignTargetType; targetCriteria: unknown },
  ): Promise<{ id: string }[]> {
    const criteria = campaign.targetCriteria as Record<string, unknown> || {};

    switch (campaign.targetType) {
      case BonusCampaignTargetType.ALL:
        return this.prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });

      case BonusCampaignTargetType.INDIVIDUAL:
        const userIds = criteria.userIds as string[];
        if (!userIds || userIds.length === 0) {
          return [];
        }
        return this.prisma.user.findMany({
          where: { id: { in: userIds }, isActive: true },
          select: { id: true },
        });

      case BonusCampaignTargetType.SEGMENT:
        // Build query based on segment criteria
        const segmentWhere: Prisma.UserWhereInput = { isActive: true };

        if (criteria.minBalance !== undefined) {
          segmentWhere.bonusBalance = { gte: criteria.minBalance as number };
        }
        if (criteria.role) {
          segmentWhere.role = criteria.role as any;
        }
        if (criteria.verificationStatus) {
          segmentWhere.verificationStatus = criteria.verificationStatus as any;
        }
        if (criteria.registeredAfter) {
          segmentWhere.createdAt = { gte: new Date(criteria.registeredAfter as string) };
        }

        return this.prisma.user.findMany({
          where: segmentWhere,
          select: { id: true },
        });

      default:
        return [];
    }
  }

  private mapToRateDto(rate: any): BonusRateResponseDto {
    return {
      id: rate.id,
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: Number(rate.rate),
      effectiveFrom: rate.effectiveFrom,
      effectiveTo: rate.effectiveTo || undefined,
      isActive: rate.isActive,
      createdById: rate.createdById || undefined,
      createdAt: rate.createdAt,
    };
  }

  private mapToCampaignDto(campaign: any): BonusCampaignDto {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description || undefined,
      bonusAmount: Number(campaign.bonusAmount),
      targetType: campaign.targetType,
      targetCriteria: campaign.targetCriteria as Record<string, unknown> || undefined,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate || undefined,
      expiryDays: campaign.expiryDays || undefined,
      usageLimit: campaign.usageLimit || undefined,
      usedCount: campaign.usedCount,
      createdById: campaign.createdById,
      createdAt: campaign.createdAt,
      executedAt: campaign.executedAt || undefined,
    };
  }
}
