import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { createHash } from 'crypto';

import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { SessionService } from '../src/modules/auth/session.service';
import { TokenService } from '../src/modules/auth/token.service';
import { UsersService } from '../src/modules/users/users.service';
import { EmailService } from '../src/modules/email/email.service';
import { PrismaService } from '../src/config/prisma.service';
import { REDIS_CLIENT } from '../src/config/redis.module';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { LocalStrategy } from '../src/modules/auth/strategies/local.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { createMockRedis, MockRedis } from './mocks/redis.mock';
import {
  createAdultUser,
  createMinorUser,
  DEFAULT_PASSWORD,
  DEFAULT_PASSWORD_HASH,
} from './factories/user.factory';

describe('Auth Controller (e2e)', () => {
  let app: INestApplication;
  let mockRedis: MockRedis;
  let mockPrisma: any;
  let mockUsersService: any;
  let mockEmailService: any;
  let jwtService: JwtService;

  beforeAll(async () => {
    mockRedis = createMockRedis();

    mockPrisma = {
      user: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      userSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      partnerRelationship: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
    };

    mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByReferralCode: jest.fn(),
    };

    mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendLoginNotification: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-minimum-32-chars',
              JWT_ACCESS_EXPIRATION: '15m',
              JWT_REFRESH_EXPIRATION: '7d',
              BCRYPT_ROUNDS: 4,
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-minimum-32-chars',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        SessionService,
        TokenService,
        JwtStrategy,
        LocalStrategy,
        JwtAuthGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: mockUsersService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
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
  });

  describe('POST /auth/register', () => {
    const validRegisterDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-15',
      acceptTerms: true,
    };

    it('should register a new adult user', async () => {
      const mockUser = createAdultUser({
        email: validRegisterDto.email,
        firstName: validRegisterDto.firstName,
        lastName: validRegisterDto.lastName,
      });

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByReferralCode.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.userSession.create.mockResolvedValue({ id: 'session-1' });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(validRegisterDto.email);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidDto = { ...validRegisterDto, email: 'invalid-email' };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);

      // Validation message should relate to email
      expect(Array.isArray(response.body.message)
        ? response.body.message.join(' ').toLowerCase()
        : response.body.message.toLowerCase()
      ).toContain('email');
    });

    it('should return 400 when terms not accepted', async () => {
      const noTermsDto = { ...validRegisterDto, acceptTerms: false };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(noTermsDto)
        .expect(400);

      expect(response.body.message).toContain('terms');
    });

    it('should return 409 for duplicate email', async () => {
      const existingUser = createAdultUser({ email: validRegisterDto.email });
      mockUsersService.findByEmail.mockResolvedValue(existingUser);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(409);

      expect(response.body.message).toContain('already registered');
    });

    it('should register minor user with MINOR role', async () => {
      const minorDto = {
        ...validRegisterDto,
        dateOfBirth: new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      };

      const mockUser = createMinorUser(15, { email: minorDto.email });
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByReferralCode.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.userSession.create.mockResolvedValue({ id: 'session-1' });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(minorDto)
        .expect(201);

      expect(response.body.user.role).toBe('MINOR');
    });
  });

  describe('POST /auth/login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: DEFAULT_PASSWORD,
    };

    it('should login with valid credentials', async () => {
      const mockUser = createAdultUser({
        email: loginDto.email,
        passwordHash: DEFAULT_PASSWORD_HASH,
      });

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.userSession.create.mockResolvedValue({ id: 'session-1' });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
    });

    it('should return 401 for invalid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 for inactive user', async () => {
      const inactiveUser = createAdultUser({ email: loginDto.email, isActive: false });
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const mockUser = createAdultUser();
      const refreshToken = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email },
        { expiresIn: '7d' },
      );

      // Set up session in Redis
      const sessionData = {
        userId: mockUser.id,
        deviceInfo: 'Test Agent',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const tokenHash = createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      await mockRedis.setex(`session:${tokenHash}`, 7 * 24 * 60 * 60, JSON.stringify(sessionData));

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.userSession.create.mockResolvedValue({ id: 'session-2' });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresAt');
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const mockUser = createAdultUser();
      const accessToken = jwtService.sign({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        ageCategory: mockUser.ageCategory,
        verificationStatus: mockUser.verificationStatus,
      });

      // Mock user lookup for JWT validation
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 1 });

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken: 'some.refresh.token' })
        .expect(200);

      expect(response.body.message).toContain('Logged out');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'some.refresh.token' })
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should return 200 for existing email', async () => {
      const mockUser = createAdultUser({ email: 'test@example.com' });
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.message).toContain('password reset link');
    });

    it('should return 200 for non-existing email (prevent enumeration)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Same response to prevent enumeration
      expect(response.body.message).toContain('password reset link');
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const userId = 'user-123';
      const token = 'valid-reset-token';

      // Store token in Redis
      await mockRedis.setex(
        `token:password_reset:${token}`,
        3600,
        JSON.stringify({ userId, type: 'password_reset', createdAt: new Date() }),
      );
      await mockRedis.setex(`token:user:${userId}:password_reset`, 3600, token);

      mockPrisma.user.update.mockResolvedValue({ id: userId });
      mockPrisma.userSession.findMany.mockResolvedValue([]);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'NewPassword123!' })
        .expect(200);

      expect(response.body.message).toContain('reset successfully');
    });

    it('should return 400 for invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPassword123!' })
        .expect(400);
    });
  });

  describe('GET /auth/verify-email/:token', () => {
    it('should verify email with valid token', async () => {
      const userId = 'user-123';
      const token = 'valid-verify-token';

      await mockRedis.setex(
        `token:email_verification:${token}`,
        86400,
        JSON.stringify({ userId, type: 'email_verification', createdAt: new Date() }),
      );
      await mockRedis.setex(`token:user:${userId}:email_verification`, 86400, token);

      mockPrisma.user.update.mockResolvedValue({ id: userId });

      const response = await request(app.getHttpServer())
        .get(`/auth/verify-email/${token}`)
        .expect(200);

      expect(response.body.message).toContain('verified successfully');
    });

    it('should return 400 for invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/verify-email/invalid-token')
        .expect(400);
    });
  });
});
