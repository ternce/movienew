import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { VerificationStatus, VerificationMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { AdminVerificationsController } from '../src/modules/admin/controllers/admin-verifications.controller';
import { AdminVerificationsService } from '../src/modules/admin/services/admin-verifications.service';
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

describe('Admin Verifications (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let mockUsersService: any;
  let jwtService: JwtService;

  const adminUser = createAdminUser();
  const moderatorUser = createModeratorUser();
  const regularUser = createAdultUser();

  // Mock verification data
  const mockVerification = {
    id: 'verification-1',
    userId: 'user-1',
    method: VerificationMethod.DOCUMENT,
    documentUrl: 'https://example.com/doc.jpg',
    status: VerificationStatus.PENDING,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'BUYER',
      verificationStatus: VerificationStatus.PENDING,
    },
  };

  const mockVerifications = [
    mockVerification,
    {
      ...mockVerification,
      id: 'verification-2',
      userId: 'user-2',
      method: VerificationMethod.PAYMENT,
      status: VerificationStatus.VERIFIED,
      user: {
        id: 'user-2',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'BUYER',
        verificationStatus: VerificationStatus.VERIFIED,
      },
    },
    {
      ...mockVerification,
      id: 'verification-3',
      userId: 'user-3',
      method: VerificationMethod.DOCUMENT,
      status: VerificationStatus.REJECTED,
      rejectionReason: 'Invalid document',
      user: {
        id: 'user-3',
        email: 'bob.wilson@example.com',
        firstName: 'Bob',
        lastName: 'Wilson',
        role: 'BUYER',
        verificationStatus: VerificationStatus.REJECTED,
      },
    },
  ];

  beforeAll(async () => {
    mockPrisma = {
      userVerification: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
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
      controllers: [AdminVerificationsController],
      providers: [
        AdminVerificationsService,
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

  describe('GET /admin/verifications', () => {
    it('should return verification list for admin', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(3);
      mockPrisma.userVerification.findMany.mockResolvedValue(mockVerifications);

      const response = await request(app.getHttpServer())
        .get('/admin/verifications')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total', 3);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body.items).toHaveLength(3);
    });

    it('should return verification list for moderator', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(3);
      mockPrisma.userVerification.findMany.mockResolvedValue(mockVerifications);

      const response = await request(app.getHttpServer())
        .get('/admin/verifications')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const pendingOnly = mockVerifications.filter((v) => v.status === VerificationStatus.PENDING);
      mockPrisma.userVerification.count.mockResolvedValue(1);
      mockPrisma.userVerification.findMany.mockResolvedValue(pendingOnly);

      const response = await request(app.getHttpServer())
        .get('/admin/verifications?status=PENDING')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].status).toBe('PENDING');
    });

    it('should filter by method', async () => {
      const documentOnly = mockVerifications.filter((v) => v.method === VerificationMethod.DOCUMENT);
      mockPrisma.userVerification.count.mockResolvedValue(2);
      mockPrisma.userVerification.findMany.mockResolvedValue(documentOnly);

      const response = await request(app.getHttpServer())
        .get('/admin/verifications?method=DOCUMENT')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
    });

    it('should reject request from non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/verifications')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .expect(403);
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/admin/verifications')
        .expect(401);
    });

    it('should paginate results', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(50);
      mockPrisma.userVerification.findMany.mockResolvedValue(mockVerifications.slice(0, 2));

      const response = await request(app.getHttpServer())
        .get('/admin/verifications?page=1&limit=10')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('total', 50);
      expect(response.body).toHaveProperty('totalPages', 5);
    });
  });

  describe('GET /admin/verifications/stats', () => {
    it('should return verification statistics', async () => {
      mockPrisma.userVerification.count
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(3)  // approved
        .mockResolvedValueOnce(2)  // rejected
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(1); // overdueCount

      const response = await request(app.getHttpServer())
        .get('/admin/verifications/stats')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('pending', 5);
      expect(response.body).toHaveProperty('approved', 3);
      expect(response.body).toHaveProperty('rejected', 2);
      expect(response.body).toHaveProperty('total', 10);
      expect(response.body).toHaveProperty('overdueCount', 1);
    });

    it('should reject request from non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/verifications/stats')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .expect(403);
    });
  });

  describe('GET /admin/verifications/:id', () => {
    it('should return verification by ID', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue(mockVerification);

      const response = await request(app.getHttpServer())
        .get('/admin/verifications/verification-1')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'verification-1');
      expect(response.body).toHaveProperty('userId', 'user-1');
      expect(response.body).toHaveProperty('status', 'PENDING');
    });

    it('should return 404 for non-existent verification', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/admin/verifications/non-existent')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(404);
    });

    it('should reject request from non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/verifications/verification-1')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .expect(403);
    });
  });

  describe('POST /admin/verifications/:id/approve', () => {
    it('should approve pending verification', async () => {
      const approvedVerification = {
        ...mockVerification,
        status: VerificationStatus.VERIFIED,
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
      };

      mockPrisma.userVerification.findUnique.mockResolvedValue(mockVerification);
      mockPrisma.userVerification.update.mockResolvedValue(approvedVerification);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/admin/verifications/verification-1/approve')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Verification approved successfully');
      expect(response.body.verification).toHaveProperty('status', 'VERIFIED');
    });

    it('should return 404 for non-existent verification', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/admin/verifications/non-existent/approve')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(404);
    });

    it('should return 400 for already processed verification', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.VERIFIED,
      });

      await request(app.getHttpServer())
        .post('/admin/verifications/verification-1/approve')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(400);
    });

    it('should reject request from non-admin user', async () => {
      await request(app.getHttpServer())
        .post('/admin/verifications/verification-1/approve')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .expect(403);
    });
  });

  describe('POST /admin/verifications/:id/reject', () => {
    it('should reject pending verification with reason', async () => {
      const rejectedVerification = {
        ...mockVerification,
        status: VerificationStatus.REJECTED,
        rejectionReason: 'Invalid document',
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
      };

      mockPrisma.userVerification.findUnique.mockResolvedValue(mockVerification);
      mockPrisma.userVerification.update.mockResolvedValue(rejectedVerification);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/admin/verifications/verification-1/reject')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ reason: 'Invalid document' })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Verification rejected successfully');
      expect(response.body.verification).toHaveProperty('status', 'REJECTED');
      expect(response.body.verification).toHaveProperty('rejectionReason', 'Invalid document');
    });

    it('should require rejection reason', async () => {
      await request(app.getHttpServer())
        .post('/admin/verifications/verification-1/reject')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent verification', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/admin/verifications/non-existent/reject')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ reason: 'Invalid document' })
        .expect(404);
    });

    it('should return 400 for already processed verification', async () => {
      mockPrisma.userVerification.findUnique.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.REJECTED,
      });

      await request(app.getHttpServer())
        .post('/admin/verifications/verification-1/reject')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ reason: 'Invalid document' })
        .expect(400);
    });

    it('should reject request from non-admin user', async () => {
      await request(app.getHttpServer())
        .post('/admin/verifications/verification-1/reject')
        .set('Authorization', `Bearer ${getRegularToken()}`)
        .send({ reason: 'Invalid document' })
        .expect(403);
    });
  });

  describe('Authorization', () => {
    it('should allow moderator to access verifications', async () => {
      mockPrisma.userVerification.count.mockResolvedValue(1);
      mockPrisma.userVerification.findMany.mockResolvedValue([mockVerification]);

      await request(app.getHttpServer())
        .get('/admin/verifications')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .expect(200);
    });

    it('should allow moderator to approve verifications', async () => {
      const approvedVerification = {
        ...mockVerification,
        status: VerificationStatus.VERIFIED,
        reviewedBy: moderatorUser.id,
        reviewedAt: new Date(),
      };

      mockPrisma.userVerification.findUnique.mockResolvedValue(mockVerification);
      mockPrisma.userVerification.update.mockResolvedValue(approvedVerification);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await request(app.getHttpServer())
        .post('/admin/verifications/verification-1/approve')
        .set('Authorization', `Bearer ${getModeratorToken()}`)
        .expect(201);
    });
  });
});
