import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommissionStatus, Prisma, TransactionStatus, WithdrawalStatus } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';
import { PARTNER_LEVELS, TAX_RATES } from '@movie-platform/shared';
import {
  AdminPartnersQueryDto,
  AdminCommissionsQueryDto,
  AdminWithdrawalsQueryDto,
} from '../dto/partner/admin-partner-query.dto';
import {
  AdminPartnerDto,
  AdminPartnerListDto,
  AdminPartnerStatsDto,
  AdminPartnerDetailDto,
} from '../dto/partner/admin-partner.dto';
import {
  AdminCommissionDto,
  AdminCommissionListDto,
  BatchCommissionActionResponseDto,
} from '../dto/partner/admin-commission.dto';
import {
  AdminWithdrawalDto,
  AdminWithdrawalListDto,
  AdminWithdrawalStatsDto,
} from '../dto/partner/admin-withdrawal.dto';

@Injectable()
export class AdminPartnersService {
  private readonly logger = new Logger(AdminPartnersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get partner program statistics.
   */
  async getPartnersStats(): Promise<AdminPartnerStatsDto> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalPartners,
        newPartnersThisMonth,
        partnersWithReferrals,
        pendingCommissions,
        pendingCommissionCount,
        approvedCommissions,
        pendingWithdrawals,
        pendingWithdrawalCount,
        completedWithdrawals,
        commissionsThisMonth,
        withdrawalsThisMonth,
      ] = await Promise.all([
        // Total partners (users with at least one referral OR with commissions)
        this.prisma.user.count({
          where: {
            OR: [
              { partnerAsPartner: { some: {} } },
              { commissions: { some: {} } },
            ],
          },
        }),
        // New partners this month
        this.prisma.user.count({
          where: {
            createdAt: { gte: startOfMonth },
            OR: [
              { partnerAsPartner: { some: {} } },
              { referredById: { not: null } },
            ],
          },
        }),
        // Active partners (those with referrals)
        this.prisma.user.count({
          where: {
            partnerAsPartner: { some: { level: 1 } },
          },
        }),
        // Pending commissions total
        this.prisma.partnerCommission.aggregate({
          where: { status: CommissionStatus.PENDING },
          _sum: { amount: true },
        }),
        // Pending commission count
        this.prisma.partnerCommission.count({
          where: { status: CommissionStatus.PENDING },
        }),
        // Total approved commissions
        this.prisma.partnerCommission.aggregate({
          where: { status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] } },
          _sum: { amount: true },
        }),
        // Pending withdrawals
        this.prisma.withdrawalRequest.aggregate({
          where: { status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED] } },
          _sum: { amount: true },
        }),
        // Pending withdrawal count
        this.prisma.withdrawalRequest.count({
          where: { status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED] } },
        }),
        // Completed withdrawals
        this.prisma.withdrawalRequest.aggregate({
          where: { status: WithdrawalStatus.COMPLETED },
          _sum: { amount: true },
        }),
        // Commissions this month
        this.prisma.partnerCommission.aggregate({
          where: {
            createdAt: { gte: startOfMonth },
            status: { in: [CommissionStatus.APPROVED, CommissionStatus.PAID] },
          },
          _sum: { amount: true },
        }),
        // Withdrawals this month
        this.prisma.withdrawalRequest.aggregate({
          where: {
            createdAt: { gte: startOfMonth },
            status: WithdrawalStatus.COMPLETED,
          },
          _sum: { amount: true },
        }),
      ]);

      // Count partners by level (this is more complex)
      const partnersByLevel = await this.getPartnersByLevel();

      return {
        totalPartners,
        newPartnersThisMonth,
        activePartners: partnersWithReferrals,
        partnersByLevel,
        totalCommissionsPaid: Number(approvedCommissions._sum.amount) || 0,
        pendingCommissions: Number(pendingCommissions._sum.amount) || 0,
        pendingCommissionCount,
        totalWithdrawals: Number(completedWithdrawals._sum.amount) || 0,
        pendingWithdrawals: Number(pendingWithdrawals._sum.amount) || 0,
        pendingWithdrawalCount,
        commissionsThisMonth: Number(commissionsThisMonth._sum.amount) || 0,
        withdrawalsThisMonth: Number(withdrawalsThisMonth._sum.amount) || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get partners stats', error);
      return {
        totalPartners: 0,
        newPartnersThisMonth: 0,
        activePartners: 0,
        partnersByLevel: { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
        totalCommissionsPaid: 0,
        pendingCommissions: 0,
        pendingCommissionCount: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        pendingWithdrawalCount: 0,
        commissionsThisMonth: 0,
        withdrawalsThisMonth: 0,
      };
    }
  }

  /**
   * Get partners list with pagination.
   */
  async getPartnersList(query: AdminPartnersQueryDto): Promise<AdminPartnerListDto> {
    const { level, search, minEarnings, minReferrals, page = 1, limit = 20 } = query;

    // Users who have a referral code (potential partners)
    const where: Prisma.UserWhereInput = {
      referralCode: { not: { equals: '' } },
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { referralCode: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          referralCode: true,
          createdAt: true,
        },
      }),
    ]);

    // Get statistics for each partner (with error handling per-user)
    const items: AdminPartnerDto[] = [];
    for (const user of users) {
      try {
        const stats = await this.getPartnerStats(user);
        items.push(stats);
      } catch (err) {
        this.logger.warn(`Failed to get stats for partner ${user.id}: ${err}`);
        // Return basic info without stats on failure
        items.push({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName || 'Unknown',
            lastName: user.lastName,
            referralCode: user.referralCode || '',
            createdAt: user.createdAt,
          },
          currentLevel: 1,
          levelName: 'Стартер',
          directReferrals: 0,
          activeReferrals: 0,
          teamSize: 0,
          teamVolume: 0,
          totalEarnings: 0,
          pendingEarnings: 0,
          totalWithdrawn: 0,
          availableBalance: 0,
        });
      }
    }

    // Filter by level and earnings if specified
    let filteredItems = items;
    if (level) {
      filteredItems = filteredItems.filter(p => p.currentLevel === level);
    }
    if (minEarnings) {
      filteredItems = filteredItems.filter(p => p.totalEarnings >= minEarnings);
    }
    if (minReferrals) {
      filteredItems = filteredItems.filter(p => p.directReferrals >= minReferrals);
    }

    const totalPages = Math.ceil(total / limit);

    return {
      items: filteredItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get partner by user ID with detailed info.
   */
  async getPartnerById(userId: string): Promise<AdminPartnerDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        referralCode: true,
        createdAt: true,
        referredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            referralCode: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const baseStats = await this.getPartnerStats(user);

    // Get recent commissions
    const recentCommissions = await this.prisma.partnerCommission.findMany({
      where: { partnerId: userId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        sourceUser: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Get recent withdrawals
    const recentWithdrawals = await this.prisma.withdrawalRequest.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    // Get direct referrals list
    const directReferrals = await this.prisma.partnerRelationship.findMany({
      where: { partnerId: userId, level: 1 },
      take: 20,
      orderBy: { createdAt: 'desc' },
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

    // Get transaction totals for referrals
    const referralIds = directReferrals.map(r => r.referralId);
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

    return {
      ...baseStats,
      recentCommissions: recentCommissions.map(c => ({
        id: c.id,
        sourceUserName: `${c.sourceUser.firstName} ${c.sourceUser.lastName || ''}`.trim(),
        level: c.level,
        amount: Number(c.amount),
        status: c.status,
        createdAt: c.createdAt,
      })),
      recentWithdrawals: recentWithdrawals.map(w => ({
        id: w.id,
        amount: Number(w.amount),
        netAmount: Number(w.amount) - Number(w.taxAmount),
        status: w.status,
        createdAt: w.createdAt,
      })),
      directReferralsList: directReferrals.map(r => ({
        id: r.referral.id,
        firstName: r.referral.firstName || 'Unknown',
        lastName: r.referral.lastName || undefined,
        email: r.referral.email,
        joinedAt: r.referral.createdAt,
        totalSpent: totalsMap.get(r.referralId) || 0,
        isActive: (totalsMap.get(r.referralId) || 0) > 0,
      })),
      referredBy: user.referredBy || null,
    };
  }

  /**
   * Get all commissions with filters.
   */
  async getCommissionsList(query: AdminCommissionsQueryDto): Promise<AdminCommissionListDto> {
    const { status, level, partnerId, sourceUserId, fromDate, toDate, page = 1, limit = 20 } = query;

    const where: Prisma.PartnerCommissionWhereInput = {};

    if (status) where.status = status;
    if (level) where.level = level;
    if (partnerId) where.partnerId = partnerId;
    if (sourceUserId) where.sourceUserId = sourceUserId;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [total, commissions, totalAmountResult] = await Promise.all([
      this.prisma.partnerCommission.count({ where }),
      this.prisma.partnerCommission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          partner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          sourceUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.partnerCommission.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: commissions.map(c => this.mapCommissionToDto(c)),
      total,
      page,
      limit,
      totalPages,
      totalAmount: Number(totalAmountResult._sum.amount) || 0,
    };
  }

  /**
   * Approve a commission.
   */
  async approveCommission(id: string, adminId: string): Promise<AdminCommissionDto> {
    const commission = await this.prisma.partnerCommission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('Комиссия не найдена');
    }

    if (commission.status !== CommissionStatus.PENDING) {
      throw new BadRequestException(
        `Комиссия должна иметь статус PENDING для одобрения, текущий статус: ${commission.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedCommission = await tx.partnerCommission.update({
        where: { id },
        data: {
          status: CommissionStatus.APPROVED,
          paidAt: new Date(),
        },
        include: {
          partner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          sourceUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'COMMISSION_APPROVED',
          entityType: 'PartnerCommission',
          entityId: id,
          oldValue: { status: CommissionStatus.PENDING },
          newValue: { status: CommissionStatus.APPROVED },
        },
      });

      return updatedCommission;
    });

    return this.mapCommissionToDto(updated);
  }

  /**
   * Reject a commission.
   */
  async rejectCommission(id: string, reason: string, adminId: string): Promise<AdminCommissionDto> {
    const commission = await this.prisma.partnerCommission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('Комиссия не найдена');
    }

    if (commission.status !== CommissionStatus.PENDING) {
      throw new BadRequestException(
        `Комиссия должна иметь статус PENDING для отклонения, текущий статус: ${commission.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedCommission = await tx.partnerCommission.update({
        where: { id },
        data: {
          status: CommissionStatus.CANCELLED,
        },
        include: {
          partner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          sourceUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'COMMISSION_REJECTED',
          entityType: 'PartnerCommission',
          entityId: id,
          oldValue: { status: CommissionStatus.PENDING },
          newValue: { status: CommissionStatus.CANCELLED, reason },
        },
      });

      return updatedCommission;
    });

    return this.mapCommissionToDto(updated);
  }

  /**
   * Batch approve commissions.
   */
  async approveCommissionsBatch(
    ids: string[],
    adminId: string,
  ): Promise<BatchCommissionActionResponseDto> {
    const approvedIds: string[] = [];
    const failedIds: string[] = [];

    for (const id of ids) {
      try {
        await this.approveCommission(id, adminId);
        approvedIds.push(id);
      } catch {
        failedIds.push(id);
      }
    }

    return {
      success: failedIds.length === 0,
      message: `Успешно одобрено комиссий: ${approvedIds.length}`,
      approvedCount: approvedIds.length,
      approvedIds,
      failedIds,
    };
  }

  /**
   * Get all withdrawals with filters.
   */
  async getWithdrawalsList(query: AdminWithdrawalsQueryDto): Promise<AdminWithdrawalListDto> {
    const { status, userId, minAmount, maxAmount, fromDate, toDate, page = 1, limit = 20 } = query;

    const where: Prisma.WithdrawalRequestWhereInput = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = minAmount;
      if (maxAmount) where.amount.lte = maxAmount;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [total, withdrawals, amountAggregates] = await Promise.all([
      this.prisma.withdrawalRequest.count({ where }),
      this.prisma.withdrawalRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              referralCode: true,
            },
          },
        },
      }),
      this.prisma.withdrawalRequest.aggregate({
        where,
        _sum: { amount: true, taxAmount: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const totalAmount = Number(amountAggregates._sum.amount) || 0;
    const totalTax = Number(amountAggregates._sum.taxAmount) || 0;

    return {
      items: withdrawals.map(w => this.mapWithdrawalToDto(w)),
      total,
      page,
      limit,
      totalPages,
      totalAmount,
      totalNetAmount: totalAmount - totalTax,
    };
  }

  /**
   * Get withdrawal by ID.
   */
  async getWithdrawalById(id: string): Promise<AdminWithdrawalDto> {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            referralCode: true,
          },
        },
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Вывод не найден');
    }

    return this.mapWithdrawalToDto(withdrawal);
  }

  /**
   * Approve a withdrawal request.
   */
  async approveWithdrawal(id: string, adminId: string): Promise<AdminWithdrawalDto> {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException('Вывод не найден');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Вывод должен иметь статус PENDING для одобрения, текущий статус: ${withdrawal.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: WithdrawalStatus.APPROVED,
          processedAt: new Date(),
          processedById: adminId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              referralCode: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'WITHDRAWAL_APPROVED',
          entityType: 'WithdrawalRequest',
          entityId: id,
          oldValue: { status: WithdrawalStatus.PENDING },
          newValue: { status: WithdrawalStatus.APPROVED },
        },
      });

      return updatedWithdrawal;
    });

    return this.mapWithdrawalToDto(updated);
  }

  /**
   * Reject a withdrawal request.
   */
  async rejectWithdrawal(id: string, reason: string, adminId: string): Promise<AdminWithdrawalDto> {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException('Вывод не найден');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Вывод должен иметь статус PENDING для отклонения, текущий статус: ${withdrawal.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: WithdrawalStatus.REJECTED,
          rejectionReason: reason,
          processedAt: new Date(),
          processedById: adminId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              referralCode: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'WITHDRAWAL_REJECTED',
          entityType: 'WithdrawalRequest',
          entityId: id,
          oldValue: { status: WithdrawalStatus.PENDING },
          newValue: { status: WithdrawalStatus.REJECTED, reason },
        },
      });

      return updatedWithdrawal;
    });

    return this.mapWithdrawalToDto(updated);
  }

  /**
   * Complete a withdrawal (mark as paid).
   */
  async completeWithdrawal(id: string, adminId: string): Promise<AdminWithdrawalDto> {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException('Вывод не найден');
    }

    if (withdrawal.status !== WithdrawalStatus.APPROVED) {
      throw new BadRequestException(
        `Вывод должен иметь статус APPROVED для завершения, текущий статус: ${withdrawal.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: WithdrawalStatus.COMPLETED,
          processedAt: new Date(),
          processedById: adminId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              referralCode: true,
            },
          },
        },
      });

      // Mark related commissions as PAID
      await tx.partnerCommission.updateMany({
        where: {
          partnerId: withdrawal.userId,
          status: CommissionStatus.APPROVED,
        },
        data: {
          status: CommissionStatus.PAID,
          paidAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'WITHDRAWAL_COMPLETED',
          entityType: 'WithdrawalRequest',
          entityId: id,
          oldValue: { status: WithdrawalStatus.APPROVED },
          newValue: { status: WithdrawalStatus.COMPLETED },
        },
      });

      return updatedWithdrawal;
    });

    return this.mapWithdrawalToDto(updated);
  }

  /**
   * Get withdrawal statistics for admin.
   */
  async getWithdrawalStats(): Promise<AdminWithdrawalStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      pending,
      approved,
      processing,
      completedThisMonth,
    ] = await Promise.all([
      this.prisma.withdrawalRequest.aggregate({
        where: { status: WithdrawalStatus.PENDING },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { status: WithdrawalStatus.APPROVED },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { status: WithdrawalStatus.PROCESSING },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: {
          status: WithdrawalStatus.COMPLETED,
          processedAt: { gte: startOfMonth },
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return {
      pendingCount: pending._count,
      pendingAmount: Number(pending._sum.amount) || 0,
      approvedCount: approved._count,
      approvedAmount: Number(approved._sum.amount) || 0,
      processingCount: processing._count,
      processingAmount: Number(processing._sum.amount) || 0,
      completedThisMonth: completedThisMonth._count,
      completedAmountThisMonth: Number(completedThisMonth._sum.amount) || 0,
    };
  }

  // ============ Private Helper Methods ============

  private async getPartnerStats(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    referralCode: string | null;
    createdAt: Date;
  }): Promise<AdminPartnerDto> {
    const [
      directReferrals,
      teamSize,
      approvedCommissions,
      pendingCommissions,
      completedWithdrawals,
      teamVolume,
    ] = await Promise.all([
      this.prisma.partnerRelationship.count({
        where: { partnerId: user.id, level: 1 },
      }),
      this.prisma.partnerRelationship.count({
        where: { partnerId: user.id },
      }),
      this.prisma.partnerCommission.aggregate({
        where: { partnerId: user.id, status: CommissionStatus.APPROVED },
        _sum: { amount: true },
      }),
      this.prisma.partnerCommission.aggregate({
        where: { partnerId: user.id, status: CommissionStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { userId: user.id, status: WithdrawalStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.getTeamVolume(user.id),
    ]);

    const activeReferrals = await this.getActiveReferralsCount(user.id);
    const currentLevel = this.calculateLevel(directReferrals, teamVolume);
    const levelInfo = PARTNER_LEVELS[currentLevel as keyof typeof PARTNER_LEVELS];

    const totalEarnings = Number(approvedCommissions._sum.amount) || 0;
    const pendingEarnings = Number(pendingCommissions._sum.amount) || 0;
    const totalWithdrawn = Number(completedWithdrawals._sum.amount) || 0;

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName,
        referralCode: user.referralCode || '',
        createdAt: user.createdAt,
      },
      currentLevel,
      levelName: levelInfo.name,
      directReferrals,
      activeReferrals,
      teamSize,
      teamVolume,
      totalEarnings,
      pendingEarnings,
      totalWithdrawn,
      availableBalance: totalEarnings - totalWithdrawn,
    };
  }

  private async getTeamVolume(userId: string): Promise<number> {
    const referralIds = await this.prisma.partnerRelationship.findMany({
      where: { partnerId: userId },
      select: { referralId: true },
    });

    const ids = referralIds.map(r => r.referralId);
    if (ids.length === 0) return 0;

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
    const directReferrals = await this.prisma.partnerRelationship.findMany({
      where: { partnerId: userId, level: 1 },
      select: { referralId: true },
    });

    const referralIds = directReferrals.map(r => r.referralId);
    if (referralIds.length === 0) return 0;

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
    for (let level = 5; level >= 1; level--) {
      const config = PARTNER_LEVELS[level as keyof typeof PARTNER_LEVELS];
      if (referralsCount >= config.minReferrals && teamVolume >= config.minTeamVolume) {
        return level;
      }
    }
    return 1;
  }

  private async getPartnersByLevel(): Promise<{
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  }> {
    // This is a simplified count - actual level calculation would require
    // computing for each partner based on their referrals and team volume
    const partnerCounts = { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 };

    // Get all partners
    const partners = await this.prisma.user.findMany({
      where: {
        OR: [
          { partnerAsPartner: { some: { level: 1 } } },
          { commissions: { some: {} } },
        ],
      },
      select: { id: true },
      take: 1000, // Limit for performance
    });

    for (const partner of partners) {
      const [referrals, volume] = await Promise.all([
        this.prisma.partnerRelationship.count({
          where: { partnerId: partner.id, level: 1 },
        }),
        this.getTeamVolume(partner.id),
      ]);
      const level = this.calculateLevel(referrals, volume);
      partnerCounts[`level${level}` as keyof typeof partnerCounts]++;
    }

    return partnerCounts;
  }

  private mapCommissionToDto(commission: any): AdminCommissionDto {
    return {
      id: commission.id,
      partner: {
        id: commission.partner.id,
        email: commission.partner.email,
        firstName: commission.partner.firstName || 'Unknown',
        lastName: commission.partner.lastName,
      },
      sourceUser: {
        id: commission.sourceUser.id,
        email: commission.sourceUser.email,
        firstName: commission.sourceUser.firstName || 'Unknown',
        lastName: commission.sourceUser.lastName,
      },
      sourceTransactionId: commission.sourceTransactionId,
      level: commission.level,
      rate: commission.level <= 5
        ? [0.1, 0.05, 0.03, 0.02, 0.01][commission.level - 1]
        : 0,
      amount: Number(commission.amount),
      status: commission.status,
      createdAt: commission.createdAt,
      approvedAt: commission.paidAt,
      paidAt: commission.paidAt,
      reviewedBy: null, // Would need to fetch separately if needed
    };
  }

  private mapWithdrawalToDto(withdrawal: any): AdminWithdrawalDto {
    const taxRate = TAX_RATES[withdrawal.taxStatus as keyof typeof TAX_RATES] || 0;
    const paymentDetails = withdrawal.paymentDetails as any;

    return {
      id: withdrawal.id,
      user: {
        id: withdrawal.user.id,
        email: withdrawal.user.email,
        firstName: withdrawal.user.firstName || 'Unknown',
        lastName: withdrawal.user.lastName,
        referralCode: withdrawal.user.referralCode || '',
      },
      amount: Number(withdrawal.amount),
      taxStatus: withdrawal.taxStatus,
      taxRate,
      taxAmount: Number(withdrawal.taxAmount),
      netAmount: Number(withdrawal.amount) - Number(withdrawal.taxAmount),
      status: withdrawal.status,
      paymentDetails: {
        type: paymentDetails?.type || 'bank_account',
        cardNumber: paymentDetails?.cardNumber
          ? `${paymentDetails.cardNumber.slice(0, 4)}****${paymentDetails.cardNumber.slice(-4)}`
          : undefined,
        bankAccount: paymentDetails?.bankAccount
          ? `${paymentDetails.bankAccount.slice(0, 5)}****${paymentDetails.bankAccount.slice(-4)}`
          : undefined,
        bankName: paymentDetails?.bankName,
        bik: paymentDetails?.bik,
        recipientName: paymentDetails?.recipientName || '',
      },
      createdAt: withdrawal.createdAt,
      approvedAt: withdrawal.processedAt,
      completedAt: withdrawal.processedAt,
      rejectionReason: withdrawal.rejectionReason,
      processedBy: null, // Would need to fetch separately if needed
    };
  }
}
