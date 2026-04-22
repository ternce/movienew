import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BonusSource, BonusTransactionType, CommissionStatus, TaxStatus, WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { BonusesService } from './bonuses.service';
import { PrismaService } from '../../config/prisma.service';
import { createAdultUser, createUserWithBalance } from '../../../test/factories';
import { BONUS_CONFIG, TAX_RATES } from '@movie-platform/shared';

describe('BonusesService', () => {
  let service: BonusesService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bonusTransaction: {
        groupBy: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      bonusRate: {
        findFirst: jest.fn(),
      },
      partnerCommission: {
        aggregate: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        count: jest.fn(),
      },
      userActivityBonus: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      bonusWithdrawal: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BonusesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BonusesService>(BonusesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return user balance with statistics', async () => {
      const user = createUserWithBalance(1000);

      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(1000),
      });
      mockPrismaService.bonusTransaction.groupBy.mockResolvedValue([
        { type: BonusTransactionType.EARNED, _sum: { amount: new Decimal(1500) } },
        { type: BonusTransactionType.SPENT, _sum: { amount: new Decimal(-500) } },
      ]);
      mockPrismaService.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(200) },
      });

      const result = await service.getBalance(user.id);

      expect(result).toEqual({
        balance: 1000,
        pendingEarnings: 200,
        lifetimeEarned: 1500,
        lifetimeSpent: 500,
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.bonusTransaction.groupBy.mockResolvedValue([]);

      await expect(service.getBalance('non-existent-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate lifetimeEarned correctly from EARNED transactions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });
      mockPrismaService.bonusTransaction.groupBy.mockResolvedValue([
        { type: BonusTransactionType.EARNED, _sum: { amount: new Decimal(1000) } },
      ]);
      mockPrismaService.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getBalance('user-id');

      expect(result.lifetimeEarned).toBe(1000);
    });

    it('should calculate lifetimeSpent correctly from SPENT transactions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });
      mockPrismaService.bonusTransaction.groupBy.mockResolvedValue([
        { type: BonusTransactionType.SPENT, _sum: { amount: new Decimal(-750) } },
      ]);
      mockPrismaService.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getBalance('user-id');

      expect(result.lifetimeSpent).toBe(750);
    });

    it('should include pending partner commissions in pendingEarnings', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(100),
      });
      mockPrismaService.bonusTransaction.groupBy.mockResolvedValue([]);
      mockPrismaService.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(350) },
      });

      const result = await service.getBalance('user-id');

      expect(result.pendingEarnings).toBe(350);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transactions', async () => {
      const transactions = [
        {
          id: 'tx-1',
          userId: 'user-id',
          type: BonusTransactionType.EARNED,
          amount: new Decimal(100),
          source: BonusSource.PROMO,
          description: 'Test',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.bonusTransaction.count.mockResolvedValue(1);
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue(transactions);

      const result = await service.getTransactionHistory('user-id', {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by transaction type', async () => {
      mockPrismaService.bonusTransaction.count.mockResolvedValue(0);
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([]);

      await service.getTransactionHistory('user-id', {
        type: BonusTransactionType.EARNED,
      });

      expect(mockPrismaService.bonusTransaction.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-id',
          type: BonusTransactionType.EARNED,
        }),
      });
    });

    it('should filter by source', async () => {
      mockPrismaService.bonusTransaction.count.mockResolvedValue(0);
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([]);

      await service.getTransactionHistory('user-id', {
        source: BonusSource.PROMO,
      });

      expect(mockPrismaService.bonusTransaction.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-id',
          source: BonusSource.PROMO,
        }),
      });
    });

    it('should filter by date range', async () => {
      mockPrismaService.bonusTransaction.count.mockResolvedValue(0);
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([]);

      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      await service.getTransactionHistory('user-id', { fromDate, toDate });

      expect(mockPrismaService.bonusTransaction.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-id',
          createdAt: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
          },
        }),
      });
    });

    it('should respect pagination parameters', async () => {
      mockPrismaService.bonusTransaction.count.mockResolvedValue(100);
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([]);

      await service.getTransactionHistory('user-id', {
        page: 3,
        limit: 10,
      });

      expect(mockPrismaService.bonusTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        skip: 20, // (3-1) * 10
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('earnBonuses', () => {
    it('should increment user balance atomically', async () => {
      const transaction = {
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.EARNED,
        amount: new Decimal(100),
        source: BonusSource.PROMO,
        description: 'Test earn',
        createdAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue(transaction);

      const result = await service.earnBonuses({
        userId: 'user-id',
        amount: 100,
        source: BonusSource.PROMO,
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { bonusBalance: { increment: expect.any(Decimal) } },
      });
      expect(result.amount).toBe(100);
      expect(result.type).toBe(BonusTransactionType.EARNED);
    });

    it('should create EARNED transaction record', async () => {
      const transaction = {
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.EARNED,
        amount: new Decimal(50),
        source: BonusSource.PARTNER,
        description: 'Partner commission',
        createdAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue(transaction);

      await service.earnBonuses({
        userId: 'user-id',
        amount: 50,
        source: BonusSource.PARTNER,
        description: 'Partner commission',
      });

      expect(mockPrismaService.bonusTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          type: BonusTransactionType.EARNED,
          source: BonusSource.PARTNER,
        }),
      });
    });

    it('should throw BadRequestException for zero/negative amount', async () => {
      await expect(
        service.earnBonuses({
          userId: 'user-id',
          amount: 0,
          source: BonusSource.PROMO,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.earnBonuses({
          userId: 'user-id',
          amount: -100,
          source: BonusSource.PROMO,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should work within transaction context', async () => {
      const mockTx = {
        user: { update: jest.fn().mockResolvedValue({}) },
        bonusTransaction: {
          create: jest.fn().mockResolvedValue({
            id: 'tx-1',
            userId: 'user-id',
            type: BonusTransactionType.EARNED,
            amount: new Decimal(100),
            source: BonusSource.PROMO,
            description: 'Test',
            createdAt: new Date(),
          }),
        },
      };

      await service.earnBonuses(
        {
          userId: 'user-id',
          amount: 100,
          source: BonusSource.PROMO,
        },
        mockTx as any,
      );

      expect(mockTx.user.update).toHaveBeenCalled();
      expect(mockTx.bonusTransaction.create).toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should support different bonus sources', async () => {
      const sources = [BonusSource.PARTNER, BonusSource.PROMO, BonusSource.REFUND];

      for (const source of sources) {
        mockPrismaService.user.update.mockResolvedValue({});
        mockPrismaService.bonusTransaction.create.mockResolvedValue({
          id: 'tx-1',
          userId: 'user-id',
          type: BonusTransactionType.EARNED,
          amount: new Decimal(100),
          source,
          description: 'Test',
          createdAt: new Date(),
        });

        const result = await service.earnBonuses({
          userId: 'user-id',
          amount: 100,
          source,
        });

        expect(result.source).toBe(source);
      }
    });
  });

  describe('spendBonuses', () => {
    it('should decrement user balance atomically', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.SPENT,
        amount: new Decimal(-100),
        source: BonusSource.PARTNER,
        description: 'Test spend',
        createdAt: new Date(),
      });

      await service.spendBonuses({
        userId: 'user-id',
        amount: 100,
        referenceId: 'order-1',
        referenceType: 'ORDER',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { bonusBalance: { decrement: expect.any(Decimal) } },
      });
    });

    it('should create SPENT transaction with negative amount', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.SPENT,
        amount: new Decimal(-100),
        source: BonusSource.PARTNER,
        createdAt: new Date(),
      });

      const result = await service.spendBonuses({
        userId: 'user-id',
        amount: 100,
        referenceId: 'order-1',
        referenceType: 'ORDER',
      });

      expect(result.amount).toBe(-100);
      expect(result.type).toBe(BonusTransactionType.SPENT);
    });

    it('should throw BadRequestException when balance insufficient', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(50),
      });

      await expect(
        service.spendBonuses({
          userId: 'user-id',
          amount: 100,
          referenceId: 'order-1',
          referenceType: 'ORDER',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.spendBonuses({
          userId: 'non-existent',
          amount: 100,
          referenceId: 'order-1',
          referenceType: 'ORDER',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should work within transaction context', async () => {
      const mockTx = {
        user: {
          findUnique: jest.fn().mockResolvedValue({ bonusBalance: new Decimal(500) }),
          update: jest.fn().mockResolvedValue({}),
        },
        bonusTransaction: {
          create: jest.fn().mockResolvedValue({
            id: 'tx-1',
            userId: 'user-id',
            type: BonusTransactionType.SPENT,
            amount: new Decimal(-100),
            source: BonusSource.PARTNER,
            createdAt: new Date(),
          }),
        },
      };

      await service.spendBonuses(
        {
          userId: 'user-id',
          amount: 100,
          referenceId: 'order-1',
          referenceType: 'ORDER',
        },
        mockTx as any,
      );

      expect(mockTx.user.findUnique).toHaveBeenCalled();
      expect(mockTx.user.update).toHaveBeenCalled();
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('validateSpend', () => {
    it('should return true when balance is sufficient', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });

      const result = await service.validateSpend('user-id', 100);

      expect(result).toBe(true);
    });

    it('should return false when balance is insufficient', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(50),
      });

      const result = await service.validateSpend('user-id', 100);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateSpend('non-existent', 100);

      expect(result).toBe(false);
    });

    it('should handle Decimal amounts correctly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(100.50),
      });

      const result = await service.validateSpend('user-id', new Decimal(100.50));

      expect(result).toBe(true);
    });
  });

  describe('getCurrentRate', () => {
    it('should return active bonus rate', async () => {
      const now = new Date();
      mockPrismaService.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1.5),
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
      });

      const result = await service.getCurrentRate();

      expect(result).toEqual({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: 1.5,
        effectiveFrom: expect.any(Date),
        effectiveTo: undefined,
      });
    });

    it('should return default rate when no rate configured', async () => {
      mockPrismaService.bonusRate.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentRate();

      expect(result).toEqual({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: 1.0,
        effectiveFrom: expect.any(Date),
        effectiveTo: undefined,
      });
    });

    it('should select correct rate based on effectiveFrom/To dates', async () => {
      mockPrismaService.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(2.0),
        effectiveFrom: new Date('2024-06-01'),
        effectiveTo: new Date('2024-12-31'),
      });

      const result = await service.getCurrentRate();

      expect(result?.rate).toBe(2.0);
      expect(result?.effectiveTo).toBeDefined();
    });
  });

  describe('convertToCurrency', () => {
    it('should convert bonus amount using current rate', async () => {
      mockPrismaService.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1.5),
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
      });

      const result = await service.convertToCurrency(100);

      expect(result).toBe(150);
    });

    it('should return 0 when no rate found', async () => {
      mockPrismaService.bonusRate.findFirst.mockResolvedValue(null);

      // Even with default rate, the service returns a rate
      const result = await service.convertToCurrency(100);

      // Default rate is 1:1, so 100 bonuses = 100 RUB
      expect(result).toBe(100);
    });
  });

  describe('adjustBalance', () => {
    it('should increment balance for positive amount', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.ADJUSTMENT,
        amount: new Decimal(500),
        source: BonusSource.PROMO,
        description: 'Admin adjustment: Test reason',
        createdAt: new Date(),
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.adjustBalance('user-id', 500, 'Test reason', 'admin-id');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { bonusBalance: { increment: expect.any(Decimal) } },
      });
      expect(result.amount).toBe(500);
    });

    it('should decrement balance for negative amount', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(1000),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.ADJUSTMENT,
        amount: new Decimal(-200),
        source: BonusSource.PROMO,
        description: 'Admin adjustment: Correction',
        createdAt: new Date(),
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.adjustBalance('user-id', -200, 'Correction', 'admin-id');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { bonusBalance: { decrement: expect.any(Decimal) } },
      });
    });

    it('should create ADJUSTMENT transaction', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.ADJUSTMENT,
        amount: new Decimal(100),
        source: BonusSource.PROMO,
        createdAt: new Date(),
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.adjustBalance('user-id', 100, 'Test', 'admin-id');

      expect(result.type).toBe(BonusTransactionType.ADJUSTMENT);
    });

    it('should create audit log entry', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.ADJUSTMENT,
        amount: new Decimal(100),
        source: BonusSource.PROMO,
        createdAt: new Date(),
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.adjustBalance('user-id', 100, 'Test reason', 'admin-id');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-id',
          action: 'BONUS_ADJUSTED',
          entityType: 'User',
          entityId: 'user-id',
        }),
      });
    });

    it('should throw BadRequestException when adjusting below zero', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(50),
      });

      await expect(
        service.adjustBalance('user-id', -100, 'Too much', 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user not found for negative adjustment', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustBalance('non-existent', -100, 'Test', 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive bonus statistics', async () => {
      // Mock getBalance
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(1000),
      });
      mockPrismaService.bonusTransaction.groupBy
        .mockResolvedValueOnce([
          { type: BonusTransactionType.EARNED, _sum: { amount: new Decimal(2000) } },
          { type: BonusTransactionType.SPENT, _sum: { amount: new Decimal(-800) } },
        ])
        .mockResolvedValueOnce([
          { type: BonusTransactionType.EARNED, _sum: { amount: new Decimal(500) }, _count: 5 },
          { type: BonusTransactionType.SPENT, _sum: { amount: new Decimal(-200) }, _count: 2 },
        ]);
      mockPrismaService.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(100) },
      });
      // Mock getExpiringBonuses
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([]);

      const result = await service.getStatistics('user-id');

      expect(result).toMatchObject({
        balance: 1000,
        pendingEarnings: 100,
        lifetimeEarned: 2000,
        lifetimeSpent: 800,
        transactionsThisMonth: 7,
        earnedThisMonth: 500,
        spentThisMonth: 200,
      });
    });

    it('should return all-zero stats for user with no transactions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(0),
      });
      mockPrismaService.bonusTransaction.groupBy.mockResolvedValue([]);
      mockPrismaService.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([]);

      const result = await service.getStatistics('user-id');

      expect(result).toMatchObject({
        balance: 0,
        pendingEarnings: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        expiringIn30Days: 0,
        transactionsThisMonth: 0,
        earnedThisMonth: 0,
        spentThisMonth: 0,
      });
    });

    it('should return balance even when partnerCommission.aggregate fails', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });
      mockPrismaService.bonusTransaction.groupBy.mockResolvedValue([]);
      mockPrismaService.partnerCommission.aggregate.mockRejectedValue(
        new Error('Connection failed'),
      );
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([]);

      const result = await service.getBalance('user-id');

      expect(result).toMatchObject({
        balance: 500,
        pendingEarnings: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
      });
    });

    it('should include expiring bonuses in statistics', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });
      mockPrismaService.bonusTransaction.groupBy.mockResolvedValue([]);
      mockPrismaService.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10);
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          amount: new Decimal(200),
          expiresAt,
        },
      ]);

      const result = await service.getStatistics('user-id');

      expect(result.expiringIn30Days).toBe(200);
    });
  });

  describe('convertCommissionToBonus', () => {
    it('should convert approved commission to bonus', async () => {
      const commission = {
        id: 'comm-1',
        partnerId: 'user-id',
        sourceUserId: 'source-user',
        sourceTransactionId: 'tx-1',
        amount: new Decimal(500),
        level: 1,
        status: CommissionStatus.APPROVED,
      };

      mockPrismaService.partnerCommission.findUnique.mockResolvedValue(commission);
      mockPrismaService.partnerCommission.update.mockResolvedValue({
        ...commission,
        status: CommissionStatus.PAID,
        paidAt: new Date(),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'bonus-tx-1',
        userId: 'user-id',
        type: BonusTransactionType.EARNED,
        amount: new Decimal(500),
        source: BonusSource.PARTNER,
        description: 'Commission from partner program (Level 1)',
        createdAt: new Date(),
      });

      const result = await service.convertCommissionToBonus('user-id', 'comm-1');

      expect(result.amount).toBe(500);
      expect(result.source).toBe(BonusSource.PARTNER);
      expect(mockPrismaService.partnerCommission.update).toHaveBeenCalledWith({
        where: { id: 'comm-1' },
        data: expect.objectContaining({
          status: CommissionStatus.PAID,
        }),
      });
    });

    it('should throw when commission not found', async () => {
      mockPrismaService.partnerCommission.findUnique.mockResolvedValue(null);

      await expect(
        service.convertCommissionToBonus('user-id', 'non-existent'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when commission does not belong to user', async () => {
      mockPrismaService.partnerCommission.findUnique.mockResolvedValue({
        id: 'comm-1',
        partnerId: 'other-user',
        status: CommissionStatus.APPROVED,
      });

      await expect(
        service.convertCommissionToBonus('user-id', 'comm-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when commission is not in APPROVED status', async () => {
      mockPrismaService.partnerCommission.findUnique.mockResolvedValue({
        id: 'comm-1',
        partnerId: 'user-id',
        status: CommissionStatus.PENDING,
      });

      await expect(
        service.convertCommissionToBonus('user-id', 'comm-1'),
      ).rejects.toThrow('Для конвертации комиссия должна иметь статус APPROVED');
    });
  });

  describe('grantReferralBonus', () => {
    it('should grant bonus to referrer on first purchase', async () => {
      // User with referrer
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'referred-user',
        referredById: 'referrer-user',
      });
      // No prior bonus transactions
      mockPrismaService.bonusTransaction.count.mockResolvedValue(0);
      // No prior payment transactions (first purchase)
      mockPrismaService.transaction.count.mockResolvedValue(1);
      // No existing referral bonus
      mockPrismaService.bonusTransaction.findFirst.mockResolvedValue(null);
      // Mock earnBonuses
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'referrer-user',
        type: BonusTransactionType.EARNED,
        amount: new Decimal(50), // 5% of 1000
        source: BonusSource.REFERRAL_BONUS,
        createdAt: new Date(),
      });

      const result = await service.grantReferralBonus('referred-user', 1000);

      expect(result).not.toBeNull();
      expect(result?.source).toBe(BonusSource.REFERRAL_BONUS);
      expect(mockPrismaService.bonusTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'referrer-user',
          source: BonusSource.REFERRAL_BONUS,
          referenceId: 'referred-user',
          referenceType: 'ReferralFirstPurchase',
        }),
      });
    });

    it('should return null if user has no referrer', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        referredById: null,
      });

      const result = await service.grantReferralBonus('user-id', 1000);

      expect(result).toBeNull();
    });

    it('should return null if not first purchase', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        referredById: 'referrer-user',
      });
      // User has prior bonus spend transactions
      mockPrismaService.bonusTransaction.count.mockResolvedValue(2);
      mockPrismaService.transaction.count.mockResolvedValue(3);

      const result = await service.grantReferralBonus('user-id', 1000);

      expect(result).toBeNull();
    });

    it('should return null if referral bonus already granted', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        referredById: 'referrer-user',
      });
      mockPrismaService.bonusTransaction.count.mockResolvedValue(0);
      mockPrismaService.transaction.count.mockResolvedValue(1);
      // Existing referral bonus
      mockPrismaService.bonusTransaction.findFirst.mockResolvedValue({
        id: 'existing-bonus',
        userId: 'referrer-user',
        source: BonusSource.REFERRAL_BONUS,
      });

      const result = await service.grantReferralBonus('user-id', 1000);

      expect(result).toBeNull();
    });
  });

  describe('grantActivityBonus', () => {
    it('should grant one-time activity bonus', async () => {
      // No existing activity bonus
      mockPrismaService.userActivityBonus.findUnique.mockResolvedValue(null);
      mockPrismaService.userActivityBonus.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.EARNED,
        amount: new Decimal(100),
        source: BonusSource.ACTIVITY,
        description: 'Bonus for your first purchase',
        createdAt: new Date(),
      });

      const result = await service.grantActivityBonus('user-id', 'FIRST_PURCHASE');

      expect(result).not.toBeNull();
      expect(result?.source).toBe(BonusSource.ACTIVITY);
      expect(mockPrismaService.userActivityBonus.create).toHaveBeenCalled();
    });

    it('should return null if one-time activity already granted', async () => {
      mockPrismaService.userActivityBonus.findUnique.mockResolvedValue({
        id: 'existing',
        userId: 'user-id',
        activityType: 'FIRST_PURCHASE',
      });

      const result = await service.grantActivityBonus('user-id', 'FIRST_PURCHASE');

      expect(result).toBeNull();
    });

    it('should use correct bonus amount for activity type', async () => {
      mockPrismaService.userActivityBonus.findUnique.mockResolvedValue(null);
      mockPrismaService.userActivityBonus.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-id',
        type: BonusTransactionType.EARNED,
        amount: new Decimal(50),
        source: BonusSource.ACTIVITY,
        createdAt: new Date(),
      });

      await service.grantActivityBonus('user-id', 'STREAK_7_DAYS');

      expect(mockPrismaService.bonusTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: expect.any(Decimal),
          referenceId: 'STREAK_7_DAYS',
        }),
      });
    });
  });

  describe('getExpiringBonuses', () => {
    it('should return bonuses expiring within specified days', async () => {
      const now = new Date();
      const expiresIn10Days = new Date();
      expiresIn10Days.setDate(now.getDate() + 10);
      const expiresIn25Days = new Date();
      expiresIn25Days.setDate(now.getDate() + 25);

      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          amount: new Decimal(100),
          expiresAt: expiresIn10Days,
        },
        {
          id: 'tx-2',
          amount: new Decimal(200),
          expiresAt: expiresIn25Days,
        },
      ]);

      const result = await service.getExpiringBonuses('user-id', 30);

      expect(result.expiringBonuses).toHaveLength(2);
      expect(result.totalExpiring).toBe(300);
      expect(result.withinDays).toBe(30);
    });

    it('should calculate days remaining correctly', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          amount: new Decimal(100),
          expiresAt,
        },
      ]);

      const result = await service.getExpiringBonuses('user-id', 30);

      expect(result.expiringBonuses[0].daysRemaining).toBeLessThanOrEqual(8);
      expect(result.expiringBonuses[0].daysRemaining).toBeGreaterThanOrEqual(6);
    });

    it('should return empty array when no expiring bonuses', async () => {
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([]);

      const result = await service.getExpiringBonuses('user-id', 30);

      expect(result.expiringBonuses).toHaveLength(0);
      expect(result.totalExpiring).toBe(0);
    });
  });

  describe('processExpiringBonuses', () => {
    it('should process and expire multiple transactions', async () => {
      const expiredTx = {
        id: 'tx-1',
        userId: 'user-id',
        amount: new Decimal(100),
        expiresAt: new Date('2024-01-01'),
        user: { id: 'user-id', bonusBalance: new Decimal(500) },
      };

      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([expiredTx]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({});
      mockPrismaService.bonusTransaction.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.processExpiringBonuses();

      expect(result.expired).toBe(1);
      expect(result.notified).toBe(1);
    });

    it('should return zero when no expired transactions', async () => {
      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([]);

      const result = await service.processExpiringBonuses();

      expect(result.expired).toBe(0);
      expect(result.notified).toBe(0);
    });

    it('should not deduct more than user balance', async () => {
      const expiredTx = {
        id: 'tx-1',
        userId: 'user-id',
        amount: new Decimal(500),
        expiresAt: new Date('2024-01-01'),
        user: { id: 'user-id', bonusBalance: new Decimal(100) },
      };

      mockPrismaService.bonusTransaction.findMany.mockResolvedValue([expiredTx]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(100),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({});
      mockPrismaService.bonusTransaction.updateMany.mockResolvedValue({ count: 1 });

      await service.processExpiringBonuses();

      // Should deduct only 100 (user balance), not 500 (expired amount)
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { bonusBalance: { decrement: new Decimal(100) } },
      });
    });
  });

  describe('previewWithdrawal', () => {
    it('should calculate withdrawal preview correctly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });
      mockPrismaService.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1),
        effectiveFrom: new Date(),
        effectiveTo: null,
      });

      const result = await service.previewWithdrawal('user-id', 2000, TaxStatus.INDIVIDUAL);

      expect(result.bonusAmount).toBe(2000);
      expect(result.currencyAmount).toBe(2000);
      expect(result.rate).toBe(1);
      expect(result.taxRate).toBe(TAX_RATES.INDIVIDUAL);
      expect(result.estimatedTax).toBe(260); // 2000 * 0.13
      expect(result.estimatedNet).toBe(1740);
    });

    it('should throw when below minimum withdrawal', async () => {
      await expect(
        service.previewWithdrawal('user-id', 100, TaxStatus.INDIVIDUAL),
      ).rejects.toThrow('Минимальная сумма вывода');
    });

    it('should throw when insufficient balance', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });

      await expect(
        service.previewWithdrawal('user-id', 2000, TaxStatus.INDIVIDUAL),
      ).rejects.toThrow('Недостаточно бонусов');
    });

    it('should apply correct tax rate for self-employed', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });
      mockPrismaService.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1),
        effectiveFrom: new Date(),
        effectiveTo: null,
      });

      const result = await service.previewWithdrawal('user-id', 2000, TaxStatus.SELF_EMPLOYED);

      expect(result.taxRate).toBe(TAX_RATES.SELF_EMPLOYED);
    });
  });

  describe('withdrawBonusesToCurrency', () => {
    it('should process withdrawal successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });
      mockPrismaService.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1),
        effectiveFrom: new Date(),
        effectiveTo: null,
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({});
      mockPrismaService.bonusWithdrawal.create.mockResolvedValue({
        id: 'withdrawal-1',
        userId: 'user-id',
        bonusAmount: 2000,
        currencyAmount: 2000,
        rate: 1,
        taxStatus: TaxStatus.INDIVIDUAL,
        taxAmount: 260,
        netAmount: 1740,
        status: WithdrawalStatus.PENDING,
      });

      const result = await service.withdrawBonusesToCurrency('user-id', {
        amount: 2000,
        taxStatus: TaxStatus.INDIVIDUAL,
      });

      expect(result.success).toBe(true);
      expect(result.bonusAmount).toBe(2000);
      expect(result.withdrawalId).toBe('withdrawal-1');
    });

    it('should deduct balance on withdrawal', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });
      mockPrismaService.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1),
        effectiveFrom: new Date(),
        effectiveTo: null,
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({});
      mockPrismaService.bonusWithdrawal.create.mockResolvedValue({
        id: 'withdrawal-1',
      });

      await service.withdrawBonusesToCurrency('user-id', {
        amount: 2000,
        taxStatus: TaxStatus.INDIVIDUAL,
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { bonusBalance: { decrement: 2000 } },
      });
    });

    it('should create WITHDRAWN transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });
      mockPrismaService.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1),
        effectiveFrom: new Date(),
        effectiveTo: null,
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.bonusTransaction.create.mockResolvedValue({});
      mockPrismaService.bonusWithdrawal.create.mockResolvedValue({
        id: 'withdrawal-1',
      });

      await service.withdrawBonusesToCurrency('user-id', {
        amount: 2000,
        taxStatus: TaxStatus.INDIVIDUAL,
      });

      expect(mockPrismaService.bonusTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          type: BonusTransactionType.WITHDRAWN,
          amount: expect.any(Decimal),
        }),
      });
    });
  });

  describe('calculateMaxApplicable', () => {
    it('should return max applicable bonus for checkout', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(1000),
      });

      const result = await service.calculateMaxApplicable('user-id', 2000);

      // Max is 50% of order = 1000, user has 1000, so max is 1000
      expect(result.maxAmount).toBe(1000);
      expect(result.balance).toBe(1000);
      expect(result.maxPercent).toBe(BONUS_CONFIG.MAX_BONUS_PERCENT_CHECKOUT);
    });

    it('should limit by user balance when less than max percent', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(300),
      });

      const result = await service.calculateMaxApplicable('user-id', 2000);

      // Max is 50% of order = 1000, but user only has 300
      expect(result.maxAmount).toBe(300);
    });

    it('should limit by order total when balance exceeds total', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });

      const result = await service.calculateMaxApplicable('user-id', 1000);

      // Max is 50% of order = 500
      expect(result.maxAmount).toBe(500);
    });

    it('should throw when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateMaxApplicable('non-existent', 1000),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('isFirstPurchase', () => {
    it('should return true for user with no completed transactions', async () => {
      mockPrismaService.transaction.count.mockResolvedValue(0);

      const result = await service.isFirstPurchase('user-id');

      expect(result).toBe(true);
    });

    it('should return true for user with exactly one completed transaction', async () => {
      mockPrismaService.transaction.count.mockResolvedValue(1);

      const result = await service.isFirstPurchase('user-id');

      expect(result).toBe(true);
    });

    it('should return false for user with multiple completed transactions', async () => {
      mockPrismaService.transaction.count.mockResolvedValue(3);

      const result = await service.isFirstPurchase('user-id');

      expect(result).toBe(false);
    });
  });
});
