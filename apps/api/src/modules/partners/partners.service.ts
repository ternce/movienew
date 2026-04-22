import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommissionStatus, Prisma, TaxStatus, TransactionStatus, WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PrismaService } from '../../config/prisma.service';
import { COMMISSION_RATES_BY_DEPTH, PARTNER_LEVELS, TAX_RATES } from '@movie-platform/shared';
import {
  AvailableBalanceDto,
  CommissionDto,
  CommissionQueryDto,
  CreateWithdrawalDto,
  PartnerDashboardDto,
  PartnerLevelDto,
  ReferralNodeDto,
  ReferralTreeDto,
  TaxCalculationDto,
  WithdrawalDto,
  WithdrawalQueryDto,
} from './dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get partner dashboard statistics.
   */
  async getDashboard(userId: string): Promise<PartnerDashboardDto> {
    // Get current partner level
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Get all statistics in parallel
    const [
      directReferrals,
      teamSize,
      approvedCommissions,
      pendingCommissions,
      withdrawals,
      thisMonthCommissions,
      lastMonthCommissions,
      teamVolume,
    ] = await Promise.all([
      // Direct referrals (level 1)
      this.prisma.partnerRelationship.count({
        where: { partnerId: userId, level: 1 },
      }),
      // Total team size (all levels)
      this.prisma.partnerRelationship.count({
        where: { partnerId: userId },
      }),
      // Approved commissions
      this.prisma.partnerCommission.aggregate({
        where: { partnerId: userId, status: CommissionStatus.APPROVED },
        _sum: { amount: true },
      }),
      // Pending commissions
      this.prisma.partnerCommission.aggregate({
        where: { partnerId: userId, status: CommissionStatus.PENDING },
        _sum: { amount: true },
      }),
      // Completed withdrawals
      this.prisma.withdrawalRequest.aggregate({
        where: { userId, status: WithdrawalStatus.COMPLETED },
        _sum: { amount: true },
      }),
      // This month commissions
      this.getMonthCommissions(userId, 0),
      // Last month commissions
      this.getMonthCommissions(userId, -1),
      // Team volume
      this.getTeamVolume(userId),
    ]);

    // Get active referrals (those with transactions)
    const activeReferrals = await this.getActiveReferralsCount(userId);

    // Calculate totals
    const totalApproved = Number(approvedCommissions._sum.amount) || 0;
    const totalPending = Number(pendingCommissions._sum.amount) || 0;
    const totalWithdrawn = Number(withdrawals._sum.amount) || 0;

    // Determine current level based on referrals and team volume
    const currentLevel = this.calculateLevel(directReferrals, teamVolume);
    const levelInfo = PARTNER_LEVELS[currentLevel as keyof typeof PARTNER_LEVELS];

    // Calculate next level progress
    const nextLevelProgress = this.calculateNextLevelProgress(
      currentLevel,
      directReferrals,
      teamVolume,
    );

    return {
      currentLevel,
      levelName: levelInfo.name,
      totalReferrals: directReferrals,
      activeReferrals,
      teamSize,
      totalEarnings: totalApproved,
      pendingEarnings: totalPending,
      availableBalance: totalApproved - totalWithdrawn,
      thisMonthEarnings: thisMonthCommissions,
      lastMonthEarnings: lastMonthCommissions,
      nextLevelProgress,
    };
  }

  /**
   * Get referral tree structure.
   */
  async getReferralTree(userId: string, maxDepth: number = 1): Promise<ReferralTreeDto> {
    // Get direct referrals with their stats
    const directRelationships = await this.prisma.partnerRelationship.findMany({
      where: { partnerId: userId, level: 1 },
      include: {
        referral: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get transaction totals for each referral
    const referralIds = directRelationships.map(r => r.referralId);
    const transactionTotals = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: referralIds },
        status: TransactionStatus.COMPLETED,
      },
      _sum: { amount: true },
    });

    const totalsMap = new Map(
      transactionTotals.map(t => [t.userId, Number(t._sum.amount) || 0]),
    );

    // Build tree nodes
    const directReferrals: ReferralNodeDto[] = await Promise.all(
      directRelationships.map(async (rel) => {
        const totalSpent = totalsMap.get(rel.referralId) || 0;
        let children: ReferralNodeDto[] = [];

        // If depth > 1, fetch children recursively
        if (maxDepth > 1) {
          children = await this.getChildReferrals(rel.referralId, 2, maxDepth);
        }

        return {
          userId: rel.referral.id,
          firstName: rel.referral.firstName || 'Unknown',
          lastName: rel.referral.lastName || undefined,
          email: rel.referral.email,
          level: 1,
          joinedAt: rel.referral.createdAt,
          totalSpent,
          isActive: totalSpent > 0,
          children,
        };
      }),
    );

    // Get total team size
    const totalTeamSize = await this.prisma.partnerRelationship.count({
      where: { partnerId: userId },
    });

    return {
      directReferrals,
      directCount: directReferrals.length,
      totalTeamSize,
    };
  }

  /**
   * Get commission history.
   */
  async getCommissions(
    userId: string,
    query: CommissionQueryDto,
  ): Promise<{ items: CommissionDto[]; total: number; page: number; limit: number }> {
    const { status, level, fromDate, toDate, page = 1, limit = 20 } = query;

    const where: Prisma.PartnerCommissionWhereInput = { partnerId: userId };

    if (status) where.status = status;
    if (level) where.level = level;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [total, commissions] = await Promise.all([
      this.prisma.partnerCommission.count({ where }),
      this.prisma.partnerCommission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Fetch source users separately
    const sourceUserIds = [...new Set(commissions.map(c => c.sourceUserId))];
    const sourceUsers = await this.prisma.user.findMany({
      where: { id: { in: sourceUserIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(sourceUsers.map(u => [u.id, u]));

    return {
      items: commissions.map(c => {
        const user = userMap.get(c.sourceUserId);
        return {
          id: c.id,
          sourceUser: {
            id: c.sourceUserId,
            firstName: user?.firstName || 'Unknown',
            lastName: user?.lastName || undefined,
          },
          level: c.level,
          amount: Number(c.amount),
          status: c.status,
          createdAt: c.createdAt,
          paidAt: c.paidAt || undefined,
        };
      }),
      total,
      page,
      limit,
    };
  }

  /**
   * Get available balance for withdrawal.
   */
  async getAvailableBalance(userId: string): Promise<AvailableBalanceDto> {
    const [approvedCommissions, pendingWithdrawals, completedWithdrawals] = await Promise.all([
      this.prisma.partnerCommission.aggregate({
        where: { partnerId: userId, status: CommissionStatus.APPROVED },
        _sum: { amount: true },
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: {
          userId,
          status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING] },
        },
        _sum: { amount: true },
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { userId, status: WithdrawalStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    const totalEarnings = Number(approvedCommissions._sum.amount) || 0;
    const pendingAmount = Number(pendingWithdrawals._sum.amount) || 0;
    const withdrawnAmount = Number(completedWithdrawals._sum.amount) || 0;

    return {
      totalEarnings,
      pendingWithdrawals: pendingAmount,
      withdrawnAmount,
      availableBalance: totalEarnings - pendingAmount - withdrawnAmount,
    };
  }

  /**
   * Create withdrawal request.
   */
  async createWithdrawal(userId: string, dto: CreateWithdrawalDto): Promise<WithdrawalDto> {
    // Check available balance
    const balance = await this.getAvailableBalance(userId);

    if (dto.amount > balance.availableBalance) {
      throw new BadRequestException('Недостаточно средств для вывода');
    }

    // Calculate tax
    const taxCalc = this.calculateTax(dto.amount, dto.taxStatus);

    // Create withdrawal request
    const withdrawal = await this.prisma.withdrawalRequest.create({
      data: {
        userId,
        amount: dto.amount,
        currency: 'RUB',
        paymentDetails: dto.paymentDetails as any,
        taxStatus: dto.taxStatus,
        taxAmount: taxCalc.taxAmount,
        status: WithdrawalStatus.PENDING,
      },
    });

    return {
      id: withdrawal.id,
      amount: Number(withdrawal.amount),
      taxStatus: withdrawal.taxStatus,
      taxAmount: Number(withdrawal.taxAmount),
      netAmount: taxCalc.netAmount,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      processedAt: withdrawal.processedAt || undefined,
      rejectionReason: withdrawal.rejectionReason || undefined,
    };
  }

  /**
   * Get withdrawal history.
   */
  async getWithdrawals(
    userId: string,
    query: WithdrawalQueryDto,
  ): Promise<{ items: WithdrawalDto[]; total: number; page: number; limit: number }> {
    const { status, fromDate, toDate, page = 1, limit = 20 } = query;

    const where: Prisma.WithdrawalRequestWhereInput = { userId };

    if (status) where.status = status;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.withdrawalRequest.count({ where }),
      this.prisma.withdrawalRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map(w => ({
        id: w.id,
        amount: Number(w.amount),
        taxStatus: w.taxStatus,
        taxAmount: Number(w.taxAmount),
        netAmount: Number(w.amount) - Number(w.taxAmount),
        status: w.status,
        createdAt: w.createdAt,
        processedAt: w.processedAt || undefined,
        rejectionReason: w.rejectionReason || undefined,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Calculate tax based on tax status.
   */
  calculateTax(amount: number, taxStatus: TaxStatus): TaxCalculationDto {
    let rate: number;

    switch (taxStatus) {
      case TaxStatus.INDIVIDUAL:
        rate = TAX_RATES.INDIVIDUAL;
        break;
      case TaxStatus.SELF_EMPLOYED:
        rate = TAX_RATES.SELF_EMPLOYED;
        break;
      case TaxStatus.ENTREPRENEUR:
        rate = TAX_RATES.ENTREPRENEUR;
        break;
      case TaxStatus.COMPANY:
        rate = 0; // Company handles own taxes
        break;
      default:
        rate = TAX_RATES.INDIVIDUAL;
    }

    const taxAmount = Math.round(amount * rate * 100) / 100;
    const netAmount = amount - taxAmount;

    return {
      grossAmount: amount,
      taxRate: rate,
      taxAmount,
      netAmount,
    };
  }

  /**
   * Get all partner levels configuration.
   */
  getPartnerLevels(): PartnerLevelDto[] {
    return Object.entries(PARTNER_LEVELS).map(([level, config]) => ({
      id: `level-${level}`,
      levelNumber: parseInt(level),
      name: config.name,
      commissionRate: config.commissionRate,
      minReferrals: config.minReferrals,
      minTeamVolume: config.minTeamVolume,
      benefits: this.getLevelBenefits(parseInt(level)),
    }));
  }

  /**
   * Calculate and create commissions for a transaction.
   * Called by PaymentsService when a payment is completed.
   */
  async calculateAndCreateCommissions(
    transactionId: string,
    purchaserUserId: string,
    amount: Decimal,
  ): Promise<void> {
    // Get all partners (upline) for this user, up to 5 levels
    const partnerRelationships = await this.prisma.partnerRelationship.findMany({
      where: { referralId: purchaserUserId },
      orderBy: { level: 'asc' },
      take: 5,
    });

    if (partnerRelationships.length === 0) return;

    // Calculate commissions for each level
    const commissionsToCreate = partnerRelationships
      .map((rel) => {
        const rate = COMMISSION_RATES_BY_DEPTH[rel.level as keyof typeof COMMISSION_RATES_BY_DEPTH] || 0;
        const commissionAmount = amount.mul(rate);

        if (commissionAmount.lte(0)) return null;

        return {
          partnerId: rel.partnerId,
          sourceUserId: purchaserUserId,
          sourceTransactionId: transactionId,
          level: rel.level,
          amount: commissionAmount,
          status: CommissionStatus.PENDING,
        };
      })
      .filter(Boolean) as Prisma.PartnerCommissionCreateManyInput[];

    if (commissionsToCreate.length === 0) return;

    // Create all commissions in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.partnerCommission.createMany({
        data: commissionsToCreate,
      });

      // Log to audit trail
      await tx.auditLog.create({
        data: {
          action: 'COMMISSIONS_CREATED',
          entityType: 'Transaction',
          entityId: transactionId,
          newValue: {
            transactionId,
            purchaserUserId,
            amount: amount.toString(),
            commissionsCount: commissionsToCreate.length,
          },
        },
      });
    });
  }

  // ============ Private Helper Methods ============

  private async getMonthCommissions(userId: string, monthOffset: number): Promise<number> {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);

    const result = await this.prisma.partnerCommission.aggregate({
      where: {
        partnerId: userId,
        status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] },
        createdAt: {
          gte: targetMonth,
          lt: nextMonth,
        },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount) || 0;
  }

  private async getTeamVolume(userId: string): Promise<number> {
    // Get all referrals for this partner
    const referralIds = await this.prisma.partnerRelationship.findMany({
      where: { partnerId: userId },
      select: { referralId: true },
    });

    const ids = referralIds.map(r => r.referralId);

    if (ids.length === 0) return 0;

    // Sum all completed transactions from these users
    const result = await this.prisma.transaction.aggregate({
      where: {
        userId: { in: ids },
        status: TransactionStatus.COMPLETED,
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount) || 0;
  }

  private async getActiveReferralsCount(userId: string): Promise<number> {
    // Get direct referrals
    const directReferrals = await this.prisma.partnerRelationship.findMany({
      where: { partnerId: userId, level: 1 },
      select: { referralId: true },
    });

    const referralIds = directReferrals.map(r => r.referralId);

    if (referralIds.length === 0) return 0;

    // Count those with transactions
    const activeCount = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: referralIds },
        status: TransactionStatus.COMPLETED,
      },
    });

    return activeCount.length;
  }

  private calculateLevel(referralsCount: number, teamVolume: number): number {
    // Check from highest level to lowest
    for (let level = 5; level >= 1; level--) {
      const config = PARTNER_LEVELS[level as keyof typeof PARTNER_LEVELS];
      if (referralsCount >= config.minReferrals && teamVolume >= config.minTeamVolume) {
        return level;
      }
    }
    return 1;
  }

  private calculateNextLevelProgress(
    currentLevel: number,
    referralsCount: number,
    teamVolume: number,
  ): PartnerDashboardDto['nextLevelProgress'] {
    if (currentLevel >= 5) {
      // Already at max level
      const maxConfig = PARTNER_LEVELS[5];
      return {
        nextLevel: 5,
        nextLevelName: maxConfig.name,
        referralsNeeded: maxConfig.minReferrals,
        currentReferrals: referralsCount,
        teamVolumeNeeded: maxConfig.minTeamVolume,
        currentTeamVolume: teamVolume,
        progressPercent: 100,
      };
    }

    const nextLevel = currentLevel + 1;
    const nextConfig = PARTNER_LEVELS[nextLevel as keyof typeof PARTNER_LEVELS];

    // Calculate progress (average of referrals and volume progress)
    const referralProgress = Math.min(100, (referralsCount / nextConfig.minReferrals) * 100);
    const volumeProgress = nextConfig.minTeamVolume > 0
      ? Math.min(100, (teamVolume / nextConfig.minTeamVolume) * 100)
      : 100;
    const progressPercent = Math.round((referralProgress + volumeProgress) / 2);

    return {
      nextLevel,
      nextLevelName: nextConfig.name,
      referralsNeeded: nextConfig.minReferrals,
      currentReferrals: referralsCount,
      teamVolumeNeeded: nextConfig.minTeamVolume,
      currentTeamVolume: teamVolume,
      progressPercent,
    };
  }

  private async getChildReferrals(
    userId: string,
    currentLevel: number,
    maxDepth: number,
  ): Promise<ReferralNodeDto[]> {
    if (currentLevel > maxDepth) return [];

    const relationships = await this.prisma.partnerRelationship.findMany({
      where: { partnerId: userId, level: 1 },
      include: {
        referral: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    return Promise.all(
      relationships.map(async (rel) => {
        const transactionSum = await this.prisma.transaction.aggregate({
          where: { userId: rel.referralId, status: TransactionStatus.COMPLETED },
          _sum: { amount: true },
        });

        const totalSpent = Number(transactionSum._sum.amount) || 0;
        const children = await this.getChildReferrals(rel.referralId, currentLevel + 1, maxDepth);

        return {
          userId: rel.referral.id,
          firstName: rel.referral.firstName || 'Unknown',
          lastName: rel.referral.lastName || undefined,
          email: rel.referral.email,
          level: currentLevel,
          joinedAt: rel.referral.createdAt,
          totalSpent,
          isActive: totalSpent > 0,
          children,
        };
      }),
    );
  }

  private getLevelBenefits(level: number): string[] {
    const benefits: string[] = ['Базовые комиссии'];

    if (level >= 2) benefits.push('Повышенная ставка комиссии');
    if (level >= 3) benefits.push('Приоритетная поддержка');
    if (level >= 4) benefits.push('Эксклюзивные материалы');
    if (level >= 5) benefits.push('VIP статус', 'Персональный менеджер');

    return benefits;
  }
}
