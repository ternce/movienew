/**
 * SubscriptionPlansService Unit Tests
 *
 * Tests for subscription plan management including:
 * - Plan listing and filtering
 * - Plan CRUD operations (admin)
 * - Content-specific plans
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

import { SubscriptionPlansService } from './subscription-plans.service';
import { PrismaService } from '../../config/prisma.service';
import {
  createMockSubscriptionPlan,
  createPremiumPlan,
  createContentPlan,
  createInactivePlan,
  SubscriptionType,
} from '../../../test/factories/subscription.factory';

describe('SubscriptionPlansService', () => {
  let service: SubscriptionPlansService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      subscriptionPlan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPlansService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SubscriptionPlansService>(SubscriptionPlansService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getActivePlans', () => {
    it('should return all active plans', async () => {
      const plans = [
        createPremiumPlan(),
        createMockSubscriptionPlan({ type: SubscriptionType.CONTENT }),
      ];

      mockPrisma.subscriptionPlan.findMany.mockResolvedValue(plans);

      const result = await service.getActivePlans();

      expect(result).toHaveLength(2);
      expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { price: 'asc' }],
      });
    });

    it('should filter by type', async () => {
      const plans = [createPremiumPlan()];

      mockPrisma.subscriptionPlan.findMany.mockResolvedValue(plans);

      await service.getActivePlans({ type: SubscriptionType.PREMIUM });

      expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true, type: SubscriptionType.PREMIUM },
        orderBy: [{ type: 'asc' }, { price: 'asc' }],
      });
    });

    it('should filter by contentId', async () => {
      const contentId = 'content-123';
      const plans = [createContentPlan(contentId)];

      mockPrisma.subscriptionPlan.findMany.mockResolvedValue(plans);

      await service.getActivePlans({ contentId });

      expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true, contentId },
        orderBy: [{ type: 'asc' }, { price: 'asc' }],
      });
    });

    it('should include inactive plans when isActive is false', async () => {
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);

      await service.getActivePlans({ isActive: false });

      expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: false },
        orderBy: [{ type: 'asc' }, { price: 'asc' }],
      });
    });

    it('should return empty array if no plans exist', async () => {
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);

      const result = await service.getActivePlans();

      expect(result).toEqual([]);
    });
  });

  describe('getPlanById', () => {
    it('should return plan by ID', async () => {
      const plan = createPremiumPlan({ id: 'plan-123' });

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan);

      const result = await service.getPlanById('plan-123');

      expect(result.id).toBe('plan-123');
      expect(result.type).toBe(SubscriptionType.PREMIUM);
      expect(mockPrisma.subscriptionPlan.findUnique).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
      });
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(service.getPlanById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should map price to number', async () => {
      const plan = {
        ...createPremiumPlan(),
        price: new Decimal(1499),
      };

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan);

      const result = await service.getPlanById(plan.id);

      expect(typeof result.price).toBe('number');
      expect(result.price).toBe(1499);
    });
  });

  describe('getPlanByContentId', () => {
    it('should return plan for content', async () => {
      const contentId = 'content-123';
      const plan = createContentPlan(contentId);

      mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(plan);

      const result = await service.getPlanByContentId(contentId);

      expect(result).not.toBeNull();
      expect(result!.contentId).toBe(contentId);
      expect(mockPrisma.subscriptionPlan.findFirst).toHaveBeenCalledWith({
        where: { contentId, isActive: true },
      });
    });

    it('should return null if no plan for content', async () => {
      mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);

      const result = await service.getPlanByContentId('no-plan-content');

      expect(result).toBeNull();
    });

    it('should only return active plans', async () => {
      const contentId = 'content-123';

      mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);

      await service.getPlanByContentId(contentId);

      expect(mockPrisma.subscriptionPlan.findFirst).toHaveBeenCalledWith({
        where: { contentId, isActive: true },
      });
    });
  });

  describe('createPlan', () => {
    it('should create a new subscription plan', async () => {
      const dto = {
        name: 'Premium Monthly',
        description: 'Access all content',
        type: SubscriptionType.PREMIUM,
        price: 1499,
        durationDays: 30,
        features: ['HD quality', 'No ads'],
      };

      const createdPlan = {
        id: 'new-plan-123',
        ...dto,
        price: new Decimal(dto.price),
        contentId: null,
        currency: 'RUB',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.subscriptionPlan.create.mockResolvedValue(createdPlan);

      const result = await service.createPlan(dto);

      expect(result.id).toBe('new-plan-123');
      expect(result.name).toBe('Premium Monthly');
      expect(result.isActive).toBe(true);
      expect(mockPrisma.subscriptionPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          description: dto.description,
          type: dto.type,
          price: dto.price,
          durationDays: dto.durationDays,
          features: dto.features,
          isActive: true,
        }),
      });
    });

    it('should create plan with contentId for content-specific plans', async () => {
      const dto = {
        name: 'Series Subscription',
        description: 'Access to specific series',
        type: SubscriptionType.CONTENT,
        price: 499,
        durationDays: 30,
        contentId: 'series-123',
      };

      const createdPlan = {
        id: 'content-plan-123',
        ...dto,
        price: new Decimal(dto.price),
        currency: 'RUB',
        features: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.subscriptionPlan.create.mockResolvedValue(createdPlan);

      const result = await service.createPlan(dto);

      expect(result.contentId).toBe('series-123');
    });

    it('should set empty features array if not provided', async () => {
      const dto = {
        name: 'Basic Plan',
        description: 'Basic access',
        type: SubscriptionType.PREMIUM,
        price: 299,
        durationDays: 7,
      };

      const createdPlan = {
        id: 'basic-plan',
        ...dto,
        price: new Decimal(dto.price),
        contentId: null,
        currency: 'RUB',
        features: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.subscriptionPlan.create.mockResolvedValue(createdPlan);

      await service.createPlan(dto);

      expect(mockPrisma.subscriptionPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          features: [],
        }),
      });
    });
  });

  describe('updatePlan', () => {
    it('should update existing plan', async () => {
      const existingPlan = createPremiumPlan({ id: 'plan-123' });
      const dto = {
        name: 'Updated Premium',
        price: 1999,
      };

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(existingPlan);
      mockPrisma.subscriptionPlan.update.mockResolvedValue({
        ...existingPlan,
        ...dto,
        price: new Decimal(dto.price),
      });

      const result = await service.updatePlan('plan-123', dto);

      expect(result.name).toBe('Updated Premium');
      expect(result.price).toBe(1999);
      expect(mockPrisma.subscriptionPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
        data: expect.objectContaining({
          name: dto.name,
          price: dto.price,
        }),
      });
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePlan('non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow partial updates', async () => {
      const existingPlan = createPremiumPlan({ id: 'plan-123' });
      const dto = { price: 1299 };

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(existingPlan);
      mockPrisma.subscriptionPlan.update.mockResolvedValue({
        ...existingPlan,
        price: new Decimal(dto.price),
      });

      const result = await service.updatePlan('plan-123', dto);

      expect(result.price).toBe(1299);
      expect(result.name).toBe(existingPlan.name); // Unchanged
    });

    it('should allow deactivating plan via update', async () => {
      const existingPlan = createPremiumPlan({ id: 'plan-123' });
      const dto = { isActive: false };

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(existingPlan);
      mockPrisma.subscriptionPlan.update.mockResolvedValue({
        ...existingPlan,
        isActive: false,
      });

      const result = await service.updatePlan('plan-123', dto);

      expect(result.isActive).toBe(false);
    });
  });

  describe('deactivatePlan', () => {
    it('should deactivate (soft delete) a plan', async () => {
      mockPrisma.subscriptionPlan.update.mockResolvedValue({
        id: 'plan-123',
        isActive: false,
      });

      await service.deactivatePlan('plan-123');

      expect(mockPrisma.subscriptionPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
        data: { isActive: false },
      });
    });
  });

  describe('DTO Mapping', () => {
    it('should correctly map plan to DTO', async () => {
      const plan = {
        id: 'plan-123',
        name: 'Premium Plan',
        description: 'Full access',
        type: SubscriptionType.PREMIUM,
        contentId: null,
        price: new Decimal(1499),
        currency: 'RUB',
        durationDays: 30,
        features: ['Feature 1', 'Feature 2'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan);

      const result = await service.getPlanById('plan-123');

      expect(result).toEqual({
        id: 'plan-123',
        name: 'Premium Plan',
        description: 'Full access',
        type: SubscriptionType.PREMIUM,
        price: 1499,
        currency: 'RUB',
        durationDays: 30,
        features: ['Feature 1', 'Feature 2'],
        isActive: true,
        createdAt: plan.createdAt,
      });
    });

    it('should handle null contentId correctly', async () => {
      const plan = createPremiumPlan(); // Premium plan has no contentId

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan);

      const result = await service.getPlanById(plan.id);

      expect(result.contentId).toBeUndefined();
    });

    it('should include contentId for content plans', async () => {
      const plan = createContentPlan('content-123');

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan);

      const result = await service.getPlanById(plan.id);

      expect(result.contentId).toBe('content-123');
    });
  });
});
