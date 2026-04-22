'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type {
  TaxCalculation,
  TaxStatus,
  Withdrawal,
  WithdrawalList,
  WithdrawalQueryParams,
  CreateWithdrawalRequest,
  SavedPaymentMethod,
} from '@/types';

// ============ Hooks ============

/**
 * Hook to fetch withdrawals list
 */
export function useWithdrawals(params?: WithdrawalQueryParams) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.partners.withdrawals(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<WithdrawalList>(endpoints.partners.withdrawals, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch a single withdrawal
 */
export function useWithdrawal(id: string | undefined) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.partners.withdrawal(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Withdrawal ID required');
      const response = await api.get<Withdrawal>(endpoints.partners.withdrawal(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated,
  });
}

/**
 * Hook to preview tax calculation
 */
export function useTaxPreview(amount: number, taxStatus: TaxStatus) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.partners.taxPreview(amount, taxStatus),
    queryFn: async () => {
      const response = await api.get<TaxCalculation>(endpoints.partners.taxPreview, {
        params: { amount, taxStatus },
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && amount > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - tax rates don't change often
  });
}

/**
 * Hook to fetch saved payment methods
 */
export function usePaymentMethods() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.partners.paymentMethods(),
    queryFn: async () => {
      const response = await api.get<SavedPaymentMethod[]>(endpoints.partners.paymentMethods);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new withdrawal
 */
export function useCreateWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWithdrawalRequest) => {
      const response = await api.post<Withdrawal>(endpoints.partners.createWithdrawal, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.withdrawals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.dashboard() });

      toast.success('Заявка на вывод успешно создана');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать заявку на вывод');
    },
  });
}

/**
 * Hook to add a payment method
 */
export function useAddPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { type: 'card' | 'bank_account'; details: Record<string, string> }) => {
      const response = await api.post<SavedPaymentMethod>(endpoints.partners.addPaymentMethod, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.paymentMethods() });
      toast.success('Способ оплаты добавлен');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось добавить способ оплаты');
    },
  });
}

/**
 * Hook to delete a payment method
 */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(endpoints.partners.deletePaymentMethod(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.paymentMethods() });
      toast.success('Способ оплаты удален');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось удалить способ оплаты');
    },
  });
}
