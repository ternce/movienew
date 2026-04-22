import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { VerificationStatus, VerificationMethod } from '@movie-platform/shared';

import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import {
  createAdultUser,
  createMockUser,
  MockUser,
} from './factories/user.factory';

const JWT_SECRET = 'test-jwt-secret-key-for-testing-only-minimum-32-chars';

describe('Users Controller (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let jwtService: JwtService;
  let testUser: MockUser;
  let accessToken: string;

  function generateToken(user: MockUser) {
    return jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      ageCategory: user.ageCategory,
      verificationStatus: user.verificationStatus,
    });
  }

  beforeAll(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      userSession: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      userVerification: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      playlist: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      playlistItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      partnerRelationship: {
        groupBy: jest.fn(),
        count: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET,
              JWT_ACCESS_EXPIRATION: '15m',
              BCRYPT_ROUNDS: 4,
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [UsersController],
      providers: [
        UsersService,
        JwtStrategy,
        JwtAuthGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
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
    testUser = createAdultUser({ email: 'test@example.com' });
    accessToken = generateToken(testUser);
    // Default: user lookup succeeds for JWT validation
    mockPrisma.user.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === testUser.id) return Promise.resolve(testUser);
      return Promise.resolve(null);
    });
  });

  // ============================================
  // Auth Guard Tests
  // ============================================
  describe('Auth guard', () => {
    it('should return 401 without Authorization header', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  // ============================================
  // GET /users/me Tests
  // ============================================
  describe('GET /users/me', () => {
    it('should return sanitized profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('firstName');
    });

    it('should exclude passwordHash from response', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('isActive');
      expect(response.body).not.toHaveProperty('referredById');
    });

    it('should return bonusBalance as number type', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(typeof response.body.bonusBalance).toBe('number');
    });
  });

  // ============================================
  // PATCH /users/me Tests
  // ============================================
  describe('PATCH /users/me', () => {
    it('should update firstName and lastName', async () => {
      const updatedUser = { ...testUser, firstName: 'Ivan', lastName: 'Petrov' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Ivan', lastName: 'Petrov' })
        .expect(200);

      expect(response.body.firstName).toBe('Ivan');
    });

    it('should update phone', async () => {
      const updatedUser = { ...testUser, phone: '+79001234567' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: '+79001234567' })
        .expect(200);

      expect(response.body.phone).toBe('+79001234567');
    });

    it('should return 400 for invalid phone format', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: 'not-a-phone' })
        .expect(400);
    });

    it('should return 400 for firstName too short', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'A' })
        .expect(400);
    });

    it('should strip unknown fields (whitelist)', async () => {
      mockPrisma.user.update.mockResolvedValue(testUser);

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Ivan', unknownField: 'value' })
        .expect(400); // forbidNonWhitelisted rejects unknown fields
    });
  });

  // ============================================
  // POST /users/me/password Tests
  // ============================================
  describe('POST /users/me/password', () => {
    it('should change password successfully', async () => {
      // Mock bcrypt comparison as truthy
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash');
      mockPrisma.user.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(200);

      expect(response.body.message).toContain('Password changed');
    });

    it('should return 400 when current password is incorrect', async () => {
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(400);
    });

    it('should return 400 for weak password (no uppercase)', async () => {
      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'weakpassword1',
        })
        .expect(400);
    });

    it('should return 400 for password too short', async () => {
      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'Ab1',
        })
        .expect(400);
    });

    it('should return 400 when currentPassword missing', async () => {
      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newPassword: 'NewPassword456!' })
        .expect(400);
    });
  });

  // ============================================
  // POST /users/me/verification Tests
  // ============================================
  describe('POST /users/me/verification', () => {
    it('should submit PAYMENT verification method', async () => {
      const verificationRecord = {
        id: 'v-1',
        status: VerificationStatus.PENDING,
        createdAt: new Date(),
      };
      mockPrisma.userVerification.create.mockResolvedValue(verificationRecord);
      mockPrisma.user.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/users/me/verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: VerificationMethod.PAYMENT })
        .expect(201);

      expect(response.body.status).toBe(VerificationStatus.PENDING);
    });

    it('should submit DOCUMENT with URL', async () => {
      const verificationRecord = {
        id: 'v-1',
        status: VerificationStatus.PENDING,
        createdAt: new Date(),
      };
      mockPrisma.userVerification.create.mockResolvedValue(verificationRecord);
      mockPrisma.user.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/users/me/verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          method: VerificationMethod.DOCUMENT,
          documentUrl: 'https://example.com/doc.jpg',
        })
        .expect(201);

      expect(response.body.status).toBe(VerificationStatus.PENDING);
    });

    it('should return 400 for DOCUMENT without URL', async () => {
      await request(app.getHttpServer())
        .post('/users/me/verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: VerificationMethod.DOCUMENT })
        .expect(400);
    });

    it('should return 409 when already PENDING', async () => {
      const pendingUser = createMockUser({
        id: testUser.id,
        verificationStatus: VerificationStatus.PENDING,
      });
      mockPrisma.user.findUnique.mockResolvedValue(pendingUser);

      await request(app.getHttpServer())
        .post('/users/me/verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: VerificationMethod.PAYMENT })
        .expect(409);
    });

    it('should return 400 for invalid method enum', async () => {
      await request(app.getHttpServer())
        .post('/users/me/verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: 'INVALID_METHOD' })
        .expect(400);
    });
  });

  // ============================================
  // GET /users/me/verification/status Tests
  // ============================================
  describe('GET /users/me/verification/status', () => {
    it('should return verification status', async () => {
      mockPrisma.userVerification.findFirst.mockResolvedValue({
        createdAt: new Date(),
        rejectionReason: null,
        reviewedAt: null,
      });

      const response = await request(app.getHttpServer())
        .get('/users/me/verification/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should return status for unverified user', async () => {
      mockPrisma.userVerification.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/users/me/verification/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe(VerificationStatus.UNVERIFIED);
    });
  });

  // ============================================
  // GET /users/me/sessions Tests
  // ============================================
  describe('GET /users/me/sessions', () => {
    it('should return active sessions', async () => {
      const sessions = [
        {
          id: 'session-1',
          deviceInfo: 'Chrome',
          ipAddress: '127.0.0.1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      ];
      mockPrisma.userSession.findMany.mockResolvedValue(sessions);

      const response = await request(app.getHttpServer())
        .get('/users/me/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it('should return empty array when no sessions', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/users/me/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  // ============================================
  // GET /users/me/referrals Tests
  // ============================================
  describe('GET /users/me/referrals', () => {
    it('should return referral stats', async () => {
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.partnerRelationship.groupBy.mockResolvedValue([
        { level: 1, _count: 5 },
      ]);
      mockPrisma.partnerRelationship.count.mockResolvedValue(5);

      const response = await request(app.getHttpServer())
        .get('/users/me/referrals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('referralCode');
      expect(response.body).toHaveProperty('directReferrals');
      expect(response.body).toHaveProperty('totalTeam');
      expect(response.body).toHaveProperty('teamByLevel');
    });

    it('should return zero counts for no referrals', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.partnerRelationship.groupBy.mockResolvedValue([]);
      mockPrisma.partnerRelationship.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/users/me/referrals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.directReferrals).toBe(0);
      expect(response.body.totalTeam).toBe(0);
    });
  });

  // ============================================
  // GET /users/me/watchlist Tests
  // ============================================
  describe('GET /users/me/watchlist', () => {
    const mockPlaylist = { id: 'playlist-1', userId: 'user-1', name: 'Избранное' };

    it('should return paginated watchlist', async () => {
      mockPrisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      mockPrisma.playlistItem.findMany.mockResolvedValue([]);
      mockPrisma.playlistItem.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/users/me/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
    });

    it('should accept page/limit query params', async () => {
      mockPrisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      mockPrisma.playlistItem.findMany.mockResolvedValue([]);
      mockPrisma.playlistItem.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/users/me/watchlist?page=2&limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(5);
    });

    it('should use default page=1 and limit=20', async () => {
      mockPrisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      mockPrisma.playlistItem.findMany.mockResolvedValue([]);
      mockPrisma.playlistItem.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/users/me/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });
  });

  // ============================================
  // POST /users/me/watchlist Tests
  // ============================================
  describe('POST /users/me/watchlist', () => {
    it('should add content to watchlist', async () => {
      const mockPlaylist = { id: 'playlist-1' };
      mockPrisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      mockPrisma.playlistItem.findUnique.mockResolvedValue(null);
      mockPrisma.playlistItem.aggregate.mockResolvedValue({ _max: { order: 0 } });
      mockPrisma.playlistItem.create.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/users/me/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentId: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(201);

      expect(response.body.message).toContain('Added');
    });

    it('should return 400 for invalid contentId (not UUID)', async () => {
      await request(app.getHttpServer())
        .post('/users/me/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentId: 'not-a-uuid' })
        .expect(400);
    });
  });

  // ============================================
  // DELETE /users/me/watchlist/:contentId Tests
  // ============================================
  describe('DELETE /users/me/watchlist/:contentId', () => {
    it('should remove content from watchlist', async () => {
      const mockPlaylist = { id: 'playlist-1' };
      mockPrisma.playlist.findFirst.mockResolvedValue(mockPlaylist);
      mockPrisma.playlistItem.deleteMany.mockResolvedValue({ count: 1 });

      const response = await request(app.getHttpServer())
        .delete('/users/me/watchlist/content-123')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('Removed');
    });

    it('should return 404 when playlist not found', async () => {
      mockPrisma.playlist.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/users/me/watchlist/content-123')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ============================================
  // DELETE /users/me/sessions/:sessionId Tests
  // ============================================
  describe('DELETE /users/me/sessions/:sessionId', () => {
    it('should terminate specific session', async () => {
      const session = { id: 'session-1', userId: testUser.id };
      mockPrisma.userSession.findFirst.mockResolvedValue(session);
      mockPrisma.userSession.delete.mockResolvedValue(session);

      const response = await request(app.getHttpServer())
        .delete('/users/me/sessions/session-1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('terminated');
    });

    it('should return 404 when session not found', async () => {
      mockPrisma.userSession.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/users/me/sessions/non-existent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ============================================
  // DELETE /users/me/sessions Tests
  // ============================================
  describe('DELETE /users/me/sessions', () => {
    it('should terminate all sessions', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 3 });

      const response = await request(app.getHttpServer())
        .delete('/users/me/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('terminated');
    });

    it('should succeed even with 0 sessions', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });

      const response = await request(app.getHttpServer())
        .delete('/users/me/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('0 session(s) terminated');
    });
  });
});
