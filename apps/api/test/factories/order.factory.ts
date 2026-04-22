/**
 * Order Factory for Tests
 *
 * Generates test order and order item data for store module testing.
 */

import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { MockProduct } from './product.factory';

// Order status
export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface MockOrder {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: Prisma.Decimal;
  bonusAmountUsed: Prisma.Decimal;
  shippingAddress: ShippingAddress;
  trackingNumber: string | null;
  notes: string | null;
  transactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceAtPurchase: Prisma.Decimal;
  bonusUsed: Prisma.Decimal;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderOptions {
  id?: string;
  userId?: string;
  status?: OrderStatus;
  totalAmount?: number;
  bonusAmountUsed?: number;
  shippingAddress?: Partial<ShippingAddress>;
  trackingNumber?: string | null;
  notes?: string | null;
  transactionId?: string | null;
}

export interface CreateOrderItemOptions {
  id?: string;
  orderId?: string;
  productId?: string;
  quantity?: number;
  priceAtPurchase?: number;
  bonusUsed?: number;
}

/**
 * Default shipping address for tests
 */
export const DEFAULT_SHIPPING_ADDRESS: ShippingAddress = {
  fullName: 'Test User',
  phone: '+79001234567',
  address: 'Test Street 123',
  city: 'Moscow',
  postalCode: '123456',
  country: 'Russia',
};

/**
 * Create a mock order
 */
export function createMockOrder(options: CreateOrderOptions = {}): MockOrder {
  const id = options.id || uuidv4();
  const now = new Date();

  return {
    id,
    userId: options.userId || uuidv4(),
    status: options.status || OrderStatus.PENDING,
    totalAmount: new Prisma.Decimal(options.totalAmount ?? 1999),
    bonusAmountUsed: new Prisma.Decimal(options.bonusAmountUsed ?? 0),
    shippingAddress: {
      ...DEFAULT_SHIPPING_ADDRESS,
      ...options.shippingAddress,
    },
    trackingNumber: options.trackingNumber ?? null,
    notes: options.notes ?? null,
    transactionId: options.transactionId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a pending order
 */
export function createPendingOrder(
  userId: string,
  totalAmount: number = 1999,
): MockOrder {
  return createMockOrder({
    userId,
    status: OrderStatus.PENDING,
    totalAmount,
  });
}

/**
 * Create a paid order
 */
export function createPaidOrder(
  userId: string,
  totalAmount: number = 1999,
  transactionId?: string,
): MockOrder {
  return createMockOrder({
    userId,
    status: OrderStatus.PAID,
    totalAmount,
    transactionId: transactionId || uuidv4(),
  });
}

/**
 * Create a shipped order
 */
export function createShippedOrder(
  userId: string,
  trackingNumber: string = 'TRACK123456',
): MockOrder {
  return createMockOrder({
    userId,
    status: OrderStatus.SHIPPED,
    trackingNumber,
    transactionId: uuidv4(),
  });
}

/**
 * Create a cancelled order
 */
export function createCancelledOrder(userId: string): MockOrder {
  return createMockOrder({
    userId,
    status: OrderStatus.CANCELLED,
  });
}

/**
 * Create an order with bonus used
 */
export function createOrderWithBonus(
  userId: string,
  totalAmount: number,
  bonusAmount: number,
): MockOrder {
  return createMockOrder({
    userId,
    status: OrderStatus.PENDING,
    totalAmount,
    bonusAmountUsed: bonusAmount,
  });
}

/**
 * Create a mock order item
 */
export function createMockOrderItem(options: CreateOrderItemOptions = {}): MockOrderItem {
  const id = options.id || uuidv4();
  const now = new Date();

  return {
    id,
    orderId: options.orderId || uuidv4(),
    productId: options.productId || uuidv4(),
    quantity: options.quantity ?? 1,
    priceAtPurchase: new Prisma.Decimal(options.priceAtPurchase ?? 999),
    bonusUsed: new Prisma.Decimal(options.bonusUsed ?? 0),
    createdAt: now,
  };
}

/**
 * Create order items from products
 */
export function createOrderItemsFromProducts(
  orderId: string,
  products: MockProduct[],
  quantities?: number[],
): MockOrderItem[] {
  return products.map((product, index) => {
    const quantity = quantities?.[index] ?? 1;
    return createMockOrderItem({
      orderId,
      productId: product.id,
      quantity,
      priceAtPurchase: Number(product.price),
    });
  });
}

/**
 * Create a complete order with items
 */
export function createOrderWithItems(
  userId: string,
  items: Array<{ product: MockProduct; quantity: number }>,
  bonusAmount: number = 0,
): { order: MockOrder; orderItems: MockOrderItem[] } {
  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  const order = createMockOrder({
    userId,
    totalAmount,
    bonusAmountUsed: bonusAmount,
  });

  const orderItems = items.map((item) =>
    createMockOrderItem({
      orderId: order.id,
      productId: item.product.id,
      quantity: item.quantity,
      priceAtPurchase: Number(item.product.price),
    }),
  );

  return { order, orderItems };
}

/**
 * Calculate total amount for cart items
 */
export function calculateCartTotal(
  items: CartItem[],
  products: Map<string, MockProduct>,
): number {
  return items.reduce((total, item) => {
    const product = products.get(item.productId);
    if (product) {
      return total + Number(product.price) * item.quantity;
    }
    return total;
  }, 0);
}

/**
 * Create cart data structure (as stored in Redis)
 */
export function createCartData(items: CartItem[]): { items: CartItem[]; updatedAt: string } {
  return {
    items,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create multiple orders for testing order history
 */
export function createOrderHistory(
  userId: string,
  count: number = 5,
): MockOrder[] {
  const statuses = [
    OrderStatus.DELIVERED,
    OrderStatus.SHIPPED,
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
    OrderStatus.PENDING,
  ];

  const orders: MockOrder[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = count - i;
    const order = createMockOrder({
      userId,
      status: statuses[i % statuses.length],
      totalAmount: (i + 1) * 500,
    });
    // Backdate the order
    order.createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    orders.push(order);
  }

  return orders;
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(status: OrderStatus): boolean {
  return [OrderStatus.PENDING, OrderStatus.PAID].includes(status);
}

/**
 * Order factory object with all creation methods
 */
export const orderFactory = {
  create: createMockOrder,
  createPending: createPendingOrder,
  createPaid: createPaidOrder,
  createShipped: createShippedOrder,
  createCancelled: createCancelledOrder,
  createWithBonus: createOrderWithBonus,
  createItem: createMockOrderItem,
  createItemsFromProducts: createOrderItemsFromProducts,
  createOrderWithItems,
  calculateCartTotal,
  createCartData,
  createOrderHistory,
  canCancelOrder,
  DEFAULT_SHIPPING_ADDRESS,
};

export default orderFactory;
