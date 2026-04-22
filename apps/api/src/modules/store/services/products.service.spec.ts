/**
 * ProductsService Unit Tests
 *
 * Tests for product management including:
 * - Product listing and filtering
 * - Stock management (CRITICAL)
 * - Optimistic locking for stock reservation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { ProductsService } from './products.service';
import { PrismaService } from '../../../config/prisma.service';
import {
  createMockProduct,
  createActiveProduct,
  createOutOfStockProduct,
  createInactiveProduct,
  createMockProductCategory,
  ProductStatus as FactoryProductStatus,
} from '../../../../test/factories/product.factory';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockPrisma: any;

  const mockCategory = createMockProductCategory({ name: 'Electronics' });

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      productCategory: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should return paginated products', async () => {
      const products = [
        { ...createActiveProduct(), category: mockCategory },
        { ...createActiveProduct(), category: mockCategory },
      ];

      mockPrisma.product.count.mockResolvedValue(2);
      mockPrisma.product.findMany.mockResolvedValue(products);

      const result = await service.getProducts({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by search term', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getProducts({ search: 'phone', page: 1, limit: 20 });

      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'phone', mode: 'insensitive' } },
            { description: { contains: 'phone', mode: 'insensitive' } },
          ],
        }),
      });
    });

    it('should filter by category', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getProducts({ categoryId: 'cat-123', page: 1, limit: 20 });

      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ categoryId: 'cat-123' }),
      });
    });

    it('should filter by price range', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getProducts({ minPrice: 100, maxPrice: 500, page: 1, limit: 20 });

      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          price: { gte: 100, lte: 500 },
        }),
      });
    });

    it('should filter by in-stock status', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getProducts({ inStock: true, page: 1, limit: 20 });

      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          stockQuantity: { gt: 0 },
        }),
      });
    });

    it('should sort by price ascending', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getProducts({ sortBy: 'price_asc', page: 1, limit: 20 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        }),
      );
    });

    it('should sort by price descending', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getProducts({ sortBy: 'price_desc', page: 1, limit: 20 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'desc' },
        }),
      );
    });

    it('should default to newest first', async () => {
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.getProducts({ page: 1, limit: 20 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('getProductById', () => {
    it('should return product by ID', async () => {
      const product = { ...createActiveProduct({ id: 'prod-123' }), category: mockCategory };

      mockPrisma.product.findUnique.mockResolvedValue(product);

      const result = await service.getProductById('prod-123');

      expect(result.id).toBe('prod-123');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.getProductById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProductBySlug', () => {
    it('should return product by slug', async () => {
      const product = {
        ...createActiveProduct({ slug: 'test-product' }),
        category: mockCategory,
      };

      mockPrisma.product.findUnique.mockResolvedValue(product);

      const result = await service.getProductBySlug('test-product');

      expect(result.slug).toBe('test-product');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.getProductBySlug('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const categories = [
        createMockProductCategory({ name: 'Electronics', order: 1 }),
        createMockProductCategory({ name: 'Clothing', order: 2 }),
      ];

      mockPrisma.productCategory.findMany.mockResolvedValue(categories);

      const result = await service.getCategories();

      expect(result).toHaveLength(2);
      expect(mockPrisma.productCategory.findMany).toHaveBeenCalledWith({
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const dto = {
        name: 'New Product',
        description: 'Description',
        categoryId: 'cat-123',
        price: 999,
        stockQuantity: 100,
      };

      const createdProduct = {
        ...createActiveProduct({ name: 'New Product' }),
        category: mockCategory,
        status: ProductStatus.DRAFT,
      };

      mockPrisma.product.create.mockResolvedValue(createdProduct);

      const result = await service.createProduct(dto);

      expect(result.name).toBe('New Product');
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Product',
          description: 'Description',
          categoryId: 'cat-123',
          price: 999,
          status: ProductStatus.DRAFT,
        }),
        include: { category: true },
      });
    });

    it('should set default allowsPartialBonus to true', async () => {
      const dto = {
        name: 'Product',
        description: 'Desc',
        categoryId: 'cat-123',
        price: 100,
        stockQuantity: 10,
      };

      mockPrisma.product.create.mockResolvedValue({
        ...createActiveProduct(),
        category: mockCategory,
      });

      await service.createProduct(dto);

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          allowsPartialBonus: true,
        }),
        include: { category: true },
      });
    });
  });

  describe('updateProduct', () => {
    it('should update existing product', async () => {
      const existingProduct = createActiveProduct({ id: 'prod-123' });
      const dto = { name: 'Updated Name', price: 1499 };

      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue({
        ...existingProduct,
        ...dto,
        category: mockCategory,
      });

      const result = await service.updateProduct('prod-123', dto);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProduct('non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkStock - CRITICAL', () => {
    it('should return true when sufficient stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        stockQuantity: 100,
        status: ProductStatus.ACTIVE,
      });

      const result = await service.checkStock('prod-123', 50);

      expect(result).toBe(true);
    });

    it('should return false when insufficient stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        stockQuantity: 10,
        status: ProductStatus.ACTIVE,
      });

      const result = await service.checkStock('prod-123', 50);

      expect(result).toBe(false);
    });

    it('should return false when product is inactive', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        stockQuantity: 100,
        status: ProductStatus.INACTIVE,
      });

      const result = await service.checkStock('prod-123', 10);

      expect(result).toBe(false);
    });

    it('should return false when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await service.checkStock('non-existent', 10);

      expect(result).toBe(false);
    });

    it('should return true for exact stock match', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        stockQuantity: 10,
        status: ProductStatus.ACTIVE,
      });

      const result = await service.checkStock('prod-123', 10);

      expect(result).toBe(true);
    });
  });

  describe('reserveStock - CRITICAL (Optimistic Locking)', () => {
    it('should decrement stock when sufficient', async () => {
      mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.reserveStock('prod-123', 5);

      expect(result).toBe(true);
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'prod-123',
          stockQuantity: { gte: 5 },
          status: ProductStatus.ACTIVE,
        },
        data: {
          stockQuantity: { decrement: 5 },
        },
      });
    });

    it('should return false when stock insufficient (optimistic lock fail)', async () => {
      // When updateMany returns count: 0, the optimistic lock failed
      mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.reserveStock('prod-123', 100);

      expect(result).toBe(false);
    });

    it('should return false when product is inactive', async () => {
      mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.reserveStock('prod-123', 5);

      expect(result).toBe(false);
    });

    it('should handle concurrent reservations correctly', async () => {
      // Simulates race condition where first call succeeds, second fails
      mockPrisma.product.updateMany
        .mockResolvedValueOnce({ count: 1 }) // First reservation succeeds
        .mockResolvedValueOnce({ count: 0 }); // Second fails (stock depleted)

      const result1 = await service.reserveStock('prod-123', 50);
      const result2 = await service.reserveStock('prod-123', 50);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('releaseStock', () => {
    it('should increment stock on order cancellation', async () => {
      mockPrisma.product.update.mockResolvedValue({});

      await service.releaseStock('prod-123', 10);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: {
          stockQuantity: { increment: 10 },
        },
      });
    });
  });

  describe('DTO Mapping', () => {
    it('should correctly map product to DTO', async () => {
      const product = {
        id: 'prod-123',
        name: 'Test Product',
        slug: 'test-product',
        description: 'A test product',
        price: new Decimal(999),
        bonusPrice: new Decimal(200),
        allowsPartialBonus: true,
        stockQuantity: 50,
        images: ['image1.jpg', 'image2.jpg'],
        status: ProductStatus.ACTIVE,
        createdAt: new Date(),
        category: mockCategory,
      };

      mockPrisma.product.findUnique.mockResolvedValue(product);

      const result = await service.getProductById('prod-123');

      expect(result).toEqual({
        id: 'prod-123',
        name: 'Test Product',
        slug: 'test-product',
        description: 'A test product',
        category: expect.objectContaining({ name: 'Electronics' }),
        price: 999,
        bonusPrice: 200,
        allowsPartialBonus: true,
        stockQuantity: 50,
        inStock: true,
        images: ['image1.jpg', 'image2.jpg'],
        status: ProductStatus.ACTIVE,
        createdAt: product.createdAt,
      });
    });

    it('should handle null bonusPrice', async () => {
      const product = {
        ...createActiveProduct(),
        bonusPrice: null,
        category: mockCategory,
      };

      mockPrisma.product.findUnique.mockResolvedValue(product);

      const result = await service.getProductById(product.id);

      expect(result.bonusPrice).toBeUndefined();
    });

    it('should calculate inStock correctly', async () => {
      const inStockProduct = {
        ...createActiveProduct({ stockQuantity: 10 }),
        category: mockCategory,
      };
      const outOfStockProduct = {
        ...createOutOfStockProduct(),
        category: mockCategory,
      };

      mockPrisma.product.findUnique.mockResolvedValueOnce(inStockProduct);
      const inStock = await service.getProductById(inStockProduct.id);
      expect(inStock.inStock).toBe(true);

      mockPrisma.product.findUnique.mockResolvedValueOnce(outOfStockProduct);
      const outOfStock = await service.getProductById(outOfStockProduct.id);
      expect(outOfStock.inStock).toBe(false);
    });
  });
});
