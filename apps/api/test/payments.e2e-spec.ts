import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TransactionStatus, TransactionType, PaymentMethodType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PaymentsController } from '../src/modules/payments/payments.controller';
import { WebhooksController } from '../src/modules/payments/webhooks.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { YooKassaService } from '../src/modules/payments/providers/yookassa/yookassa.service';
import { SbpService } from '../src/modules/payments/providers/sbp/sbp.service';
import { BankTransferService } from '../src/modules/payments/providers/bank-transfer/bank-transfer.service';
import { BonusesService } from '../src/modules/bonuses/bonuses.service';
import { PartnersService } from '../src/modules/partners/partners.service';
import { UserSubscriptionsService } from '../src/modules/subscriptions/user-subscriptions.service';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { UsersService } from '../src/modules/users/users.service';
import { createAdultUser } from './factories/user.factory';
import {
  createMockTransaction,
  createPendingTransaction,
  createCompletedTransaction,
} from './factories/transaction.factory';

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let mockYooKassaService: any;
  let mockSbpService: any;
  let mockBankTransferService: any;
  let mockBonusesService: any;
  let mockPartnersService: any;
  let mockUsersService: any;
  let mockUserSubscriptionsService: any;
  let jwtService: JwtService;

  const mockUser = createAdultUser({ bonusBalance: 500 });

  const generateAuthToken = (user: any) => {
    return jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  };

  beforeAll(async () => {
    // Mock Prisma
    mockPrisma = {
      transaction: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      userSubscription: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      subscriptionAccess: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bonusTransaction: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      invoice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    // Mock YooKassa Service
    mockYooKassaService = {
      createPayment: jest.fn().mockResolvedValue({
        id: 'yookassa_payment_123',
        status: 'pending',
        confirmation: {
          type: 'redirect',
          confirmation_url: 'https://yookassa.ru/checkout/123',
        },
      }),
      getPaymentStatus: jest.fn().mockResolvedValue({
        id: 'yookassa_payment_123',
        status: 'succeeded',
        paid: true,
      }),
      createRefund: jest.fn().mockResolvedValue({
        id: 'yookassa_refund_123',
        status: 'succeeded',
      }),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      isMockMode: jest.fn().mockReturnValue(true),
      getReturnUrl: jest.fn().mockReturnValue('http://localhost:3000/payment/callback'),
    };

    // Mock SBP Service
    mockSbpService = {
      createQrCode: jest.fn().mockResolvedValue({
        paymentId: 'sbp_payment_123',
        qrCodeUrl: 'https://sbp.example.com/qr/123',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      }),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      isMockMode: jest.fn().mockReturnValue(true),
    };

    // Mock Bank Transfer Service
    mockBankTransferService = {
      createInvoice: jest.fn().mockResolvedValue({
        invoiceNumber: 'INV-123456',
        bankDetails: {
          bankName: 'Test Bank',
          bik: '044525225',
          accountNumber: '40702810938000060473',
          recipientName: 'ООО "МувиПлатформ"',
          inn: '7707083893',
          kpp: '773601001',
        },
        amount: 499,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      }),
      verifyPayment: jest.fn().mockResolvedValue(true),
      isMockMode: jest.fn().mockReturnValue(true),
    };

    // Mock Bonuses Service
    mockBonusesService = {
      validateSpend: jest.fn().mockResolvedValue(true),
      spendBonuses: jest.fn().mockResolvedValue({ success: true }),
      refundBonuses: jest.fn().mockResolvedValue({ success: true }),
    };

    // Mock Partners Service
    mockPartnersService = {
      processCommission: jest.fn().mockResolvedValue({ success: true }),
    };

    // Mock Users Service
    mockUsersService = {
      findById: jest.fn().mockResolvedValue(mockUser),
    };

    // Mock UserSubscriptions Service
    mockUserSubscriptionsService = {
      activateSubscription: jest.fn().mockResolvedValue({ success: true }),
      getActiveSubscription: jest.fn().mockResolvedValue(null),
      grantContentAccess: jest.fn().mockResolvedValue({ success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-jwt-secret-key-for-testing-only-minimum-32-chars',
              YOOKASSA_SHOP_ID: 'test_shop_id',
              YOOKASSA_SECRET_KEY: 'test_secret_key',
              YOOKASSA_MOCK_MODE: 'true',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-jwt-secret-key-for-testing-only-minimum-32-chars',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [PaymentsController, WebhooksController],
      providers: [
        PaymentsService,
        JwtStrategy,
        JwtAuthGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: YooKassaService, useValue: mockYooKassaService },
        { provide: SbpService, useValue: mockSbpService },
        { provide: BankTransferService, useValue: mockBankTransferService },
        { provide: BonusesService, useValue: mockBonusesService },
        { provide: PartnersService, useValue: mockPartnersService },
        { provide: UserSubscriptionsService, useValue: mockUserSubscriptionsService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersService.findById.mockResolvedValue(mockUser);
  });

  describe('POST /payments/initiate', () => {
    it('should create a CARD payment via YooKassa', async () => {
      const pendingTransaction = createPendingTransaction({
        userId: mockUser.id,
        amount: 499,
        paymentMethod: PaymentMethodType.CARD,
      });

      mockPrisma.transaction.create.mockResolvedValue(pendingTransaction);

      const response = await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          type: TransactionType.SUBSCRIPTION,
          amount: 499,
          paymentMethod: PaymentMethodType.CARD,
          referenceId: 'plan-123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body.status).toBe(TransactionStatus.PENDING);
      expect(response.body.paymentMethod).toBe(PaymentMethodType.CARD);
      expect(mockYooKassaService.createPayment).toHaveBeenCalled();
    });

    it('should create an SBP payment with QR code', async () => {
      const pendingTransaction = createPendingTransaction({
        userId: mockUser.id,
        amount: 499,
        paymentMethod: PaymentMethodType.SBP,
      });

      mockPrisma.transaction.create.mockResolvedValue(pendingTransaction);

      const response = await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          type: TransactionType.SUBSCRIPTION,
          amount: 499,
          paymentMethod: PaymentMethodType.SBP,
          referenceId: 'plan-123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body.paymentMethod).toBe(PaymentMethodType.SBP);
      expect(mockSbpService.createQrCode).toHaveBeenCalled();
    });

    it('should create a bank transfer payment with invoice', async () => {
      const pendingTransaction = createPendingTransaction({
        userId: mockUser.id,
        amount: 499,
        paymentMethod: PaymentMethodType.BANK_TRANSFER,
      });

      mockPrisma.transaction.create.mockResolvedValue(pendingTransaction);

      const response = await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          type: TransactionType.SUBSCRIPTION,
          amount: 499,
          paymentMethod: PaymentMethodType.BANK_TRANSFER,
          referenceId: 'plan-123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body.paymentMethod).toBe(PaymentMethodType.BANK_TRANSFER);
      expect(mockBankTransferService.createInvoice).toHaveBeenCalled();
    });

    it('should apply bonus and reduce payment amount', async () => {
      const pendingTransaction = createPendingTransaction({
        userId: mockUser.id,
        amount: 499,
        bonusAmountUsed: 100,
        paymentMethod: PaymentMethodType.CARD,
      });

      mockPrisma.transaction.create.mockResolvedValue(pendingTransaction);

      const response = await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          type: TransactionType.SUBSCRIPTION,
          amount: 499,
          paymentMethod: PaymentMethodType.CARD,
          bonusAmount: 100,
          referenceId: 'plan-123',
        })
        .expect(201);

      expect(response.body.bonusAmountUsed).toBe(100);
      expect(response.body.amountToPay).toBe(399);
      expect(mockBonusesService.validateSpend).toHaveBeenCalledWith(mockUser.id, 100);
    });

    it('should complete payment immediately when bonus covers full amount', async () => {
      const completedTransaction = createCompletedTransaction({
        userId: mockUser.id,
        amount: 499,
        bonusAmountUsed: 499,
        paymentMethod: PaymentMethodType.CARD,
      });

      mockPrisma.transaction.create.mockResolvedValue(completedTransaction);
      mockPrisma.transaction.update.mockResolvedValue(completedTransaction);

      const response = await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          type: TransactionType.SUBSCRIPTION,
          amount: 499,
          paymentMethod: PaymentMethodType.CARD,
          bonusAmount: 499,
          referenceId: 'plan-123',
        })
        .expect(201);

      expect(response.body.status).toBe(TransactionStatus.COMPLETED);
      expect(response.body.amountToPay).toBe(0);
    });

    it('should reject insufficient bonus', async () => {
      mockBonusesService.validateSpend.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          type: TransactionType.SUBSCRIPTION,
          amount: 499,
          paymentMethod: PaymentMethodType.CARD,
          bonusAmount: 1000,
          referenceId: 'plan-123',
        })
        .expect(400);
    });

    it('should reject invalid payment method', async () => {
      await request(app.getHttpServer())
        .post('/payments/initiate')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          type: TransactionType.SUBSCRIPTION,
          amount: 499,
          paymentMethod: 'INVALID_METHOD',
          referenceId: 'plan-123',
        })
        .expect(400);
    });

    it('should reject unauthorized request', async () => {
      await request(app.getHttpServer())
        .post('/payments/initiate')
        .send({
          type: TransactionType.SUBSCRIPTION,
          amount: 499,
          paymentMethod: PaymentMethodType.CARD,
        })
        .expect(401);
    });
  });

  describe('GET /payments/status/:transactionId', () => {
    it('should return PENDING status', async () => {
      const pendingTransaction = createPendingTransaction({
        id: 'transaction-123',
        userId: mockUser.id,
      });

      mockPrisma.transaction.findUnique.mockResolvedValue(pendingTransaction);

      const response = await request(app.getHttpServer())
        .get('/payments/status/transaction-123')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .expect(200);

      expect(response.body.transactionId).toBe('transaction-123');
      expect(response.body.status).toBe(TransactionStatus.PENDING);
    });

    it('should return COMPLETED status', async () => {
      const completedTransaction = createCompletedTransaction({
        id: 'transaction-456',
        userId: mockUser.id,
      });

      mockPrisma.transaction.findUnique.mockResolvedValue(completedTransaction);

      const response = await request(app.getHttpServer())
        .get('/payments/status/transaction-456')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .expect(200);

      expect(response.body.status).toBe(TransactionStatus.COMPLETED);
      expect(response.body).toHaveProperty('completedAt');
    });

    it('should return 404 for unknown transaction', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/payments/status/unknown-id')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .expect(404);
    });
  });

  describe('GET /payments/transactions', () => {
    it('should return paginated transaction history', async () => {
      const transactions = [
        createCompletedTransaction({ userId: mockUser.id, amount: 499 }),
        createCompletedTransaction({ userId: mockUser.id, amount: 299 }),
      ];

      mockPrisma.transaction.count.mockResolvedValue(2);
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const response = await request(app.getHttpServer())
        .get('/payments/transactions')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });

    it('should filter by transaction type', async () => {
      const transactions = [
        createCompletedTransaction({
          userId: mockUser.id,
          type: TransactionType.SUBSCRIPTION,
        }),
      ];

      mockPrisma.transaction.count.mockResolvedValue(1);
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const response = await request(app.getHttpServer())
        .get('/payments/transactions')
        .query({ type: TransactionType.SUBSCRIPTION })
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].type).toBe(TransactionType.SUBSCRIPTION);
    });

    it('should filter by status', async () => {
      const transactions = [
        createPendingTransaction({ userId: mockUser.id }),
      ];

      mockPrisma.transaction.count.mockResolvedValue(1);
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const response = await request(app.getHttpServer())
        .get('/payments/transactions')
        .query({ status: TransactionStatus.PENDING })
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].status).toBe(TransactionStatus.PENDING);
    });

    it('should filter by date range', async () => {
      const transactions = [
        createCompletedTransaction({ userId: mockUser.id }),
      ];

      mockPrisma.transaction.count.mockResolvedValue(1);
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const fromDate = new Date('2025-01-01').toISOString();
      const toDate = new Date('2025-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/payments/transactions')
        .query({ fromDate, toDate })
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
    });
  });

  describe('POST /payments/refund', () => {
    it('should process full refund', async () => {
      const completedTransaction = createCompletedTransaction({
        id: 'transaction-to-refund',
        userId: mockUser.id,
        amount: 499,
      });

      const refundedTransaction = {
        ...completedTransaction,
        status: TransactionStatus.REFUNDED,
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(completedTransaction);
      mockPrisma.transaction.update.mockResolvedValue(refundedTransaction);
      mockYooKassaService.createRefund.mockResolvedValue({
        id: 'refund-123',
        status: 'succeeded',
      });

      const response = await request(app.getHttpServer())
        .post('/payments/refund')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          transactionId: 'transaction-to-refund',
        })
        .expect(201);

      expect(response.body.status).toBe(TransactionStatus.REFUNDED);
    });

    it('should process partial refund', async () => {
      const completedTransaction = createCompletedTransaction({
        id: 'transaction-partial-refund',
        userId: mockUser.id,
        amount: 499,
      });

      mockPrisma.transaction.findUnique.mockResolvedValue(completedTransaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...completedTransaction,
        status: TransactionStatus.PARTIALLY_REFUNDED,
      });
      mockYooKassaService.createRefund.mockResolvedValue({
        id: 'partial-refund-123',
        status: 'succeeded',
        amount: { value: '200.00', currency: 'RUB' },
      });

      const response = await request(app.getHttpServer())
        .post('/payments/refund')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          transactionId: 'transaction-partial-refund',
          amount: 200,
        })
        .expect(201);

      expect(mockYooKassaService.createRefund).toHaveBeenCalled();
    });

    it('should restore bonus on refund', async () => {
      const completedTransaction = createCompletedTransaction({
        id: 'transaction-with-bonus',
        userId: mockUser.id,
        amount: 499,
        bonusAmountUsed: 100,
      });

      mockPrisma.transaction.findUnique.mockResolvedValue(completedTransaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...completedTransaction,
        status: TransactionStatus.REFUNDED,
      });

      await request(app.getHttpServer())
        .post('/payments/refund')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          transactionId: 'transaction-with-bonus',
        })
        .expect(201);

      expect(mockBonusesService.refundBonuses).toHaveBeenCalledWith(
        mockUser.id,
        100,
      );
    });

    it('should reject refund of non-completed transaction', async () => {
      const pendingTransaction = createPendingTransaction({
        id: 'pending-transaction',
        userId: mockUser.id,
      });

      mockPrisma.transaction.findUnique.mockResolvedValue(pendingTransaction);

      await request(app.getHttpServer())
        .post('/payments/refund')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .send({
          transactionId: 'pending-transaction',
        })
        .expect(400);
    });
  });

  describe('Webhooks', () => {
    describe('POST /webhooks/yookassa', () => {
      it('should process YooKassa success webhook', async () => {
        const pendingTransaction = createPendingTransaction({
          id: 'transaction-for-webhook',
          userId: mockUser.id,
          providerTransactionId: 'yookassa_123',
        });

        mockPrisma.transaction.findFirst.mockResolvedValue(pendingTransaction);
        mockPrisma.transaction.update.mockResolvedValue({
          ...pendingTransaction,
          status: TransactionStatus.COMPLETED,
        });

        const response = await request(app.getHttpServer())
          .post('/webhooks/yookassa')
          .set('x-webhook-signature', 'valid-signature')
          .send({
            event: 'payment.succeeded',
            object: {
              id: 'yookassa_123',
              status: 'succeeded',
              paid: true,
              amount: { value: '499.00', currency: 'RUB' },
            },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should process YooKassa failure webhook', async () => {
        const pendingTransaction = createPendingTransaction({
          id: 'transaction-failed',
          userId: mockUser.id,
          providerTransactionId: 'yookassa_failed',
        });

        mockPrisma.transaction.findFirst.mockResolvedValue(pendingTransaction);
        mockPrisma.transaction.update.mockResolvedValue({
          ...pendingTransaction,
          status: TransactionStatus.FAILED,
        });

        const response = await request(app.getHttpServer())
          .post('/webhooks/yookassa')
          .set('x-webhook-signature', 'valid-signature')
          .send({
            event: 'payment.canceled',
            object: {
              id: 'yookassa_failed',
              status: 'canceled',
            },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should reject invalid webhook signature', async () => {
        mockYooKassaService.verifyWebhookSignature.mockReturnValue(false);

        const response = await request(app.getHttpServer())
          .post('/webhooks/yookassa')
          .set('x-webhook-signature', 'invalid-signature')
          .send({
            event: 'payment.succeeded',
            object: { id: 'test' },
          })
          .expect(200);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid signature');
      });
    });

    describe('POST /webhooks/sbp', () => {
      it('should process SBP success webhook', async () => {
        const pendingTransaction = createPendingTransaction({
          id: 'sbp-transaction',
          userId: mockUser.id,
          paymentMethod: PaymentMethodType.SBP,
        });

        mockPrisma.transaction.findFirst.mockResolvedValue(pendingTransaction);
        mockPrisma.transaction.update.mockResolvedValue({
          ...pendingTransaction,
          status: TransactionStatus.COMPLETED,
        });

        const response = await request(app.getHttpServer())
          .post('/webhooks/sbp')
          .set('x-sbp-signature', 'valid-signature')
          .send({
            eventType: 'PAYMENT_STATUS_CHANGED',
            paymentId: 'sbp_123',
            status: 'SUCCESS',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /webhooks/bank-transfer', () => {
      it('should process bank transfer confirmation', async () => {
        const pendingTransaction = createPendingTransaction({
          id: 'bank-transfer-123',
          userId: mockUser.id,
          paymentMethod: PaymentMethodType.BANK_TRANSFER,
        });

        mockPrisma.transaction.findUnique.mockResolvedValue(pendingTransaction);
        mockPrisma.transaction.update.mockResolvedValue({
          ...pendingTransaction,
          status: TransactionStatus.COMPLETED,
        });

        const response = await request(app.getHttpServer())
          .post('/webhooks/bank-transfer')
          .set('x-admin-secret', 'admin-secret')
          .send({
            invoiceNumber: 'INV-123',
            amount: 499,
            transactionId: 'bank-transfer-123',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should reject without transaction ID', async () => {
        const response = await request(app.getHttpServer())
          .post('/webhooks/bank-transfer')
          .set('x-admin-secret', 'admin-secret')
          .send({
            invoiceNumber: 'INV-123',
            amount: 499,
          })
          .expect(200);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Transaction ID required');
      });
    });

    it('should be idempotent for duplicate webhooks', async () => {
      const completedTransaction = createCompletedTransaction({
        id: 'already-completed',
        userId: mockUser.id,
        providerTransactionId: 'yookassa_duplicate',
      });

      mockPrisma.transaction.findFirst.mockResolvedValue(completedTransaction);

      // First call
      await request(app.getHttpServer())
        .post('/webhooks/yookassa')
        .set('x-webhook-signature', 'valid-signature')
        .send({
          event: 'payment.succeeded',
          object: { id: 'yookassa_duplicate' },
        })
        .expect(200);

      // Second call (duplicate)
      const response = await request(app.getHttpServer())
        .post('/webhooks/yookassa')
        .set('x-webhook-signature', 'valid-signature')
        .send({
          event: 'payment.succeeded',
          object: { id: 'yookassa_duplicate' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Transaction update should not be called twice for already completed transaction
    });
  });

  describe('POST /payments/complete/:transactionId', () => {
    it('should complete a pending payment (admin/testing)', async () => {
      const pendingTransaction = createPendingTransaction({
        id: 'pending-to-complete',
        userId: mockUser.id,
      });

      mockPrisma.transaction.findUnique.mockResolvedValue(pendingTransaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...pendingTransaction,
        status: TransactionStatus.COMPLETED,
      });

      const response = await request(app.getHttpServer())
        .post('/payments/complete/pending-to-complete')
        .set('Authorization', `Bearer ${generateAuthToken(mockUser)}`)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Webhook health check', () => {
    it('should return OK status', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });
});
