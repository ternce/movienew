/**
 * AdminDashboardService Unit Tests
 *
 * Tests for admin dashboard functionality including:
 * - Dashboard overview aggregation
 * - Stats collection (users, subscriptions, orders, etc.)
 * - Revenue by month calculation
 * - User growth over time
 * - Recent transactions
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatus,
  SubscriptionStatus,
  TransactionStatus,
  VerificationStatus,
  WithdrawalStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '../../../config/prisma.service';
import { createMockUser } from '../../../../test/factories/user.factory';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        count: jest.fn(),
      },
      userSubscription: {
        count: jest.fn(),
      },
      order: {
        count: jest.fn(),
      },
      userVerification: {
        count: jest.fn(),
      },
      withdrawalRequest: {
        count: jest.fn(),
      },
      content: {
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
      transaction: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return all dashboard stats', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(1000) // totalUsers
        .mockResolvedValueOnce(15); // newUsersToday
      mockPrisma.userSubscription.count.mockResolvedValue(200);
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.userVerification.count.mockResolvedValue(3);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(2);
      mockPrisma.content.count.mockResolvedValue(500);
      mockPrisma.product.count.mockResolvedValue(50);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(150000) },
      });

      const result = await service.getDashboardStats();

      expect(result.totalUsers).toBe(1000);
      expect(result.newUsersToday).toBe(15);
      expect(result.activeSubscriptions).toBe(200);
      expect(result.monthlyRevenue).toBe(150000);
      expect(result.pendingOrders).toBe(5);
      expect(result.pendingVerifications).toBe(3);
      expect(result.pendingWithdrawals).toBe(2);
      expect(result.contentCount).toBe(500);
      expect(result.productCount).toBe(50);
    });

    it('should filter newUsersToday by today date', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await service.getDashboardStats();

      // Second user.count call should have date filter
      const secondCall = mockPrisma.user.count.mock.calls[1];
      expect(secondCall[0]).toHaveProperty('where');
      expect(secondCall[0].where).toHaveProperty('createdAt');
      expect(secondCall[0].where.createdAt).toHaveProperty('gte');
    });

    it('should filter active subscriptions correctly', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(100);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await service.getDashboardStats();

      expect(mockPrisma.userSubscription.count).toHaveBeenCalledWith({
        where: { status: SubscriptionStatus.ACTIVE },
      });
    });

    it('should filter pending orders correctly', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(3);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await service.getDashboardStats();

      expect(mockPrisma.order.count).toHaveBeenCalledWith({
        where: { status: OrderStatus.PENDING },
      });
    });

    it('should filter pending verifications correctly', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(5);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await service.getDashboardStats();

      expect(mockPrisma.userVerification.count).toHaveBeenCalledWith({
        where: { status: VerificationStatus.PENDING },
      });
    });

    it('should filter pending withdrawals correctly', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(8);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await service.getDashboardStats();

      expect(mockPrisma.withdrawalRequest.count).toHaveBeenCalledWith({
        where: { status: WithdrawalStatus.PENDING },
      });
    });

    it('should return 0 for monthlyRevenue when no transactions', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getDashboardStats();

      expect(result.monthlyRevenue).toBe(0);
    });
  });

  describe('getRevenueByMonth', () => {
    it('should return revenue for specified number of months', async () => {
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(50000) },
      });

      const result = await service.getRevenueByMonth(3);

      expect(result).toHaveLength(3);
    });

    it('should separate subscription and store revenue', async () => {
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(30000) } }) // subscription
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(20000) } }); // store

      const result = await service.getRevenueByMonth(1);

      expect(result[0].subscriptionRevenue).toBe(30000);
      expect(result[0].storeRevenue).toBe(20000);
      expect(result[0].totalRevenue).toBe(50000);
    });

    it('should format period as YYYY-MM', async () => {
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getRevenueByMonth(1);

      expect(result[0].period).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should filter by SUBSCRIPTION type for subscription revenue', async () => {
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      await service.getRevenueByMonth(1);

      const subscriptionCall = mockPrisma.transaction.aggregate.mock.calls[0];
      expect(subscriptionCall[0].where.type).toBe('SUBSCRIPTION');
      expect(subscriptionCall[0].where.status).toBe(TransactionStatus.COMPLETED);
    });

    it('should filter by STORE type for store revenue', async () => {
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      await service.getRevenueByMonth(1);

      const storeCall = mockPrisma.transaction.aggregate.mock.calls[1];
      expect(storeCall[0].where.type).toBe('STORE');
      expect(storeCall[0].where.status).toBe(TransactionStatus.COMPLETED);
    });

    it('should handle null revenue amounts', async () => {
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getRevenueByMonth(1);

      expect(result[0].subscriptionRevenue).toBe(0);
      expect(result[0].storeRevenue).toBe(0);
      expect(result[0].totalRevenue).toBe(0);
    });

    it('should return months in chronological order', async () => {
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(1000) },
      });

      const result = await service.getRevenueByMonth(3);

      // First result should be earliest month
      const periods = result.map((r) => r.period);
      const sortedPeriods = [...periods].sort();
      expect(periods).toEqual(sortedPeriods);
    });
  });

  describe('getUserGrowth', () => {
    it('should return growth stats for specified number of days', async () => {
      mockPrisma.user.count.mockResolvedValue(100);

      const result = await service.getUserGrowth(7);

      expect(result).toHaveLength(7);
    });

    it('should return newUsers and totalUsers for each day', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(5) // newUsers
        .mockResolvedValueOnce(100); // totalUsers

      const result = await service.getUserGrowth(1);

      expect(result[0]).toHaveProperty('newUsers');
      expect(result[0]).toHaveProperty('totalUsers');
      expect(result[0]).toHaveProperty('date');
    });

    it('should format date as YYYY-MM-DD', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.getUserGrowth(1);

      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return days in chronological order', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.getUserGrowth(3);

      const dates = result.map((r) => r.date);
      const sortedDates = [...dates].sort();
      expect(dates).toEqual(sortedDates);
    });

    it('should query new users with date range', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUserGrowth(1);

      // First call for newUsers should have date range
      const newUsersCall = mockPrisma.user.count.mock.calls[0];
      expect(newUsersCall[0].where.createdAt).toHaveProperty('gte');
      expect(newUsersCall[0].where.createdAt).toHaveProperty('lt');
    });

    it('should query total users with lt filter only', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUserGrowth(1);

      // Second call for totalUsers should only have lt
      const totalUsersCall = mockPrisma.user.count.mock.calls[1];
      expect(totalUsersCall[0].where.createdAt).toHaveProperty('lt');
      expect(totalUsersCall[0].where.createdAt.gte).toBeUndefined();
    });
  });

  describe('getRecentTransactions', () => {
    it('should return specified number of transactions', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      const transactions = [
        {
          id: 'txn-1',
          type: 'SUBSCRIPTION',
          amount: new Decimal(1000),
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          user: { email: mockUser.email },
        },
        {
          id: 'txn-2',
          type: 'STORE',
          amount: new Decimal(500),
          status: TransactionStatus.PENDING,
          createdAt: new Date(),
          user: { email: 'other@example.com' },
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getRecentTransactions(2);

      expect(result).toHaveLength(2);
    });

    it('should map transaction to DTO correctly', async () => {
      const createdAt = new Date();
      const transactions = [
        {
          id: 'txn-123',
          type: 'SUBSCRIPTION',
          amount: new Decimal(1499),
          status: TransactionStatus.COMPLETED,
          createdAt,
          user: { email: 'user@example.com' },
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getRecentTransactions(1);

      expect(result[0]).toEqual({
        id: 'txn-123',
        userEmail: 'user@example.com',
        type: 'SUBSCRIPTION',
        amount: 1499,
        status: TransactionStatus.COMPLETED,
        createdAt,
      });
    });

    it('should order by createdAt desc', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.getRecentTransactions(10);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should include user email in query', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.getRecentTransactions(10);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: {
              select: { email: true },
            },
          },
        }),
      );
    });

    it('should respect limit parameter', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.getRecentTransactions(5);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('should convert Decimal amount to number', async () => {
      const transactions = [
        {
          id: 'txn-1',
          type: 'STORE',
          amount: new Decimal(2999.99),
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          user: { email: 'user@test.com' },
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getRecentTransactions(1);

      expect(typeof result[0].amount).toBe('number');
      expect(result[0].amount).toBe(2999.99);
    });
  });

  describe('getDashboardOverview', () => {
    it('should aggregate all dashboard data', async () => {
      // Mock getDashboardStats dependencies
      mockPrisma.user.count.mockResolvedValue(1000);
      mockPrisma.userSubscription.count.mockResolvedValue(200);
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.userVerification.count.mockResolvedValue(3);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(2);
      mockPrisma.content.count.mockResolvedValue(500);
      mockPrisma.product.count.mockResolvedValue(50);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(100000) },
      });
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.getDashboardOverview();

      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('revenueByMonth');
      expect(result).toHaveProperty('userGrowth');
      expect(result).toHaveProperty('recentTransactions');
    });

    it('should return 6 months of revenue by default', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.getDashboardOverview();

      expect(result.revenueByMonth).toHaveLength(6);
    });

    it('should return 30 days of user growth by default', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.getDashboardOverview();

      expect(result.userGrowth).toHaveLength(30);
    });

    it('should return 10 recent transactions by default', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.getDashboardOverview();

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });
});
