import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';

import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';
import { PrismaService } from '../../src/config/prisma.service';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { createAdultUser, createAdminUser, createMinorUser } from '../factories/user.factory';

const JWT_SECRET = 'test-jwt-secret-key-for-testing-only-minimum-32-chars';
const WRONG_SECRET = 'completely-wrong-secret-that-should-not-be-accepted!';

describe('Security: Auth Bypass Prevention', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let jwtService: JwtService;

  beforeAll(async () => {
    mockPrisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      userSession: { findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
      userVerification: { create: jest.fn(), findFirst: jest.fn() },
      playlist: { findFirst: jest.fn(), create: jest.fn() },
      playlistItem: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), deleteMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
      partnerRelationship: { groupBy: jest.fn(), count: jest.fn() },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [() => ({ JWT_SECRET, JWT_ACCESS_EXPIRATION: '15m', BCRYPT_ROUNDS: 4 })] }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '15m' } }),
      ],
      controllers: [UsersController],
      providers: [
        UsersService, JwtStrategy, JwtAuthGuard, Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 for protected routes without token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
    await request(app.getHttpServer()).patch('/users/me').send({}).expect(401);
    await request(app.getHttpServer()).post('/users/me/password').send({}).expect(401);
    await request(app.getHttpServer()).get('/users/me/sessions').expect(401);
    await request(app.getHttpServer()).get('/users/me/referrals').expect(401);
  });

  it('should return 401 for expired JWT', async () => {
    const testUser = createAdultUser();
    // Sign with very short expiry
    const expiredToken = jwtService.sign(
      { sub: testUser.id, email: testUser.email, role: testUser.role, ageCategory: testUser.ageCategory, verificationStatus: testUser.verificationStatus },
      { expiresIn: '1ms' },
    );

    // Wait for token to expire
    await new Promise((resolve) => setTimeout(resolve, 50));

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('should return 401 for malformed JWT', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer not.a.valid.jwt.token')
      .expect(401);
  });

  it('should return 401 for JWT signed with wrong secret', async () => {
    const testUser = createAdultUser();
    const forgedToken = jwt.sign(
      { sub: testUser.id, email: testUser.email, role: 'ADMIN', ageCategory: testUser.ageCategory },
      WRONG_SECRET,
      { expiresIn: '15m' },
    );

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${forgedToken}`)
      .expect(401);
  });

  it('should return 401 for JWT with modified payload (role escalation)', async () => {
    const buyerUser = createAdultUser();
    // Sign valid token
    const validToken = jwtService.sign({
      sub: buyerUser.id, email: buyerUser.email, role: 'BUYER',
      ageCategory: buyerUser.ageCategory, verificationStatus: buyerUser.verificationStatus,
    });

    // Tamper with the payload
    const parts = validToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    payload.role = 'ADMIN'; // Escalate role
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = parts.join('.');

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .expect(401);
  });

  it('should return 401 for JWT with no sub claim', async () => {
    const noSubToken = jwt.sign(
      { email: 'test@example.com', role: 'BUYER' },
      JWT_SECRET,
      { expiresIn: '15m' },
    );

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${noSubToken}`)
      .expect(401);
  });

  it('should return 401 for Bearer with empty token', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer ')
      .expect(401);
  });

  it('should return 401 for non-Bearer scheme', async () => {
    const testUser = createAdultUser();
    const token = jwtService.sign({
      sub: testUser.id, email: testUser.email, role: testUser.role,
      ageCategory: testUser.ageCategory, verificationStatus: testUser.verificationStatus,
    });

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Basic ${token}`)
      .expect(401);
  });

  it('should prevent accessing other users data with valid token', async () => {
    const user1 = createAdultUser();
    const user2 = createAdultUser();

    const token1 = jwtService.sign({
      sub: user1.id, email: user1.email, role: user1.role,
      ageCategory: user1.ageCategory, verificationStatus: user1.verificationStatus,
    });

    // User 1's token accesses /users/me — should only return user 1's data
    mockPrisma.user.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === user1.id) return Promise.resolve(user1);
      if (where.id === user2.id) return Promise.resolve(user2);
      return Promise.resolve(null);
    });

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    // Should get user1's email, not user2's
    expect(response.body.email).toBe(user1.email);
    expect(response.body.email).not.toBe(user2.email);
  });

  it('should verify user exists when validating JWT', async () => {
    const deletedUser = createAdultUser();
    const token = jwtService.sign({
      sub: deletedUser.id, email: deletedUser.email, role: deletedUser.role,
      ageCategory: deletedUser.ageCategory, verificationStatus: deletedUser.verificationStatus,
    });

    // User no longer exists in DB
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(404); // User not found by getProfile
  });

  it('should return 401 for JWT with algorithm none', async () => {
    const testUser = createAdultUser();
    // Attempt algorithm-none attack
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: testUser.id, email: testUser.email, role: 'ADMIN',
    })).toString('base64url');
    const algoNoneToken = `${header}.${payload}.`;

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${algoNoneToken}`)
      .expect(401);
  });

  it('should not expose sensitive info in 401 error', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .expect(401);

    expect(response.body.message).not.toContain(JWT_SECRET);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });
});
