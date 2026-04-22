import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { AdminDashboardController } from '../src/modules/admin/controllers/admin-dashboard.controller';
import { AdminDashboardService } from '../src/modules/admin/services/admin-dashboard.service';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { UsersService } from '../src/modules/users/users.service';
import { createAdminUser, createAdultUser } from './factories/user.factory';

describe('Admin Dashboard (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let mockUsersService: any;
  let jwtService: JwtService;

  const adminUser = createAdminUser();
  const regularUser = createAdultUser();

  beforeAll(async () => {
    mockPrisma = {
      user: {
        count: jest.fn(),
      },
      userSubscription: {
        count: jest.fn(),
      },
      order: {
        count: jest.fn(),
      },
      userVerification: {
        count: jest.fn(),
      },
      withdrawalRequest: {
        count: jest.fn(),
      },
      content: {
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
      transaction: {
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
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
      controllers: [AdminDashboardController],
      providers: [
        AdminDashboardService,
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
  });

  function generateToken(user: any): string {
    return jwtService.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      ageCategory: user.ageCategory,
      verificationStatus: user.verificationStatus,
    });
  }

  describe('GET /admin/dashboard', () => {
    it('should return dashboard overview for admin', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count.mockResolvedValue(1000);
      mockPrisma.userSubscription.count.mockResolvedValue(200);
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.userVerification.count.mockResolvedValue(3);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(2);
      mockPrisma.content.count.mockResolvedValue(500);
      mockPrisma.product.count.mockResolvedValue(50);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(150000) },
      });
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('revenueByMonth');
      expect(response.body).toHaveProperty('userGrowth');
      expect(response.body).toHaveProperty('recentTransactions');
    });

    it('should return 403 for non-admin user', async () => {
      mockUsersService.findById.mockResolvedValue(regularUser);

      const token = generateToken(regularUser);

      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .expect(401);
    });

    it('should include 6 months of revenue data', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.revenueByMonth).toHaveLength(6);
    });

    it('should include 30 days of user growth data', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.userGrowth).toHaveLength(30);
    });
  });

  describe('GET /admin/dashboard/stats', () => {
    it('should return stats for admin', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(15); // today
      mockPrisma.userSubscription.count.mockResolvedValue(200);
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.userVerification.count.mockResolvedValue(3);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(2);
      mockPrisma.content.count.mockResolvedValue(500);
      mockPrisma.product.count.mockResolvedValue(50);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(150000) },
      });

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers', 1000);
      expect(response.body).toHaveProperty('newUsersToday', 15);
      expect(response.body).toHaveProperty('activeSubscriptions', 200);
      expect(response.body).toHaveProperty('monthlyRevenue', 150000);
      expect(response.body).toHaveProperty('pendingOrders', 5);
      expect(response.body).toHaveProperty('pendingVerifications', 3);
      expect(response.body).toHaveProperty('pendingWithdrawals', 2);
      expect(response.body).toHaveProperty('contentCount', 500);
      expect(response.body).toHaveProperty('productCount', 50);
    });

    it('should return 403 for non-admin user', async () => {
      mockUsersService.findById.mockResolvedValue(regularUser);

      const token = generateToken(regularUser);

      await request(app.getHttpServer())
        .get('/admin/dashboard/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should handle zero values', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSubscription.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userVerification.count.mockResolvedValue(0);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.totalUsers).toBe(0);
      expect(response.body.monthlyRevenue).toBe(0);
    });
  });
});
