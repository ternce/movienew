import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SubscriptionStatus, SubscriptionPlanType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { AdminSubscriptionsController } from '../src/modules/admin/controllers/admin-subscriptions.controller';
import { AdminSubscriptionsService } from '../src/modules/admin/services/admin-subscriptions.service';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { UsersService } from '../src/modules/users/users.service';
import {
  createAdminUser,
  createAdultUser,
  createModeratorUser,
} from './factories/user.factory';

describe('Admin Subscriptions (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let mockUsersService: any;
  let jwtService: JwtService;

  const adminUser = createAdminUser();
  const moderatorUser = createModeratorUser();
  const regularUser = createAdultUser();

  // Mock subscription data
  const mockSubscription = {
    id: 'subscription-1',
    userId: 'user-1',
    planId: 'plan-1',
    status: SubscriptionStatus.ACTIVE,
    startedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    autoRenew: true,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    plan: {
      id: 'plan-1',
      name: 'Premium Monthly',
      type: SubscriptionPlanType.PREMIUM,
      price: 99900,
      durationDays: 30,
    },
  };

  const mockSubscriptions = [
    mockSubscription,
    {
      ...mockSubscription,
      id: 'subscription-2',
      userId: 'user-2',
      planId: 'plan-2',
      expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      autoRenew: false,
      user: {
        id: 'user-2',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      },
      plan: {
        id: 'plan-2',
        name: 'Series Access',
        type: SubscriptionPlanType.SERIES,
        price: 29900,
        durationDays: 30,
      },
    },
    {
      ...mockSubscription,
      id: 'subscription-3',
      userId: 'user-3',
      planId: 'plan-3',
      status: SubscriptionStatus.CANCELLED,
      autoRenew: false,
      expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      cancelledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      user: {
        id: 'user-3',
        email: 'bob.wilson@example.com',
        firstName: 'Bob',
        lastName: 'Wilson',
      },
      plan: {
        id: 'plan-3',
        name: 'Tutorial Access',
        type: SubscriptionPlanType.TUTORIAL,
        price: 49900,
        durationDays: 30,
      },
    },
  ];

  beforeAll(async () => {
    mockPrisma = {
      userSubscription: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      auditLog: {
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
      controllers: [AdminSubscriptionsController],
      providers: [
        AdminSubscriptionsService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
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
    mockUsersService.findById.mockImplementation((id: string) => {
      if (id === adminUser.id) return Promise.resolve(adminUser);
      if (id === moderatorUser.id) return Promise.resolve(moderatorUser);
      if (id === regularUser.id) return Promise.resolve(regularUser);
      return Promise.resolve(null);
    });
  });

  const getAdminToken = () =>
    jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });

  const getModeratorToken = () =>
    jwtService.sign({ sub: moderatorUser.id, email: moderatorUser.email, role: moderatorUser.role });

  const getRegularToken = () =>
    jwtService.sign({ sub: regularUser.id, email: regularUser.email, role: regularUser.role });

  describe('GET /admin/subscriptions', () => {
    it('should return subscription list for admin', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(3);
      mockPrisma.userSubscription.findMany.mockResolvedValue(mockSubscriptions);

      const response = await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total', 3);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body.items).toHaveLength(3);
    });

    it('should return subscription list for moderator', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(3);
      mockPrisma.userSubscription.findMany.mockResolvedValue(mockSubscriptions);

      const response = await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const activeOnly = mockSubscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE);
      mockPrisma.userSubscription.count.mockResolvedValue(2);
      mockPrisma.userSubscription.findMany.mockResolvedValue(activeOnly);

      const response = await request(app.getHttpServer())
        .get('/admin/subscriptions?status=ACTIVE')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
    });

    it('should filter by plan type', async () => {
      const premiumOnly = mockSubscriptions.filter((s) => s.plan?.type === SubscriptionPlanType.PREMIUM);
      mockPrisma.userSubscription.count.mockResolvedValue(1);
      mockPrisma.userSubscription.findMany.mockResolvedValue(premiumOnly);

      const response = await request(app.getHttpServer())
        .get('/admin/subscriptions?planType=PREMIUM')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].plan.type).toBe('PREMIUM');
    });

    it('should filter by auto-renew', async () => {
      const autoRenewOnly = mockSubscriptions.filter((s) => s.autoRenew);
      mockPrisma.userSubscription.count.mockResolvedValue(1);
      mockPrisma.userSubscription.findMany.mockResolvedValue(autoRenewOnly);

      const response = await request(app.getHttpServer())
        .get('/admin/subscriptions?autoRenew=true')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
    });

    it('should reject request from non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .expect(403);
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .expect(401);
    });

    it('should paginate results', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(50);
      mockPrisma.userSubscription.findMany.mockResolvedValue(mockSubscriptions.slice(0, 2));

      const response = await request(app.getHttpServer())
        .get('/admin/subscriptions?page=1&limit=10')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('total', 50);
      expect(response.body).toHaveProperty('totalPages', 5);
    });
  });

  describe('GET /admin/subscriptions/stats', () => {
    it('should return subscription statistics', async () => {
      // Mock count calls in order: active, cancelled, expired, paused, total, expiringIn7Days
      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(80)  // active
        .mockResolvedValueOnce(10)  // cancelled
        .mockResolvedValueOnce(5)   // expired
        .mockResolvedValueOnce(2)   // paused
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(8);  // expiringIn7Days

      // Mock raw queries for MRR and avg duration
      mockPrisma.$queryRaw = jest.fn()
        .mockResolvedValueOnce([{ mrr: 50000 }])  // MRR
        .mockResolvedValueOnce([{ avg: 30 }]);    // avg duration

      const response = await request(app.getHttpServer())
        .get('/admin/subscriptions/stats')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('active', 80);
      expect(response.body).toHaveProperty('cancelled', 10);
      expect(response.body).toHaveProperty('expired', 5);
      expect(response.body).toHaveProperty('paused', 2);
      expect(response.body).toHaveProperty('total', 100);
      expect(response.body).toHaveProperty('expiringIn7Days', 8);
      expect(response.body).toHaveProperty('monthlyRecurringRevenue');
      expect(response.body).toHaveProperty('avgDurationDays');
    });

    it('should reject request from non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/subscriptions/stats')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .expect(403);
    });
  });

  describe('GET /admin/subscriptions/expiring', () => {
    it('should return subscriptions expiring soon', async () => {
      const expiringSoon = [mockSubscription];
      mockPrisma.userSubscription.findMany.mockResolvedValue(expiringSoon);

      const response = await request(app.getHttpServer())
        .get('/admin/subscriptions/expiring')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should accept custom days parameter', async () => {
      mockPrisma.userSubscription.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/admin/subscriptions/expiring?days=14')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(mockPrisma.userSubscription.findMany).toHaveBeenCalled();
    });

    it('should reject request from non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/subscriptions/expiring')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .expect(403);
    });
  });

  describe('GET /admin/subscriptions/:id', () => {
    it('should return subscription by ID', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue(mockSubscription);

      const response = await request(app.getHttpServer())
        .get('/admin/subscriptions/subscription-1')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'subscription-1');
      expect(response.body).toHaveProperty('userId', 'user-1');
      expect(response.body).toHaveProperty('status', 'ACTIVE');
    });

    it('should return 404 for non-existent subscription', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/admin/subscriptions/non-existent')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(404);
    });

    it('should reject request from non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/subscriptions/subscription-1')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .expect(403);
    });
  });

  describe('PATCH /admin/subscriptions/:id/extend', () => {
    it('should extend subscription for admin', async () => {
      const extendedSubscription = {
        ...mockSubscription,
        expiresAt: new Date(mockSubscription.expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      };

      mockPrisma.userSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue(extendedSubscription);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .patch('/admin/subscriptions/subscription-1/extend')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ days: 30, reason: 'Customer complaint resolution' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Subscription extended by 30 days');
    });

    it('should require days parameter', async () => {
      await request(app.getHttpServer())
        .patch('/admin/subscriptions/subscription-1/extend')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ reason: 'No days specified' })
        .expect(400);
    });

    it('should reject invalid days value', async () => {
      await request(app.getHttpServer())
        .patch('/admin/subscriptions/subscription-1/extend')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ days: -5, reason: 'Invalid days' })
        .expect(400);
    });

    it('should return 404 for non-existent subscription', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/admin/subscriptions/non-existent/extend')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ days: 30, reason: 'Extension' })
        .expect(404);
    });

    it('should reject extend request from moderator', async () => {
      await request(app.getHttpServer())
        .patch('/admin/subscriptions/subscription-1/extend')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .send({ days: 30, reason: 'Extension' })
        .expect(403);
    });

    it('should reject extend request from non-admin user', async () => {
      await request(app.getHttpServer())
        .patch('/admin/subscriptions/subscription-1/extend')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .send({ days: 30, reason: 'Extension' })
        .expect(403);
    });
  });

  describe('POST /admin/subscriptions/:id/cancel', () => {
    it('should cancel subscription for admin', async () => {
      const cancelledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Admin forced cancellation',
      };

      mockPrisma.userSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.userSubscription.update.mockResolvedValue(cancelledSubscription);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/admin/subscriptions/subscription-1/cancel')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ reason: 'Fraudulent activity' })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Subscription cancelled successfully');
      expect(response.body.subscription).toHaveProperty('status', 'CANCELLED');
    });

    it('should require cancellation reason', async () => {
      await request(app.getHttpServer())
        .post('/admin/subscriptions/subscription-1/cancel')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent subscription', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/admin/subscriptions/non-existent/cancel')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ reason: 'Cancellation' })
        .expect(404);
    });

    it('should return 400 for already cancelled subscription', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
      });

      await request(app.getHttpServer())
        .post('/admin/subscriptions/subscription-1/cancel')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ reason: 'Already cancelled' })
        .expect(400);
    });

    it('should reject cancel request from moderator', async () => {
      await request(app.getHttpServer())
        .post('/admin/subscriptions/subscription-1/cancel')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .send({ reason: 'Cancellation' })
        .expect(403);
    });

    it('should reject cancel request from non-admin user', async () => {
      await request(app.getHttpServer())
        .post('/admin/subscriptions/subscription-1/cancel')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .send({ reason: 'Cancellation' })
        .expect(403);
    });
  });

  describe('Authorization', () => {
    it('should allow moderator to view subscriptions', async () => {
      mockPrisma.userSubscription.count.mockResolvedValue(1);
      mockPrisma.userSubscription.findMany.mockResolvedValue([mockSubscription]);

      await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .expect(200);
    });

    it('should allow moderator to view subscription details', async () => {
      mockPrisma.userSubscription.findUnique.mockResolvedValue(mockSubscription);

      await request(app.getHttpServer())
        .get('/admin/subscriptions/subscription-1')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .expect(200);
    });

    it('should deny moderator from extending subscriptions', async () => {
      await request(app.getHttpServer())
        .patch('/admin/subscriptions/subscription-1/extend')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .send({ days: 30, reason: 'Extension attempt' })
        .expect(403);
    });

    it('should deny moderator from cancelling subscriptions', async () => {
      await request(app.getHttpServer())
        .post('/admin/subscriptions/subscription-1/cancel')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .send({ reason: 'Cancel attempt' })
        .expect(403);
    });
  });
});
