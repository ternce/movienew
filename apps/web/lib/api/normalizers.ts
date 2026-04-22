/**
 * Centralized API response normalizers.
 *
 * The backend and frontend often use different field names or shapes for the
 * same data. These pure functions transform raw API responses into the types
 * the frontend expects, keeping hook code clean and testable.
 */

import type {
  PartnerDashboard,
  PartnerLevelConfig,
  AvailableBalance,
  SubscriptionPlan,
} from '@/types';

import type {
  ApiPartnerLevelResponse,
  ApiPartnerDashboardResponse,
  ApiPartnerBalanceResponse,
} from '@/hooks/partner/use-partner-dashboard';

// ============ Partner Normalizers ============

/** Map level numbers (1-5) to PartnerLevel string names */
export const LEVEL_NUMBER_TO_NAME: Record<number, string> = {
  1: 'STARTER',
  2: 'BRONZE',
  3: 'SILVER',
  4: 'GOLD',
  5: 'PLATINUM',
};

/**
 * Normalize a single raw API partner-level response into PartnerLevelConfig.
 */
export function normalizePartnerLevel(l: ApiPartnerLevelResponse): PartnerLevelConfig {
  return {
    level: l.level ?? LEVEL_NUMBER_TO_NAME[l.levelNumber ?? 0] ?? 'STARTER',
    name: l.name ?? '',
    minReferrals: l.minReferrals ?? 0,
    minEarnings: l.minEarnings ?? l.minTeamVolume ?? 0,
    commissionRate: l.commissionRate ?? 0,
    benefits: Array.isArray(l.benefits) ? l.benefits : [],
  } as PartnerLevelConfig;
}

/**
 * Normalize an array of raw API partner-level responses.
 */
export function normalizePartnerLevels(data: ApiPartnerLevelResponse[]): PartnerLevelConfig[] {
  return data.map(normalizePartnerLevel);
}

/**
 * Normalize a raw API partner dashboard response into PartnerDashboard.
 */
export function normalizePartnerDashboard(d: ApiPartnerDashboardResponse): PartnerDashboard {
  const np = d.nextLevelProgress;
  // Convert numeric level to PartnerLevel string if needed
  const rawLevel = d.currentLevel ?? d.level ?? 1;
  const level =
    typeof rawLevel === 'number'
      ? (LEVEL_NUMBER_TO_NAME[rawLevel] ?? 'STARTER')
      : rawLevel;

  return {
    level,
    levelName: d.levelName ?? 'Стартер',
    referralCode: d.referralCode ?? '',
    referralUrl: d.referralUrl ?? '',
    totalReferrals: d.totalReferrals ?? 0,
    activeReferrals: d.activeReferrals ?? 0,
    totalEarnings: d.totalEarnings ?? 0,
    pendingEarnings: d.pendingEarnings ?? 0,
    availableBalance: d.availableBalance ?? 0,
    withdrawnAmount: d.withdrawnAmount ?? 0,
    currentMonthEarnings: d.currentMonthEarnings ?? d.thisMonthEarnings ?? 0,
    previousMonthEarnings: d.previousMonthEarnings ?? d.lastMonthEarnings ?? 0,
    levelProgress: d.levelProgress ??
      (np
        ? {
            currentLevel: level,
            nextLevel: np.nextLevel
              ? typeof np.nextLevel === 'number'
                ? (LEVEL_NUMBER_TO_NAME[np.nextLevel] ?? null)
                : np.nextLevel
              : null,
            referralsProgress: {
              current: np.currentReferrals ?? 0,
              required: np.referralsNeeded ?? 0,
              percentage: np.referralsNeeded
                ? Math.round(((np.currentReferrals ?? 0) / np.referralsNeeded) * 100)
                : 0,
            },
            earningsProgress: {
              current: np.currentTeamVolume ?? 0,
              required: np.teamVolumeNeeded ?? 0,
              percentage: np.teamVolumeNeeded
                ? Math.round(((np.currentTeamVolume ?? 0) / np.teamVolumeNeeded) * 100)
                : 0,
            },
          }
        : {
            currentLevel: 1,
            nextLevel: null,
            referralsProgress: { current: 0, required: 0, percentage: 0 },
            earningsProgress: { current: 0, required: 0, percentage: 0 },
          }),
    recentCommissions: d.recentCommissions ?? [],
  } as PartnerDashboard;
}

/**
 * Normalize a raw API partner balance response into AvailableBalance.
 */
export function normalizePartnerBalance(d: ApiPartnerBalanceResponse): AvailableBalance {
  const available = d.available ?? d.availableBalance ?? 0;
  const pending = d.pending ?? d.pendingWithdrawals ?? 0;
  const processing = d.processing ?? 0;
  const minimumWithdrawal = d.minimumWithdrawal ?? 1000;

  return {
    available,
    pending,
    processing,
    minimumWithdrawal,
    canWithdraw: d.canWithdraw ?? available >= minimumWithdrawal,
  } as AvailableBalance;
}

// ============ Subscription Normalizers ============

/**
 * Normalize a subscription plan's `features` field.
 * The API may return features as a JSON string instead of an array.
 */
export function normalizeSubscriptionPlanFeatures(
  plan: SubscriptionPlan,
): SubscriptionPlan {
  return {
    ...plan,
    features: Array.isArray(plan.features)
      ? plan.features
      : typeof plan.features === 'string'
        ? JSON.parse(plan.features)
        : [],
  };
}

/**
 * Normalize an array of subscription plans.
 */
export function normalizeSubscriptionPlans(
  plans: SubscriptionPlan[],
): SubscriptionPlan[] {
  return plans.map(normalizeSubscriptionPlanFeatures);
}
