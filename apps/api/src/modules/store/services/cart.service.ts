import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import Redis from 'ioredis';

import { PrismaService } from '../../../config/prisma.service';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { AddToCartDto, CartDto, CartItemDto, CartSummaryDto, UpdateCartItemDto } from '../dto';
import { ProductStatus } from '@prisma/client';

interface CartData {
  items: Array<{ productId: string; quantity: number }>;
  updatedAt: string;
}

const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const CART_KEY_PREFIX = 'cart:';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Get user's cart.
   */
  async getCart(userId: string): Promise<CartDto> {
    const cartData = await this.getCartData(userId);

    if (cartData.items.length === 0) {
      return {
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalAmount: 0,
        maxBonusApplicable: 0,
        updatedAt: new Date(cartData.updatedAt),
      };
    }

    // Fetch product details
    const productIds = cartData.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Build cart items
    const items: CartItemDto[] = [];
    let totalAmount = 0;
    let maxBonusApplicable = 0;
    let totalQuantity = 0;

    for (const cartItem of cartData.items) {
      const product = productMap.get(cartItem.productId);
      if (!product) continue;

      const itemTotal = Number(product.price) * cartItem.quantity;
      totalAmount += itemTotal;
      totalQuantity += cartItem.quantity;

      // Calculate max bonus for this item
      if (product.allowsPartialBonus && product.bonusPrice) {
        maxBonusApplicable += Number(product.bonusPrice) * cartItem.quantity;
      }

      items.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        productImage: (product.images as string[])?.[0],
        price: Number(product.price),
        bonusPrice: product.bonusPrice ? Number(product.bonusPrice) : undefined,
        quantity: cartItem.quantity,
        totalPrice: itemTotal,
        inStock: product.stockQuantity > 0 && product.status === ProductStatus.ACTIVE,
        availableQuantity: product.stockQuantity,
      });
    }

    return {
      items,
      itemCount: items.length,
      totalQuantity,
      totalAmount,
      maxBonusApplicable,
      updatedAt: new Date(cartData.updatedAt),
    };
  }

  /**
   * Get cart summary (for header).
   */
  async getCartSummary(userId: string): Promise<CartSummaryDto> {
    const cartData = await this.getCartData(userId);

    if (cartData.items.length === 0) {
      return { itemCount: 0, totalAmount: 0 };
    }

    // Fetch product prices
    const productIds = cartData.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true },
    });

    const priceMap = new Map(products.map((p) => [p.id, Number(p.price)]));

    let totalAmount = 0;
    for (const item of cartData.items) {
      const price = priceMap.get(item.productId) || 0;
      totalAmount += price * item.quantity;
    }

    return {
      itemCount: cartData.items.length,
      totalAmount,
    };
  }

  /**
   * Add item to cart.
   */
  async addToCart(userId: string, dto: AddToCartDto): Promise<CartDto> {
    // Validate product exists and has stock
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, stockQuantity: true, status: true },
    });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Товар недоступен');
    }

    const cartData = await this.getCartData(userId);
    const existingItem = cartData.items.find((item) => item.productId === dto.productId);

    const newQuantity = existingItem
      ? existingItem.quantity + dto.quantity
      : dto.quantity;

    if (newQuantity > product.stockQuantity) {
      throw new BadRequestException('Нет в наличии');
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
    } else {
      cartData.items.push({ productId: dto.productId, quantity: dto.quantity });
    }

    cartData.updatedAt = new Date().toISOString();
    await this.saveCartData(userId, cartData);

    return this.getCart(userId);
  }

  /**
   * Update cart item quantity.
   */
  async updateCartItem(userId: string, dto: UpdateCartItemDto): Promise<CartDto> {
    const cartData = await this.getCartData(userId);
    const itemIndex = cartData.items.findIndex((item) => item.productId === dto.productId);

    if (itemIndex === -1) {
      throw new BadRequestException('Товар не в корзине');
    }

    if (dto.quantity === 0) {
      // Remove item
      cartData.items.splice(itemIndex, 1);
    } else {
      // Validate stock
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: { stockQuantity: true },
      });

      if (!product || dto.quantity > product.stockQuantity) {
        throw new BadRequestException('Нет в наличии');
      }

      cartData.items[itemIndex].quantity = dto.quantity;
    }

    cartData.updatedAt = new Date().toISOString();
    await this.saveCartData(userId, cartData);

    return this.getCart(userId);
  }

  /**
   * Remove item from cart.
   */
  async removeFromCart(userId: string, productId: string): Promise<CartDto> {
    const cartData = await this.getCartData(userId);
    cartData.items = cartData.items.filter((item) => item.productId !== productId);
    cartData.updatedAt = new Date().toISOString();

    await this.saveCartData(userId, cartData);
    return this.getCart(userId);
  }

  /**
   * Clear entire cart.
   */
  async clearCart(userId: string): Promise<void> {
    await this.redis.del(CART_KEY_PREFIX + userId);
  }

  /**
   * Validate cart items are still available for checkout.
   */
  async validateCartForCheckout(userId: string): Promise<{
    valid: boolean;
    unavailableItems: string[];
    stockIssues: Array<{ productId: string; available: number; requested: number }>;
  }> {
    const cartData = await this.getCartData(userId);

    if (cartData.items.length === 0) {
      return { valid: false, unavailableItems: [], stockIssues: [] };
    }

    const productIds = cartData.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stockQuantity: true, status: true, name: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const unavailableItems: string[] = [];
    const stockIssues: Array<{ productId: string; available: number; requested: number }> = [];

    for (const item of cartData.items) {
      const product = productMap.get(item.productId);

      if (!product || product.status !== ProductStatus.ACTIVE) {
        unavailableItems.push(item.productId);
      } else if (product.stockQuantity < item.quantity) {
        stockIssues.push({
          productId: item.productId,
          available: product.stockQuantity,
          requested: item.quantity,
        });
      }
    }

    return {
      valid: unavailableItems.length === 0 && stockIssues.length === 0,
      unavailableItems,
      stockIssues,
    };
  }

  /**
   * Get raw cart data for checkout.
   */
  async getCartDataForCheckout(userId: string): Promise<CartData> {
    return this.getCartData(userId);
  }

  // ============ Private Helper Methods ============

  private async getCartData(userId: string): Promise<CartData> {
    const key = CART_KEY_PREFIX + userId;
    const data = await this.redis.get(key);

    if (!data) {
      return { items: [], updatedAt: new Date().toISOString() };
    }

    try {
      return JSON.parse(data) as CartData;
    } catch {
      this.logger.warn(`Invalid cart data for user ${userId}`);
      return { items: [], updatedAt: new Date().toISOString() };
    }
  }

  private async saveCartData(userId: string, data: CartData): Promise<void> {
    const key = CART_KEY_PREFIX + userId;
    await this.redis.setex(key, CART_TTL, JSON.stringify(data));
  }
}
