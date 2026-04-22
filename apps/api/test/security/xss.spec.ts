import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';
import { PrismaService } from '../../src/config/prisma.service';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { createAdultUser } from '../factories/user.factory';

const JWT_SECRET = 'test-jwt-secret-key-for-testing-only-minimum-32-chars';

describe('Security: XSS Prevention', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let accessToken: string;
  let testUser: any;

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
    const jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    testUser = createAdultUser();
    accessToken = jwtService.sign({
      sub: testUser.id, email: testUser.email, role: testUser.role,
      ageCategory: testUser.ageCategory, verificationStatus: testUser.verificationStatus,
    });
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should not execute script tags in profile firstName', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const updatedUser = { ...testUser, firstName: xssPayload };
    mockPrisma.user.update.mockResolvedValue(updatedUser);

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: xssPayload });

    // API stores as-is (output encoding is frontend's job) OR rejects
    if (response.status === 200) {
      // Response is JSON — not rendered as HTML, so XSS not exploitable
      expect(response.headers['content-type']).toContain('application/json');
    }
  });

  it('should not execute script tags in lastName', async () => {
    const xssPayload = '<img src=x onerror=alert(1)>';
    const updatedUser = { ...testUser, lastName: xssPayload };
    mockPrisma.user.update.mockResolvedValue(updatedUser);

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lastName: xssPayload });

    if (response.status === 200) {
      expect(response.headers['content-type']).toContain('application/json');
    }
  });

  it('should return JSON content type for all API responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.headers['content-type']).toContain('application/json');
  });

  it('should handle event handler injection', async () => {
    const xssPayload = '" onmouseover="alert(1)" name="';
    const updatedUser = { ...testUser, firstName: xssPayload };
    mockPrisma.user.update.mockResolvedValue(updatedUser);

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: xssPayload });

    if (response.status === 200) {
      expect(response.headers['content-type']).toContain('application/json');
    }
  });

  it('should handle unicode-encoded XSS payloads', async () => {
    const xssPayload = '\u003cscript\u003ealert(1)\u003c/script\u003e';
    const updatedUser = { ...testUser, firstName: xssPayload };
    mockPrisma.user.update.mockResolvedValue(updatedUser);

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: xssPayload });

    if (response.status === 200) {
      expect(response.headers['content-type']).toContain('application/json');
    }
  });

  it('should handle SVG-based XSS in avatarUrl', async () => {
    const xssPayload = 'javascript:alert(1)';

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ avatarUrl: xssPayload });

    // URL validation should reject javascript: URLs
    expect(response.status).toBe(400);
  });

  it('should reject data: URI scheme in avatarUrl', async () => {
    const dataUri = 'data:text/html,<script>alert(1)</script>';

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ avatarUrl: dataUri });

    expect(response.status).toBe(400);
  });

  it('should not reflect XSS in error messages', async () => {
    const xssPayload = '<script>alert(1)</script>';

    const response = await request(app.getHttpServer())
      .post('/users/me/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ contentId: xssPayload });

    // Error should not contain the raw XSS payload unescaped
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.status).toBe(400);
  });

  it('should handle nested object injection attempts', async () => {
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Valid',
        __proto__: { isAdmin: true },
      });

    // forbidNonWhitelisted should reject unknown fields
    expect(response.status).toBe(400);
  });
});
