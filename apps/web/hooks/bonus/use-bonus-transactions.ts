'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Types ============

export interface BonusTransaction {
  id: string;
  type: 'EARNED' | 'SPENT' | 'WITHDRAWN' | 'EXPIRED' | 'ADJUSTMENT';
  amount: number;
  source: 'PARTNER' | 'PROMO' | 'REFUND' | 'REFERRAL_BONUS' | 'ACTIVITY';
  referenceId?: string;
  referenceType?: string;
  description: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface BonusQueryParams {
  type?: string;
  source?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTransactions {
  items: BonusTransaction[];
  total: number;
  page: number;
  limit: number;
}

export interface WithdrawalPreview {
  bonusAmount: number;
  currencyAmount: number;
  rate: number;
  estimatedTax: number;
  estimatedNet: number;
  taxRate: number;
}

export interface WithdrawBonusRequest {
  amount: number;
  taxStatus: 'INDIVIDUAL' | 'SELF_EMPLOYED' | 'ENTREPRENEUR' | 'COMPANY';
  paymentDetails?: Record<string, unknown>;
}

export interface WithdrawalResult {
  success: boolean;
  bonusAmount: number;
  currencyAmount: number;
  rate: number;
  taxAmount: number;
  netAmount: number;
  withdrawalId?: string;
  message?: string;
}

// ============ Error Handling ============

/**
 * Bonus-specific error codes
 */
export type BonusErrorCode =
  | 'INSUFFICIENT_BONUS_BALANCE'
  | 'BONUS_EXPIRED'
  | 'MAX_BONUS_EXCEEDED'
  | 'MINIMUM_WITHDRAWAL_NOT_MET'
  | 'WITHDRAWAL_LIMIT_EXCEEDED'
  | 'BONUS_SYSTEM_UNAVAILABLE';

/**
 * Map API error codes to user-friendly Russian messages
 */
export const bonusErrorMessages: Record<BonusErrorCode, string> = {
  INSUFFICIENT_BONUS_BALANCE: 'Недостаточно бонусов на балансе',
  BONUS_EXPIRED: 'Срок действия бонусов истёк',
  MAX_BONUS_EXCEEDED: 'Превышен максимум оплаты бонусами (50% от заказа)',
  MINIMUM_WITHDRAWAL_NOT_MET: 'Минимальная сумма вывода — 1000 бонусов',
  WITHDRAWAL_LIMIT_EXCEEDED: 'Превышен лимит на вывод средств',
  BONUS_SYSTEM_UNAVAILABLE: 'Система бонусов временно недоступна',
};

/**
 * Get user-friendly error message from API error
 */
export function getBonusErrorMessage(error: ApiError | Error | unknown): string {
  if (error instanceof ApiError) {
    const code = error.code as BonusErrorCode;
    if (code && bonusErrorMessages[code]) {
      return bonusErrorMessages[code];
    }
    return error.message || 'Произошла ошибка при работе с бонусами';
  }

  if (error instanceof Error) {
    return error.message || 'Произошла неизвестная ошибка';
  }

  return 'Произошла неизвестная ошибка';
}

// ============ Hooks ============

/**
 * Hook to fetch bonus transaction history
 */
export function useBonusHistory(params?: BonusQueryParams) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.bonuses.transactions(params as Record<string, unknown>),
    queryFn: async () => {
      const response = await api.get<PaginatedTransactions>(endpoints.bonuses.transactions, {
        params: params as Record<string, string | number | boolean | null | undefined>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to preview bonus withdrawal
 */
export function useWithdrawalPreview(
  amount: number,
  taxStatus: 'INDIVIDUAL' | 'SELF_EMPLOYED' | 'ENTREPRENEUR' | 'COMPANY',
) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: ['bonuses', 'withdrawalPreview', { amount, taxStatus }],
    queryFn: async () => {
      const response = await api.get<WithdrawalPreview>(endpoints.bonuses.withdrawalPreview, {
        params: { amount, taxStatus },
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && amount >= 1000,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to withdraw bonuses
 */
export function useWithdrawBonus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WithdrawBonusRequest) => {
      const response = await api.post<WithdrawalResult>(endpoints.bonuses.withdraw, data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate bonus queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bonuses.all });

      if (data.success) {
        toast.success(data.message || 'Заявка на вывод успешно создана');
      }
    },
    onError: (error: ApiError) => {
      const message = getBonusErrorMessage(error);
      toast.error(message);
    },
  });
}

/**
 * Hook to invalidate bonus queries after purchase
 * Call this after successful checkout to update bonus balance
 */
export function useInvalidateBonusQueries() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bonuses.all });
  }, [queryClient]);
}

// ============ Helpers ============

/**
 * Helper to format bonus amount for display
 */
export function formatBonusAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(amount));
}

/**
 * Helper to get bonus type label in Russian
 */
export function getBonusTypeLabel(type: BonusTransaction['type']): string {
  const labels: Record<BonusTransaction['type'], string> = {
    EARNED: 'Начислено',
    SPENT: 'Списано',
    WITHDRAWN: 'Выведено',
    EXPIRED: 'Истекло',
    ADJUSTMENT: 'Корректировка',
  };
  return labels[type] || type;
}

/**
 * Helper to get bonus source label in Russian
 */
export function getBonusSourceLabel(source: BonusTransaction['source']): string {
  const labels: Record<BonusTransaction['source'], string> = {
    PARTNER: 'Партнёрская программа',
    PROMO: 'Промо-акция',
    REFUND: 'Возврат',
    REFERRAL_BONUS: 'Реферальный бонус',
    ACTIVITY: 'Активность',
  };
  return labels[source] || source;
}

/**
 * Helper to get color for bonus type
 */
export function getBonusTypeColor(type: BonusTransaction['type']): string {
  const colors: Record<BonusTransaction['type'], string> = {
    EARNED: 'text-green-400',
    SPENT: 'text-red-400',
    WITHDRAWN: 'text-blue-400',
    EXPIRED: 'text-yellow-400',
    ADJUSTMENT: 'text-purple-400',
  };
  return colors[type] || 'text-gray-400';
}
