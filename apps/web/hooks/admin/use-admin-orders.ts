'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Order Types ============

export interface AdminOrder {
  id: string;
  userId: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  totalAmount: number;
  bonusAmountUsed: number;
  shippingAddress: Record<string, unknown> | null;
  trackingNumber: string | null;
  items: AdminOrderItem[];
  createdAt: string;
}

export interface AdminOrderItem {
  orderId: string;
  productId: string;
  product: { id: string; name: string; slug: string; images?: string[] };
  quantity: number;
  priceAtPurchase: number;
  bonusUsed: number;
}

export interface AdminOrderQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedOrders {
  items: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderStats {
  totalOrders: number;
  pendingCount: number;
  processingCount: number;
  shippedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalRevenue: number;
}

// ============ Order Queries ============

/**
 * Hook to fetch admin orders list
 */
export function useAdminOrders(params?: AdminOrderQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminStore.orders(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<PaginatedOrders>(endpoints.adminStore.orders, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch admin order detail
 */
export function useAdminOrderDetail(id: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminStore.order(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Order ID required');
      const response = await api.get<AdminOrder>(endpoints.adminStore.order(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch admin order stats
 */
export function useAdminOrderStats() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminStore.orderStats(),
    queryFn: async () => {
      const response = await api.get<OrderStats>(endpoints.adminStore.orderStats);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============ Order Mutations ============

/**
 * Hook to update order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.patch<AdminOrder>(
        endpoints.adminStore.orderStatus(id),
        { status }
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStore.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStore.order(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStore.orderStats() });
      toast.success('Статус заказа обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить статус заказа');
    },
  });
}
