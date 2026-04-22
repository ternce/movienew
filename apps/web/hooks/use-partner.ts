'use client';

/**
 * Re-export all partner hooks from split modules.
 * This file exists for backward compatibility -- new code should import
 * directly from '@/hooks/partner' or the specific sub-module.
 */

// Re-export everything from partner barrel
export {
  // Constants
  LEVEL_NUMBER_TO_NAME,
  // Dashboard hooks
  usePartnerLevels,
  usePartnerDashboard,
  usePartnerBalance,
  // Referral hooks
  useReferralTree,
  useCommissions,
  useCommission,
  // Withdrawal hooks
  useWithdrawals,
  useWithdrawal,
  useTaxPreview,
  usePaymentMethods,
  useCreateWithdrawal,
  useAddPaymentMethod,
  useDeletePaymentMethod,
} from './partner';

// Re-export API response types
export type {
  ApiPartnerLevelResponse,
  ApiPartnerDashboardResponse,
  ApiPartnerBalanceResponse,
  ApiReferralNodeResponse,
  ApiReferralTreeResponse,
} from './partner';

// ============ Combined Hook ============

// Import from sub-modules directly (not from barrel re-exports above)
import {
  usePartnerLevels as _usePartnerLevels,
  usePartnerDashboard as _usePartnerDashboard,
  usePartnerBalance as _usePartnerBalance,
} from './partner/use-partner-dashboard';
import { useCreateWithdrawal as _useCreateWithdrawal } from './partner/use-partner-withdrawals';

/**
 * Combined hook for partner program management
 */
export function usePartner() {
  const levels = _usePartnerLevels();
  const dashboard = _usePartnerDashboard();
  const balance = _usePartnerBalance();
  const createWithdrawalMutation = _useCreateWithdrawal();

  return {
    // Levels (public)
    levels: levels.data,
    isLoadingLevels: levels.isLoading,
    levelsError: levels.error,

    // Dashboard
    dashboard: dashboard.data,
    isLoadingDashboard: dashboard.isLoading,
    dashboardError: dashboard.error,
    refetchDashboard: dashboard.refetch,

    // Balance
    balance: balance.data,
    isLoadingBalance: balance.isLoading,
    balanceError: balance.error,
    refetchBalance: balance.refetch,

    // Computed values from dashboard
    level: dashboard.data?.level,
    levelName: dashboard.data?.levelName,
    referralCode: dashboard.data?.referralCode,
    referralUrl: dashboard.data?.referralUrl,
    totalEarnings: dashboard.data?.totalEarnings ?? 0,
    pendingEarnings: dashboard.data?.pendingEarnings ?? 0,
    availableBalance: dashboard.data?.availableBalance ?? 0,
    totalReferrals: dashboard.data?.totalReferrals ?? 0,
    activeReferrals: dashboard.data?.activeReferrals ?? 0,

    // Withdrawal
    createWithdrawal: createWithdrawalMutation.mutate,
    createWithdrawalAsync: createWithdrawalMutation.mutateAsync,
    isCreatingWithdrawal: createWithdrawalMutation.isPending,
    withdrawalResult: createWithdrawalMutation.data,
    withdrawalError: createWithdrawalMutation.error,
  };
}
