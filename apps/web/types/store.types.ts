import type { OrderStatus, ProductStatus } from '@movie-platform/shared';
import type { PaymentMethodType } from '@/types';

// =============================================================================
// Product Types
// =============================================================================

export interface StoreProductDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: StoreCategoryDto;
  price: number;
  bonusPrice?: number;
  allowsPartialBonus: boolean;
  stockQuantity: number;
  inStock: boolean;
  images: string[];
  status: ProductStatus;
  createdAt: string;
}

export interface StoreCategoryDto {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  order: number;
}

// =============================================================================
// Cart Types
// =============================================================================

export interface CartDto {
  items: CartItemDto[];
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  maxBonusApplicable: number;
  updatedAt: string;
}

export interface CartItemDto {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  price: number;
  bonusPrice?: number;
  quantity: number;
  totalPrice: number;
  inStock: boolean;
  availableQuantity: number;
}

export interface CartSummaryDto {
  itemCount: number;
  totalAmount: number;
}

// =============================================================================
// Order Types
// =============================================================================

export interface OrderDto {
  id: string;
  status: OrderStatus;
  items: OrderItemDto[];
  totalAmount: number;
  bonusAmountUsed: number;
  amountPaid: number;
  shippingAddress: ShippingAddressDto;
  trackingNumber?: string;
  createdAt: string;
}

export interface OrderItemDto {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  priceAtPurchase: number;
  bonusUsed: number;
  total: number;
}

export interface ShippingAddressDto {
  fullName: string;
  phone: string;
  postalCode: string;
  city: string;
  address: string;
  instructions?: string;
}

// =============================================================================
// Query / Request Types
// =============================================================================

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'price' | 'name' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: OrderStatus | string;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CreateOrderRequest {
  shippingAddress: ShippingAddressDto;
  paymentMethod: PaymentMethodType;
  bonusAmount?: number;
  returnUrl?: string;
}
