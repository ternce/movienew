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

describe('Security: Input Validation', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let accessToken: string;

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

    const testUser = createAdultUser();
    accessToken = jwtService.sign({
      sub: testUser.id, email: testUser.email, role: testUser.role,
      ageCategory: testUser.ageCategory, verificationStatus: testUser.verificationStatus,
    });
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Password validation', () => {
    it('should reject password without uppercase letter', async () => {
      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'TestPassword123!', newPassword: 'nouppercase1' })
        .expect(400);
    });

    it('should reject password without number', async () => {
      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'TestPassword123!', newPassword: 'NoNumberHere!' })
        .expect(400);
    });

    it('should reject password shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'TestPassword123!', newPassword: 'Ab1!' })
        .expect(400);
    });
  });

  describe('Field length validation', () => {
    it('should reject firstName exceeding max length (51 chars)', async () => {
      const longName = 'A'.repeat(51);

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: longName })
        .expect(400);
    });

    it('should reject lastName exceeding max length', async () => {
      const longName = 'B'.repeat(51);

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ lastName: longName })
        .expect(400);
    });

    it('should reject extremely long strings (10000 chars)', async () => {
      const hugeString = 'X'.repeat(10000);

      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: hugeString })
        .expect(400);
    });
  });

  describe('Unknown field rejection', () => {
    it('should reject unknown fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Valid', hackField: 'malicious' })
        .expect(400);
    });

    it('should reject attempts to set role via profile update', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Valid', role: 'ADMIN' })
        .expect(400);
    });

    it('should reject attempts to set passwordHash directly', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Valid', passwordHash: 'hacked' })
        .expect(400);
    });
  });

  describe('Empty/missing body validation', () => {
    it('should reject empty body on password change', async () => {
      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should reject verification submission without method', async () => {
      await request(app.getHttpServer())
        .post('/users/me/verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('Enum validation', () => {
    it('should reject invalid verification method enum', async () => {
      await request(app.getHttpServer())
        .post('/users/me/verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: 'INVALID_METHOD' })
        .expect(400);
    });

    it('should reject numeric value for enum field', async () => {
      await request(app.getHttpServer())
        .post('/users/me/verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ method: 12345 })
        .expect(400);
    });
  });

  describe('UUID validation', () => {
    it('should reject non-UUID contentId', async () => {
      await request(app.getHttpServer())
        .post('/users/me/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentId: 'not-a-uuid' })
        .expect(400);
    });

    it('should reject empty string contentId', async () => {
      await request(app.getHttpServer())
        .post('/users/me/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentId: '' })
        .expect(400);
    });
  });
});
