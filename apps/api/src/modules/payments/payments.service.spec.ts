/**
 * PaymentsService Unit Tests
 *
 * Tests for payment processing functionality including:
 * - Payment initiation with various methods
 * - Webhook processing with idempotency
 * - Refund handling
 * - Transaction history
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentMethodType,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PaymentsService } from './payments.service';
import { PrismaService } from '../../config/prisma.service';
import { BonusesService } from '../bonuses/bonuses.service';
import { PartnersService } from '../partners/partners.service';
import { YooKassaService } from './providers/yookassa/yookassa.service';
import { SbpService } from './providers/sbp/sbp.service';
import { BankTransferService } from './providers/bank-transfer/bank-transfer.service';
import { createMockUser } from '../../../test/factories/user.factory';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPrisma: any;
  let mockBonusesService: any;
  let mockPartnersService: any;
  let mockYooKassaService: any;
  let mockSbpService: any;
  let mockBankTransferService: any;

  const mockUser = createMockUser();
  const userId = mockUser.id;

  beforeEach(async () => {
    // Create comprehensive mocks
    mockPrisma = {
      transaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      invoice: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockBonusesService = {
      validateSpend: jest.fn(),
      spendBonuses: jest.fn(),
      earnBonuses: jest.fn(),
    };

    mockPartnersService = {
      calculateAndCreateCommissions: jest.fn(),
    };

    mockYooKassaService = {
      createPayment: jest.fn(),
      createRefund: jest.fn(),
      getReturnUrl: jest.fn().mockReturnValue('https://example.com/return'),
    };

    mockSbpService = {
      createPayment: jest.fn(),
    };

    mockBankTransferService = {
      createInvoice: jest.fn(),
      generateQrCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BonusesService, useValue: mockBonusesService },
        { provide: PartnersService, useValue: mockPartnersService },
        { provide: YooKassaService, useValue: mockYooKassaService },
        { provide: SbpService, useValue: mockSbpService },
        { provide: BankTransferService, useValue: mockBankTransferService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiatePayment', () => {
    const baseDto = {
      type: TransactionType.SUBSCRIPTION,
      amount: 1000,
      paymentMethod: PaymentMethodType.CARD,
      referenceId: 'ref-123',
    };

    it('should initiate card payment via YooKassa', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        currency: 'RUB',
        bonusAmountUsed: new Decimal(0),
        paymentMethod: PaymentMethodType.CARD,
        status: TransactionStatus.PENDING,
        createdAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValue(transaction);
      mockYooKassaService.createPayment.mockResolvedValue({
        id: 'ext-payment-123',
        confirmation: { confirmation_url: 'https://payment.url' },
      });
      mockPrisma.transaction.update.mockResolvedValue(transaction);

      const result = await service.initiatePayment(userId, baseDto);

      expect(result.transactionId).toBe('txn-123');
      expect(result.status).toBe(TransactionStatus.PENDING);
      expect(result.paymentUrl).toBe('https://payment.url');
      expect(mockYooKassaService.createPayment).toHaveBeenCalled();
    });

    it('should initiate SBP payment', async () => {
      const dto = { ...baseDto, paymentMethod: PaymentMethodType.SBP };
      const transaction = {
        id: 'txn-123',
        userId,
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        currency: 'RUB',
        bonusAmountUsed: new Decimal(0),
        paymentMethod: PaymentMethodType.SBP,
        status: TransactionStatus.PENDING,
        createdAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValue(transaction);
      mockSbpService.createPayment.mockResolvedValue({
        paymentId: 'sbp-payment-123',
        qrCodeUrl: 'https://qr.sbp.url',
        expiresAt: new Date(),
      });
      mockPrisma.transaction.update.mockResolvedValue(transaction);

      const result = await service.initiatePayment(userId, dto);

      expect(result.qrCodeUrl).toBe('https://qr.sbp.url');
      expect(mockSbpService.createPayment).toHaveBeenCalled();
    });

    it('should initiate bank transfer payment', async () => {
      const dto = { ...baseDto, paymentMethod: PaymentMethodType.BANK_TRANSFER };
      const transaction = {
        id: 'txn-123',
        userId,
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        currency: 'RUB',
        bonusAmountUsed: new Decimal(0),
        paymentMethod: PaymentMethodType.BANK_TRANSFER,
        status: TransactionStatus.PENDING,
        createdAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValue(transaction);
      mockBankTransferService.createInvoice.mockReturnValue({
        bankDetails: { accountNumber: '123456' },
        dueDate: new Date(),
      });
      mockBankTransferService.generateQrCode.mockReturnValue('https://qr.url');
      mockPrisma.invoice.create.mockResolvedValue({ id: 'invoice-123' });
      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      const result = await service.initiatePayment(userId, dto);

      expect(result.invoiceId).toBe('invoice-123');
      expect(result.bankDetails).toEqual({ accountNumber: '123456' });
      expect(mockBankTransferService.createInvoice).toHaveBeenCalled();
    });

    it('should initiate QR payment via SBP', async () => {
      const dto = { ...baseDto, paymentMethod: PaymentMethodType.QR };
      const transaction = {
        id: 'txn-123',
        userId,
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        currency: 'RUB',
        bonusAmountUsed: new Decimal(0),
        paymentMethod: PaymentMethodType.QR,
        status: TransactionStatus.PENDING,
        createdAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValue(transaction);
      mockSbpService.createPayment.mockResolvedValue({
        paymentId: 'qr-payment-123',
        qrCodeUrl: 'https://qr.url',
        expiresAt: new Date(),
      });
      mockPrisma.transaction.update.mockResolvedValue(transaction);

      const result = await service.initiatePayment(userId, dto);

      expect(result.qrCodeUrl).toBe('https://qr.url');
      expect(mockSbpService.createPayment).toHaveBeenCalled();
    });

    it('should validate bonus amount before payment', async () => {
      const dto = { ...baseDto, bonusAmount: 500 };
      mockBonusesService.validateSpend.mockResolvedValue(false);

      await expect(service.initiatePayment(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockBonusesService.validateSpend).toHaveBeenCalledWith(userId, 500);
    });

    it('should allow partial bonus payment', async () => {
      const dto = { ...baseDto, bonusAmount: 500 };
      const transaction = {
        id: 'txn-123',
        userId,
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        currency: 'RUB',
        bonusAmountUsed: new Decimal(500),
        paymentMethod: PaymentMethodType.CARD,
        status: TransactionStatus.PENDING,
        createdAt: new Date(),
      };

      mockBonusesService.validateSpend.mockResolvedValue(true);
      mockPrisma.transaction.create.mockResolvedValue(transaction);
      mockYooKassaService.createPayment.mockResolvedValue({
        id: 'ext-123',
        confirmation: { confirmation_url: 'https://payment.url' },
      });
      mockPrisma.transaction.update.mockResolvedValue(transaction);

      const result = await service.initiatePayment(userId, dto);

      expect(result.bonusAmountUsed).toBe(500);
      expect(result.amountToPay).toBe(500); // 1000 - 500
    });

    it('should complete immediately if fully covered by bonus', async () => {
      const dto = { ...baseDto, amount: 500, bonusAmount: 500 };
      const transaction = {
        id: 'txn-123',
        userId,
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(500),
        currency: 'RUB',
        bonusAmountUsed: new Decimal(500),
        paymentMethod: PaymentMethodType.CARD,
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
      };

      mockBonusesService.validateSpend.mockResolvedValue(true);
      mockPrisma.transaction.create.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.PENDING,
      });
      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      const result = await service.initiatePayment(userId, dto);

      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(result.amountToPay).toBe(0);
      expect(mockBonusesService.spendBonuses).toHaveBeenCalled();
    });
  });

  describe('completePayment - Webhook Idempotency', () => {
    const externalPaymentId = 'ext-payment-123';

    it('should complete payment on success webhook', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(1000),
        bonusAmountUsed: new Decimal(0),
        status: TransactionStatus.PENDING,
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);
      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.COMPLETED,
      });
      mockPrisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPartnersService.calculateAndCreateCommissions.mockResolvedValue(undefined);

      await service.completePayment(externalPaymentId, 'succeeded');

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'txn-123' },
          data: expect.objectContaining({
            status: TransactionStatus.COMPLETED,
          }),
        }),
      );
      expect(mockPartnersService.calculateAndCreateCommissions).toHaveBeenCalled();
    });

    it('should skip processing if transaction already completed (idempotency)', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(1000),
        status: TransactionStatus.COMPLETED, // Already completed
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);

      await service.completePayment(externalPaymentId, 'succeeded');

      // Should not attempt to update
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
      expect(mockPartnersService.calculateAndCreateCommissions).not.toHaveBeenCalled();
    });

    it('should skip processing if transaction already failed (idempotency)', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(1000),
        status: TransactionStatus.FAILED, // Already failed
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);

      await service.completePayment(externalPaymentId, 'succeeded');

      // Should not attempt to update
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    });

    it('should skip processing if transaction already cancelled (idempotency)', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(1000),
        status: TransactionStatus.CANCELLED, // Already cancelled
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);

      await service.completePayment(externalPaymentId, 'succeeded');

      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    });

    it('should skip processing if transaction already refunded (idempotency)', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(1000),
        status: TransactionStatus.REFUNDED, // Already refunded
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);

      await service.completePayment(externalPaymentId, 'succeeded');

      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    });

    it('should handle duplicate success webhooks (idempotency)', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(1000),
        bonusAmountUsed: new Decimal(0),
        status: TransactionStatus.PENDING,
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);
      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.COMPLETED,
      });
      mockPrisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPartnersService.calculateAndCreateCommissions.mockResolvedValue(undefined);

      // First webhook
      await service.completePayment(externalPaymentId, 'succeeded');

      // Reset for second call
      mockPrisma.transaction.findFirst.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.COMPLETED, // Now completed
      });

      // Second duplicate webhook
      await service.completePayment(externalPaymentId, 'succeeded');

      // Update should only be called once (from first webhook)
      expect(mockPrisma.transaction.update).toHaveBeenCalledTimes(1);
    });

    it('should mark transaction as failed on failed webhook', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(1000),
        status: TransactionStatus.PENDING,
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.FAILED,
      });

      await service.completePayment(externalPaymentId, 'failed');

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-123' },
        data: { status: TransactionStatus.FAILED },
      });
    });

    it('should mark transaction as cancelled on canceled webhook', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(1000),
        status: TransactionStatus.PENDING,
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.CANCELLED,
      });

      await service.completePayment(externalPaymentId, 'canceled');

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-123' },
        data: { status: TransactionStatus.CANCELLED },
      });
    });

    it('should handle unknown external payment ID gracefully', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      // Should not throw, just log warning
      await expect(
        service.completePayment('unknown-payment-id', 'succeeded'),
      ).resolves.toBeUndefined();
    });

    it('should create partner commissions on successful payment', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(10000),
        bonusAmountUsed: new Decimal(0),
        status: TransactionStatus.PENDING,
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);
      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.COMPLETED,
      });
      mockPrisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPartnersService.calculateAndCreateCommissions.mockResolvedValue(undefined);

      await service.completePayment(externalPaymentId, 'succeeded');

      expect(mockPartnersService.calculateAndCreateCommissions).toHaveBeenCalledWith(
        'txn-123',
        userId,
        expect.any(Decimal),
      );
    });

    it('should deduct bonus on successful payment', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId,
        amount: new Decimal(1000),
        bonusAmountUsed: new Decimal(300),
        status: TransactionStatus.PENDING,
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);
      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.COMPLETED,
      });
      mockPrisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPartnersService.calculateAndCreateCommissions.mockResolvedValue(undefined);

      await service.completePayment(externalPaymentId, 'succeeded');

      expect(mockBonusesService.spendBonuses).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          amount: 300,
          referenceId: 'txn-123',
        }),
        expect.any(Object),
      );
    });
  });

  describe('completePaymentById', () => {
    it('should complete payment by transaction ID', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        amount: new Decimal(1000),
        bonusAmountUsed: new Decimal(0),
        status: TransactionStatus.PENDING,
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.COMPLETED,
      });
      mockPrisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPartnersService.calculateAndCreateCommissions.mockResolvedValue(undefined);

      await service.completePaymentById('txn-123');

      expect(mockPrisma.transaction.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.completePaymentById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should skip if already processed', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        amount: new Decimal(1000),
        status: TransactionStatus.COMPLETED,
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      await service.completePaymentById('txn-123');

      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status', async () => {
      const transaction = {
        id: 'txn-123',
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        status: TransactionStatus.COMPLETED,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      const result = await service.getPaymentStatus('txn-123');

      expect(result.transactionId).toBe('txn-123');
      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(result.amount).toBe(1000);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.getPaymentStatus('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transaction history', async () => {
      const transactions = [
        {
          id: 'txn-1',
          type: TransactionType.SUBSCRIPTION,
          amount: new Decimal(1000),
          currency: 'RUB',
          bonusAmountUsed: new Decimal(0),
          paymentMethod: PaymentMethodType.CARD,
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
          completedAt: new Date(),
          metadata: {},
        },
        {
          id: 'txn-2',
          type: TransactionType.PURCHASE,
          amount: new Decimal(500),
          currency: 'RUB',
          bonusAmountUsed: new Decimal(100),
          paymentMethod: PaymentMethodType.SBP,
          status: TransactionStatus.PENDING,
          createdAt: new Date(),
          completedAt: null,
          metadata: {},
        },
      ];

      mockPrisma.transaction.count.mockResolvedValue(2);
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getTransactions(userId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by type', async () => {
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.getTransactions(userId, {
        type: TransactionType.SUBSCRIPTION,
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId,
          type: TransactionType.SUBSCRIPTION,
        }),
      });
    });

    it('should filter by status', async () => {
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.getTransactions(userId, {
        status: TransactionStatus.COMPLETED,
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId,
          status: TransactionStatus.COMPLETED,
        }),
      });
    });

    it('should filter by date range', async () => {
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      await service.getTransactions(userId, {
        fromDate,
        toDate,
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
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

  describe('processRefund', () => {
    it('should process refund for completed transaction', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        currency: 'RUB',
        bonusAmountUsed: new Decimal(0),
        paymentMethod: PaymentMethodType.CARD,
        status: TransactionStatus.COMPLETED,
        externalPaymentId: 'ext-123',
        createdAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockYooKassaService.createRefund.mockResolvedValue({ id: 'refund-123' });
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.REFUNDED,
      });

      const result = await service.processRefund(userId, {
        transactionId: 'txn-123',
        reason: 'Customer request',
      });

      expect(result.status).toBe(TransactionStatus.REFUNDED);
      expect(mockYooKassaService.createRefund).toHaveBeenCalled();
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.processRefund(userId, { transactionId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transaction belongs to another user', async () => {
      const transaction = {
        id: 'txn-123',
        userId: 'other-user',
        status: TransactionStatus.COMPLETED,
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      await expect(
        service.processRefund(userId, { transactionId: 'txn-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transaction is not completed', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        status: TransactionStatus.PENDING,
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      await expect(
        service.processRefund(userId, { transactionId: 'txn-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if refund amount exceeds transaction amount', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        amount: new Decimal(1000),
        status: TransactionStatus.COMPLETED,
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      await expect(
        service.processRefund(userId, { transactionId: 'txn-123', amount: 2000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should restore bonus on refund', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        currency: 'RUB',
        bonusAmountUsed: new Decimal(200),
        paymentMethod: PaymentMethodType.CARD,
        status: TransactionStatus.COMPLETED,
        externalPaymentId: null,
        createdAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.REFUNDED,
      });

      await service.processRefund(userId, {
        transactionId: 'txn-123',
        reason: 'Test refund',
      });

      expect(mockBonusesService.earnBonuses).toHaveBeenCalledWith({
        userId,
        amount: 200,
        source: 'REFUND',
        referenceId: 'txn-123',
        referenceType: 'Transaction',
      });
    });

    it('should process partial refund', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        currency: 'RUB',
        bonusAmountUsed: new Decimal(0),
        paymentMethod: PaymentMethodType.CARD,
        status: TransactionStatus.COMPLETED,
        externalPaymentId: 'ext-123',
        createdAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockYooKassaService.createRefund.mockResolvedValue({ id: 'refund-123' });
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.REFUNDED,
      });

      await service.processRefund(userId, {
        transactionId: 'txn-123',
        amount: 500, // Partial refund
        reason: 'Partial refund',
      });

      expect(mockYooKassaService.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: { value: '500.00', currency: 'RUB' },
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw BadRequestException for unsupported payment method', async () => {
      const dto = {
        type: TransactionType.SUBSCRIPTION,
        amount: 1000,
        paymentMethod: 'UNSUPPORTED' as PaymentMethodType,
        referenceId: 'ref-123',
      };

      const transaction = {
        id: 'txn-123',
        userId,
        amount: new Decimal(1000),
        bonusAmountUsed: new Decimal(0),
        status: TransactionStatus.PENDING,
        createdAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValue(transaction);

      await expect(service.initiatePayment(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log on payment completion', async () => {
      const transaction = {
        id: 'txn-123',
        userId,
        externalPaymentId: 'ext-123',
        type: TransactionType.SUBSCRIPTION,
        amount: new Decimal(1000),
        bonusAmountUsed: new Decimal(0),
        paymentMethod: PaymentMethodType.CARD,
        status: TransactionStatus.PENDING,
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);
      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.COMPLETED,
      });
      mockPrisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPartnersService.calculateAndCreateCommissions.mockResolvedValue(undefined);

      await service.completePayment('ext-123', 'succeeded');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          action: 'PAYMENT_COMPLETED',
          entityType: 'Transaction',
          entityId: 'txn-123',
        }),
      });
    });
  });
});
