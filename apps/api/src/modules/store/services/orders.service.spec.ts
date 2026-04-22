/**
 * OrdersService Unit Tests
 *
 * Tests for order management including:
 * - Order creation (checkout flow)
 * - Stock reservation
 * - Order cancellation with stock release
 * - Bonus restoration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethodType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { OrdersService } from './orders.service';
import { CartService } from './cart.service';
import { ProductsService } from './products.service';
import { PrismaService } from '../../../config/prisma.service';
import { PaymentsService } from '../../payments/payments.service';
import { BonusesService } from '../../bonuses/bonuses.service';
import { createMockUser } from '../../../../test/factories/user.factory';
import {
  createMockOrder,
  createPendingOrder,
  createPaidOrder,
  OrderStatus as FactoryOrderStatus,
  DEFAULT_SHIPPING_ADDRESS,
} from '../../../../test/factories/order.factory';
import { createActiveProduct } from '../../../../test/factories/product.factory';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: any;
  let mockCartService: any;
  let mockProductsService: any;
  let mockPaymentsService: any;
  let mockBonusesService: any;

  const mockUser = createMockUser();
  const userId = mockUser.id;

  beforeEach(async () => {
    mockPrisma = {
      order: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      orderItem: {
        createMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockCartService = {
      validateCartForCheckout: jest.fn(),
      getCart: jest.fn(),
      clearCart: jest.fn(),
      getCartDataForCheckout: jest.fn(),
    };

    mockProductsService = {
      reserveStock: jest.fn(),
      releaseStock: jest.fn(),
    };

    mockPaymentsService = {
      initiatePayment: jest.fn(),
    };

    mockBonusesService = {
      validateSpend: jest.fn(),
      earnBonuses: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CartService, useValue: mockCartService },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: BonusesService, useValue: mockBonusesService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const createOrderDto = {
      paymentMethod: PaymentMethodType.CARD,
      shippingAddress: DEFAULT_SHIPPING_ADDRESS,
    };

    const mockCart = {
      items: [
        {
          productId: 'prod-1',
          productName: 'Product 1',
          price: 1000,
          quantity: 2,
          totalPrice: 2000,
        },
        {
          productId: 'prod-2',
          productName: 'Product 2',
          price: 500,
          quantity: 1,
          totalPrice: 500,
        },
      ],
      totalAmount: 2500,
      maxBonusApplicable: 500,
    };

    beforeEach(() => {
      mockCartService.validateCartForCheckout.mockResolvedValue({
        valid: true,
        unavailableItems: [],
        stockIssues: [],
      });
      mockCartService.getCart.mockResolvedValue(mockCart);
      mockProductsService.reserveStock.mockResolvedValue(true);
      mockPaymentsService.initiatePayment.mockResolvedValue({
        transactionId: 'txn-123',
        status: TransactionStatus.PENDING,
        paymentUrl: 'https://payment.url',
      });
    });

    it('should create order from cart', async () => {
      const newOrder = { id: 'order-123', userId, status: OrderStatus.PENDING };

      mockPrisma.order.create.mockResolvedValue(newOrder);
      mockPrisma.orderItem.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.createOrder(userId, createOrderDto);

      expect(result.transactionId).toBe('txn-123');
      expect(mockCartService.clearCart).toHaveBeenCalledWith(userId);
    });

    it('should throw BadRequestException for empty cart', async () => {
      mockCartService.validateCartForCheckout.mockResolvedValue({
        valid: false,
        unavailableItems: [],
        stockIssues: [],
      });

      await expect(service.createOrder(userId, createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unavailable items', async () => {
      mockCartService.validateCartForCheckout.mockResolvedValue({
        valid: false,
        unavailableItems: ['prod-deleted'],
        stockIssues: [],
      });

      await expect(service.createOrder(userId, createOrderDto)).rejects.toThrow(
        'Some items are no longer available',
      );
    });

    it('should throw BadRequestException for stock issues', async () => {
      mockCartService.validateCartForCheckout.mockResolvedValue({
        valid: false,
        unavailableItems: [],
        stockIssues: [{ productId: 'prod-1', available: 1, requested: 10 }],
      });

      await expect(service.createOrder(userId, createOrderDto)).rejects.toThrow(
        'Some items have insufficient stock',
      );
    });

    it('should validate bonus amount', async () => {
      mockBonusesService.validateSpend.mockResolvedValue(false);

      await expect(
        service.createOrder(userId, { ...createOrderDto, bonusAmount: 300 }), // Within maxBonusApplicable (500)
      ).rejects.toThrow('Insufficient bonus balance');
    });

    it('should throw when bonus exceeds max applicable', async () => {
      await expect(
        service.createOrder(userId, {
          ...createOrderDto,
          bonusAmount: 1000, // Max is 500
        }),
      ).rejects.toThrow('Bonus amount exceeds maximum allowed');
    });

    it('should reserve stock for all items', async () => {
      mockPrisma.order.create.mockResolvedValue({ id: 'order-123' });
      mockPrisma.orderItem.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.createOrder(userId, createOrderDto);

      expect(mockProductsService.reserveStock).toHaveBeenCalledTimes(2);
      expect(mockProductsService.reserveStock).toHaveBeenCalledWith('prod-1', 2);
      expect(mockProductsService.reserveStock).toHaveBeenCalledWith('prod-2', 1);
    });

    it('should throw if stock reservation fails', async () => {
      mockProductsService.reserveStock
        .mockResolvedValueOnce(true) // First product OK
        .mockResolvedValueOnce(false); // Second product fails

      await expect(service.createOrder(userId, createOrderDto)).rejects.toThrow(
        'Failed to reserve stock for Product 2',
      );
    });

    it('should initiate payment with correct amount', async () => {
      mockPrisma.order.create.mockResolvedValue({ id: 'order-123' });
      mockPrisma.orderItem.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.createOrder(userId, createOrderDto);

      expect(mockPaymentsService.initiatePayment).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          amount: 2500,
          paymentMethod: PaymentMethodType.CARD,
          referenceId: 'order-123',
        }),
      );
    });

    it('should pass bonus amount to payment', async () => {
      mockBonusesService.validateSpend.mockResolvedValue(true);
      mockPrisma.order.create.mockResolvedValue({ id: 'order-123' });
      mockPrisma.orderItem.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.createOrder(userId, { ...createOrderDto, bonusAmount: 300 });

      expect(mockPaymentsService.initiatePayment).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          bonusAmount: 300,
        }),
      );
    });
  });

  describe('completeOrder', () => {
    it('should update order status to PAID', async () => {
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-123',
        status: OrderStatus.PAID,
      });

      await service.completeOrder('order-123');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { status: OrderStatus.PAID },
      });
    });
  });

  describe('getUserOrders', () => {
    it('should return paginated orders', async () => {
      const orders = [
        {
          id: 'order-1',
          userId,
          status: OrderStatus.PAID,
          totalAmount: new Decimal(2500),
          bonusAmountUsed: new Decimal(0),
          shippingAddress: DEFAULT_SHIPPING_ADDRESS,
          createdAt: new Date(),
          items: [
            {
              productId: 'prod-1',
              quantity: 2,
              priceAtPurchase: new Decimal(1000),
              bonusUsed: new Decimal(0),
              product: {
                name: 'Product 1',
                images: ['image.jpg'],
              },
            },
          ],
        },
      ];

      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findMany.mockResolvedValue(orders);

      const result = await service.getUserOrders(userId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.getUserOrders(userId, {
        status: OrderStatus.DELIVERED,
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.order.count).toHaveBeenCalledWith({
        where: { userId, status: OrderStatus.DELIVERED },
      });
    });

    it('should filter by date range', async () => {
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.getUserOrders(userId, {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.order.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId,
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        }),
      });
    });
  });

  describe('getOrderById', () => {
    it('should return order details', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.PAID,
        totalAmount: new Decimal(2500),
        bonusAmountUsed: new Decimal(100),
        shippingAddress: DEFAULT_SHIPPING_ADDRESS,
        trackingNumber: null,
        createdAt: new Date(),
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            priceAtPurchase: new Decimal(1000),
            bonusUsed: new Decimal(50),
            product: {
              name: 'Product 1',
              images: ['image.jpg'],
            },
          },
        ],
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);

      const result = await service.getOrderById(userId, 'order-123');

      expect(result.id).toBe('order-123');
      expect(result.totalAmount).toBe(2500);
      expect(result.bonusAmountUsed).toBe(100);
      expect(result.amountPaid).toBe(2400); // 2500 - 100
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrderById(userId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel pending order', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.PENDING,
        bonusAmountUsed: new Decimal(0),
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 1 },
        ],
      };
      const cancelledOrder = {
        ...order,
        status: OrderStatus.CANCELLED,
        items: order.items.map((item) => ({
          ...item,
          priceAtPurchase: new Decimal(1000),
          bonusUsed: new Decimal(0),
          product: { name: 'Product', images: [] },
        })),
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue(cancelledOrder);

      const result = await service.cancelOrder(userId, 'order-123');

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should cancel paid order', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.PAID,
        bonusAmountUsed: new Decimal(0),
        items: [{ productId: 'prod-1', quantity: 1 }],
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.CANCELLED,
        items: order.items.map((item) => ({
          ...item,
          priceAtPurchase: new Decimal(1000),
          bonusUsed: new Decimal(0),
          product: { name: 'Product', images: [] },
        })),
      });

      const result = await service.cancelOrder(userId, 'order-123');

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should release stock on cancellation', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.PENDING,
        bonusAmountUsed: new Decimal(0),
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 3 },
        ],
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.CANCELLED,
        items: order.items.map((item) => ({
          ...item,
          priceAtPurchase: new Decimal(1000),
          bonusUsed: new Decimal(0),
          product: { name: 'Product', images: [] },
        })),
      });

      await service.cancelOrder(userId, 'order-123');

      expect(mockProductsService.releaseStock).toHaveBeenCalledWith('prod-1', 2);
      expect(mockProductsService.releaseStock).toHaveBeenCalledWith('prod-2', 3);
    });

    it('should restore bonus on cancellation', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.PENDING,
        bonusAmountUsed: new Decimal(500),
        items: [{ productId: 'prod-1', quantity: 1 }],
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.CANCELLED,
        items: order.items.map((item) => ({
          ...item,
          priceAtPurchase: new Decimal(1000),
          bonusUsed: new Decimal(0),
          product: { name: 'Product', images: [] },
        })),
      });

      await service.cancelOrder(userId, 'order-123');

      expect(mockBonusesService.earnBonuses).toHaveBeenCalledWith({
        userId,
        amount: 500,
        source: 'REFUND',
        referenceId: 'order-123',
        referenceType: 'Order',
      });
    });

    it('should not restore bonus if none was used', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.PENDING,
        bonusAmountUsed: new Decimal(0),
        items: [{ productId: 'prod-1', quantity: 1 }],
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.CANCELLED,
        items: order.items.map((item) => ({
          ...item,
          priceAtPurchase: new Decimal(1000),
          bonusUsed: new Decimal(0),
          product: { name: 'Product', images: [] },
        })),
      });

      await service.cancelOrder(userId, 'order-123');

      expect(mockBonusesService.earnBonuses).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelOrder(userId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for shipped order', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.SHIPPED,
        items: [],
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);

      await expect(service.cancelOrder(userId, 'order-123')).rejects.toThrow(
        'Order cannot be cancelled',
      );
    });

    it('should throw BadRequestException for delivered order', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.DELIVERED,
        items: [],
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);

      await expect(service.cancelOrder(userId, 'order-123')).rejects.toThrow(
        'Order cannot be cancelled',
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status (admin)', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.PAID,
        totalAmount: new Decimal(2500),
        bonusAmountUsed: new Decimal(0),
        shippingAddress: DEFAULT_SHIPPING_ADDRESS,
        items: [],
        createdAt: new Date(),
      };

      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.SHIPPED,
        trackingNumber: 'TRACK123',
        items: [],
      });

      const result = await service.updateOrderStatus('order-123', {
        status: OrderStatus.SHIPPED,
        trackingNumber: 'TRACK123',
      });

      expect(result.status).toBe(OrderStatus.SHIPPED);
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('non-existent', { status: OrderStatus.SHIPPED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DTO Mapping', () => {
    it('should calculate amount paid correctly', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.PAID,
        totalAmount: new Decimal(1000),
        bonusAmountUsed: new Decimal(200),
        shippingAddress: DEFAULT_SHIPPING_ADDRESS,
        trackingNumber: null,
        createdAt: new Date(),
        items: [],
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);

      const result = await service.getOrderById(userId, 'order-123');

      expect(result.totalAmount).toBe(1000);
      expect(result.bonusAmountUsed).toBe(200);
      expect(result.amountPaid).toBe(800); // 1000 - 200
    });

    it('should include tracking number when present', async () => {
      const order = {
        id: 'order-123',
        userId,
        status: OrderStatus.SHIPPED,
        totalAmount: new Decimal(1000),
        bonusAmountUsed: new Decimal(0),
        shippingAddress: DEFAULT_SHIPPING_ADDRESS,
        trackingNumber: 'TRACK123456',
        createdAt: new Date(),
        items: [],
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);

      const result = await service.getOrderById(userId, 'order-123');

      expect(result.trackingNumber).toBe('TRACK123456');
    });
  });
});
