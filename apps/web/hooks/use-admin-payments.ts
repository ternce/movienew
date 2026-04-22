'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Types ============

export interface AdminTransaction {
  id: string;
  userId: string;
  userEmail: string;
  type: 'SUBSCRIPTION' | 'STORE' | 'BONUS_PURCHASE' | 'WITHDRAWAL';
  amount: number;
  currency: string;
  bonusUsed: number;
  paymentMethod: string;
  externalId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTransactionQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedTransactions {
  items: AdminTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminPaymentStats {
  totalRevenue: number;
  monthlyRevenue: number;
  transactionCount: number;
  refundCount: number;
  averageTransaction: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
}

// ============ Transaction Queries ============

/**
 * Hook to fetch admin transactions
 */
export function useAdminTransactions(params?: AdminTransactionQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPayments.transactions(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<PaginatedTransactions>(endpoints.adminPayments.transactions, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch single transaction detail
 */
export function useAdminTransaction(id: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPayments.transaction(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Transaction ID required');
      const response = await api.get<AdminTransaction>(endpoints.adminPayments.transaction(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
  });
}

/**
 * Hook to refund a transaction
 */
export function useRefundTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; message: string }>(
        endpoints.adminPayments.refund(id)
      );
      return response.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPayments.transactions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPayments.transaction(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPayments.stats() });
      toast.success('Транзакция возвращена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось выполнить возврат');
    },
  });
}

/**
 * Hook to fetch admin payment stats
 */
export function useAdminPaymentStats() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPayments.stats(),
    queryFn: async () => {
      const response = await api.get<AdminPaymentStats>(endpoints.adminPayments.stats);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 60 * 1000, // 1 minute
  });
}
