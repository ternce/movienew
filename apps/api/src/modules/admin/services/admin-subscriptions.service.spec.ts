/**
 * AdminSubscriptionsService Unit Tests
 *
 * Tests for admin subscription management functionality including:
 * - Getting subscriptions with filters and pagination
 * - Getting subscription by ID
 * - Getting subscription statistics
 * - Extending subscriptions
 * - Cancelling subscriptions
 * - Getting expiring subscriptions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionStatus, SubscriptionPlanType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { PrismaService } from '../../../config/prisma.service';

describe('AdminSubscriptionsService', () => {
  let service: AdminSubscriptionsService;
  let mockPrisma: any;

  const mockUser = {
    id: 'user-123',
    email: 'subscriber@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
  };

  const mockPlan = {
    id: 'plan-123',
    name: 'Premium',
    type: SubscriptionPlanType.PREMIUM,
    price: new Decimal(499),
    durationDays: 30,
  };

  const mockSubscription = {
    id: 'sub-123',
    userId: mockUser.id,
    planId: mockPlan.id,
    status: SubscriptionStatus.ACTIVE,
    startedAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-02-01'),
    autoRenew: true,
    cancelledAt: null,
    user: mockUser,
    plan: mockPlan,
  };

  const mockAdminId = 'admin-123';

  beforeEach(async () => {
    mockPrisma = {
      userSubscription: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminSubscriptionsService>(AdminSubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriptions', () => {
    it('should return paginated subscriptions', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(50);
      mockPrisma.userSubscription.findMany.mockResolvedValue([mockSubscription]);

      const result = await service.getSubscriptions({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(3);
    });

    it('should filter by status', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getSubscriptions({ status: SubscriptionStatus.ACTIVE });

      expect(mockPrisma.userSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SubscriptionStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter by plan type', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getSubscriptions({ planType: SubscriptionPlanType.PREMIUM });

      expect(mockPrisma.userSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            plan: { type: SubscriptionPlanType.PREMIUM },
          }),
        }),
      );
    });

    it('should filter by auto-renew status', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getSubscriptions({ autoRenew: true });

      expect(mockPrisma.userSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            autoRenew: true,
          }),
        }),
      );
    });

    it('should filter by search term (user email/name)', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getSubscriptions({ search: 'jane' });

      expect(mockPrisma.userSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: {
              OR: [
                { email: { contains: 'jane', mode: 'insensitive' } },
                { firstName: { contains: 'jane', mode: 'insensitive' } },
                { lastName: { contains: 'jane', mode: 'insensitive' } },
              ],
            },
          }),
        }),
      );
    });

    it('should order by expiresAt ascending', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getSubscriptions({});

      expect(mockPrisma.userSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { expiresAt: 'asc' },
        }),
      );
    });

    it('should map subscription to DTO correctly', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(1);
      mockPrisma.userSubscription.findMany.mockResolvedValue([mockSubscription]);

      const result = await service.getSubscriptions({});

      const item = result.items[0];
      expect(item.id).toBe(mockSubscription.id);
      expect(item.userId).toBe(mockUser.id);
      expect(item.userEmail).toBe(mockUser.email);
      expect(item.userFirstName).toBe(mockUser.firstName);
      expect(item.userLastName).toBe(mockUser.lastName);
      expect(item.plan.id).toBe(mockPlan.id);
      expect(item.plan.name).toBe(mockPlan.name);
      expect(item.plan.type).toBe(mockPlan.type);
      expect(item.status).toBe(mockSubscription.status);
      expect(item.autoRenew).toBe(mockSubscription.autoRenew);
    });

    it('should calculate daysRemaining correctly', async () => {
      const futureExpiry = new Date();
      futureExpiry.setDate(futureExpiry.getDate() + 15); // 15 days from now
      const subscriptionWithFutureExpiry = {
        ...mockSubscription,
        expiresAt: futureExpiry,
      };

      mockPrisma.userSubscription.count.mockResolvedValue(1);
      mockPrisma.userSubscription.findMany.mockResolvedValue([subscriptionWithFutureExpiry]);

      const result = await service.getSubscriptions({});

      expect(result.items[0].daysRemaining).toBeGreaterThan(14);
      expect(result.items[0].daysRemaining).toBeLessThanOrEqual(16);
    });
  });

  describe('getSubscriptionById', () => {
    it('should return subscription by ID', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getSubscriptionById('sub-123');

      expect(result.id).toBe('sub-123');
      expect(result.userEmail).toBe(mockUser.email);
      expect(result.plan.name).toBe(mockPlan.name);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue(null);

      await expect(service.getSubscriptionById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return subscription statistics', async () => {
      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(500)  // active
        .mockResolvedValueOnce(100)  // cancelled
        .mockResolvedValueOnce(50)   // expired
        .mockResolvedValueOnce(10)   // paused
        .mockResolvedValueOnce(660)  // total
        .mockResolvedValueOnce(25);  // expiring in 7 days

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ mrr: 250000 }])   // MRR
        .mockResolvedValueOnce([{ avg: 45 }]);      // avg duration

      const result = await service.getStats();

      expect(result.active).toBe(500);
      expect(result.cancelled).toBe(100);
      expect(result.expired).toBe(50);
      expect(result.paused).toBe(10);
      expect(result.total).toBe(660);
      expect(result.expiringIn7Days).toBe(25);
      expect(result.monthlyRecurringRevenue).toBe(25000000); // In kopecks
      expect(result.avgDurationDays).toBe(45);
    });

    it('should filter active subscriptions correctly', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.$queryRaw.mockResolvedValue([{ mrr: 0, avg: 0 }]);

      await service.getStats();

      expect(mockPrisma.userSubscription.count).toHaveBeenCalledWith({
        where: { status: SubscriptionStatus.ACTIVE },
      });
    });

    it('should handle null MRR result', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ mrr: null }])
        .mockResolvedValueOnce([{ avg: null }]);

      const result = await service.getStats();

      expect(result.monthlyRecurringRevenue).toBe(0);
      expect(result.avgDurationDays).toBe(0);
    });
  });

  describe('getExpiringSubscriptions', () => {
    it('should return subscriptions expiring within specified days', async () => {
      const expiringSubscription = {
        ...mockSubscription,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      };
      mockPrisma.userSubscription.findMany.mockResolvedValue([expiringSubscription]);

      const result = await service.getExpiringSubscriptions(7);

      expect(result).toHaveLength(1);
      expect(result[0].daysUntilExpiry).toBeGreaterThanOrEqual(2);
      expect(result[0].daysUntilExpiry).toBeLessThanOrEqual(4);
    });

    it('should filter active subscriptions only', async () => {
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getExpiringSubscriptions(7);

      expect(mockPrisma.userSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SubscriptionStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should order by expiresAt ascending', async () => {
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getExpiringSubscriptions(7);

      expect(mockPrisma.userSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { expiresAt: 'asc' },
        }),
      );
    });

    it('should limit to 50 results', async () => {
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getExpiringSubscriptions(7);

      expect(mockPrisma.userSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should use default 7 days when not specified', async () => {
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getExpiringSubscriptions();

      // Verify the date range covers approximately 7 days
      const call = mockPrisma.userSubscription.findMany.mock.calls[0];
      const where = call[0].where;
      const gte = new Date(where.expiresAt.gte).getTime();
      const lte = new Date(where.expiresAt.lte).getTime();
      const daysDiff = (lte - gte) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });
  });

  describe('extendSubscription', () => {
    it('should extend an active subscription', async () => {
      const originalExpiresAt = new Date('2024-02-01');
      const activeSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: originalExpiresAt,
      };

      mockPrisma.userSubscription.findUnique.mockResolvedValue(activeSubscription);

      const newExpiresAt = new Date('2024-03-02'); // 30 days later
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...activeSubscription,
        expiresAt: newExpiresAt,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.extendSubscription(
        'sub-123',
        30,
        'Compensation for downtime',
        mockAdminId,
      );

      expect(result.expiresAt.getTime()).toBeGreaterThan(originalExpiresAt.getTime());
    });

    it('should throw NotFoundException when subscription not found', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.extendSubscription('nonexistent', 30, 'Reason', mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-active subscription', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(cancelledSubscription);

      await expect(
        service.extendSubscription('sub-123', 30, 'Reason', mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create audit log on extension', async () => {
      const activeSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(activeSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue(activeSubscription);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.extendSubscription('sub-123', 30, 'Test reason', mockAdminId);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockAdminId,
          action: 'SUBSCRIPTION_EXTENDED',
          entityType: 'UserSubscription',
          entityId: 'sub-123',
          newValue: expect.objectContaining({
            days: 30,
            reason: 'Test reason',
          }),
        }),
      });
    });

    it('should handle undefined reason', async () => {
      const activeSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(activeSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue(activeSubscription);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.extendSubscription('sub-123', 14, undefined, mockAdminId);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newValue: expect.objectContaining({
            days: 14,
            reason: undefined,
          }),
        }),
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel an active subscription', async () => {
      const activeSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(activeSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...activeSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        autoRenew: false,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.cancelSubscription(
        'sub-123',
        'User request',
        mockAdminId,
      );

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelSubscription('nonexistent', 'Reason', mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already cancelled subscription', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(cancelledSubscription);

      await expect(
        service.cancelSubscription('sub-123', 'Reason', mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set autoRenew to false on cancellation', async () => {
      const activeSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(activeSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...activeSubscription,
        status: SubscriptionStatus.CANCELLED,
        autoRenew: false,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.cancelSubscription('sub-123', 'User request', mockAdminId);

      expect(mockPrisma.userSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionStatus.CANCELLED,
            autoRenew: false,
          }),
        }),
      );
    });

    it('should set cancelledAt timestamp', async () => {
      const activeSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(activeSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...activeSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.cancelSubscription('sub-123', 'User request', mockAdminId);

      expect(mockPrisma.userSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancelledAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should create audit log on cancellation', async () => {
      const activeSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(activeSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...activeSubscription,
        status: SubscriptionStatus.CANCELLED,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.cancelSubscription('sub-123', 'Fraudulent activity', mockAdminId);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockAdminId,
          action: 'SUBSCRIPTION_CANCELLED_BY_ADMIN',
          entityType: 'UserSubscription',
          entityId: 'sub-123',
          oldValue: { status: SubscriptionStatus.ACTIVE },
          newValue: expect.objectContaining({
            status: SubscriptionStatus.CANCELLED,
            reason: 'Fraudulent activity',
          }),
        }),
      });
    });

    it('should allow cancelling paused subscriptions', async () => {
      const pausedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.PAUSED,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(pausedSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...pausedSubscription,
        status: SubscriptionStatus.CANCELLED,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.cancelSubscription(
        'sub-123',
        'User request',
        mockAdminId,
      );

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
    });

    it('should allow cancelling expired subscriptions', async () => {
      const expiredSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.EXPIRED,
      };
      mockPrisma.userSubscription.findUnique.mockResolvedValue(expiredSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...expiredSubscription,
        status: SubscriptionStatus.CANCELLED,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.cancelSubscription(
        'sub-123',
        'Cleanup',
        mockAdminId,
      );

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
    });
  });
});
