import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, OrderStatus, ProductStatus } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';

@Injectable()
export class AdminStoreService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ Products ============

  async getProducts(
    page: number,
    limit: number,
    filters?: {
      search?: string;
      categoryId?: string;
      status?: string;
      minPrice?: number;
      maxPrice?: number;
    },
  ) {
    const where: Prisma.ProductWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.status) {
      where.status = filters.status as ProductStatus;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        price: Number(p.price),
        bonusPrice: p.bonusPrice ? Number(p.bonusPrice) : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    return {
      ...product,
      price: Number(product.price),
      bonusPrice: product.bonusPrice ? Number(product.bonusPrice) : null,
    };
  }

  async createProduct(
    dto: {
      name: string;
      description?: string;
      categoryId?: string;
      price: number;
      bonusPrice?: number;
      allowsPartialBonus?: boolean;
      stockQuantity: number;
      images?: string[];
      status?: string;
    },
    adminId: string,
  ) {
    if (!dto.description || dto.description.trim().length === 0) {
      throw new BadRequestException('Описание товара обязательно');
    }
    if (!dto.categoryId) {
      throw new BadRequestException('Категория товара обязательна');
    }

    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/(^-|-$)/g, '');

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        categoryId: dto.categoryId,
        price: dto.price,
        bonusPrice: dto.bonusPrice ?? null,
        allowsPartialBonus: dto.allowsPartialBonus ?? true,
        stockQuantity: dto.stockQuantity,
        images: dto.images || [],
        status: (dto.status as ProductStatus) || ProductStatus.DRAFT,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    await this.createAuditLog(adminId, 'CREATE', 'Product', product.id);

    return {
      ...product,
      price: Number(product.price),
      bonusPrice: product.bonusPrice ? Number(product.bonusPrice) : null,
    };
  }

  async updateProduct(
    id: string,
    dto: {
      name?: string;
      description?: string;
      categoryId?: string;
      price?: number;
      bonusPrice?: number;
      allowsPartialBonus?: boolean;
      stockQuantity?: number;
      images?: string[];
      status?: string;
    },
    adminId: string,
  ) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Товар не найден');
    }

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
      data.slug = dto.name
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.categoryId !== undefined) {
      if (!dto.categoryId) {
        throw new BadRequestException('Нельзя убрать категорию у товара');
      }
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.bonusPrice !== undefined) data.bonusPrice = dto.bonusPrice;
    if (dto.allowsPartialBonus !== undefined) data.allowsPartialBonus = dto.allowsPartialBonus;
    if (dto.stockQuantity !== undefined) data.stockQuantity = dto.stockQuantity;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.status !== undefined) data.status = dto.status as ProductStatus;

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    await this.createAuditLog(adminId, 'UPDATE', 'Product', product.id);

    return {
      ...product,
      price: Number(product.price),
      bonusPrice: product.bonusPrice ? Number(product.bonusPrice) : null,
    };
  }

  async deleteProduct(id: string, adminId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.DISCONTINUED },
    });

    await this.createAuditLog(adminId, 'DELETE', 'Product', id);
  }

  async getProductStats() {
    const [
      totalProducts,
      activeCount,
      draftCount,
      outOfStockCount,
      discontinuedCount,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
      this.prisma.product.count({ where: { status: ProductStatus.DRAFT } }),
      this.prisma.product.count({ where: { status: ProductStatus.OUT_OF_STOCK } }),
      this.prisma.product.count({ where: { status: ProductStatus.DISCONTINUED } }),
    ]);

    return {
      totalProducts,
      activeCount,
      draftCount,
      outOfStockCount,
      discontinuedCount,
    };
  }

  // ============ Categories ============

  async getCategories() {
    const categories = await this.prisma.productCategory.findMany({
      include: {
        children: {
          orderBy: { order: 'asc' },
        },
      },
      where: { parentId: null },
      orderBy: { order: 'asc' },
    });

    return categories;
  }

  async createCategory(
    dto: { name: string; slug?: string; parentId?: string; order?: number },
    adminId: string,
  ) {
    const slug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, '-')
        .replace(/(^-|-$)/g, '');

    const category = await this.prisma.productCategory.create({
      data: {
        name: dto.name,
        slug,
        parentId: dto.parentId || null,
        order: dto.order ?? 0,
      },
    });

    await this.createAuditLog(adminId, 'CREATE', 'ProductCategory', category.id);

    return category;
  }

  async updateCategory(
    id: string,
    dto: { name?: string; slug?: string; parentId?: string; order?: number },
    adminId: string,
  ) {
    const existing = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Категория не найдена');
    }

    const category = await this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId || null }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });

    await this.createAuditLog(adminId, 'UPDATE', 'ProductCategory', category.id);

    return category;
  }

  async deleteCategory(id: string, adminId: string) {
    const existing = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Категория не найдена');
    }

    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new BadRequestException(
        `Невозможно удалить категорию с ${productCount} привязанными товарами`,
      );
    }

    const childCount = await this.prisma.productCategory.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new BadRequestException(
        `Невозможно удалить категорию с ${childCount} подкатегориями`,
      );
    }

    await this.prisma.productCategory.delete({ where: { id } });

    await this.createAuditLog(adminId, 'DELETE', 'ProductCategory', id);
  }

  // ============ Orders ============

  async getOrders(
    page: number,
    limit: number,
    filters?: {
      status?: string;
      userId?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const where: Prisma.OrderWhereInput = {};

    if (filters?.status) {
      where.status = filters.status as OrderStatus;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        bonusAmountUsed: Number(o.bonusAmountUsed),
        items: o.items.map((item) => ({
          ...item,
          priceAtPurchase: Number(item.priceAtPurchase),
          bonusUsed: Number(item.bonusUsed),
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, images: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return {
      ...order,
      totalAmount: Number(order.totalAmount),
      bonusAmountUsed: Number(order.bonusAmountUsed),
      items: order.items.map((item) => ({
        ...item,
        priceAtPurchase: Number(item.priceAtPurchase),
        bonusUsed: Number(item.bonusUsed),
      })),
    };
  }

  async updateOrderStatus(
    id: string,
    dto: { status: string; trackingNumber?: string },
    adminId: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status as OrderStatus,
        ...(dto.trackingNumber !== undefined && {
          trackingNumber: dto.trackingNumber,
        }),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    await this.createAuditLog(adminId, 'UPDATE', 'Order', id);

    return {
      ...updated,
      totalAmount: Number(updated.totalAmount),
      bonusAmountUsed: Number(updated.bonusAmountUsed),
      items: updated.items.map((item) => ({
        ...item,
        priceAtPurchase: Number(item.priceAtPurchase),
        bonusUsed: Number(item.bonusUsed),
      })),
    };
  }

  async getOrderStats() {
    const [
      totalOrders,
      pendingCount,
      processingCount,
      shippedCount,
      deliveredCount,
      cancelledCount,
      totalRevenueResult,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.order.aggregate({
        where: { status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.PROCESSING] } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders,
      pendingCount,
      processingCount,
      shippedCount,
      deliveredCount,
      cancelledCount,
      totalRevenue: Number(totalRevenueResult._sum.totalAmount) || 0,
    };
  }

  // ============ Helpers ============

  private async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
        },
      });
    } catch {
      // Silently fail audit logging - don't break main operations
    }
  }
}
