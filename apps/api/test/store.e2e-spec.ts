import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ProductStatus, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { ProductsController } from '../src/modules/store/controllers/products.controller';
import { CartController } from '../src/modules/store/controllers/cart.controller';
import { OrdersController } from '../src/modules/store/controllers/orders.controller';
import { ProductsService } from '../src/modules/store/services/products.service';
import { CartService } from '../src/modules/store/services/cart.service';
import { OrdersService } from '../src/modules/store/services/orders.service';
import { PrismaService } from '../src/config/prisma.service';
import { REDIS_CLIENT } from '../src/config/redis.module';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { UsersService } from '../src/modules/users/users.service';
import { BonusesService } from '../src/modules/bonuses/bonuses.service';
import { PartnersService } from '../src/modules/partners/partners.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { createMockRedis, MockRedis } from './mocks/redis.mock';
import { createAdultUser } from './factories/user.factory';
import {
  createActiveProduct,
  createOutOfStockProduct,
  createMockProductCategory,
} from './factories/product.factory';

describe('Store (e2e)', () => {
  let app: INestApplication;
  let mockRedis: MockRedis;
  let mockPrisma: any;
  let mockUsersService: any;
  let mockBonusesService: any;
  let mockPartnersService: any;
  let mockPaymentsService: any;
  let jwtService: JwtService;

  const mockUser = createAdultUser({ bonusBalance: 5000 });
  const mockCategory = createMockProductCategory({ name: 'Electronics' });

  beforeAll(async () => {
    mockRedis = createMockRedis();

    mockPrisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      productCategory: {
        findMany: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      orderItem: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
      },
      bonusTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockUsersService = {
      findById: jest.fn(),
    };

    mockBonusesService = {
      spendBonus: jest.fn(),
      restoreBonus: jest.fn(),
    };

    mockPartnersService = {
      calculateAndCreateCommissions: jest.fn(),
    };

    mockPaymentsService = {
      initiatePayment: jest.fn(),
      processPayment: jest.fn(),
      createPayment: jest.fn(),
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
      controllers: [ProductsController, CartController, OrdersController],
      providers: [
        ProductsService,
        CartService,
        OrdersService,
        JwtStrategy,
        JwtAuthGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: mockUsersService },
        { provide: BonusesService, useValue: mockBonusesService },
        { provide: PartnersService, useValue: mockPartnersService },
        { provide: PaymentsService, useValue: mockPaymentsService },
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
    mockUsersService.findById.mockResolvedValue(mockUser);
  });

  function generateToken(user = mockUser): string {
    return jwtService.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      ageCategory: user.ageCategory,
      verificationStatus: user.verificationStatus,
    });
  }

  // ==================== Products ====================

  describe('GET /store/products', () => {
    it('should return products (public)', async () => {
      const products = [
        { ...createActiveProduct(), category: mockCategory },
        { ...createActiveProduct(), category: mockCategory },
      ];

      mockPrisma.product.count.mockResolvedValue(2);
      mockPrisma.product.findMany.mockResolvedValue(products);

      const response = await request(app.getHttpServer())
        .get('/store/products')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body.items).toHaveLength(2);
    });

    it('should filter by search term', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/store/products?search=phone')
        .expect(200);

      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              name: { contains: 'phone', mode: 'insensitive' },
            }),
          ]),
        }),
      });
    });

    it('should filter by category', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/store/products?categoryId=cat-123')
        .expect(200);

      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          categoryId: 'cat-123',
        }),
      });
    });

    it('should filter by in-stock', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/store/products?inStock=true')
        .expect(200);

      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          stockQuantity: { gt: 0 },
        }),
      });
    });

    it('should support pagination', async () => {
      mockPrisma.product.count.mockResolvedValue(100);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/store/products?page=3&limit=10')
        .expect(200);

      expect(response.body.page).toBe(3);
      expect(response.body.limit).toBe(10);
    });
  });

  describe('GET /store/products/categories', () => {
    it('should return categories (public)', async () => {
      const categories = [
        createMockProductCategory({ name: 'Electronics', order: 1 }),
        createMockProductCategory({ name: 'Books', order: 2 }),
      ];

      mockPrisma.productCategory.findMany.mockResolvedValue(categories);

      const response = await request(app.getHttpServer())
        .get('/store/products/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /store/products/:productId', () => {
    it('should return product by ID', async () => {
      const product = {
        ...createActiveProduct({ id: 'prod-123' }),
        category: mockCategory,
      };

      mockPrisma.product.findUnique.mockResolvedValue(product);

      const response = await request(app.getHttpServer())
        .get('/store/products/prod-123')
        .expect(200);

      expect(response.body.id).toBe('prod-123');
    });

    it('should return 404 for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/store/products/non-existent')
        .expect(404);
    });
  });

  // ==================== Cart ====================

  describe('GET /store/cart', () => {
    it('should return cart for authenticated user', async () => {
      const token = generateToken();
      const product = {
        ...createActiveProduct({ id: 'prod-123', price: 1000 }),
        category: mockCategory,
      };

      mockRedis.set(
        `cart:${mockUser.id}`,
        JSON.stringify({
          items: [{ productId: 'prod-123', quantity: 2 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([product]);

      const response = await request(app.getHttpServer())
        .get('/store/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('itemCount');
      expect(response.body).toHaveProperty('totalAmount');
    });

    it('should return empty cart when no items', async () => {
      const token = generateToken();

      const response = await request(app.getHttpServer())
        .get('/store/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.itemCount).toBe(0);
      expect(response.body.totalAmount).toBe(0);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/store/cart')
        .expect(401);
    });
  });

  describe('POST /store/cart/items', () => {
    it('should add item to cart', async () => {
      const token = generateToken();
      const product = {
        ...createActiveProduct({ id: 'prod-123' }),
        category: mockCategory,
      };

      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-123',
        stockQuantity: 100,
        status: ProductStatus.ACTIVE,
      });
      mockPrisma.product.findMany.mockResolvedValue([product]);

      const response = await request(app.getHttpServer())
        .post('/store/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: 'prod-123', quantity: 2 })
        .expect(201);

      expect(response.body).toHaveProperty('items');
    });

    it('should return 400 for inactive product', async () => {
      const token = generateToken();

      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-123',
        stockQuantity: 100,
        status: ProductStatus.INACTIVE,
      });

      await request(app.getHttpServer())
        .post('/store/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: 'prod-123', quantity: 2 })
        .expect(400);
    });

    it('should return 400 for non-existent product', async () => {
      const token = generateToken();

      mockPrisma.product.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/store/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: 'non-existent', quantity: 1 })
        .expect(400);
    });
  });

  describe('PUT /store/cart/items', () => {
    it('should update cart item quantity', async () => {
      const token = generateToken();
      const product = {
        ...createActiveProduct({ id: 'prod-123' }),
        category: mockCategory,
      };

      mockRedis.set(
        `cart:${mockUser.id}`,
        JSON.stringify({
          items: [{ productId: 'prod-123', quantity: 2 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findUnique.mockResolvedValue({ stockQuantity: 100 });
      mockPrisma.product.findMany.mockResolvedValue([product]);

      const response = await request(app.getHttpServer())
        .put('/store/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: 'prod-123', quantity: 5 })
        .expect(200);

      expect(response.body).toHaveProperty('items');
    });

    it('should remove item when quantity is 0', async () => {
      const token = generateToken();

      mockRedis.set(
        `cart:${mockUser.id}`,
        JSON.stringify({
          items: [{ productId: 'prod-123', quantity: 2 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .put('/store/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: 'prod-123', quantity: 0 })
        .expect(200);

      expect(response.body.items).toHaveLength(0);
    });
  });

  describe('DELETE /store/cart/items/:productId', () => {
    it('should remove item from cart', async () => {
      const token = generateToken();
      const product2 = {
        ...createActiveProduct({ id: 'prod-2' }),
        category: mockCategory,
      };

      mockRedis.set(
        `cart:${mockUser.id}`,
        JSON.stringify({
          items: [
            { productId: 'prod-1', quantity: 1 },
            { productId: 'prod-2', quantity: 1 },
          ],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([product2]);

      const response = await request(app.getHttpServer())
        .delete('/store/cart/items/prod-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
    });
  });

  describe('DELETE /store/cart', () => {
    it('should clear cart', async () => {
      const token = generateToken();

      mockRedis.set(
        `cart:${mockUser.id}`,
        JSON.stringify({
          items: [{ productId: 'prod-123', quantity: 2 }],
          updatedAt: new Date().toISOString(),
        }),
      );

      const response = await request(app.getHttpServer())
        .delete('/store/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  // ==================== Orders ====================

  describe('GET /store/orders', () => {
    it('should return user orders', async () => {
      const token = generateToken();
      const order = {
        id: 'order-123',
        userId: mockUser.id,
        totalAmount: new Decimal(2000),
        status: OrderStatus.PAID,
        createdAt: new Date(),
        items: [],
      };

      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findMany.mockResolvedValue([order]);

      const response = await request(app.getHttpServer())
        .get('/store/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total', 1);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/store/orders')
        .expect(401);
    });
  });

  describe('GET /store/orders/:orderId', () => {
    it('should return order by ID', async () => {
      const token = generateToken();
      const order = {
        id: 'order-123',
        userId: mockUser.id,
        totalAmount: new Decimal(2000),
        status: OrderStatus.PAID,
        createdAt: new Date(),
        items: [],
      };

      mockPrisma.order.findUnique.mockResolvedValue(order);

      const response = await request(app.getHttpServer())
        .get('/store/orders/order-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe('order-123');
    });

    it('should return 404 for non-existent order', async () => {
      const token = generateToken();

      mockPrisma.order.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/store/orders/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
