'use client';

/**
 * Re-export all bonus hooks from split modules.
 * This file exists for backward compatibility -- new code should import
 * directly from '@/hooks/bonus' or the specific sub-module.
 */

// Re-export everything from bonus barrel
export {
  // Balance hooks
  useBonusBalance,
  useBonusStatistics,
  useBonusRate,
  useExpiringBonuses,
  useMaxApplicable,
  // Transaction hooks
  useBonusHistory,
  useWithdrawalPreview,
  useWithdrawBonus,
  useInvalidateBonusQueries,
  // Error handling
  bonusErrorMessages,
  getBonusErrorMessage,
  // Helpers
  formatBonusAmount,
  getBonusTypeLabel,
  getBonusSourceLabel,
  getBonusTypeColor,
} from './bonus';

// Re-export types
export type {
  BonusBalance,
  BonusStatistics,
  BonusRate,
  ExpiringBonus,
  ExpiringBonusSummary,
  MaxApplicableBonus,
  BonusTransaction,
  BonusQueryParams,
  PaginatedTransactions,
  WithdrawalPreview,
  WithdrawBonusRequest,
  WithdrawalResult,
  BonusErrorCode,
} from './bonus';

// ============ Combined Hook ============

// Import from sub-modules directly (not from barrel re-exports above)
import {
  useBonusBalance as _useBonusBalance,
  useBonusStatistics as _useBonusStatistics,
  useBonusRate as _useBonusRate,
  useExpiringBonuses as _useExpiringBonuses,
} from './bonus/use-bonus-balance';
import { useWithdrawBonus as _useWithdrawBonus } from './bonus/use-bonus-transactions';

/**
 * Combined hook for easy bonus management
 */
export function useBonus() {
  const balance = _useBonusBalance();
  const statistics = _useBonusStatistics();
  const rate = _useBonusRate();
  const expiring = _useExpiringBonuses(30);
  const withdrawMutation = _useWithdrawBonus();

  return {
    // Balance
    balance: balance.data?.balance ?? 0,
    pendingEarnings: balance.data?.pendingEarnings ?? 0,
    lifetimeEarned: balance.data?.lifetimeEarned ?? 0,
    lifetimeSpent: balance.data?.lifetimeSpent ?? 0,
    isLoadingBalance: balance.isLoading,
    balanceError: balance.error,
    refetchBalance: balance.refetch,

    // Statistics
    statistics: statistics.data,
    isLoadingStatistics: statistics.isLoading,
    expiringIn30Days: expiring.data?.totalExpiring ?? 0,

    // Rate
    rate: rate.data?.rate ?? 1,
    rateData: rate.data,
    isLoadingRate: rate.isLoading,

    // Expiring
    expiringBonuses: expiring.data?.expiringBonuses ?? [],
    totalExpiring: expiring.data?.totalExpiring ?? 0,

    // Withdrawal
    withdraw: withdrawMutation.mutate,
    withdrawAsync: withdrawMutation.mutateAsync,
    isWithdrawing: withdrawMutation.isPending,
    withdrawalResult: withdrawMutation.data,
    withdrawalError: withdrawMutation.error,

    // Combined loading state
    isLoading: balance.isLoading || rate.isLoading,
  };
}
