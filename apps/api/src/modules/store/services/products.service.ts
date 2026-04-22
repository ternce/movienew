import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';
import { CacheService, CACHE_TTL } from '../../../common/cache/cache.service';
import {
  CreateProductDto,
  ProductCategoryDto,
  ProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from '../dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get products with filters and pagination.
   */
  async getProducts(
    query: ProductQueryDto,
  ): Promise<{ items: ProductDto[]; total: number; page: number; limit: number }> {
    const {
      search,
      categoryId,
      status = ProductStatus.ACTIVE,
      minPrice,
      maxPrice,
      inStock,
      sortBy = 'newest',
      page = 1,
      limit = 20,
    } = query;

    const cacheKey = `store:products:${CacheService.createKeyFromParams({
      search, categoryId, status, minPrice, maxPrice, inStock, sortBy, page, limit,
    })}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const where: Prisma.ProductWhereInput = { status };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (categoryId) where.categoryId = categoryId;

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
      }

      if (inStock) where.stockQuantity = { gt: 0 };

      // Determine sort order
      let orderBy: Prisma.ProductOrderByWithRelationInput;
      switch (sortBy) {
        case 'price_asc':
          orderBy = { price: 'asc' };
          break;
        case 'price_desc':
          orderBy = { price: 'desc' };
          break;
        case 'name':
          orderBy = { name: 'asc' };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }

      const [total, products] = await Promise.all([
        this.prisma.product.count({ where }),
        this.prisma.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
          include: { category: true },
        }),
      ]);

      return {
        items: products.map((p) => this.mapToDto(p)),
        total,
        page,
        limit,
      };
    }, { ttl: CACHE_TTL.DEFAULT });
  }

  /**
   * Get product by ID.
   */
  async getProductById(productId: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    return this.mapToDto(product);
  }

  /**
   * Get product by slug.
   */
  async getProductBySlug(slug: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    return this.mapToDto(product);
  }

  /**
   * Get all product categories.
   */
  async getCategories(): Promise<ProductCategoryDto[]> {
    return this.cache.getOrSet('store:categories', async () => {
      const categories = await this.prisma.productCategory.findMany({
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      });

      return categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId || undefined,
        order: c.order,
      }));
    }, { ttl: CACHE_TTL.LONG });
  }

  /**
   * Create a new product (admin).
   */
  async createProduct(dto: CreateProductDto): Promise<ProductDto> {
    const slug = this.generateSlug(dto.name);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        categoryId: dto.categoryId,
        price: dto.price,
        bonusPrice: dto.bonusPrice,
        allowsPartialBonus: dto.allowsPartialBonus ?? true,
        stockQuantity: dto.stockQuantity,
        images: dto.images || [],
        status: ProductStatus.DRAFT,
      },
      include: { category: true },
    });

    await this.cache.invalidatePattern('store:*');
    return this.mapToDto(product);
  }

  /**
   * Update a product (admin).
   */
  async updateProduct(productId: string, dto: UpdateProductDto): Promise<ProductDto> {
    const existing = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing) {
      throw new NotFoundException('Товар не найден');
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        price: dto.price,
        bonusPrice: dto.bonusPrice,
        allowsPartialBonus: dto.allowsPartialBonus,
        stockQuantity: dto.stockQuantity,
        images: dto.images,
        status: dto.status,
      },
      include: { category: true },
    });

    await this.cache.invalidatePattern('store:*');
    return this.mapToDto(product);
  }

  /**
   * Check stock availability.
   */
  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true, status: true },
    });

    return (
      product !== null &&
      product.status === ProductStatus.ACTIVE &&
      product.stockQuantity >= quantity
    );
  }

  /**
   * Reserve stock (optimistic locking).
   */
  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    const result = await this.prisma.product.updateMany({
      where: {
        id: productId,
        stockQuantity: { gte: quantity },
        status: ProductStatus.ACTIVE,
      },
      data: {
        stockQuantity: { decrement: quantity },
      },
    });

    return result.count > 0;
  }

  /**
   * Release reserved stock (on order cancellation).
   */
  async releaseStock(productId: string, quantity: number): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: { increment: quantity },
      },
    });
  }

  /**
   * Map product to DTO.
   */
  private mapToDto(product: any): ProductDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        parentId: product.category.parentId || undefined,
        order: product.category.order,
      },
      price: Number(product.price),
      bonusPrice: product.bonusPrice ? Number(product.bonusPrice) : undefined,
      allowsPartialBonus: product.allowsPartialBonus,
      stockQuantity: product.stockQuantity,
      inStock: product.stockQuantity > 0,
      images: (product.images as string[]) || [],
      status: product.status,
      createdAt: product.createdAt,
    };
  }

  /**
   * Generate a URL-friendly slug.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[а-яё]/g, (char) => {
        const map: Record<string, string> = {
          а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
          з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
          п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
          ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
          я: 'ya',
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);
  }
}
