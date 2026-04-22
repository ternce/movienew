'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import {
  normalizeSubscriptionPlanFeatures,
  normalizeSubscriptionPlans,
} from '@/lib/api/normalizers';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type {
  SubscriptionPlan,
  UserSubscription,
  ContentAccessResult,
  PurchaseSubscriptionRequest,
  CancelSubscriptionRequest,
  ToggleAutoRenewRequest,
  PaymentResult,
  PaginatedList,
} from '@/types';

/**
 * Hook to fetch all active subscription plans
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: queryKeys.subscriptions.plans(),
    queryFn: async () => {
      const response = await api.get<SubscriptionPlan[]>(endpoints.subscriptions.plans, { skipAuth: true });
      return normalizeSubscriptionPlans(response.data ?? []);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - plans don't change often
  });
}

/**
 * Hook to fetch a specific subscription plan
 */
export function useSubscriptionPlan(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptions.plan(planId || ''),
    queryFn: async () => {
      if (!planId) throw new Error('Plan ID required');
      const response = await api.get<SubscriptionPlan>(endpoints.subscriptions.plan(planId), { skipAuth: true });
      return normalizeSubscriptionPlanFeatures(response.data);
    },
    enabled: !!planId,
    staleTime: 10 * 60 * 1000, // 10 minutes - individual plans don't change often
  });
}

/**
 * Hook to fetch user's subscriptions
 */
export function useMySubscriptions(params?: { status?: string; page?: number; limit?: number }) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.subscriptions.my(),
    queryFn: async () => {
      const response = await api.get<PaginatedList<UserSubscription>>(
        endpoints.subscriptions.my,
        { params },
      );
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch active subscription (most recent active one)
 */
export function useActiveSubscription() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.subscriptions.active(),
    queryFn: async () => {
      const response = await api.get<PaginatedList<UserSubscription>>(
        endpoints.subscriptions.my,
        { params: { status: 'ACTIVE', limit: 1 } },
      );
      return response.data.items[0] || null;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to check access to specific content
 */
export function useContentAccess(contentId: string | undefined) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.subscriptions.access(contentId || ''),
    queryFn: async () => {
      if (!contentId) throw new Error('Content ID required');
      const response = await api.get<ContentAccessResult>(
        endpoints.subscriptions.checkAccess(contentId),
      );
      return response.data;
    },
    enabled: !!contentId && isAuthenticated && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to purchase a subscription
 */
export function usePurchaseSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PurchaseSubscriptionRequest) => {
      const response = await api.post<PaymentResult>(endpoints.subscriptions.purchase, data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate subscription queries
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });

      // If payment completed immediately (bonus covered full amount)
      if (data.status === 'COMPLETED') {
        toast.success('Подписка успешно оформлена!');
      }
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось оформить подписку');
    },
  });
}

/**
 * Hook to cancel a subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CancelSubscriptionRequest) => {
      const response = await api.post<UserSubscription>(endpoints.subscriptions.cancel, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });

      if (data.status === 'CANCELLED') {
        toast.success('Подписка отменена');
      } else {
        toast.success('Подписка будет отменена по окончании периода');
      }
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отменить подписку');
    },
  });
}

/**
 * Hook to toggle auto-renewal
 */
export function useToggleAutoRenew() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ToggleAutoRenewRequest) => {
      const response = await api.put<UserSubscription>(endpoints.subscriptions.autoRenew, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      toast.success(
        data.autoRenew
          ? 'Автопродление включено'
          : 'Автопродление отключено',
      );
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось изменить настройки автопродления');
    },
  });
}

/**
 * Combined hook for subscription management
 */
export function useSubscription() {
  const plans = useSubscriptionPlans();
  const mySubscriptions = useMySubscriptions();
  const activeSubscription = useActiveSubscription();
  const purchaseMutation = usePurchaseSubscription();
  const cancelMutation = useCancelSubscription();
  const autoRenewMutation = useToggleAutoRenew();

  return {
    // Plans
    plans: plans.data,
    isLoadingPlans: plans.isLoading,
    plansError: plans.error,
    refetchPlans: plans.refetch,

    // My subscriptions
    subscriptions: mySubscriptions.data?.items,
    isLoadingSubscriptions: mySubscriptions.isLoading,
    subscriptionsError: mySubscriptions.error,
    refetchSubscriptions: mySubscriptions.refetch,

    // Active subscription
    activeSubscription: activeSubscription.data,
    hasActiveSubscription: !!activeSubscription.data,
    isLoadingActive: activeSubscription.isLoading,

    // Purchase
    purchase: purchaseMutation.mutate,
    purchaseAsync: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    purchaseResult: purchaseMutation.data,
    purchaseError: purchaseMutation.error,

    // Cancel
    cancel: cancelMutation.mutate,
    cancelAsync: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,

    // Auto-renew
    toggleAutoRenew: autoRenewMutation.mutate,
    isTogglingAutoRenew: autoRenewMutation.isPending,
  };
}
