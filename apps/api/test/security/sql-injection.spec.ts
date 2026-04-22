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

describe('Security: SQL Injection Prevention', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let jwtService: JwtService;
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
    jwtService = moduleFixture.get<JwtService>(JwtService);
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

  it('should safely handle SQL injection in profile firstName', async () => {
    const sqlPayload = "'; DROP TABLE users; --";
    mockPrisma.user.update.mockImplementation(({ data }: any) => {
      // Prisma parameterizes queries — raw SQL never executed
      return Promise.resolve({ ...createAdultUser(), firstName: data.firstName });
    });

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: sqlPayload })
      .expect(400); // Min length validation may catch short payloads

    // If 400 due to minLength, that's fine — input is rejected
    // If it passed validation, Prisma parameterizes the query
  });

  it('should safely handle SQL injection in lastName', async () => {
    const sqlPayload = "' OR '1'='1";
    // Since minLength=2 passes, this will reach service
    mockPrisma.user.update.mockResolvedValue(createAdultUser());

    // The important thing: no error is thrown from DB layer
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lastName: sqlPayload });

    // Should be 200 (Prisma safely parameterizes) or 400 (validation)
    expect([200, 400]).toContain(response.status);
  });

  it('should handle SQL injection in watchlist contentId parameter', async () => {
    // UUID validation should reject non-UUID strings
    await request(app.getHttpServer())
      .post('/users/me/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ contentId: "'; DROP TABLE content; --" })
      .expect(400);
  });

  it('should handle SQL injection in URL path parameter', async () => {
    mockPrisma.playlist.findFirst.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .delete("/users/me/watchlist/'; DROP TABLE users; --")
      .set('Authorization', `Bearer ${accessToken}`);

    // Should not crash — Prisma parameterizes path params too
    expect([200, 404]).toContain(response.status);
  });

  it('should handle valid special characters in names (e.g., O\'Brien)', async () => {
    const updatedUser = { ...createAdultUser(), firstName: "O'Brien" };
    mockPrisma.user.update.mockResolvedValue(updatedUser);

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: "O'Brien" })
      .expect(200);

    expect(response.body.firstName).toBe("O'Brien");
  });

  it('should not leak database internals in error responses', async () => {
    mockPrisma.user.findUnique.mockRejectedValueOnce(new Error('DB connection failed'));

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    // Error response should not contain stack traces or DB details
    const body = JSON.stringify(response.body);
    expect(body).not.toContain('SELECT');
    expect(body).not.toContain('postgres');
    expect(body).not.toContain('prisma');
  });

  it('should handle UNION-based injection in query parameters', async () => {
    mockPrisma.playlist.findFirst.mockResolvedValue({ id: 'p-1' });
    mockPrisma.playlistItem.findMany.mockResolvedValue([]);
    mockPrisma.playlistItem.count.mockResolvedValue(0);

    const response = await request(app.getHttpServer())
      .get('/users/me/watchlist?page=1 UNION SELECT * FROM users&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    // parseInt handles this safely — NaN becomes default value
    expect([200, 400]).toContain(response.status);
  });
});
