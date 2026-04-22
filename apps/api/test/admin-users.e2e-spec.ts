import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserRole, VerificationStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { AdminUsersController } from '../src/modules/admin/controllers/admin-users.controller';
import { AdminUsersService } from '../src/modules/admin/services/admin-users.service';
import { BonusesService } from '../src/modules/bonuses/bonuses.service';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { UsersService } from '../src/modules/users/users.service';
import {
  createAdminUser,
  createAdultUser,
  createPartnerUser,
} from './factories/user.factory';

describe('Admin Users (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let mockUsersService: any;
  let mockBonusesService: any;
  let jwtService: JwtService;

  const adminUser = createAdminUser();
  const regularUser = createAdultUser();

  beforeAll(async () => {
    mockPrisma = {
      user: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockUsersService = {
      findById: jest.fn(),
    };

    mockBonusesService = {
      adjustBalance: jest.fn(),
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
      controllers: [AdminUsersController],
      providers: [
        AdminUsersService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: mockUsersService },
        { provide: BonusesService, useValue: mockBonusesService },
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

  describe('GET /admin/users', () => {
    it('should return users list for admin', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const users = [createAdultUser(), createPartnerUser()];
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue(users);

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body.items).toHaveLength(2);
    });

    it('should return 403 for non-admin user', async () => {
      mockUsersService.findById.mockResolvedValue(regularUser);

      const token = generateToken(regularUser);

      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should filter by search term', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .get('/admin/users?search=john')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { email: { contains: 'john', mode: 'insensitive' } },
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
          ]),
        }),
      });
    });

    it('should filter by role', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .get('/admin/users?role=PARTNER')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          role: UserRole.PARTNER,
        }),
      });
    });

    it('should filter by verification status', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .get('/admin/users?verificationStatus=VERIFIED')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          verificationStatus: VerificationStatus.VERIFIED,
        }),
      });
    });

    it('should filter by isActive status', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .get('/admin/users?isActive=false')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: false,
        }),
      });
    });

    it('should support pagination', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/users?page=3&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.page).toBe(3);
      expect(response.body.limit).toBe(10);
    });
  });

  describe('GET /admin/users/:userId', () => {
    it('should return user by ID', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetUser = createAdultUser({ id: 'user-123' });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser);

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe('user-123');
    });

    it('should return 404 for non-existent user', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .get('/admin/users/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 403 for non-admin user', async () => {
      mockUsersService.findById.mockResolvedValue(regularUser);

      const token = generateToken(regularUser);

      await request(app.getHttpServer())
        .get('/admin/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('PATCH /admin/users/:userId/role', () => {
    it('should update user role', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetUser = createAdultUser({ id: 'user-123' });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser);
      mockPrisma.user.update.mockResolvedValue({
        ...targetUser,
        role: UserRole.PARTNER,
      });

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .patch('/admin/users/user-123/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.PARTNER })
        .expect(200);

      expect(response.body.role).toBe(UserRole.PARTNER);
    });

    it('should create audit log entry', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetUser = createAdultUser({ id: 'user-123' });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser);
      mockPrisma.user.update.mockResolvedValue({
        ...targetUser,
        role: UserRole.MODERATOR,
      });

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .patch('/admin/users/user-123/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.MODERATOR })
        .expect(200);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_ROLE_CHANGED',
          entityType: 'User',
          entityId: 'user-123',
        }),
      });
    });

    it('should return 404 for non-existent user', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .patch('/admin/users/non-existent/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.PARTNER })
        .expect(404);
    });
  });

  describe('POST /admin/users/:userId/deactivate', () => {
    it('should deactivate user', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetUser = createAdultUser({ id: 'user-123', isActive: true });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser);
      mockPrisma.user.update.mockResolvedValue({
        ...targetUser,
        isActive: false,
      });

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .post('/admin/users/user-123/deactivate')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.isActive).toBe(false);
    });

    it('should create audit log for deactivation', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetUser = createAdultUser({ id: 'user-123' });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser);
      mockPrisma.user.update.mockResolvedValue({
        ...targetUser,
        isActive: false,
      });

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .post('/admin/users/user-123/deactivate')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_DEACTIVATED',
        }),
      });
    });

    it('should return 400 when trying to deactivate admin', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetAdmin = createAdminUser({ id: 'admin-123' });
      mockPrisma.user.findUnique.mockResolvedValue(targetAdmin);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .post('/admin/users/admin-123/deactivate')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('POST /admin/users/:userId/activate', () => {
    it('should activate user', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetUser = createAdultUser({ id: 'user-123', isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser);
      mockPrisma.user.update.mockResolvedValue({
        ...targetUser,
        isActive: true,
      });

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .post('/admin/users/user-123/activate')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.isActive).toBe(true);
    });

    it('should create audit log for activation', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetUser = createAdultUser({ id: 'user-123', isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(targetUser);
      mockPrisma.user.update.mockResolvedValue({
        ...targetUser,
        isActive: true,
      });

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .post('/admin/users/user-123/activate')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_ACTIVATED',
        }),
      });
    });
  });

  describe('POST /admin/users/:userId/bonus-adjust', () => {
    it('should adjust user bonus balance', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetUser = createAdultUser({ id: 'user-123', bonusBalance: 1000 });
      mockBonusesService.adjustBalance.mockResolvedValue(undefined);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...targetUser,
        bonusBalance: new Decimal(1500),
      });

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .post('/admin/users/user-123/bonus-adjust')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 500, reason: 'Promotion bonus' })
        .expect(201);

      expect(response.body.bonusBalance).toBe(1500);
      expect(mockBonusesService.adjustBalance).toHaveBeenCalledWith(
        'user-123',
        500,
        'Promotion bonus',
        adminUser.id,
      );
    });

    it('should support negative adjustments', async () => {
      mockUsersService.findById.mockResolvedValue(adminUser);

      const targetUser = createAdultUser({ id: 'user-123', bonusBalance: 1000 });
      mockBonusesService.adjustBalance.mockResolvedValue(undefined);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...targetUser,
        bonusBalance: new Decimal(500),
      });

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .post('/admin/users/user-123/bonus-adjust')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -500, reason: 'Penalty' })
        .expect(201);

      expect(mockBonusesService.adjustBalance).toHaveBeenCalledWith(
        'user-123',
        -500,
        'Penalty',
        adminUser.id,
      );
    });
  });
});
