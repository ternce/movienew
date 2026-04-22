import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  BonusSource,
  BonusTransactionType,
  CommissionStatus,
  Prisma,
  TaxStatus,
  WithdrawalStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PrismaService } from '../../config/prisma.service';
import {
  BonusBalanceDto,
  BonusQueryDto,
  BonusRateDto,
  BonusTransactionDto,
  ExpiringBonusDto,
  ExpiringBonusSummaryDto,
  MaxApplicableBonusDto,
  BonusStatisticsDto,
  WithdrawBonusDto,
  WithdrawalResultDto,
  WithdrawalPreviewDto,
} from './dto';
import {
  BONUS_CONFIG,
  ACTIVITY_BONUSES,
  ONE_TIME_ACTIVITIES,
  TAX_RATES,
} from '@movie-platform/shared';

// Activity type from shared package
type ActivityType =
  | 'FIRST_PURCHASE'
  | 'STREAK_7_DAYS'
  | 'STREAK_30_DAYS'
  | 'PROFILE_COMPLETE'
  | 'FIRST_REVIEW'
  | 'REFERRAL_MILESTONE_5'
  | 'REFERRAL_MILESTONE_10';

interface EarnBonusParams {
  userId: string;
  amount: number | Decimal;
  source: BonusSource;
  referenceId?: string;
  referenceType?: string;
  description?: string;
  expiryDays?: number;
  metadata?: Prisma.InputJsonValue;
}

interface SpendBonusParams {
  userId: string;
  amount: number | Decimal;
  referenceId: string;
  referenceType: string;
  description?: string;
}

@Injectable()
export class BonusesService {
  private readonly logger = new Logger(BonusesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's bonus balance with statistics.
   */
  async getBalance(userId: string): Promise<BonusBalanceDto> {
    try {
      const [user, stats] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { bonusBalance: true },
        }),
        this.prisma.bonusTransaction.groupBy({
          by: ['type'],
          where: { userId },
          _sum: { amount: true },
        }),
      ]);

      if (!user) {
        throw new BadRequestException('Пользователь не найден');
      }

      // Calculate statistics from grouped transactions
      let lifetimeEarned = 0;
      let lifetimeSpent = 0;

      for (const stat of stats) {
        const amount = Number(stat._sum?.amount) || 0;
        if (stat.type === BonusTransactionType.EARNED || stat.type === BonusTransactionType.ADJUSTMENT) {
          if (amount > 0) lifetimeEarned += amount;
        } else if (stat.type === BonusTransactionType.SPENT) {
          lifetimeSpent += Math.abs(amount);
        }
      }

      // Calculate pending earnings (from pending partner commissions)
      let pendingEarnings = 0;
      try {
        const pendingCommissions = await this.prisma.partnerCommission.aggregate({
          where: {
            partnerId: userId,
            status: CommissionStatus.PENDING,
          },
          _sum: { amount: true },
        });
        pendingEarnings = Number(pendingCommissions._sum?.amount) || 0;
      } catch (error) {
        this.logger.warn(`Failed to fetch pending commissions for user ${userId}: ${error}`);
      }

      return {
        balance: Number(user.bonusBalance),
        pendingEarnings,
        lifetimeEarned,
        lifetimeSpent,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to get balance for user ${userId}: ${error}`);
      throw error;
    }
  }

  /**
   * Get detailed bonus statistics for a user.
   */
  async getStatistics(userId: string): Promise<BonusStatisticsDto> {
    try {
      const balance = await this.getBalance(userId);

      let expiringIn30Days = 0;
      try {
        const expiring = await this.getExpiringBonuses(userId, 30);
        expiringIn30Days = expiring.totalExpiring;
      } catch (error) {
        this.logger.warn(`Failed to fetch expiring bonuses for user ${userId}: ${error}`);
      }

      // Get this month's activity
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyStats = await this.prisma.bonusTransaction.groupBy({
        by: ['type'],
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      });

      let earnedThisMonth = 0;
      let spentThisMonth = 0;
      let transactionsThisMonth = 0;

      for (const stat of monthlyStats) {
        const amount = Number(stat._sum?.amount) || 0;
        transactionsThisMonth += typeof stat._count === 'number' ? stat._count : 0;
        if (stat.type === BonusTransactionType.EARNED) {
          earnedThisMonth += amount;
        } else if (stat.type === BonusTransactionType.SPENT) {
          spentThisMonth += Math.abs(amount);
        }
      }

      return {
        balance: balance.balance,
        pendingEarnings: balance.pendingEarnings,
        lifetimeEarned: balance.lifetimeEarned,
        lifetimeSpent: balance.lifetimeSpent,
        expiringIn30Days,
        transactionsThisMonth,
        earnedThisMonth,
        spentThisMonth,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to get statistics for user ${userId}: ${error}`);
      throw error;
    }
  }

  /**
   * Get paginated bonus transaction history.
   */
  async getTransactionHistory(
    userId: string,
    query: BonusQueryDto,
  ): Promise<{ items: BonusTransactionDto[]; total: number; page: number; limit: number }> {
    const { type, source, fromDate, toDate, page = 1, limit = 20 } = query;

    const where: Prisma.BonusTransactionWhereInput = { userId };

    if (type) {
      where.type = type;
    }

    if (source) {
      where.source = source;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.bonusTransaction.count({ where }),
      this.prisma.bonusTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map(this.mapToTransactionDto),
      total,
      page,
      limit,
    };
  }

  /**
   * Earn bonuses - atomic balance update.
   * Called when partner commission is approved, promo applied, etc.
   */
  async earnBonuses(
    params: EarnBonusParams,
    tx?: Prisma.TransactionClient,
  ): Promise<BonusTransactionDto> {
    const client = tx || this.prisma;
    const {
      userId,
      amount,
      source,
      referenceId,
      referenceType,
      description,
      expiryDays = BONUS_CONFIG.DEFAULT_EXPIRY_DAYS,
      metadata = {} as Prisma.InputJsonValue,
    } = params;

    const amountDecimal = new Decimal(amount.toString());

    if (amountDecimal.lte(0)) {
      throw new BadRequestException('Сумма начисления должна быть положительной');
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Atomic: update balance and create transaction in single operation
    const [, transaction] = await Promise.all([
      client.user.update({
        where: { id: userId },
        data: { bonusBalance: { increment: amountDecimal } },
      }),
      client.bonusTransaction.create({
        data: {
          userId,
          type: BonusTransactionType.EARNED,
          amount: amountDecimal,
          source,
          referenceId,
          referenceType,
          description: description || `Earned bonus from ${source}`,
          expiresAt,
          metadata: metadata as Prisma.InputJsonValue,
        },
      }),
    ]);

    return this.mapToTransactionDto(transaction);
  }

  /**
   * Spend bonuses - atomic balance deduction with validation.
   * Called during checkout when user applies bonuses.
   */
  async spendBonuses(
    params: SpendBonusParams,
    tx?: Prisma.TransactionClient,
  ): Promise<BonusTransactionDto> {
    const client = tx || this.prisma;
    const { userId, amount, referenceId, referenceType, description } = params;

    const amountDecimal = new Decimal(amount.toString());

    if (amountDecimal.lte(0)) {
      throw new BadRequestException('Сумма списания должна быть положительной');
    }

    // First check balance (within transaction context)
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { bonusBalance: true },
    });

    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    if (user.bonusBalance.lt(amountDecimal)) {
      throw new BadRequestException('Недостаточно бонусов');
    }

    // Atomic: deduct balance and create transaction
    const [, transaction] = await Promise.all([
      client.user.update({
        where: { id: userId },
        data: { bonusBalance: { decrement: amountDecimal } },
      }),
      client.bonusTransaction.create({
        data: {
          userId,
          type: BonusTransactionType.SPENT,
          amount: amountDecimal.neg(), // Negative for spent
          source: BonusSource.PARTNER, // Default, can be overridden
          referenceId,
          referenceType,
          description: description || 'Bonus spent on purchase',
        },
      }),
    ]);

    return this.mapToTransactionDto(transaction);
  }

  /**
   * Validate if user can spend the specified amount.
   */
  async validateSpend(userId: string, amount: number | Decimal): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { bonusBalance: true },
    });

    if (!user) return false;

    const amountDecimal = new Decimal(amount.toString());
    return user.bonusBalance.gte(amountDecimal);
  }

  /**
   * Get current bonus conversion rate.
   */
  async getCurrentRate(): Promise<BonusRateDto | null> {
    const now = new Date();

    const rate = await this.prisma.bonusRate.findFirst({
      where: {
        effectiveFrom: { lte: now },
        isActive: true,
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!rate) {
      // Return default rate if none configured
      return {
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: BONUS_CONFIG.DEFAULT_RATE,
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: undefined,
      };
    }

    return {
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: Number(rate.rate),
      effectiveFrom: rate.effectiveFrom,
      effectiveTo: rate.effectiveTo || undefined,
    };
  }

  /**
   * Convert bonuses to currency amount.
   */
  async convertToCurrency(bonusAmount: number | Decimal): Promise<number> {
    const rate = await this.getCurrentRate();
    if (!rate) return 0;

    const amount = new Decimal(bonusAmount.toString());
    return Number(amount.mul(rate.rate));
  }

  /**
   * Convert approved partner commission to bonus.
   */
  async convertCommissionToBonus(
    userId: string,
    commissionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BonusTransactionDto> {
    const client = tx || this.prisma;

    // Get the commission
    const commission = await client.partnerCommission.findUnique({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new BadRequestException('Комиссия не найдена');
    }

    if (commission.partnerId !== userId) {
      throw new BadRequestException('Комиссия не принадлежит этому пользователю');
    }

    if (commission.status !== CommissionStatus.APPROVED) {
      throw new BadRequestException('Для конвертации комиссия должна иметь статус APPROVED');
    }

    // Use a transaction if not provided
    const executeConversion = async (prismaClient: Prisma.TransactionClient) => {
      // Update commission status to PAID
      await prismaClient.partnerCommission.update({
        where: { id: commissionId },
        data: {
          status: CommissionStatus.PAID,
          paidAt: new Date(),
        },
      });

      // Earn bonuses
      return this.earnBonuses(
        {
          userId,
          amount: commission.amount,
          source: BonusSource.PARTNER,
          referenceId: commissionId,
          referenceType: 'PartnerCommission',
          description: `Commission from partner program (Level ${commission.level})`,
          metadata: {
            commissionLevel: commission.level,
            sourceUserId: commission.sourceUserId,
            sourceTransactionId: commission.sourceTransactionId,
          },
        },
        prismaClient,
      );
    };

    if (tx) {
      return executeConversion(tx);
    }

    return this.prisma.$transaction(async (prismaClient) => {
      return executeConversion(prismaClient);
    });
  }

  /**
   * Grant referral bonus when a referred user makes their first purchase.
   * The referrer (not the buyer) receives the bonus.
   */
  async grantReferralBonus(
    referralUserId: string,
    purchaseAmount: number | Decimal,
    tx?: Prisma.TransactionClient,
  ): Promise<BonusTransactionDto | null> {
    const client = tx || this.prisma;

    // Get the referred user and their referrer
    const user = await client.user.findUnique({
      where: { id: referralUserId },
      select: { id: true, referredById: true },
    });

    if (!user || !user.referredById) {
      // No referrer, no bonus to grant
      return null;
    }

    // Check if this is the user's first purchase (no prior SPENT transactions)
    const priorPurchases = await client.bonusTransaction.count({
      where: {
        userId: referralUserId,
        type: BonusTransactionType.SPENT,
      },
    });

    // Also check for prior transactions in the Transaction table
    const priorTransactions = await client.transaction.count({
      where: {
        userId: referralUserId,
        status: 'COMPLETED',
      },
    });

    // If this isn't the first purchase, don't grant
    if (priorPurchases > 0 || priorTransactions > 1) {
      return null;
    }

    // Check if referral bonus was already granted for this user
    const existingBonus = await client.bonusTransaction.findFirst({
      where: {
        userId: user.referredById,
        source: BonusSource.REFERRAL_BONUS,
        referenceId: referralUserId,
        referenceType: 'ReferralFirstPurchase',
      },
    });

    if (existingBonus) {
      // Already granted
      return null;
    }

    // Calculate referral bonus (percentage of purchase amount)
    const purchaseDecimal = new Decimal(purchaseAmount.toString());
    const bonusAmount = purchaseDecimal
      .mul(BONUS_CONFIG.REFERRAL_BONUS_PERCENT)
      .div(100)
      .toDecimalPlaces(2);

    if (bonusAmount.lte(0)) {
      return null;
    }

    // Grant bonus to the referrer
    return this.earnBonuses(
      {
        userId: user.referredById,
        amount: bonusAmount,
        source: BonusSource.REFERRAL_BONUS,
        referenceId: referralUserId,
        referenceType: 'ReferralFirstPurchase',
        description: `Referral bonus for user's first purchase`,
        metadata: {
          referralUserId,
          purchaseAmount: Number(purchaseAmount),
          bonusPercent: BONUS_CONFIG.REFERRAL_BONUS_PERCENT,
        },
      },
      client as Prisma.TransactionClient,
    );
  }

  /**
   * Grant activity bonus for specific achievements.
   */
  async grantActivityBonus(
    userId: string,
    activityType: ActivityType,
    metadata?: Record<string, unknown>,
  ): Promise<BonusTransactionDto | null> {
    // Check if this is a one-time activity
    const isOneTime = ONE_TIME_ACTIVITIES.includes(activityType as any);

    if (isOneTime) {
      // Check if already granted
      const existing = await this.prisma.userActivityBonus.findUnique({
        where: {
          userId_activityType: {
            userId,
            activityType,
          },
        },
      });

      if (existing) {
        this.logger.log(`Activity bonus ${activityType} already granted to user ${userId}`);
        return null;
      }
    }

    // Get bonus amount for this activity
    const bonusAmount = ACTIVITY_BONUSES[activityType];
    if (!bonusAmount) {
      this.logger.warn(`Unknown activity type: ${activityType}`);
      return null;
    }

    // Use transaction for atomicity
    return this.prisma.$transaction(async (tx) => {
      // Record the activity bonus grant
      await tx.userActivityBonus.create({
        data: {
          userId,
          activityType,
        },
      });

      // Grant the bonus
      return this.earnBonuses(
        {
          userId,
          amount: bonusAmount,
          source: BonusSource.ACTIVITY,
          referenceId: activityType,
          referenceType: 'ActivityBonus',
          description: this.getActivityBonusDescription(activityType),
          metadata: {
            activityType,
            ...metadata,
          },
        },
        tx,
      );
    });
  }

  /**
   * Get bonuses expiring within specified number of days.
   */
  async getExpiringBonuses(userId: string, withinDays: number = 30): Promise<ExpiringBonusSummaryDto> {
    const now = new Date();
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + withinDays);

    const expiringTransactions = await this.prisma.bonusTransaction.findMany({
      where: {
        userId,
        type: BonusTransactionType.EARNED,
        expiresAt: {
          gt: now,
          lte: expiryThreshold,
        },
        // Only include positive amounts (not already expired/spent)
        amount: { gt: 0 },
      },
      orderBy: { expiresAt: 'asc' },
    });

    const expiringBonuses: ExpiringBonusDto[] = expiringTransactions.map((t) => {
      const daysRemaining = Math.ceil(
        (t.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        amount: Number(t.amount),
        expiresAt: t.expiresAt!,
        daysRemaining,
        transactionId: t.id,
      };
    });

    const totalExpiring = expiringBonuses.reduce((sum, b) => sum + b.amount, 0);

    return {
      expiringBonuses,
      totalExpiring,
      withinDays,
    };
  }

  /**
   * Process expired bonuses - run by scheduler.
   * Returns count of expired transactions and users notified.
   */
  async processExpiringBonuses(): Promise<{ expired: number; notified: number }> {
    const now = new Date();

    // Find all expired but not yet processed EARNED transactions
    const expiredTransactions = await this.prisma.bonusTransaction.findMany({
      where: {
        type: BonusTransactionType.EARNED,
        expiresAt: { lte: now },
        amount: { gt: 0 },
      },
      include: {
        user: {
          select: { id: true, bonusBalance: true },
        },
      },
    });

    if (expiredTransactions.length === 0) {
      return { expired: 0, notified: 0 };
    }

    // Group by user for batch processing
    const userExpirations = new Map<string, { transactions: typeof expiredTransactions; total: Decimal }>();

    for (const tx of expiredTransactions) {
      const existing = userExpirations.get(tx.userId) || { transactions: [], total: new Decimal(0) };
      existing.transactions.push(tx);
      existing.total = existing.total.add(tx.amount);
      userExpirations.set(tx.userId, existing);
    }

    let expiredCount = 0;
    const usersNotified = new Set<string>();

    // Process each user's expired bonuses
    for (const [userId, data] of userExpirations) {
      await this.prisma.$transaction(async (tx) => {
        // Deduct expired amount from balance (but not below 0)
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { bonusBalance: true },
        });

        if (!user) return;

        const amountToDeduct = Decimal.min(user.bonusBalance, data.total);

        if (amountToDeduct.gt(0)) {
          // Update user balance
          await tx.user.update({
            where: { id: userId },
            data: { bonusBalance: { decrement: amountToDeduct } },
          });

          // Create EXPIRED transaction
          await tx.bonusTransaction.create({
            data: {
              userId,
              type: BonusTransactionType.EXPIRED,
              amount: amountToDeduct.neg(),
              source: BonusSource.PROMO,
              description: `${data.transactions.length} bonus(es) expired`,
              metadata: {
                expiredTransactionIds: data.transactions.map((t) => t.id),
                originalTotal: Number(data.total),
                actualDeducted: Number(amountToDeduct),
              },
            },
          });

          // Mark original transactions as processed by updating amount to 0
          // This prevents double-processing
          await tx.bonusTransaction.updateMany({
            where: {
              id: { in: data.transactions.map((t) => t.id) },
            },
            data: { amount: 0 },
          });
        }

        expiredCount += data.transactions.length;
        usersNotified.add(userId);
      });
    }

    this.logger.log(`Processed ${expiredCount} expired bonuses for ${usersNotified.size} users`);

    return { expired: expiredCount, notified: usersNotified.size };
  }

  /**
   * Preview bonus withdrawal (show tax calculation).
   */
  async previewWithdrawal(
    userId: string,
    amount: number,
    taxStatus: TaxStatus,
  ): Promise<WithdrawalPreviewDto> {
    // Validate minimum withdrawal
    if (amount < BONUS_CONFIG.MIN_WITHDRAWAL_AMOUNT) {
      throw new BadRequestException(
        `Минимальная сумма вывода — ${BONUS_CONFIG.MIN_WITHDRAWAL_AMOUNT} бонусов`,
      );
    }

    // Validate balance
    const isValid = await this.validateSpend(userId, amount);
    if (!isValid) {
      throw new BadRequestException('Недостаточно бонусов');
    }

    // Get current rate
    const rate = await this.getCurrentRate();
    const rateValue = rate?.rate || BONUS_CONFIG.DEFAULT_RATE;

    // Calculate currency amount
    const currencyAmount = amount * rateValue;

    // Calculate tax based on status
    let taxRate: number;
    switch (taxStatus) {
      case TaxStatus.INDIVIDUAL:
        taxRate = TAX_RATES.INDIVIDUAL;
        break;
      case TaxStatus.SELF_EMPLOYED:
        taxRate = TAX_RATES.SELF_EMPLOYED;
        break;
      case TaxStatus.ENTREPRENEUR:
        taxRate = TAX_RATES.ENTREPRENEUR;
        break;
      case TaxStatus.COMPANY:
        taxRate = TAX_RATES.SELF_EMPLOYED_LEGAL;
        break;
      default:
        taxRate = TAX_RATES.INDIVIDUAL;
    }

    const estimatedTax = Math.round(currencyAmount * taxRate * 100) / 100;
    const estimatedNet = Math.round((currencyAmount - estimatedTax) * 100) / 100;

    return {
      bonusAmount: amount,
      currencyAmount,
      rate: rateValue,
      estimatedTax,
      estimatedNet,
      taxRate,
    };
  }

  /**
   * Withdraw bonuses to currency.
   */
  async withdrawBonusesToCurrency(
    userId: string,
    dto: WithdrawBonusDto,
  ): Promise<WithdrawalResultDto> {
    // Preview to validate and calculate
    const preview = await this.previewWithdrawal(userId, dto.amount, dto.taxStatus);

    // Process withdrawal in transaction
    return this.prisma.$transaction(async (tx) => {
      // Deduct bonuses from balance
      await tx.user.update({
        where: { id: userId },
        data: { bonusBalance: { decrement: dto.amount } },
      });

      // Create WITHDRAWN transaction
      await tx.bonusTransaction.create({
        data: {
          userId,
          type: BonusTransactionType.WITHDRAWN,
          amount: new Decimal(dto.amount).neg(),
          source: BonusSource.PARTNER,
          description: 'Bonus withdrawal to currency',
          metadata: {
            currencyAmount: preview.currencyAmount,
            rate: preview.rate,
            taxStatus: dto.taxStatus,
            taxAmount: preview.estimatedTax,
            netAmount: preview.estimatedNet,
          },
        },
      });

      // Create withdrawal request
      const withdrawal = await tx.bonusWithdrawal.create({
        data: {
          userId,
          bonusAmount: dto.amount,
          currencyAmount: preview.currencyAmount,
          rate: preview.rate,
          taxStatus: dto.taxStatus,
          taxAmount: preview.estimatedTax,
          netAmount: preview.estimatedNet,
          paymentDetails: (dto.paymentDetails ?? {}) as Prisma.InputJsonValue,
          status: WithdrawalStatus.PENDING,
        },
      });

      return {
        success: true,
        bonusAmount: dto.amount,
        currencyAmount: preview.currencyAmount,
        rate: preview.rate,
        taxAmount: preview.estimatedTax,
        netAmount: preview.estimatedNet,
        withdrawalId: withdrawal.id,
        message: 'Withdrawal request created successfully. Processing may take 1-3 business days.',
      };
    });
  }

  /**
   * Calculate maximum bonus applicable for checkout.
   */
  async calculateMaxApplicable(userId: string, orderTotal: number): Promise<MaxApplicableBonusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { bonusBalance: true },
    });

    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    const balance = Number(user.bonusBalance);
    const maxPercent = BONUS_CONFIG.MAX_BONUS_PERCENT_CHECKOUT;
    const maxByPercent = (orderTotal * maxPercent) / 100;
    const maxAmount = Math.min(balance, maxByPercent, orderTotal);

    return {
      maxAmount: Math.floor(maxAmount * 100) / 100, // Round down to 2 decimal places
      balance,
      maxPercent,
    };
  }

  /**
   * Admin: Adjust user's bonus balance (for corrections/promotions).
   */
  async adjustBalance(
    userId: string,
    amount: number,
    reason: string,
    adminId: string,
  ): Promise<BonusTransactionDto> {
    const amountDecimal = new Decimal(amount);

    return this.prisma.$transaction(async (tx) => {
      // Update balance
      if (amountDecimal.gt(0)) {
        await tx.user.update({
          where: { id: userId },
          data: { bonusBalance: { increment: amountDecimal } },
        });
      } else {
        // Check balance before deducting
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { bonusBalance: true },
        });

        if (!user) {
          throw new BadRequestException('Пользователь не найден');
        }

        if (user.bonusBalance.lt(amountDecimal.abs())) {
          throw new BadRequestException('Нельзя уменьшить ниже нуля');
        }

        await tx.user.update({
          where: { id: userId },
          data: { bonusBalance: { decrement: amountDecimal.abs() } },
        });
      }

      // Calculate expiry for positive adjustments
      let expiresAt: Date | undefined;
      if (amountDecimal.gt(0)) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + BONUS_CONFIG.DEFAULT_EXPIRY_DAYS);
      }

      // Create transaction record
      const transaction = await tx.bonusTransaction.create({
        data: {
          userId,
          type: BonusTransactionType.ADJUSTMENT,
          amount: amountDecimal,
          source: BonusSource.PROMO,
          description: `Admin adjustment: ${reason}`,
          referenceId: adminId,
          referenceType: 'ADMIN_ADJUSTMENT',
          expiresAt,
          metadata: {
            adminId,
            reason,
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'BONUS_ADJUSTED',
          entityType: 'User',
          entityId: userId,
          newValue: {
            amount,
            reason,
            newBalance: amountDecimal.gt(0) ? 'incremented' : 'decremented',
          },
        },
      });

      return this.mapToTransactionDto(transaction);
    });
  }

  /**
   * Check if user has made their first purchase (for referral bonus eligibility).
   */
  async isFirstPurchase(userId: string): Promise<boolean> {
    const completedTransactions = await this.prisma.transaction.count({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    return completedTransactions <= 1;
  }

  /**
   * Get human-readable description for activity bonus.
   */
  private getActivityBonusDescription(activityType: ActivityType): string {
    const descriptions: Record<ActivityType, string> = {
      FIRST_PURCHASE: 'Bonus for your first purchase',
      STREAK_7_DAYS: 'Bonus for 7-day activity streak',
      STREAK_30_DAYS: 'Bonus for 30-day activity streak',
      PROFILE_COMPLETE: 'Bonus for completing your profile',
      FIRST_REVIEW: 'Bonus for your first review',
      REFERRAL_MILESTONE_5: 'Bonus for referring 5 users',
      REFERRAL_MILESTONE_10: 'Bonus for referring 10 users',
    };

    return descriptions[activityType] || `Activity bonus: ${activityType}`;
  }

  /**
   * Map Prisma model to DTO.
   */
  private mapToTransactionDto(transaction: any): BonusTransactionDto {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      source: transaction.source,
      referenceId: transaction.referenceId || undefined,
      referenceType: transaction.referenceType || undefined,
      description: transaction.description,
      expiresAt: transaction.expiresAt || undefined,
      metadata: transaction.metadata || undefined,
      createdAt: transaction.createdAt,
    };
  }
}
