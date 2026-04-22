import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, TransactionType } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.service';
import { PaymentsService } from '../../payments/payments.service';
import { BonusesService } from '../../bonuses/bonuses.service';
import { CartService } from './cart.service';
import { ProductsService } from './products.service';
import {
  CreateOrderDto,
  OrderDto,
  OrderItemDto,
  OrderQueryDto,
  ShippingAddressDto,
  UpdateOrderStatusDto,
} from '../dto';
import { PaymentResultDto } from '../../payments/dto';

/** Order with included items and their products, as returned by Prisma findMany/findFirst */
type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } } };
}>;

/** Order item with included product */
type OrderItemWithProduct = OrderWithItems['items'][number];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
    private readonly paymentsService: PaymentsService,
    private readonly bonusesService: BonusesService,
  ) {}

  /**
   * Create an order from cart.
   */
  async createOrder(userId: string, dto: CreateOrderDto): Promise<PaymentResultDto> {
    // Validate cart
    const validation = await this.cartService.validateCartForCheckout(userId);

    if (!validation.valid) {
      if (validation.unavailableItems.length > 0) {
        throw new BadRequestException('Некоторые товары больше недоступны');
      }
      if (validation.stockIssues.length > 0) {
        throw new BadRequestException('Некоторых товаров нет в наличии');
      }
      throw new BadRequestException('Корзина пуста');
    }

    // Get cart data
    const cart = await this.cartService.getCart(userId);

    // Validate bonus amount
    const bonusAmount = dto.bonusAmount || 0;
    if (bonusAmount > 0) {
      if (bonusAmount > (cart.maxBonusApplicable || 0)) {
        throw new BadRequestException('Сумма бонусов превышает допустимую');
      }
      const isValid = await this.bonusesService.validateSpend(userId, bonusAmount);
      if (!isValid) {
        throw new BadRequestException('Недостаточно бонусов');
      }
    }

    // Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Reserve stock for all items
      for (const item of cart.items) {
        const reserved = await this.productsService.reserveStock(item.productId, item.quantity);
        if (!reserved) {
          throw new BadRequestException(`Не удалось зарезервировать товар ${item.productName}`);
        }
      }

      // Calculate totals
      const totalAmount = cart.totalAmount;

      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalAmount,
          bonusAmountUsed: bonusAmount,
          shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
        },
      });

      // Create order items
      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: item.price,
          bonusUsed: 0, // Could distribute bonus across items
        })),
      });

      // Log to audit
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_CREATED',
          entityType: 'Order',
          entityId: newOrder.id,
          newValue: {
            totalAmount,
            bonusUsed: bonusAmount,
            itemCount: cart.items.length,
          },
        },
      });

      return newOrder;
    });

    // Initiate payment
    const paymentResult = await this.paymentsService.initiatePayment(userId, {
      type: TransactionType.STORE,
      amount: cart.totalAmount,
      paymentMethod: dto.paymentMethod,
      bonusAmount,
      referenceId: order.id,
      returnUrl: dto.returnUrl,
      metadata: {
        orderId: order.id,
      },
    });

    // Clear cart after successful order creation
    await this.cartService.clearCart(userId);

    this.logger.log(`Order created: ${order.id} for user ${userId}`);

    return paymentResult;
  }

  /**
   * Complete an order after successful payment.
   */
  async completeOrder(orderId: string): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
    });

    this.logger.log(`Order completed: ${orderId}`);
  }

  /**
   * Get user's orders.
   */
  async getUserOrders(
    userId: string,
    query: OrderQueryDto,
  ): Promise<{ items: OrderDto[]; total: number; page: number; limit: number }> {
    const { status, fromDate, toDate, page = 1, limit = 20 } = query;

    const where: Prisma.OrderWhereInput = { userId };

    if (status) where.status = status;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: true },
          },
        },
      }),
    ]);

    return {
      items: orders.map((order) => this.mapToDto(order)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get order by ID.
   */
  async getOrderById(userId: string, orderId: string): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return this.mapToDto(order);
  }

  /**
   * Cancel an order.
   */
  async cancelOrder(userId: string, orderId: string): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    const cancelableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAID];
    if (!cancelableStatuses.includes(order.status)) {
      throw new BadRequestException('Заказ не может быть отменён');
    }

    // Release stock and update order in transaction
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Release stock for each item
      for (const item of order.items) {
        await this.productsService.releaseStock(item.productId, item.quantity);
      }

      // Restore bonus if used
      if (Number(order.bonusAmountUsed) > 0) {
        await this.bonusesService.earnBonuses({
          userId,
          amount: Number(order.bonusAmountUsed),
          source: 'REFUND',
          referenceId: orderId,
          referenceType: 'Order',
        });
      }

      // Update order status
      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: {
          items: {
            include: { product: true },
          },
        },
      });
    });

    this.logger.log(`Order cancelled: ${orderId}`);

    return this.mapToDto(updatedOrder);
  }

  /**
   * Update order status (admin).
   */
  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        trackingNumber: dto.trackingNumber,
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return this.mapToDto(updatedOrder);
  }

  /**
   * Map order to DTO.
   */
  private mapToDto(order: OrderWithItems): OrderDto {
    const items: OrderItemDto[] = order.items.map((item: OrderItemWithProduct) => ({
      productId: item.productId,
      productName: item.product.name,
      productImage: (item.product.images as string[])?.[0],
      quantity: item.quantity,
      priceAtPurchase: Number(item.priceAtPurchase),
      bonusUsed: Number(item.bonusUsed),
      total: Number(item.priceAtPurchase) * item.quantity - Number(item.bonusUsed),
    }));

    return {
      id: order.id,
      status: order.status,
      items,
      totalAmount: Number(order.totalAmount),
      bonusAmountUsed: Number(order.bonusAmountUsed),
      amountPaid: Number(order.totalAmount) - Number(order.bonusAmountUsed),
      shippingAddress: order.shippingAddress as unknown as ShippingAddressDto,
      trackingNumber: order.trackingNumber || undefined,
      createdAt: order.createdAt,
    };
  }
}
