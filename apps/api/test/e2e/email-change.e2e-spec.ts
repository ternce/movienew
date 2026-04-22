import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';
import { TokenService } from '../../src/modules/auth/token.service';
import { EmailService } from '../../src/modules/email/email.service';
import { StorageService } from '../../src/modules/storage/storage.service';
import { PrismaService } from '../../src/config/prisma.service';
import { REDIS_CLIENT } from '../../src/config/redis.module';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { createMockRedis, MockRedis } from '../mocks/redis.mock';
import { createAdultUser, MockUser } from '../factories/user.factory';

const JWT_SECRET = 'test-jwt-secret-key-for-testing-only-minimum-32-chars';

describe('Email Change (e2e)', () => {
  let app: INestApplication;
  let mockRedis: MockRedis;
  let mockPrisma: any;
  let mockEmailService: any;
  let mockStorageService: any;
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
    mockRedis = createMockRedis();

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

    mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendLoginNotification: jest.fn().mockResolvedValue(undefined),
      sendEmailChangeCode: jest.fn().mockResolvedValue(undefined),
    };

    mockStorageService = {
      uploadFile: jest.fn().mockResolvedValue('http://localhost:9000/avatars/test.jpg'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
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
        TokenService,
        JwtStrategy,
        JwtAuthGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: EmailService, useValue: mockEmailService },
        { provide: StorageService, useValue: mockStorageService },
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
    mockRedis.reset();

    testUser = createAdultUser({ email: 'current@example.com' });
    accessToken = generateToken(testUser);

    // Default: user lookup succeeds for JWT validation and service calls
    mockPrisma.user.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === testUser.id) return Promise.resolve(testUser);
      if (where.email === testUser.email) return Promise.resolve(testUser);
      return Promise.resolve(null);
    });
  });

  // ============================================
  // POST /users/me/email/request-code
  // ============================================
  describe('POST /users/me/email/request-code', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/users/me/email/request-code')
        .send({ newEmail: 'newemail@example.com' })
        .expect(401);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/me/email/request-code')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'not-an-email' })
        .expect(400);

      expect(
        Array.isArray(response.body.message)
          ? response.body.message.join(' ').toLowerCase()
          : (response.body.message || '').toLowerCase(),
      ).toMatch(/email/);
    });

    it('should return 400 if new email same as current', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/me/email/request-code')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: testUser.email })
        .expect(400);

      // Russian message: "Новый email совпадает с текущим"
      expect(response.body.message).toBeDefined();
    });

    it('should return 409 if email already taken by another user', async () => {
      const existingUser = createAdultUser({ email: 'taken@example.com' });

      mockPrisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === testUser.id) return Promise.resolve(testUser);
        if (where.email === testUser.email) return Promise.resolve(testUser);
        if (where.email === 'taken@example.com') return Promise.resolve(existingUser);
        return Promise.resolve(null);
      });

      const response = await request(app.getHttpServer())
        .post('/users/me/email/request-code')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'taken@example.com' })
        .expect(409);

      expect(response.body.message).toBeDefined();
    });

    it('should return 200 and send code on valid request', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/me/email/request-code')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'newemail@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();

      // Verify EmailService.sendEmailChangeCode was called
      expect(mockEmailService.sendEmailChangeCode).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendEmailChangeCode).toHaveBeenCalledWith(
        testUser.email,
        testUser.firstName,
        'newemail@example.com',
        expect.any(String), // the OTP code
      );

      // Verify code was stored in Redis
      const keys = mockRedis.getAllKeys();
      const codeKey = keys.find((k) => k.startsWith('email_change:code:'));
      expect(codeKey).toBeDefined();
    });
  });

  // ============================================
  // POST /users/me/email/confirm
  // ============================================
  describe('POST /users/me/email/confirm', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/users/me/email/confirm')
        .send({ code: '123456' })
        .expect(401);
    });

    it('should return 400 for wrong OTP code', async () => {
      // First, request a code so there is a valid entry in Redis
      await request(app.getHttpServer())
        .post('/users/me/email/request-code')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'newemail@example.com' })
        .expect(200);

      // Now try to confirm with wrong code
      const response = await request(app.getHttpServer())
        .post('/users/me/email/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '000000' })
        .expect(400);

      // Russian message: "Неверный код подтверждения"
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 for expired/nonexistent code', async () => {
      // No code was requested — Redis has no entry for this user
      const response = await request(app.getHttpServer())
        .post('/users/me/email/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '123456' })
        .expect(400);

      // Russian message: "Код подтверждения истёк или не найден"
      expect(response.body.message).toBeDefined();
    });

    it('should return 200 and update email on correct OTP code', async () => {
      const newEmail = 'newemail@example.com';

      // Step 1: Request code
      await request(app.getHttpServer())
        .post('/users/me/email/request-code')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail })
        .expect(200);

      // Extract the OTP code that was passed to EmailService
      const sentCode =
        mockEmailService.sendEmailChangeCode.mock.calls[0][3];
      expect(sentCode).toMatch(/^\d{6}$/);

      // Step 2: Mock the user update for confirm
      const updatedUser = { ...testUser, email: newEmail };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      // Ensure findUnique for the new email returns null (not taken)
      mockPrisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === testUser.id) return Promise.resolve(testUser);
        if (where.email === testUser.email) return Promise.resolve(testUser);
        // New email is not taken
        if (where.email === newEmail) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      // Step 3: Confirm with correct code
      const response = await request(app.getHttpServer())
        .post('/users/me/email/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: sentCode })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe(newEmail);

      // Verify passwordHash is NOT returned in response
      expect(response.body.data).not.toHaveProperty('passwordHash');

      // Verify prisma user.update was called with the new email
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: { email: newEmail },
      });

      // Verify the code is consumed (single-use) — second attempt should fail
      const retryResponse = await request(app.getHttpServer())
        .post('/users/me/email/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: sentCode })
        .expect(400);

      expect(retryResponse.body.message).toBeDefined();
    });
  });
});
