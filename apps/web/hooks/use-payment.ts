'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type {
  InitiatePaymentRequest,
  PaymentResult,
  PaymentStatus,
  Transaction,
  TransactionQueryParams,
  RefundRequest,
  PaginatedList,
} from '@/types';

/**
 * Hook to poll payment status until completion
 * Polls every 3 seconds while status is PENDING
 */
export function usePaymentStatus(transactionId: string | undefined) {
  const queryClient = useQueryClient();
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  const query = useQuery({
    queryKey: queryKeys.payments.status(transactionId || ''),
    queryFn: async () => {
      if (!transactionId) throw new Error('Transaction ID required');
      const response = await api.get<PaymentStatus>(
        endpoints.payments.status(transactionId),
      );
      return response.data;
    },
    enabled: !!transactionId,
    staleTime: 0, // Always fetch fresh data when polling
  });

  // Set up polling while payment is pending
  useEffect(() => {
    if (query.data?.status === 'PENDING') {
      pollIntervalRef.current = setInterval(() => {
        query.refetch();
      }, 3000); // Poll every 3 seconds
    } else {
      // Clear polling when status changes
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Show toast for final status
      if (query.data?.status === 'COMPLETED') {
        toast.success('Платёж успешно выполнен!');
        queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.bonuses.all });
      } else if (query.data?.status === 'FAILED') {
        toast.error('Платёж не удался. Попробуйте ещё раз.');
      } else if (query.data?.status === 'CANCELLED') {
        toast.error('Платёж был отменён.');
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [query.data?.status, query.refetch, queryClient]);

  return {
    status: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isPending: query.data?.status === 'PENDING',
    isCompleted: query.data?.status === 'COMPLETED',
    isFailed: query.data?.status === 'FAILED',
    isCancelled: query.data?.status === 'CANCELLED',
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch transaction history
 */
export function useTransactionHistory(params?: TransactionQueryParams) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.payments.transactions(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      // Convert params to the expected API format
      const apiParams: Record<string, string | number | boolean | undefined | null> | undefined = params
        ? {
            type: params.type,
            status: params.status,
            fromDate: params.fromDate,
            toDate: params.toDate,
            page: params.page,
            limit: params.limit,
          }
        : undefined;

      const response = await api.get<PaginatedList<Transaction>>(
        endpoints.payments.transactions,
        { params: apiParams },
      );
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
  });
}

/**
 * Hook to initiate a payment
 */
export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InitiatePaymentRequest) => {
      const response = await api.post<PaymentResult>(endpoints.payments.initiate, data);
      return response.data;
    },
    onSuccess: (data) => {
      // If payment completed immediately (bonus covered full amount)
      if (data.status === 'COMPLETED') {
        toast.success('Платёж успешно выполнен!');
        queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.bonuses.all });
      }
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось инициировать платёж');
    },
  });
}

/**
 * Hook to request a refund
 */
export function useRequestRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RefundRequest) => {
      const response = await api.post<Transaction>(endpoints.payments.refund, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Возврат обработан');
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bonuses.all });
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обработать возврат');
    },
  });
}

/**
 * Combined hook for payment operations
 */
export function usePayment() {
  const initiateMutation = useInitiatePayment();
  const refundMutation = useRequestRefund();

  return {
    // Initiate payment
    initiatePayment: initiateMutation.mutate,
    initiatePaymentAsync: initiateMutation.mutateAsync,
    isInitiating: initiateMutation.isPending,
    paymentResult: initiateMutation.data,
    initiateError: initiateMutation.error,

    // Refund
    requestRefund: refundMutation.mutate,
    requestRefundAsync: refundMutation.mutateAsync,
    isRefunding: refundMutation.isPending,
    refundResult: refundMutation.data,
    refundError: refundMutation.error,
  };
}

/**
 * Helper function to get redirect URL for payment
 * Redirects user to payment provider page
 */
export function handlePaymentRedirect(paymentResult: PaymentResult) {
  if (paymentResult.redirectUrl) {
    // Card payments via YooKassa
    window.location.href = paymentResult.redirectUrl;
  } else if (paymentResult.qrCodeUrl) {
    // SBP payments - QR code is displayed in the UI
    return { type: 'QR' as const, url: paymentResult.qrCodeUrl };
  } else if (paymentResult.bankDetails) {
    // Bank transfer - details are displayed in the UI
    return { type: 'BANK_TRANSFER' as const, details: paymentResult.bankDetails };
  }
  return null;
}
