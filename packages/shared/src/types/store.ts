// Product status
export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

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

// Product
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  price: number;
  bonusPrice?: number; // Full price in bonuses
  allowsPartialBonus: boolean;
  stockQuantity: number;
  images: string[];
  status: ProductStatus;
  createdAt: Date;
}

// Product category
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  order: number;
}

// Shipping address
export interface ShippingAddress {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  building: string;
  apartment?: string;
  postalCode: string;
}

// Order
export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  bonusAmountUsed: number;
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  createdAt: Date;
}

// Order item
export interface OrderItem {
  orderId: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  bonusUsed: number;
}

// Cart item (client-side or session-based)
export interface CartItem {
  productId: string;
  quantity: number;
}
