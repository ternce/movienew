import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';
import { AgeCategory } from '@prisma/client';

import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';
import { PrismaService } from '../../src/config/prisma.service';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { createAdultUser, createMinorUser, createMockUser } from '../factories/user.factory';

const JWT_SECRET = 'test-jwt-secret-key-for-testing-only-minimum-32-chars';
const WRONG_SECRET = 'completely-wrong-secret-that-should-not-be-accepted!';

describe('Security: Age Verification Bypass Prevention', () => {
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

  it('should correctly identify EIGHTEEN_PLUS user from JWT', async () => {
    const adultUser = createAdultUser();
    const token = jwtService.sign({
      sub: adultUser.id, email: adultUser.email, role: adultUser.role,
      ageCategory: AgeCategory.EIGHTEEN_PLUS, verificationStatus: adultUser.verificationStatus,
    });
    mockPrisma.user.findUnique.mockResolvedValue(adultUser);

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.ageCategory).toBe(AgeCategory.EIGHTEEN_PLUS);
  });

  it('should correctly identify TWELVE_PLUS user from JWT', async () => {
    const minorUser = createMinorUser(14);
    const token = jwtService.sign({
      sub: minorUser.id, email: minorUser.email, role: minorUser.role,
      ageCategory: AgeCategory.TWELVE_PLUS, verificationStatus: minorUser.verificationStatus,
    });
    mockPrisma.user.findUnique.mockResolvedValue(minorUser);

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.ageCategory).toBe(AgeCategory.TWELVE_PLUS);
  });

  it('should correctly identify SIX_PLUS user from JWT', async () => {
    const minorUser = createMinorUser(8);
    const token = jwtService.sign({
      sub: minorUser.id, email: minorUser.email, role: minorUser.role,
      ageCategory: AgeCategory.SIX_PLUS, verificationStatus: minorUser.verificationStatus,
    });
    mockPrisma.user.findUnique.mockResolvedValue(minorUser);

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.ageCategory).toBe(AgeCategory.SIX_PLUS);
  });

  it('should reject JWT with manipulated ageCategory (wrong secret)', async () => {
    const minorUser = createMinorUser(14);
    // Forge token with EIGHTEEN_PLUS using wrong secret
    const forgedToken = jwt.sign(
      {
        sub: minorUser.id, email: minorUser.email, role: minorUser.role,
        ageCategory: AgeCategory.EIGHTEEN_PLUS,
      },
      WRONG_SECRET,
      { expiresIn: '15m' },
    );

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${forgedToken}`)
      .expect(401);
  });

  it('should use database ageCategory, not just JWT claim', async () => {
    // JWT says EIGHTEEN_PLUS but DB says TWELVE_PLUS
    const minorUser = createMinorUser(14);
    const token = jwtService.sign({
      sub: minorUser.id, email: minorUser.email, role: minorUser.role,
      ageCategory: AgeCategory.EIGHTEEN_PLUS, // JWT lie
      verificationStatus: minorUser.verificationStatus,
    });
    mockPrisma.user.findUnique.mockResolvedValue(minorUser); // DB truth

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Profile should show actual DB value
    expect(response.body.ageCategory).toBe(minorUser.ageCategory);
  });

  it('should handle missing ageCategory in JWT gracefully', async () => {
    const user = createAdultUser();
    // Sign without ageCategory
    const token = jwtService.sign({
      sub: user.id, email: user.email, role: user.role,
      verificationStatus: user.verificationStatus,
    });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    // Should still work — profile comes from DB, not JWT
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('ageCategory');
  });

  it('should return user\'s real ageCategory from database for ZERO_PLUS', async () => {
    const childUser = createMinorUser(4);
    const token = jwtService.sign({
      sub: childUser.id, email: childUser.email, role: childUser.role,
      ageCategory: AgeCategory.ZERO_PLUS, verificationStatus: childUser.verificationStatus,
    });
    mockPrisma.user.findUnique.mockResolvedValue(childUser);

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.ageCategory).toBe(AgeCategory.ZERO_PLUS);
  });

  it('should preserve ageCategory for SIXTEEN_PLUS users', async () => {
    const teenUser = createMinorUser(17);
    const token = jwtService.sign({
      sub: teenUser.id, email: teenUser.email, role: teenUser.role,
      ageCategory: AgeCategory.SIXTEEN_PLUS, verificationStatus: teenUser.verificationStatus,
    });
    mockPrisma.user.findUnique.mockResolvedValue(teenUser);

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.ageCategory).toBe(AgeCategory.SIXTEEN_PLUS);
  });
});
