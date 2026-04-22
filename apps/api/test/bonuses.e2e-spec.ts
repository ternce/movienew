import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BonusTransactionType, TaxStatus, WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { BonusesController } from '../src/modules/bonuses/bonuses.controller';
import { BonusesService } from '../src/modules/bonuses/bonuses.service';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { UsersService } from '../src/modules/users/users.service';
import { createAdultUser } from './factories/user.factory';
import { createEarnTransaction, createExpiringTransaction } from './factories/bonus.factory';
import { BONUS_CONFIG, TAX_RATES } from '@movie-platform/shared';

describe('Bonuses (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let mockUsersService: any;
  let jwtService: JwtService;

  const mockUser = createAdultUser({ bonusBalance: 5000 });

  beforeAll(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bonusTransaction: {
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        create: jest.fn(),
      },
      bonusRate: {
        findFirst: jest.fn(),
      },
      partnerCommission: {
        aggregate: jest.fn(),
      },
      bonusWithdrawal: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockUsersService = {
      findById: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-jwt-secret-key-for-testing-only-minimum-32-chars',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-jwt-secret-key-for-testing-only-minimum-32-chars',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [BonusesController],
      providers: [
        BonusesService,
        JwtStrategy,
        JwtAuthGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

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

  function generateToken(user = mockUser): string {
    return jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      ageCategory: user.ageCategory,
      verificationStatus: user.verificationStatus,
    });
  }

  describe('GET /bonuses/balance', () => {
    it('should return bonus balance for authenticated user', async () => {
      const token = generateToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });
      mockPrisma.bonusTransaction.groupBy.mockResolvedValue([
        { type: BonusTransactionType.EARNED, _sum: { amount: new Decimal(10000) } },
        { type: BonusTransactionType.SPENT, _sum: { amount: new Decimal(-5000) } },
      ]);
      mockPrisma.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const response = await request(app.getHttpServer())
        .get('/bonuses/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('lifetimeEarned');
      expect(response.body).toHaveProperty('lifetimeSpent');
      expect(response.body).toHaveProperty('pendingEarnings');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/bonuses/balance')
        .expect(401);
    });

    it('should handle user with zero balance', async () => {
      const zeroBalanceUser = createAdultUser({ bonusBalance: 0 });
      const token = generateToken(zeroBalanceUser);

      mockUsersService.findById.mockResolvedValue(zeroBalanceUser);
      mockPrisma.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(0),
      });
      mockPrisma.bonusTransaction.groupBy.mockResolvedValue([]);
      mockPrisma.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const response = await request(app.getHttpServer())
        .get('/bonuses/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.balance).toBe(0);
      expect(response.body.lifetimeEarned).toBe(0);
      expect(response.body.lifetimeSpent).toBe(0);
    });
  });

  describe('GET /bonuses/transactions', () => {
    it('should return transaction history', async () => {
      const token = generateToken();
      const transactions = [
        createEarnTransaction(mockUser.id, 1000, 'PURCHASE'),
        createEarnTransaction(mockUser.id, 500, 'REFERRAL'),
      ];

      mockPrisma.bonusTransaction.count.mockResolvedValue(2);
      mockPrisma.bonusTransaction.findMany.mockResolvedValue(transactions);

      const response = await request(app.getHttpServer())
        .get('/bonuses/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 20);
      expect(response.body.items).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const token = generateToken();

      mockPrisma.bonusTransaction.count.mockResolvedValue(100);
      mockPrisma.bonusTransaction.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/bonuses/transactions?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/bonuses/transactions')
        .expect(401);
    });

    it('should return empty array for user with no transactions', async () => {
      const token = generateToken();

      mockPrisma.bonusTransaction.count.mockResolvedValue(0);
      mockPrisma.bonusTransaction.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/bonuses/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /bonuses/rate', () => {
    it('should return current bonus rate (public endpoint)', async () => {
      const rate = {
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1.5),
        effectiveFrom: new Date(),
        effectiveTo: null,
      };

      mockPrisma.bonusRate.findFirst.mockResolvedValue(rate);

      const response = await request(app.getHttpServer())
        .get('/bonuses/rate')
        .expect(200);

      expect(response.body).toHaveProperty('fromCurrency', 'BONUS');
      expect(response.body).toHaveProperty('toCurrency', 'RUB');
      expect(response.body).toHaveProperty('rate', 1.5);
      expect(response.body).toHaveProperty('effectiveFrom');
    });

    it('should return default rate when no rate configured', async () => {
      mockPrisma.bonusRate.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/bonuses/rate')
        .expect(200);

      // Service returns default rate when none configured
      expect(response.body).toHaveProperty('fromCurrency', 'BONUS');
      expect(response.body).toHaveProperty('toCurrency', 'RUB');
      expect(response.body).toHaveProperty('rate', 1.0);
    });

    it('should work without authentication (public)', async () => {
      mockPrisma.bonusRate.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/bonuses/rate')
        .expect(200);
    });
  });

  describe('GET /bonuses/statistics', () => {
    it('should return detailed bonus statistics', async () => {
      const token = generateToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });
      mockPrisma.bonusTransaction.groupBy
        .mockResolvedValueOnce([
          { type: BonusTransactionType.EARNED, _sum: { amount: new Decimal(10000) } },
          { type: BonusTransactionType.SPENT, _sum: { amount: new Decimal(-5000) } },
        ])
        .mockResolvedValueOnce([
          { type: BonusTransactionType.EARNED, _sum: { amount: new Decimal(500) }, _count: 3 },
        ]);
      mockPrisma.partnerCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(200) },
      });
      mockPrisma.bonusTransaction.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/bonuses/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('lifetimeEarned');
      expect(response.body).toHaveProperty('lifetimeSpent');
      expect(response.body).toHaveProperty('pendingEarnings');
      expect(response.body).toHaveProperty('expiringIn30Days');
      expect(response.body).toHaveProperty('transactionsThisMonth');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/bonuses/statistics')
        .expect(401);
    });
  });

  describe('GET /bonuses/expiring', () => {
    it('should return expiring bonuses within specified days', async () => {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 15);

      mockPrisma.bonusTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          amount: new Decimal(500),
          expiresAt,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/bonuses/expiring?withinDays=30')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('expiringBonuses');
      expect(response.body).toHaveProperty('totalExpiring');
      expect(response.body).toHaveProperty('withinDays', 30);
      expect(response.body.expiringBonuses).toHaveLength(1);
    });

    it('should default to 30 days if not specified', async () => {
      const token = generateToken();

      mockPrisma.bonusTransaction.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/bonuses/expiring')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.withinDays).toBe(30);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/bonuses/expiring')
        .expect(401);
    });
  });

  describe('GET /bonuses/max-applicable', () => {
    it('should return max applicable bonus for order', async () => {
      const token = generateToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });

      const response = await request(app.getHttpServer())
        .get('/bonuses/max-applicable?orderTotal=2000')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('maxAmount');
      expect(response.body).toHaveProperty('balance', 5000);
      expect(response.body).toHaveProperty('maxPercent', BONUS_CONFIG.MAX_BONUS_PERCENT_CHECKOUT);
      // Max is 50% of 2000 = 1000
      expect(response.body.maxAmount).toBe(1000);
    });

    it('should limit by balance when balance is lower', async () => {
      const token = generateToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(300),
      });

      const response = await request(app.getHttpServer())
        .get('/bonuses/max-applicable?orderTotal=2000')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // User only has 300, which is less than 50% of 2000 (1000)
      expect(response.body.maxAmount).toBe(300);
    });

    it('should return 400 without orderTotal', async () => {
      const token = generateToken();

      await request(app.getHttpServer())
        .get('/bonuses/max-applicable')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/bonuses/max-applicable?orderTotal=1000')
        .expect(401);
    });
  });

  describe('GET /bonuses/withdrawal-preview', () => {
    it('should return withdrawal preview with tax calculation', async () => {
      const token = generateToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });
      mockPrisma.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1),
        effectiveFrom: new Date(),
        effectiveTo: null,
      });

      const response = await request(app.getHttpServer())
        .get(`/bonuses/withdrawal-preview?amount=2000&taxStatus=${TaxStatus.INDIVIDUAL}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('bonusAmount', 2000);
      expect(response.body).toHaveProperty('currencyAmount', 2000);
      expect(response.body).toHaveProperty('rate', 1);
      expect(response.body).toHaveProperty('estimatedTax');
      expect(response.body).toHaveProperty('estimatedNet');
      expect(response.body).toHaveProperty('taxRate', TAX_RATES.INDIVIDUAL);
    });

    it('should return 400 when below minimum withdrawal', async () => {
      const token = generateToken();

      await request(app.getHttpServer())
        .get(`/bonuses/withdrawal-preview?amount=100&taxStatus=${TaxStatus.INDIVIDUAL}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('should return 400 when insufficient balance', async () => {
      const token = generateToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });

      await request(app.getHttpServer())
        .get(`/bonuses/withdrawal-preview?amount=2000&taxStatus=${TaxStatus.INDIVIDUAL}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/bonuses/withdrawal-preview?amount=2000&taxStatus=INDIVIDUAL')
        .expect(401);
    });
  });

  describe('POST /bonuses/withdraw', () => {
    it('should process withdrawal successfully', async () => {
      const token = generateToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(5000),
      });
      mockPrisma.bonusRate.findFirst.mockResolvedValue({
        fromCurrency: 'BONUS',
        toCurrency: 'RUB',
        rate: new Decimal(1),
        effectiveFrom: new Date(),
        effectiveTo: null,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.bonusTransaction.create.mockResolvedValue({});
      mockPrisma.bonusWithdrawal.create.mockResolvedValue({
        id: 'withdrawal-1',
        userId: mockUser.id,
        bonusAmount: 2000,
        currencyAmount: 2000,
        rate: 1,
        taxStatus: TaxStatus.INDIVIDUAL,
        taxAmount: 260,
        netAmount: 1740,
        status: WithdrawalStatus.PENDING,
      });

      const response = await request(app.getHttpServer())
        .post('/bonuses/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 2000,
          taxStatus: TaxStatus.INDIVIDUAL,
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('bonusAmount', 2000);
      expect(response.body).toHaveProperty('withdrawalId', 'withdrawal-1');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when below minimum withdrawal', async () => {
      const token = generateToken();

      await request(app.getHttpServer())
        .post('/bonuses/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          taxStatus: TaxStatus.INDIVIDUAL,
        })
        .expect(400);
    });

    it('should return 400 when insufficient balance', async () => {
      const token = generateToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        bonusBalance: new Decimal(500),
      });

      await request(app.getHttpServer())
        .post('/bonuses/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 2000,
          taxStatus: TaxStatus.INDIVIDUAL,
        })
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/bonuses/withdraw')
        .send({
          amount: 2000,
          taxStatus: TaxStatus.INDIVIDUAL,
        })
        .expect(401);
    });

    it('should validate request body', async () => {
      const token = generateToken();

      await request(app.getHttpServer())
        .post('/bonuses/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing required fields
        })
        .expect(400);
    });
  });
});
