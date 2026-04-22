/**
 * UserSubscriptionsService Unit Tests
 *
 * Tests for user subscription functionality including:
 * - Subscription purchase flow
 * - Access control (CRITICAL)
 * - Subscription cancellation
 * - Auto-renewal management
 * - Expired subscription processing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PaymentMethodType,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { UserSubscriptionsService } from './user-subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { PrismaService } from '../../config/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { createMockUser } from '../../../test/factories/user.factory';
import {
  createPremiumPlan,
  createContentPlan,
  createActiveSubscription,
  createExpiredSubscription,
  createCancelledSubscription,
  SubscriptionStatus,
  SubscriptionType,
} from '../../../test/factories/subscription.factory';

describe('UserSubscriptionsService', () => {
  let service: UserSubscriptionsService;
  let mockPrisma: any;
  let mockPlansService: any;
  let mockPaymentsService: any;

  const mockUser = createMockUser();
  const userId = mockUser.id;

  beforeEach(async () => {
    mockPrisma = {
      userSubscription: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      subscriptionAccess: {
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      content: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockPlansService = {
      getPlanById: jest.fn(),
    };

    mockPaymentsService = {
      initiatePayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SubscriptionPlansService, useValue: mockPlansService },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<UserSubscriptionsService>(UserSubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('purchase', () => {
    const plan = createPremiumPlan();

    it('should initiate subscription purchase', async () => {
      mockPlansService.getPlanById.mockResolvedValue(plan);
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
      mockPaymentsService.initiatePayment.mockResolvedValue({
        transactionId: 'txn-123',
        status: TransactionStatus.PENDING,
        paymentUrl: 'https://payment.url',
      });

      const dto = {
        planId: plan.id,
        paymentMethod: PaymentMethodType.CARD,
      };

      const result = await service.purchase(userId, dto);

      expect(result.transactionId).toBe('txn-123');
      expect(mockPaymentsService.initiatePayment).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          type: TransactionType.SUBSCRIPTION,
          amount: plan.price,
          paymentMethod: PaymentMethodType.CARD,
          referenceId: plan.id,
        }),
      );
    });

    it('should throw BadRequestException if plan is inactive', async () => {
      mockPlansService.getPlanById.mockResolvedValue({ ...plan, isActive: false });

      await expect(
        service.purchase(userId, { planId: plan.id, paymentMethod: PaymentMethodType.CARD }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user already has active subscription', async () => {
      mockPlansService.getPlanById.mockResolvedValue(plan);
      mockPrisma.userSubscription.findFirst.mockResolvedValue(
        createActiveSubscription(userId, plan.id),
      );

      await expect(
        service.purchase(userId, { planId: plan.id, paymentMethod: PaymentMethodType.CARD }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass bonus amount to payment', async () => {
      mockPlansService.getPlanById.mockResolvedValue(plan);
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
      mockPaymentsService.initiatePayment.mockResolvedValue({
        transactionId: 'txn-123',
        status: TransactionStatus.PENDING,
      });

      const dto = {
        planId: plan.id,
        paymentMethod: PaymentMethodType.CARD,
        bonusAmount: 500,
      };

      await service.purchase(userId, dto);

      expect(mockPaymentsService.initiatePayment).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ bonusAmount: 500 }),
      );
    });

    it('should set autoRenew metadata', async () => {
      mockPlansService.getPlanById.mockResolvedValue(plan);
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
      mockPaymentsService.initiatePayment.mockResolvedValue({
        transactionId: 'txn-123',
        status: TransactionStatus.PENDING,
      });

      const dto = {
        planId: plan.id,
        paymentMethod: PaymentMethodType.CARD,
        autoRenew: false,
      };

      await service.purchase(userId, dto);

      expect(mockPaymentsService.initiatePayment).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          metadata: expect.objectContaining({ autoRenew: false }),
        }),
      );
    });
  });

  describe('activateSubscription', () => {
    const plan = createPremiumPlan({ durationDays: 30 });

    it('should activate subscription after payment', async () => {
      mockPlansService.getPlanById.mockResolvedValue(plan);

      const mockSubscription = {
        id: 'sub-123',
        userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        plan,
      };

      mockPrisma.userSubscription.create.mockResolvedValue(mockSubscription);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.activateSubscription(userId, plan.id, 'txn-123');

      expect(result.id).toBe('sub-123');
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(mockPrisma.userSubscription.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SUBSCRIPTION_ACTIVATED',
          entityType: 'UserSubscription',
        }),
      });
    });

    it('should grant content access for content-specific plans', async () => {
      const contentPlan = createContentPlan('content-123');
      mockPlansService.getPlanById.mockResolvedValue(contentPlan);

      const mockSubscription = {
        id: 'sub-123',
        userId,
        planId: contentPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        plan: contentPlan,
      };

      mockPrisma.userSubscription.create.mockResolvedValue(mockSubscription);
      mockPrisma.subscriptionAccess.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.activateSubscription(userId, contentPlan.id, 'txn-123');

      expect(mockPrisma.subscriptionAccess.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subscriptionId: 'sub-123',
          contentId: 'content-123',
        }),
      });
    });

    it('should calculate correct expiration date', async () => {
      const plan60Days = { ...plan, durationDays: 60 };
      mockPlansService.getPlanById.mockResolvedValue(plan60Days);

      const beforeCreate = Date.now();
      let capturedExpiresAt: Date;

      mockPrisma.userSubscription.create.mockImplementation((args: any) => {
        capturedExpiresAt = args.data.expiresAt;
        return {
          id: 'sub-123',
          ...args.data,
          plan: plan60Days,
        };
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.activateSubscription(userId, plan.id, 'txn-123');

      const expectedExpiration = beforeCreate + 60 * 24 * 60 * 60 * 1000;
      expect(capturedExpiresAt!.getTime()).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(capturedExpiresAt!.getTime()).toBeLessThanOrEqual(expectedExpiration + 1000);
    });
  });

  describe('checkAccess - CRITICAL', () => {
    const contentId = 'content-123';

    it('should grant access for free content', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: contentId,
        isFree: true,
      });

      const result = await service.checkAccess(userId, contentId);

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe('Free content');
    });

    it('should grant access for premium subscription holders', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: contentId,
        isFree: false,
      });
      mockPrisma.userSubscription.findFirst.mockResolvedValue({
        id: 'sub-premium',
        userId,
        status: SubscriptionStatus.ACTIVE,
        plan: { type: SubscriptionType.PREMIUM },
      });

      const result = await service.checkAccess(userId, contentId);

      expect(result.hasAccess).toBe(true);
      expect(result.subscriptionId).toBe('sub-premium');
    });

    it('should grant access for content-specific subscription', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: contentId,
        isFree: false,
      });
      // No premium subscription
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
      // Has content-specific access
      mockPrisma.subscriptionAccess.findFirst.mockResolvedValue({
        subscriptionId: 'sub-content',
        contentId,
        revokedAt: null,
      });

      const result = await service.checkAccess(userId, contentId);

      expect(result.hasAccess).toBe(true);
      expect(result.subscriptionId).toBe('sub-content');
    });

    it('should deny access without subscription', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: contentId,
        isFree: false,
      });
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.subscriptionAccess.findFirst.mockResolvedValue(null);

      const result = await service.checkAccess(userId, contentId);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Subscription required');
    });

    it('should deny access for expired subscription', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: contentId,
        isFree: false,
      });
      // Premium subscription query will check expiresAt >= now
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.subscriptionAccess.findFirst.mockResolvedValue(null);

      const result = await service.checkAccess(userId, contentId);

      expect(result.hasAccess).toBe(false);
    });

    it('should return not found reason for non-existent content', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null);

      const result = await service.checkAccess(userId, 'non-existent-content');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Content not found');
    });

    it('should deny access if subscription access is revoked', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: contentId,
        isFree: false,
      });
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
      // Access was revoked, so findFirst returns null with revokedAt filter
      mockPrisma.subscriptionAccess.findFirst.mockResolvedValue(null);

      const result = await service.checkAccess(userId, contentId);

      expect(result.hasAccess).toBe(false);
    });

    it('should check premium subscription first, then content access', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: contentId,
        isFree: false,
      });
      mockPrisma.userSubscription.findFirst.mockResolvedValue({
        id: 'sub-premium',
        userId,
        status: SubscriptionStatus.ACTIVE,
        plan: { type: SubscriptionType.PREMIUM },
      });

      await service.checkAccess(userId, contentId);

      // Should check premium subscription with correct filters
      expect(mockPrisma.userSubscription.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: { gte: expect.any(Date) },
          plan: { type: 'PREMIUM' },
        }),
      });
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return paginated user subscriptions', async () => {
      const subscriptions = [
        {
          id: 'sub-1',
          userId,
          planId: 'plan-1',
          status: SubscriptionStatus.ACTIVE,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true,
          plan: createPremiumPlan(),
        },
      ];

      mockPrisma.userSubscription.count.mockResolvedValue(1);
      mockPrisma.userSubscription.findMany.mockResolvedValue(subscriptions);

      const result = await service.getUserSubscriptions(userId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await service.getUserSubscriptions(userId, {
        status: SubscriptionStatus.ACTIVE,
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.userSubscription.count).toHaveBeenCalledWith({
        where: { userId, status: SubscriptionStatus.ACTIVE },
      });
    });

    it('should calculate days remaining correctly', async () => {
      const expiresIn10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const subscription = {
        id: 'sub-1',
        userId,
        planId: 'plan-1',
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        expiresAt: expiresIn10Days,
        autoRenew: true,
        plan: createPremiumPlan(),
      };

      mockPrisma.userSubscription.count.mockResolvedValue(1);
      mockPrisma.userSubscription.findMany.mockResolvedValue([subscription]);

      const result = await service.getUserSubscriptions(userId, { page: 1, limit: 20 });

      expect(result.items[0].daysRemaining).toBe(10);
    });
  });

  describe('getActiveSubscription', () => {
    it('should return active subscription', async () => {
      const subscription = {
        id: 'sub-123',
        userId,
        planId: 'plan-1',
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        plan: createPremiumPlan(),
      };

      mockPrisma.userSubscription.findFirst.mockResolvedValue(subscription);

      const result = await service.getActiveSubscription(userId);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('should return null if no active subscription', async () => {
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);

      const result = await service.getActiveSubscription(userId);

      expect(result).toBeNull();
    });

    it('should filter by planId if provided', async () => {
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);

      await service.getActiveSubscription(userId, 'specific-plan');

      expect(mockPrisma.userSubscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            planId: 'specific-plan',
            status: SubscriptionStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const subscription = {
        id: 'sub-123',
        userId,
        status: SubscriptionStatus.ACTIVE,
        plan: createPremiumPlan(),
      };

      mockPrisma.userSubscription.findFirst.mockResolvedValue(subscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...subscription,
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        autoRenew: false,
      });
      mockPrisma.subscriptionAccess.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.cancelSubscription(userId, {
        subscriptionId: 'sub-123',
        immediate: true,
      });

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
      expect(mockPrisma.subscriptionAccess.updateMany).toHaveBeenCalled();
    });

    it('should cancel subscription at end of period', async () => {
      const subscription = {
        id: 'sub-123',
        userId,
        status: SubscriptionStatus.ACTIVE,
        plan: createPremiumPlan(),
      };

      mockPrisma.userSubscription.findFirst.mockResolvedValue(subscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...subscription,
        autoRenew: false,
        cancelledAt: new Date(),
      });

      const result = await service.cancelSubscription(userId, {
        subscriptionId: 'sub-123',
        immediate: false,
      });

      expect(result.status).toBe(SubscriptionStatus.ACTIVE); // Still active until end
      expect(mockPrisma.subscriptionAccess.updateMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelSubscription(userId, { subscriptionId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if subscription not active', async () => {
      mockPrisma.userSubscription.findFirst.mockResolvedValue({
        id: 'sub-123',
        userId,
        status: SubscriptionStatus.EXPIRED,
        plan: createPremiumPlan(),
      });

      await expect(
        service.cancelSubscription(userId, { subscriptionId: 'sub-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should revoke content access on immediate cancellation', async () => {
      const subscription = {
        id: 'sub-123',
        userId,
        status: SubscriptionStatus.ACTIVE,
        plan: createPremiumPlan(),
      };

      mockPrisma.userSubscription.findFirst.mockResolvedValue(subscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...subscription,
        status: SubscriptionStatus.CANCELLED,
      });
      mockPrisma.subscriptionAccess.updateMany.mockResolvedValue({ count: 1 });

      await service.cancelSubscription(userId, {
        subscriptionId: 'sub-123',
        immediate: true,
      });

      expect(mockPrisma.subscriptionAccess.updateMany).toHaveBeenCalledWith({
        where: { subscriptionId: 'sub-123', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('toggleAutoRenew', () => {
    it('should enable auto-renewal', async () => {
      const subscription = {
        id: 'sub-123',
        userId,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: false,
        plan: createPremiumPlan(),
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockPrisma.userSubscription.findFirst.mockResolvedValue(subscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...subscription,
        autoRenew: true,
      });

      const result = await service.toggleAutoRenew(userId, {
        subscriptionId: 'sub-123',
        autoRenew: true,
      });

      expect(result.autoRenew).toBe(true);
    });

    it('should disable auto-renewal', async () => {
      const subscription = {
        id: 'sub-123',
        userId,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        plan: createPremiumPlan(),
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockPrisma.userSubscription.findFirst.mockResolvedValue(subscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...subscription,
        autoRenew: false,
      });

      const result = await service.toggleAutoRenew(userId, {
        subscriptionId: 'sub-123',
        autoRenew: false,
      });

      expect(result.autoRenew).toBe(false);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleAutoRenew(userId, { subscriptionId: 'non-existent', autoRenew: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processExpiredSubscriptions', () => {
    it('should process expired subscriptions', async () => {
      const expiredSubscriptions = [
        { id: 'sub-1', userId, status: SubscriptionStatus.ACTIVE },
        { id: 'sub-2', userId, status: SubscriptionStatus.ACTIVE },
      ];

      mockPrisma.userSubscription.findMany.mockResolvedValue(expiredSubscriptions);
      mockPrisma.userSubscription.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.subscriptionAccess.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.processExpiredSubscriptions();

      expect(result).toBe(2);
      expect(mockPrisma.userSubscription.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['sub-1', 'sub-2'] } },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    });

    it('should revoke access for expired subscriptions', async () => {
      const expiredSubscriptions = [{ id: 'sub-1', userId }];

      mockPrisma.userSubscription.findMany.mockResolvedValue(expiredSubscriptions);
      mockPrisma.userSubscription.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.subscriptionAccess.updateMany.mockResolvedValue({ count: 1 });

      await service.processExpiredSubscriptions();

      expect(mockPrisma.subscriptionAccess.updateMany).toHaveBeenCalledWith({
        where: {
          subscriptionId: { in: ['sub-1'] },
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should return 0 if no subscriptions expired', async () => {
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      const result = await service.processExpiredSubscriptions();

      expect(result).toBe(0);
    });
  });

  describe('DTO Mapping', () => {
    it('should correctly calculate days remaining', async () => {
      const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const subscription = {
        id: 'sub-123',
        userId,
        planId: 'plan-1',
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        expiresAt,
        autoRenew: true,
        plan: createPremiumPlan(),
      };

      mockPrisma.userSubscription.findFirst.mockResolvedValue(subscription);

      const result = await service.getActiveSubscription(userId);

      expect(result!.daysRemaining).toBe(15);
    });

    it('should return 0 days remaining for expired subscription', async () => {
      const expiresAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // Expired yesterday
      const subscription = {
        id: 'sub-123',
        userId,
        planId: 'plan-1',
        status: SubscriptionStatus.EXPIRED,
        startedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        expiresAt,
        autoRenew: false,
        plan: createPremiumPlan(),
      };

      mockPrisma.userSubscription.count.mockResolvedValue(1);
      mockPrisma.userSubscription.findMany.mockResolvedValue([subscription]);

      const result = await service.getUserSubscriptions(userId, { page: 1, limit: 20 });

      expect(result.items[0].daysRemaining).toBe(0);
    });
  });
});
