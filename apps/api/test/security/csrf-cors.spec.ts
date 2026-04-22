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

describe('Security: CSRF/CORS Protection', () => {
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

    // Enable CORS with specific origins (mirrors production config)
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

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

  it('should include CORS headers for allowed origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/users/me')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('should not include CORS headers for unauthorized origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/users/me')
      .set('Origin', 'https://evil-site.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should not use wildcard * for Access-Control-Allow-Origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/users/me')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('should include correct CORS headers in preflight response', async () => {
    const response = await request(app.getHttpServer())
      .options('/users/me')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

    expect(response.headers['access-control-allow-methods']).toBeDefined();
    expect(response.headers['access-control-allow-headers']).toBeDefined();
  });

  it('should include credentials support in CORS', async () => {
    const response = await request(app.getHttpServer())
      .options('/users/me')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should respond to preflight OPTIONS request with 204', async () => {
    const response = await request(app.getHttpServer())
      .options('/users/me')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
  });

  it('should require authentication for state-changing requests (CSRF protection)', async () => {
    // Without Authorization header, PATCH should fail
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Origin', 'http://localhost:3000')
      .send({ firstName: 'Hacked' });

    expect(response.status).toBe(401);
  });
});
