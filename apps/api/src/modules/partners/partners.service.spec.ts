/**
 * PartnersService Unit Tests
 *
 * Tests for partner program functionality including:
 * - 5-level commission calculation (10%, 5%, 3%, 2%, 1%)
 * - Tax calculation by status (13%, 4%, 6%, 0%)
 * - Dashboard statistics
 * - Referral tree management
 * - Withdrawal handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommissionStatus, TaxStatus, TransactionStatus, WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PartnersService } from './partners.service';
import { PrismaService } from '../../config/prisma.service';
import {
  createMockUser,
  createPartnerUser,
} from '../../../test/factories/user.factory';
import {
  createMockCommission,
  createMockRelationship,
  createMockWithdrawal,
  create5LevelReferralTree,
  COMMISSION_RATES,
  TAX_RATES,
  TaxStatus as FactoryTaxStatus,
  CommissionStatus as FactoryCommissionStatus,
  WithdrawalStatus as FactoryWithdrawalStatus,
} from '../../../test/factories/partner.factory';

describe('PartnersService', () => {
  let service: PartnersService;
  let mockPrisma: any;

  beforeEach(async () => {
    // Create comprehensive mock for PrismaService
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      partnerRelationship: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      partnerCommission: {
        aggregate: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
      withdrawalRequest: {
        aggregate: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      transaction: {
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PartnersService>(PartnersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTax', () => {
    it('should calculate 13% tax for INDIVIDUAL status', () => {
      const amount = 10000;
      const result = service.calculateTax(amount, TaxStatus.INDIVIDUAL);

      expect(result.grossAmount).toBe(10000);
      expect(result.taxRate).toBe(0.13);
      expect(result.taxAmount).toBe(1300);
      expect(result.netAmount).toBe(8700);
    });

    it('should calculate 4% tax for SELF_EMPLOYED status', () => {
      const amount = 10000;
      const result = service.calculateTax(amount, TaxStatus.SELF_EMPLOYED);

      expect(result.grossAmount).toBe(10000);
      expect(result.taxRate).toBe(0.04);
      expect(result.taxAmount).toBe(400);
      expect(result.netAmount).toBe(9600);
    });

    it('should calculate 6% tax for ENTREPRENEUR status', () => {
      const amount = 10000;
      const result = service.calculateTax(amount, TaxStatus.ENTREPRENEUR);

      expect(result.grossAmount).toBe(10000);
      expect(result.taxRate).toBe(0.06);
      expect(result.taxAmount).toBe(600);
      expect(result.netAmount).toBe(9400);
    });

    it('should calculate 0% tax for COMPANY status', () => {
      const amount = 10000;
      const result = service.calculateTax(amount, TaxStatus.COMPANY);

      expect(result.grossAmount).toBe(10000);
      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.netAmount).toBe(10000);
    });

    it('should handle decimal amounts correctly', () => {
      const amount = 12345.67;
      const result = service.calculateTax(amount, TaxStatus.INDIVIDUAL);

      expect(result.grossAmount).toBe(12345.67);
      expect(result.taxRate).toBe(0.13);
      // Tax should be rounded to 2 decimal places
      expect(result.taxAmount).toBe(1604.94);
      expect(result.netAmount).toBe(12345.67 - 1604.94);
    });

    it('should handle zero amount', () => {
      const result = service.calculateTax(0, TaxStatus.INDIVIDUAL);

      expect(result.grossAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.netAmount).toBe(0);
    });

    it('should handle large amounts', () => {
      const amount = 1000000;
      const result = service.calculateTax(amount, TaxStatus.INDIVIDUAL);

      expect(result.grossAmount).toBe(1000000);
      expect(result.taxAmount).toBe(130000);
      expect(result.netAmount).toBe(870000);
    });
  });

  describe('calculateAndCreateCommissions', () => {
    const transactionId = 'transaction-123';
    const purchaserUserId = 'purchaser-123';
    const amount = new Decimal(10000);

    it('should create commission at 10% for level 1', async () => {
      const partnerId = 'partner-level-1';
      const relationship = createMockRelationship({
        partnerId,
        referralId: purchaserUserId,
        level: 1,
      });

      mockPrisma.partnerRelationship.findMany.mockResolvedValue([relationship]);
      mockPrisma.partnerCommission.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.calculateAndCreateCommissions(transactionId, purchaserUserId, amount);

      expect(mockPrisma.partnerCommission.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            partnerId,
            sourceUserId: purchaserUserId,
            sourceTransactionId: transactionId,
            level: 1,
            amount: expect.any(Decimal),
            status: CommissionStatus.PENDING,
          }),
        ]),
      });

      // Verify 10% commission
      const createCall = mockPrisma.partnerCommission.createMany.mock.calls[0][0];
      const commission = createCall.data[0];
      expect(Number(commission.amount)).toBe(1000); // 10% of 10000
    });

    it('should create commission at 5% for level 2', async () => {
      const partnerId = 'partner-level-2';
      const relationship = createMockRelationship({
        partnerId,
        referralId: purchaserUserId,
        level: 2,
      });

      mockPrisma.partnerRelationship.findMany.mockResolvedValue([relationship]);
      mockPrisma.partnerCommission.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.calculateAndCreateCommissions(transactionId, purchaserUserId, amount);

      const createCall = mockPrisma.partnerCommission.createMany.mock.calls[0][0];
      const commission = createCall.data[0];
      expect(Number(commission.amount)).toBe(500); // 5% of 10000
    });

    it('should create commission at 3% for level 3', async () => {
      const partnerId = 'partner-level-3';
      const relationship = createMockRelationship({
        partnerId,
        referralId: purchaserUserId,
        level: 3,
      });

      mockPrisma.partnerRelationship.findMany.mockResolvedValue([relationship]);
      mockPrisma.partnerCommission.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.calculateAndCreateCommissions(transactionId, purchaserUserId, amount);

      const createCall = mockPrisma.partnerCommission.createMany.mock.calls[0][0];
      const commission = createCall.data[0];
      expect(Number(commission.amount)).toBe(300); // 3% of 10000
    });

    it('should create commission at 2% for level 4', async () => {
      const partnerId = 'partner-level-4';
      const relationship = createMockRelationship({
        partnerId,
        referralId: purchaserUserId,
        level: 4,
      });

      mockPrisma.partnerRelationship.findMany.mockResolvedValue([relationship]);
      mockPrisma.partnerCommission.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.calculateAndCreateCommissions(transactionId, purchaserUserId, amount);

      const createCall = mockPrisma.partnerCommission.createMany.mock.calls[0][0];
      const commission = createCall.data[0];
      expect(Number(commission.amount)).toBe(200); // 2% of 10000
    });

    it('should create commission at 1% for level 5', async () => {
      const partnerId = 'partner-level-5';
      const relationship = createMockRelationship({
        partnerId,
        referralId: purchaserUserId,
        level: 5,
      });

      mockPrisma.partnerRelationship.findMany.mockResolvedValue([relationship]);
      mockPrisma.partnerCommission.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.calculateAndCreateCommissions(transactionId, purchaserUserId, amount);

      const createCall = mockPrisma.partnerCommission.createMany.mock.calls[0][0];
      const commission = createCall.data[0];
      expect(Number(commission.amount)).toBe(100); // 1% of 10000
    });

    it('should create commissions for all 5 levels correctly', async () => {
      const { relationships } = create5LevelReferralTree('root-partner');
      // Relationships in the factory are from the root to each level
      const relationshipsFromPurchaser = relationships.map((rel, idx) => ({
        ...rel,
        referralId: purchaserUserId,
        level: idx + 1,
      }));

      mockPrisma.partnerRelationship.findMany.mockResolvedValue(relationshipsFromPurchaser);
      mockPrisma.partnerCommission.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.calculateAndCreateCommissions(transactionId, purchaserUserId, amount);

      const createCall = mockPrisma.partnerCommission.createMany.mock.calls[0][0];
      expect(createCall.data).toHaveLength(5);

      // Verify each level's commission
      const commissions = createCall.data;
      expect(Number(commissions[0].amount)).toBe(1000); // Level 1: 10%
      expect(Number(commissions[1].amount)).toBe(500);  // Level 2: 5%
      expect(Number(commissions[2].amount)).toBe(300);  // Level 3: 3%
      expect(Number(commissions[3].amount)).toBe(200);  // Level 4: 2%
      expect(Number(commissions[4].amount)).toBe(100);  // Level 5: 1%
    });

    it('should not create commissions beyond level 5', async () => {
      const relationships = [
        createMockRelationship({ partnerId: 'partner-1', referralId: purchaserUserId, level: 1 }),
        createMockRelationship({ partnerId: 'partner-6', referralId: purchaserUserId, level: 6 }),
        createMockRelationship({ partnerId: 'partner-7', referralId: purchaserUserId, level: 7 }),
      ];

      mockPrisma.partnerRelationship.findMany.mockResolvedValue(relationships);
      mockPrisma.partnerCommission.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.calculateAndCreateCommissions(transactionId, purchaserUserId, amount);

      // Only level 1 should have commission (levels 6 and 7 have 0% rate)
      const createCall = mockPrisma.partnerCommission.createMany.mock.calls[0][0];
      expect(createCall.data).toHaveLength(1);
      expect(createCall.data[0].level).toBe(1);
    });

    it('should not create commissions if no partner relationships exist', async () => {
      mockPrisma.partnerRelationship.findMany.mockResolvedValue([]);

      await service.calculateAndCreateCommissions(transactionId, purchaserUserId, amount);

      expect(mockPrisma.partnerCommission.createMany).not.toHaveBeenCalled();
    });

    it('should create audit log when commissions are created', async () => {
      const relationship = createMockRelationship({
        partnerId: 'partner-1',
        referralId: purchaserUserId,
        level: 1,
      });

      mockPrisma.partnerRelationship.findMany.mockResolvedValue([relationship]);
      mockPrisma.partnerCommission.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.calculateAndCreateCommissions(transactionId, purchaserUserId, amount);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'COMMISSIONS_CREATED',
          entityType: 'Transaction',
          entityId: transactionId,
        }),
      });
    });
  });

  describe('getDashboard', () => {
    const userId = 'user-123';
    const mockUser = createPartnerUser({ id: userId });

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getDashboard(userId)).rejects.toThrow(NotFoundException);
    });

    it('should return dashboard statistics', async () => {
      mockPrisma.partnerRelationship.count
        .mockResolvedValueOnce(5) // direct referrals
        .mockResolvedValueOnce(10); // team size
      mockPrisma.partnerCommission.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(5000) } }) // approved
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(1000) } }) // pending
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(500) } })  // this month
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(300) } }); // last month
      mockPrisma.withdrawalRequest.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(2000) },
      });
      mockPrisma.transaction.groupBy.mockResolvedValue([{ userId: 'ref-1' }, { userId: 'ref-2' }]);
      mockPrisma.partnerRelationship.findMany.mockResolvedValue([
        { referralId: 'ref-1' },
        { referralId: 'ref-2' },
        { referralId: 'ref-3' },
      ]);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: new Decimal(50000) } });

      const result = await service.getDashboard(userId);

      expect(result).toHaveProperty('currentLevel');
      expect(result).toHaveProperty('levelName');
      expect(result).toHaveProperty('totalReferrals');
      expect(result).toHaveProperty('activeReferrals');
      expect(result).toHaveProperty('teamSize');
      expect(result).toHaveProperty('totalEarnings');
      expect(result).toHaveProperty('pendingEarnings');
      expect(result).toHaveProperty('availableBalance');
      expect(result).toHaveProperty('nextLevelProgress');
    });

    it('should calculate available balance correctly', async () => {
      const approvedAmount = 10000;
      const withdrawnAmount = 3000;

      mockPrisma.partnerRelationship.count.mockResolvedValue(0);
      mockPrisma.partnerCommission.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(approvedAmount) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } });
      mockPrisma.withdrawalRequest.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(withdrawnAmount) },
      });
      mockPrisma.partnerRelationship.findMany.mockResolvedValue([]);
      mockPrisma.transaction.groupBy.mockResolvedValue([]);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getDashboard(userId);

      expect(result.totalEarnings).toBe(approvedAmount);
      expect(result.availableBalance).toBe(approvedAmount - withdrawnAmount);
    });

    it('should calculate partner level based on referrals and team volume', async () => {
      // Setup for level 2: needs 5 referrals and 10000 team volume
      mockPrisma.partnerRelationship.count
        .mockResolvedValueOnce(6) // 6 direct referrals
        .mockResolvedValueOnce(10); // team size
      mockPrisma.partnerCommission.aggregate.mockResolvedValue({ _sum: { amount: new Decimal(0) } });
      mockPrisma.withdrawalRequest.aggregate.mockResolvedValue({ _sum: { amount: new Decimal(0) } });
      mockPrisma.partnerRelationship.findMany.mockResolvedValue([
        { referralId: 'ref-1' }, { referralId: 'ref-2' },
      ]);
      mockPrisma.transaction.groupBy.mockResolvedValue([]);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(15000) }, // 15000 team volume
      });

      const result = await service.getDashboard(userId);

      expect(result.currentLevel).toBe(2); // Bronze level
      expect(result.levelName).toBe('Бронза');
    });
  });

  describe('getReferralTree', () => {
    const userId = 'user-123';

    it('should return empty tree if no referrals', async () => {
      mockPrisma.partnerRelationship.findMany.mockResolvedValue([]);
      mockPrisma.transaction.groupBy.mockResolvedValue([]);
      mockPrisma.partnerRelationship.count.mockResolvedValue(0);

      const result = await service.getReferralTree(userId);

      expect(result.directReferrals).toEqual([]);
      expect(result.directCount).toBe(0);
      expect(result.totalTeamSize).toBe(0);
    });

    it('should return direct referrals with their stats', async () => {
      const referral = createMockUser({ firstName: 'John', lastName: 'Doe' });
      mockPrisma.partnerRelationship.findMany.mockResolvedValue([
        {
          partnerId: userId,
          referralId: referral.id,
          level: 1,
          createdAt: new Date(),
          referral: {
            id: referral.id,
            firstName: referral.firstName,
            lastName: referral.lastName,
            email: referral.email,
            createdAt: referral.createdAt,
          },
        },
      ]);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { userId: referral.id, _sum: { amount: new Decimal(5000) } },
      ]);
      mockPrisma.partnerRelationship.count.mockResolvedValue(1);

      const result = await service.getReferralTree(userId, 1);

      expect(result.directReferrals).toHaveLength(1);
      expect(result.directReferrals[0].firstName).toBe('John');
      expect(result.directReferrals[0].level).toBe(1);
    });

    it('should include transaction totals for referrals', async () => {
      const referral = createMockUser();
      mockPrisma.partnerRelationship.findMany.mockResolvedValue([
        {
          partnerId: userId,
          referralId: referral.id,
          level: 1,
          createdAt: new Date(),
          referral: {
            id: referral.id,
            firstName: referral.firstName,
            lastName: referral.lastName,
            email: referral.email,
            createdAt: referral.createdAt,
          },
        },
      ]);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { userId: referral.id, _sum: { amount: new Decimal(7500) } },
      ]);
      mockPrisma.partnerRelationship.count.mockResolvedValue(1);

      const result = await service.getReferralTree(userId, 1);

      expect(result.directReferrals[0].totalSpent).toBe(7500);
      expect(result.directReferrals[0].isActive).toBe(true);
    });
  });

  describe('getCommissions', () => {
    const userId = 'user-123';

    it('should return paginated commission history', async () => {
      const commissions = [
        {
          id: 'comm-1',
          partnerId: userId,
          sourceUserId: 'source-1',
          level: 1,
          amount: new Decimal(1000),
          status: CommissionStatus.APPROVED,
          createdAt: new Date(),
          paidAt: null,
        },
        {
          id: 'comm-2',
          partnerId: userId,
          sourceUserId: 'source-2',
          level: 2,
          amount: new Decimal(500),
          status: CommissionStatus.PENDING,
          createdAt: new Date(),
          paidAt: null,
        },
      ];

      mockPrisma.partnerCommission.count.mockResolvedValue(2);
      mockPrisma.partnerCommission.findMany.mockResolvedValue(commissions);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'source-1', firstName: 'User', lastName: 'One' },
        { id: 'source-2', firstName: 'User', lastName: 'Two' },
      ]);

      const result = await service.getCommissions(userId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockPrisma.partnerCommission.count.mockResolvedValue(0);
      mockPrisma.partnerCommission.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getCommissions(userId, {
        status: CommissionStatus.APPROVED,
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.partnerCommission.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          partnerId: userId,
          status: CommissionStatus.APPROVED,
        }),
      });
    });

    it('should filter by level', async () => {
      mockPrisma.partnerCommission.count.mockResolvedValue(0);
      mockPrisma.partnerCommission.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getCommissions(userId, { level: 1, page: 1, limit: 20 });

      expect(mockPrisma.partnerCommission.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          partnerId: userId,
          level: 1,
        }),
      });
    });

    it('should filter by date range', async () => {
      mockPrisma.partnerCommission.count.mockResolvedValue(0);
      mockPrisma.partnerCommission.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      await service.getCommissions(userId, { fromDate, toDate, page: 1, limit: 20 });

      expect(mockPrisma.partnerCommission.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          partnerId: userId,
          createdAt: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
          },
        }),
      });
    });
  });

  describe('getAvailableBalance', () => {
    const userId = 'user-123';

    it('should calculate available balance correctly', async () => {
      mockPrisma.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(10000) },
      });
      mockPrisma.withdrawalRequest.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(2000) } }) // pending
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(3000) } }); // completed

      const result = await service.getAvailableBalance(userId);

      expect(result.totalEarnings).toBe(10000);
      expect(result.pendingWithdrawals).toBe(2000);
      expect(result.withdrawnAmount).toBe(3000);
      expect(result.availableBalance).toBe(5000); // 10000 - 2000 - 3000
    });

    it('should return zero available balance when fully withdrawn', async () => {
      mockPrisma.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(10000) },
      });
      mockPrisma.withdrawalRequest.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(10000) } });

      const result = await service.getAvailableBalance(userId);

      expect(result.availableBalance).toBe(0);
    });

    it('should handle null amounts', async () => {
      mockPrisma.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrisma.withdrawalRequest.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getAvailableBalance(userId);

      expect(result.totalEarnings).toBe(0);
      expect(result.pendingWithdrawals).toBe(0);
      expect(result.withdrawnAmount).toBe(0);
      expect(result.availableBalance).toBe(0);
    });
  });

  describe('createWithdrawal', () => {
    const userId = 'user-123';

    beforeEach(() => {
      // Mock getAvailableBalance dependencies
      mockPrisma.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(10000) },
      });
      mockPrisma.withdrawalRequest.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } });
    });

    it('should create withdrawal request with correct tax calculation', async () => {
      const dto = {
        amount: 5000,
        taxStatus: TaxStatus.INDIVIDUAL,
        paymentDetails: {
          bankName: 'Test Bank',
          accountNumber: '123456789',
        },
      };

      mockPrisma.withdrawalRequest.create.mockResolvedValue({
        id: 'withdrawal-123',
        userId,
        amount: new Decimal(5000),
        currency: 'RUB',
        taxStatus: TaxStatus.INDIVIDUAL,
        taxAmount: new Decimal(650),
        status: WithdrawalStatus.PENDING,
        createdAt: new Date(),
        processedAt: null,
        rejectionReason: null,
      });

      const result = await service.createWithdrawal(userId, dto);

      expect(result.amount).toBe(5000);
      expect(result.taxStatus).toBe(TaxStatus.INDIVIDUAL);
      expect(result.taxAmount).toBe(650); // 13%
      expect(result.netAmount).toBe(4350); // 5000 - 650
      expect(result.status).toBe(WithdrawalStatus.PENDING);
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      mockPrisma.partnerCommission.aggregate.mockReset();
      mockPrisma.withdrawalRequest.aggregate.mockReset();

      mockPrisma.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(1000) },
      });
      mockPrisma.withdrawalRequest.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(0) } });

      const dto = {
        amount: 5000, // More than available
        taxStatus: TaxStatus.INDIVIDUAL,
        paymentDetails: {},
      };

      await expect(service.createWithdrawal(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create withdrawal with SELF_EMPLOYED tax (4%)', async () => {
      const dto = {
        amount: 10000,
        taxStatus: TaxStatus.SELF_EMPLOYED,
        paymentDetails: {},
      };

      mockPrisma.withdrawalRequest.create.mockResolvedValue({
        id: 'withdrawal-123',
        userId,
        amount: new Decimal(10000),
        currency: 'RUB',
        taxStatus: TaxStatus.SELF_EMPLOYED,
        taxAmount: new Decimal(400),
        status: WithdrawalStatus.PENDING,
        createdAt: new Date(),
        processedAt: null,
        rejectionReason: null,
      });

      const result = await service.createWithdrawal(userId, dto);

      expect(result.taxAmount).toBe(400); // 4%
      expect(result.netAmount).toBe(9600);
    });

    it('should create withdrawal with COMPANY tax (0%)', async () => {
      const dto = {
        amount: 10000,
        taxStatus: TaxStatus.COMPANY,
        paymentDetails: {},
      };

      mockPrisma.withdrawalRequest.create.mockResolvedValue({
        id: 'withdrawal-123',
        userId,
        amount: new Decimal(10000),
        currency: 'RUB',
        taxStatus: TaxStatus.COMPANY,
        taxAmount: new Decimal(0),
        status: WithdrawalStatus.PENDING,
        createdAt: new Date(),
        processedAt: null,
        rejectionReason: null,
      });

      const result = await service.createWithdrawal(userId, dto);

      expect(result.taxAmount).toBe(0);
      expect(result.netAmount).toBe(10000);
    });
  });

  describe('getWithdrawals', () => {
    const userId = 'user-123';

    it('should return paginated withdrawal history', async () => {
      const withdrawals = [
        {
          id: 'w-1',
          userId,
          amount: new Decimal(5000),
          taxStatus: TaxStatus.INDIVIDUAL,
          taxAmount: new Decimal(650),
          status: WithdrawalStatus.COMPLETED,
          createdAt: new Date(),
          processedAt: new Date(),
          rejectionReason: null,
        },
      ];

      mockPrisma.withdrawalRequest.count.mockResolvedValue(1);
      mockPrisma.withdrawalRequest.findMany.mockResolvedValue(withdrawals);

      const result = await service.getWithdrawals(userId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].amount).toBe(5000);
      expect(result.items[0].netAmount).toBe(4350); // 5000 - 650
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.findMany.mockResolvedValue([]);

      await service.getWithdrawals(userId, {
        status: WithdrawalStatus.PENDING,
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.withdrawalRequest.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId,
          status: WithdrawalStatus.PENDING,
        }),
      });
    });

    it('should filter by date range', async () => {
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.findMany.mockResolvedValue([]);

      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      await service.getWithdrawals(userId, { fromDate, toDate, page: 1, limit: 20 });

      expect(mockPrisma.withdrawalRequest.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId,
          createdAt: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
          },
        }),
      });
    });
  });

  describe('getPartnerLevels', () => {
    it('should return all partner level configurations', () => {
      const result = service.getPartnerLevels();

      expect(result).toHaveLength(5);

      // Level 1 - Стартер
      expect(result[0].levelNumber).toBe(1);
      expect(result[0].name).toBe('Стартер');
      expect(result[0].minReferrals).toBe(0);
      expect(result[0].minTeamVolume).toBe(0);

      // Level 2 - Бронза
      expect(result[1].levelNumber).toBe(2);
      expect(result[1].name).toBe('Бронза');
      expect(result[1].minReferrals).toBe(5);
      expect(result[1].minTeamVolume).toBe(10000);

      // Level 3 - Серебро
      expect(result[2].levelNumber).toBe(3);
      expect(result[2].name).toBe('Серебро');
      expect(result[2].minReferrals).toBe(15);
      expect(result[2].minTeamVolume).toBe(50000);

      // Level 4 - Золото
      expect(result[3].levelNumber).toBe(4);
      expect(result[3].name).toBe('Золото');
      expect(result[3].minReferrals).toBe(30);
      expect(result[3].minTeamVolume).toBe(150000);

      // Level 5 - Платина
      expect(result[4].levelNumber).toBe(5);
      expect(result[4].name).toBe('Платина');
      expect(result[4].minReferrals).toBe(50);
      expect(result[4].minTeamVolume).toBe(500000);
    });

    it('should include benefits for each level', () => {
      const result = service.getPartnerLevels();

      // All levels should have basic benefits
      result.forEach((level) => {
        expect(level.benefits).toContain('Базовые комиссии');
      });

      // Higher levels should have more benefits
      expect(result[4].benefits).toContain('VIP статус');
      expect(result[4].benefits).toContain('Персональный менеджер');
    });
  });

  describe('Commission Rate Verification', () => {
    it('should have correct commission rates defined', () => {
      expect(COMMISSION_RATES[1]).toBe(0.10); // 10%
      expect(COMMISSION_RATES[2]).toBe(0.05); // 5%
      expect(COMMISSION_RATES[3]).toBe(0.03); // 3%
      expect(COMMISSION_RATES[4]).toBe(0.02); // 2%
      expect(COMMISSION_RATES[5]).toBe(0.01); // 1%
    });

    it('should calculate correct total commission across all levels', () => {
      const baseAmount = 10000;
      let totalCommission = 0;

      for (let level = 1; level <= 5; level++) {
        totalCommission += baseAmount * COMMISSION_RATES[level as keyof typeof COMMISSION_RATES];
      }

      // 10% + 5% + 3% + 2% + 1% = 21%
      expect(totalCommission).toBe(2100);
    });
  });

  describe('Tax Rate Verification', () => {
    it('should have correct tax rates defined', () => {
      expect(TAX_RATES[FactoryTaxStatus.INDIVIDUAL]).toBe(0.13); // 13%
      expect(TAX_RATES[FactoryTaxStatus.SELF_EMPLOYED]).toBe(0.04); // 4%
      expect(TAX_RATES[FactoryTaxStatus.ENTREPRENEUR]).toBe(0.06); // 6%
      expect(TAX_RATES[FactoryTaxStatus.COMPANY]).toBe(0.0); // 0%
    });
  });
});
