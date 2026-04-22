import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  SubscriptionStatus,
  TransactionStatus,
  VerificationStatus,
  WithdrawalStatus,
} from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';
import { CacheService, CACHE_TTL } from '../../../common/cache/cache.service';
import {
  DashboardOverviewDto,
  DashboardStatsDto,
  RecentTransactionDto,
  RevenueStatDto,
  UserGrowthStatDto,
} from '../dto';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get dashboard overview with all stats.
   * Cached for 5 minutes to reduce database load.
   */
  async getDashboardOverview(): Promise<DashboardOverviewDto> {
    return this.cache.getOrSet('admin:dashboard:overview', async () => {
      const [stats, revenueByMonth, userGrowth, recentTransactions] = await Promise.all([
        this.getDashboardStats(),
        this.getRevenueByMonth(6),
        this.getUserGrowth(30),
        this.getRecentTransactions(10),
      ]);

      return {
        stats,
        revenueByMonth,
        userGrowth,
        recentTransactions,
      };
    }, { ttl: CACHE_TTL.DEFAULT });
  }

  /**
   * Get dashboard stats.
   */
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      newUsersToday,
      activeSubscriptions,
      monthlyRevenue,
      pendingOrders,
      pendingVerifications,
      pendingWithdrawals,
      contentCount,
      productCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.getMonthRevenue(),
      this.prisma.order.count({
        where: { status: OrderStatus.PENDING },
      }),
      this.prisma.userVerification.count({
        where: { status: VerificationStatus.PENDING },
      }),
      this.prisma.withdrawalRequest.count({
        where: { status: WithdrawalStatus.PENDING },
      }),
      this.prisma.content.count(),
      this.prisma.product.count(),
    ]);

    return {
      totalUsers,
      newUsersToday,
      activeSubscriptions,
      monthlyRevenue,
      pendingOrders,
      pendingVerifications,
      pendingWithdrawals,
      contentCount,
      productCount,
    };
  }

  /**
   * Get revenue by month using a single raw SQL query.
   * Replaces the previous N+1 loop (2 aggregate queries per month).
   */
  async getRevenueByMonth(months: number): Promise<RevenueStatDto[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const results = await this.prisma.$queryRaw<Array<{
      period: string;
      subscriptionRevenue: number | null;
      storeRevenue: number | null;
      totalRevenue: number | null;
    }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "created_at"), 'YYYY-MM') AS "period",
        COALESCE(SUM(CASE WHEN "type" = 'SUBSCRIPTION' THEN "amount" ELSE 0 END), 0) AS "subscriptionRevenue",
        COALESCE(SUM(CASE WHEN "type" = 'STORE' THEN "amount" ELSE 0 END), 0) AS "storeRevenue",
        COALESCE(SUM("amount"), 0) AS "totalRevenue"
      FROM "transactions"
      WHERE "status" = 'COMPLETED'
        AND "created_at" >= ${startDate}
      GROUP BY DATE_TRUNC('month', "created_at")
      ORDER BY "period"
    `;

    return results.map((r) => ({
      period: r.period,
      subscriptionRevenue: Number(r.subscriptionRevenue),
      storeRevenue: Number(r.storeRevenue),
      totalRevenue: Number(r.totalRevenue),
    }));
  }

  /**
   * Get user growth over time using a single raw SQL query.
   * Replaces the previous N+1 loop (2 count queries per day).
   * Uses a window function for cumulative total.
   */
  async getUserGrowth(days: number): Promise<UserGrowthStatDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get the count of all users before the start date for the running total base
    const baseCountResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS "count" FROM "users" WHERE "created_at" < ${startDate}
    `;
    const baseCount = Number(baseCountResult[0]?.count ?? 0);

    const results = await this.prisma.$queryRaw<Array<{
      date: Date;
      newUsers: bigint;
    }>>`
      SELECT
        DATE("created_at") AS "date",
        COUNT(*) AS "newUsers"
      FROM "users"
      WHERE "created_at" >= ${startDate}
      GROUP BY DATE("created_at")
      ORDER BY "date"
    `;

    // Build the result with running total
    let runningTotal = baseCount;
    return results.map((r) => {
      const newUsers = Number(r.newUsers);
      runningTotal += newUsers;
      return {
        date: r.date.toISOString().split('T')[0],
        newUsers,
        totalUsers: runningTotal,
      };
    });
  }

  /**
   * Get recent transactions.
   */
  async getRecentTransactions(limit: number): Promise<RecentTransactionDto[]> {
    const transactions = await this.prisma.transaction.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return transactions.map((t) => ({
      id: t.id,
      userEmail: t.user.email,
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Get current month's revenue.
   */
  private async getMonthRevenue(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await this.prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount) || 0;
  }
}
