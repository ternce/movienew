/**
 * CartService Unit Tests
 *
 * Tests for Redis cart functionality including:
 * - Cart operations (add, update, remove)
 * - Stock validation
 * - Checkout validation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { CartService } from './cart.service';
import { PrismaService } from '../../../config/prisma.service';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { createMockUser } from '../../../../test/factories/user.factory';
import {
  createActiveProduct,
  createOutOfStockProduct,
  createInactiveProduct,
  createMockProductCategory,
} from '../../../../test/factories/product.factory';

describe('CartService', () => {
  let service: CartService;
  let mockPrisma: any;
  let mockRedis: any;

  const mockUser = createMockUser();
  const userId = mockUser.id;
  const mockCategory = createMockProductCategory();

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return empty cart when no data in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getCart(userId);

      expect(result.items).toEqual([]);
      expect(result.itemCount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it('should return cart with product details', async () => {
      const product = {
        ...createActiveProduct({ price: 999 }),
        category: mockCategory,
        images: ['image.jpg'],
      };

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: product.id, quantity: 2 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([product]);

      const result = await service.getCart(userId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe(product.id);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].totalPrice).toBe(1998); // 999 * 2
      expect(result.totalAmount).toBe(1998);
    });

    it('should calculate max bonus applicable', async () => {
      const productWithBonus = {
        ...createActiveProduct({ price: 1000 }),
        bonusPrice: new Decimal(300),
        allowsPartialBonus: true,
        category: mockCategory,
      };

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: productWithBonus.id, quantity: 2 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([productWithBonus]);

      const result = await service.getCart(userId);

      expect(result.maxBonusApplicable).toBe(600); // 300 * 2
    });

    it('should filter out products that no longer exist', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [
            { productId: 'existing', quantity: 1 },
            { productId: 'deleted', quantity: 1 },
          ],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([
        {
          ...createActiveProduct({ id: 'existing' }),
          category: mockCategory,
        },
      ]);

      const result = await service.getCart(userId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe('existing');
    });
  });

  describe('getCartSummary', () => {
    it('should return zero for empty cart', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getCartSummary(userId);

      expect(result.itemCount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it('should return summary with totals', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-2', quantity: 1 },
          ],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', price: new Decimal(500) },
        { id: 'prod-2', price: new Decimal(1000) },
      ]);

      const result = await service.getCartSummary(userId);

      expect(result.itemCount).toBe(2);
      expect(result.totalAmount).toBe(2000); // 500*2 + 1000*1
    });
  });

  describe('addToCart', () => {
    it('should add new item to cart', async () => {
      const product = createActiveProduct({ stockQuantity: 100, price: 999 });

      mockPrisma.product.findUnique.mockResolvedValue({
        id: product.id,
        stockQuantity: 100,
        status: ProductStatus.ACTIVE,
      });
      // First call returns empty cart
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValue('OK');
      // Second call (from getCart) returns updated cart
      mockRedis.get.mockResolvedValueOnce(
        JSON.stringify({
          items: [{ productId: product.id, quantity: 2 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      // For getCart call
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          bonusPrice: null,
          allowsPartialBonus: false,
          stockQuantity: 100,
          status: ProductStatus.ACTIVE,
          images: ['image.jpg'],
          category: mockCategory,
        },
      ]);

      const result = await service.addToCart(userId, {
        productId: product.id,
        quantity: 2,
      });

      expect(mockRedis.setex).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('should increase quantity for existing item', async () => {
      const product = createActiveProduct({ id: 'prod-123', stockQuantity: 100 });

      mockPrisma.product.findUnique.mockResolvedValue({
        id: product.id,
        stockQuantity: 100,
        status: ProductStatus.ACTIVE,
      });
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: product.id, quantity: 3 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockRedis.setex.mockResolvedValue('OK');
      mockPrisma.product.findMany.mockResolvedValue([
        { ...product, category: mockCategory },
      ]);

      await service.addToCart(userId, { productId: product.id, quantity: 2 });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        expect.any(Number),
        expect.stringContaining('"quantity":5'), // 3 + 2
      );
    });

    it('should throw BadRequestException for inactive product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-123',
        stockQuantity: 100,
        status: ProductStatus.INACTIVE,
      });

      await expect(
        service.addToCart(userId, { productId: 'prod-123', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addToCart(userId, { productId: 'non-existent', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when exceeding stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-123',
        stockQuantity: 5,
        status: ProductStatus.ACTIVE,
      });
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: 'prod-123', quantity: 3 }],
          updatedAt: new Date().toISOString(),
        }),
      );

      await expect(
        service.addToCart(userId, { productId: 'prod-123', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCartItem', () => {
    it('should update item quantity', async () => {
      const product = createActiveProduct({ id: 'prod-123', stockQuantity: 100 });

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: 'prod-123', quantity: 5 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findUnique.mockResolvedValue({
        stockQuantity: 100,
      });
      mockRedis.setex.mockResolvedValue('OK');
      mockPrisma.product.findMany.mockResolvedValue([
        { ...product, category: mockCategory },
      ]);

      await service.updateCartItem(userId, { productId: 'prod-123', quantity: 10 });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.stringContaining('"quantity":10'),
      );
    });

    it('should remove item when quantity is 0', async () => {
      const product = createActiveProduct({ id: 'prod-123' });

      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: 'prod-123', quantity: 5 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockRedis.setex.mockResolvedValue('OK');
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await service.updateCartItem(userId, {
        productId: 'prod-123',
        quantity: 0,
      });

      expect(result.items).toHaveLength(0);
    });

    it('should throw BadRequestException for item not in cart', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [],
          updatedAt: new Date().toISOString(),
        }),
      );

      await expect(
        service.updateCartItem(userId, { productId: 'not-in-cart', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when exceeding stock', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: 'prod-123', quantity: 5 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findUnique.mockResolvedValue({
        stockQuantity: 10,
      });

      await expect(
        service.updateCartItem(userId, { productId: 'prod-123', quantity: 20 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-2', quantity: 1 },
          ],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockRedis.setex.mockResolvedValue('OK');
      mockPrisma.product.findMany.mockResolvedValue([
        {
          ...createActiveProduct({ id: 'prod-2' }),
          category: mockCategory,
        },
      ]);

      const result = await service.removeFromCart(userId, 'prod-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe('prod-2');
    });
  });

  describe('clearCart', () => {
    it('should delete cart from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.clearCart(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(`cart:${userId}`);
    });
  });

  describe('validateCartForCheckout', () => {
    it('should return valid for available items', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: 'prod-123', quantity: 5 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-123',
          stockQuantity: 100,
          status: ProductStatus.ACTIVE,
          name: 'Product',
        },
      ]);

      const result = await service.validateCartForCheckout(userId);

      expect(result.valid).toBe(true);
      expect(result.unavailableItems).toHaveLength(0);
      expect(result.stockIssues).toHaveLength(0);
    });

    it('should return invalid for empty cart', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.validateCartForCheckout(userId);

      expect(result.valid).toBe(false);
    });

    it('should identify unavailable items', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: 'inactive-prod', quantity: 1 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'inactive-prod',
          stockQuantity: 100,
          status: ProductStatus.INACTIVE, // Product is inactive
          name: 'Inactive Product',
        },
      ]);

      const result = await service.validateCartForCheckout(userId);

      expect(result.valid).toBe(false);
      expect(result.unavailableItems).toContain('inactive-prod');
    });

    it('should identify stock issues', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: 'low-stock', quantity: 10 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'low-stock',
          stockQuantity: 5, // Less than requested
          status: ProductStatus.ACTIVE,
          name: 'Low Stock Product',
        },
      ]);

      const result = await service.validateCartForCheckout(userId);

      expect(result.valid).toBe(false);
      expect(result.stockIssues).toHaveLength(1);
      expect(result.stockIssues[0]).toEqual({
        productId: 'low-stock',
        available: 5,
        requested: 10,
      });
    });

    it('should identify deleted products', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          items: [{ productId: 'deleted-prod', quantity: 1 }],
          updatedAt: new Date().toISOString(),
        }),
      );
      mockPrisma.product.findMany.mockResolvedValue([]); // No products found

      const result = await service.validateCartForCheckout(userId);

      expect(result.valid).toBe(false);
      expect(result.unavailableItems).toContain('deleted-prod');
    });
  });

  describe('getCartDataForCheckout', () => {
    it('should return raw cart data', async () => {
      const cartData = {
        items: [{ productId: 'prod-123', quantity: 5 }],
        updatedAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cartData));

      const result = await service.getCartDataForCheckout(userId);

      expect(result.items).toEqual(cartData.items);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in Redis gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid json{');

      const result = await service.getCart(userId);

      expect(result.items).toEqual([]);
      expect(result.itemCount).toBe(0);
    });
  });
});
