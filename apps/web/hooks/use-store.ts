'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type { PaginatedList, PaymentResult } from '@/types';
import type {
  StoreProductDto,
  StoreCategoryDto,
  CartDto,
  CartSummaryDto,
  OrderDto,
  ProductQueryParams,
  OrderQueryParams,
  AddToCartRequest,
  UpdateCartItemRequest,
  CreateOrderRequest,
} from '@/types/store.types';

// =============================================================================
// Product Queries
// =============================================================================

export function useStoreProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: queryKeys.store.products(params as Record<string, unknown>),
    queryFn: async () => {
      const response = await api.get<PaginatedList<StoreProductDto>>(
        endpoints.store.products,
        { params: params as Record<string, string | number | boolean | undefined | null> },
      );
      return response.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useStoreCategories() {
  return useQuery({
    queryKey: queryKeys.store.categories(),
    queryFn: async () => {
      const response = await api.get<StoreCategoryDto[]>(endpoints.store.categories);
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useStoreProduct(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.store.product(slug || ''),
    queryFn: async () => {
      if (!slug) throw new Error('Slug required');
      const response = await api.get<StoreProductDto>(endpoints.store.productBySlug(slug));
      return response.data;
    },
    enabled: !!slug,
  });
}

// =============================================================================
// Cart Queries
// =============================================================================

export function useCart() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.store.cart(),
    queryFn: async () => {
      const response = await api.get<CartDto>(endpoints.store.cart);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 30 * 1000,
  });
}

export function useCartSummary() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.store.cartSummary(),
    queryFn: async () => {
      const response = await api.get<CartSummaryDto>(endpoints.store.cartSummary);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 10 * 1000,
  });
}

// =============================================================================
// Cart Mutations
// =============================================================================

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddToCartRequest) => {
      const response = await api.post<CartDto>(endpoints.store.cartItems, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cart() });
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cartSummary() });
      toast.success('Товар добавлен в корзину');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось добавить товар в корзину');
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const response = await api.put<CartDto>(
        endpoints.store.cartItem(productId),
        { quantity } as UpdateCartItemRequest,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cart() });
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cartSummary() });
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить количество');
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await api.delete<void>(endpoints.store.cartItem(productId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cart() });
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cartSummary() });
      toast.success('Товар удалён из корзины');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось удалить товар');
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete<void>(endpoints.store.cart);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cart() });
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cartSummary() });
      toast.success('Корзина очищена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось очистить корзину');
    },
  });
}

// =============================================================================
// Order Queries
// =============================================================================

export function useOrders(params?: OrderQueryParams) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.store.orders(params as Record<string, unknown>),
    queryFn: async () => {
      const response = await api.get<PaginatedList<OrderDto>>(
        endpoints.store.orders,
        { params: params as Record<string, string | number | boolean | undefined | null> },
      );
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string | undefined) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.store.order(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Order ID required');
      const response = await api.get<OrderDto>(endpoints.store.order(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated,
  });
}

// =============================================================================
// Order Mutations
// =============================================================================

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderRequest) => {
      const response = await api.post<PaymentResult & { orderId: string }>(
        endpoints.store.orders,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cart() });
      queryClient.invalidateQueries({ queryKey: queryKeys.store.cartSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.store.orders() });
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать заказ');
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post<OrderDto>(endpoints.store.cancelOrder(orderId));
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.store.order(data.id) });
      toast.success('Заказ отменён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отменить заказ');
    },
  });
}
