import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SubscriptionStatus, AgeCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { SubscriptionsController } from '../src/modules/subscriptions/subscriptions.controller';
import { SubscriptionPlansService } from '../src/modules/subscriptions/subscription-plans.service';
import { UserSubscriptionsService } from '../src/modules/subscriptions/user-subscriptions.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { BonusesService } from '../src/modules/bonuses/bonuses.service';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { UsersService } from '../src/modules/users/users.service';
import { createAdultUser } from './factories/user.factory';
import {
  createPremiumPlan,
  createContentPlan,
  createActiveSubscription,
  SubscriptionType,
} from './factories/subscription.factory';

describe('Subscriptions (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let mockPaymentsService: any;
  let mockUsersService: any;
  let mockBonusesService: any;
  let jwtService: JwtService;

  const mockUser = createAdultUser();

  beforeAll(async () => {
    mockPrisma = {
      subscriptionPlan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      userSubscription: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      subscriptionAccess: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      content: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockPaymentsService = {
      createPayment: jest.fn(),
    };

    mockUsersService = {
      findById: jest.fn(),
    };

    mockBonusesService = {
      spendBonus: jest.fn().mockResolvedValue({ success: true }),
      restoreBonus: jest.fn().mockResolvedValue({ success: true }),
      validateSpend: jest.fn().mockResolvedValue(true),
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
      controllers: [SubscriptionsController],
      providers: [
        SubscriptionPlansService,
        UserSubscriptionsService,
        JwtStrategy,
        JwtAuthGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: BonusesService, useValue: mockBonusesService },
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
      id: user.id,
      email: user.email,
      role: user.role,
      ageCategory: user.ageCategory,
      verificationStatus: user.verificationStatus,
    });
  }

  describe('GET /subscriptions/plans', () => {
    it('should return active plans (public)', async () => {
      const plans = [
        createPremiumPlan(),
        createContentPlan('content-123'),
      ];

      mockPrisma.subscriptionPlan.findMany.mockResolvedValue(plans);

      const response = await request(app.getHttpServer())
        .get('/subscriptions/plans')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const plans = [createPremiumPlan()];

      mockPrisma.subscriptionPlan.findMany.mockResolvedValue(plans);

      await request(app.getHttpServer())
        .get('/subscriptions/plans?type=PREMIUM')
        .expect(200);

      expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: SubscriptionType.PREMIUM,
          }),
        }),
      );
    });

    it('should filter by contentId', async () => {
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/subscriptions/plans?contentId=content-123')
        .expect(200);

      expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contentId: 'content-123',
          }),
        }),
      );
    });
  });

  describe('GET /subscriptions/plans/:planId', () => {
    it('should return plan by ID', async () => {
      const plan = createPremiumPlan({ id: 'plan-123' });

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan);

      const response = await request(app.getHttpServer())
        .get('/subscriptions/plans/plan-123')
        .expect(200);

      expect(response.body.id).toBe('plan-123');
      expect(response.body.type).toBe(SubscriptionType.PREMIUM);
    });

    it('should return 404 for non-existent plan', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/subscriptions/plans/non-existent')
        .expect(404);
    });
  });

  describe('POST /subscriptions/purchase', () => {
    it('should initiate subscription purchase', async () => {
      const token = generateToken();
      const plan = createPremiumPlan({ id: 'plan-123' });

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan);
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
      mockPaymentsService.createPayment.mockResolvedValue({
        paymentId: 'payment-123',
        paymentUrl: 'https://payment.example.com/pay',
        status: 'PENDING',
      });

      const response = await request(app.getHttpServer())
        .post('/subscriptions/purchase')
        .set('Authorization', `Bearer ${token}`)
        .send({ planId: 'plan-123', paymentMethod: 'YOOKASSA' })
        .expect(201);

      expect(response.body).toHaveProperty('paymentId');
      expect(response.body).toHaveProperty('paymentUrl');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/subscriptions/purchase')
        .send({ planId: 'plan-123', paymentMethod: 'YOOKASSA' })
        .expect(401);
    });

    it('should return 404 for non-existent plan', async () => {
      const token = generateToken();

      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/subscriptions/purchase')
        .set('Authorization', `Bearer ${token}`)
        .send({ planId: 'non-existent', paymentMethod: 'YOOKASSA' })
        .expect(404);
    });
  });

  describe('GET /subscriptions/my', () => {
    it('should return user subscriptions', async () => {
      const token = generateToken();
      const plan = createPremiumPlan();
      const subscription = {
        ...createActiveSubscription(mockUser.id, plan.id),
        plan,
      };

      mockPrisma.userSubscription.count.mockResolvedValue(1);
      mockPrisma.userSubscription.findMany.mockResolvedValue([subscription]);

      const response = await request(app.getHttpServer())
        .get('/subscriptions/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total', 1);
      expect(response.body.items).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const token = generateToken();

      mockPrisma.userSubscription.count.mockResolvedValue(50);
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/subscriptions/my?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/subscriptions/my')
        .expect(401);
    });
  });

  describe('GET /subscriptions/my/active', () => {
    it('should return active subscription', async () => {
      const token = generateToken();
      const plan = createPremiumPlan();
      const subscription = {
        ...createActiveSubscription(mockUser.id, plan.id),
        plan,
      };

      mockPrisma.userSubscription.findFirst.mockResolvedValue(subscription);

      const response = await request(app.getHttpServer())
        .get('/subscriptions/my/active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', SubscriptionStatus.ACTIVE);
    });

    it('should return null when no active subscription', async () => {
      const token = generateToken();

      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/subscriptions/my/active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeNull();
    });
  });

  describe('GET /subscriptions/access/:contentId', () => {
    it('should grant access for free content', async () => {
      const token = generateToken();

      mockPrisma.content.findUnique.mockResolvedValue({
        id: 'content-123',
        isFree: true,
        ageCategory: AgeCategory.ZERO_PLUS,
      });

      const response = await request(app.getHttpServer())
        .get('/subscriptions/access/content-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasAccess', true);
      expect(response.body).toHaveProperty('reason', 'FREE_CONTENT');
    });

    it('should grant access for premium subscriber', async () => {
      const token = generateToken();
      const plan = createPremiumPlan();

      mockPrisma.content.findUnique.mockResolvedValue({
        id: 'content-123',
        isFree: false,
        ageCategory: AgeCategory.TWELVE_PLUS,
      });
      mockPrisma.userSubscription.findFirst.mockResolvedValue({
        ...createActiveSubscription(mockUser.id, plan.id),
        plan,
      });

      const response = await request(app.getHttpServer())
        .get('/subscriptions/access/content-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasAccess', true);
      expect(response.body).toHaveProperty('reason', 'PREMIUM_SUBSCRIPTION');
    });

    it('should deny access without subscription', async () => {
      const token = generateToken();

      mockPrisma.content.findUnique.mockResolvedValue({
        id: 'content-123',
        isFree: false,
        ageCategory: AgeCategory.TWELVE_PLUS,
      });
      mockPrisma.userSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.subscriptionAccess.findFirst.mockResolvedValue(null);
      mockPrisma.subscriptionPlan.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/subscriptions/access/content-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasAccess', false);
      expect(response.body).toHaveProperty('reason', 'NO_SUBSCRIPTION');
    });

    it('should return 404 for non-existent content', async () => {
      const token = generateToken();

      mockPrisma.content.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/subscriptions/access/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('POST /subscriptions/cancel', () => {
    it('should cancel subscription', async () => {
      const token = generateToken();
      const plan = createPremiumPlan();
      const subscription = {
        ...createActiveSubscription(mockUser.id, plan.id),
        plan,
      };

      mockPrisma.userSubscription.findUnique.mockResolvedValue(subscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...subscription,
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/subscriptions/cancel')
        .set('Authorization', `Bearer ${token}`)
        .send({ subscriptionId: subscription.id })
        .expect(201);

      expect(response.body).toHaveProperty('status', SubscriptionStatus.CANCELLED);
    });

    it('should return 404 for non-existent subscription', async () => {
      const token = generateToken();

      mockPrisma.userSubscription.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/subscriptions/cancel')
        .set('Authorization', `Bearer ${token}`)
        .send({ subscriptionId: 'non-existent' })
        .expect(404);
    });
  });

  describe('PUT /subscriptions/auto-renew', () => {
    it('should toggle auto-renewal', async () => {
      const token = generateToken();
      const plan = createPremiumPlan();
      const subscription = {
        ...createActiveSubscription(mockUser.id, plan.id),
        autoRenew: true,
        plan,
      };

      mockPrisma.userSubscription.findUnique.mockResolvedValue(subscription);
      mockPrisma.userSubscription.update.mockResolvedValue({
        ...subscription,
        autoRenew: false,
      });

      const response = await request(app.getHttpServer())
        .put('/subscriptions/auto-renew')
        .set('Authorization', `Bearer ${token}`)
        .send({ subscriptionId: subscription.id, autoRenew: false })
        .expect(200);

      expect(response.body).toHaveProperty('autoRenew', false);
    });
  });
});
