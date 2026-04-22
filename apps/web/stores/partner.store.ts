import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TaxStatus, PaymentDetails } from '@/types';

/**
 * Withdrawal flow step type
 */
type WithdrawalStep = 'amount' | 'tax' | 'payment' | 'confirm';

/**
 * Partner store state interface
 */
interface PartnerState {
  // Withdrawal flow state
  withdrawalStep: WithdrawalStep;
  withdrawalAmount: number;
  withdrawalTaxStatus: TaxStatus;
  withdrawalPaymentDetails: PaymentDetails | null;

  // Referral tree state
  treeDepth: number;
  expandedNodes: Set<string>;

  // Commission filters state
  commissionStatusFilter: string | null;
  commissionLevelFilter: number | null;

  // Error state
  error: string | null;

  // Actions - Withdrawal flow
  setWithdrawalStep: (step: WithdrawalStep) => void;
  nextWithdrawalStep: () => void;
  prevWithdrawalStep: () => void;
  setWithdrawalAmount: (amount: number) => void;
  setWithdrawalTaxStatus: (status: TaxStatus) => void;
  setWithdrawalPaymentDetails: (details: PaymentDetails | null) => void;
  resetWithdrawal: () => void;

  // Actions - Referral tree
  setTreeDepth: (depth: number) => void;
  toggleNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Actions - Commission filters
  setCommissionStatusFilter: (status: string | null) => void;
  setCommissionLevelFilter: (level: number | null) => void;
  resetCommissionFilters: () => void;

  // Actions - Error handling
  setError: (error: string | null) => void;

  // Actions - Reset
  resetAll: () => void;
}

/**
 * Withdrawal step order for navigation
 */
const WITHDRAWAL_STEP_ORDER: WithdrawalStep[] = ['amount', 'tax', 'payment', 'confirm'];

/**
 * Default state values
 */
const DEFAULT_STATE = {
  withdrawalStep: 'amount' as WithdrawalStep,
  withdrawalAmount: 0,
  withdrawalTaxStatus: 'INDIVIDUAL' as TaxStatus,
  withdrawalPaymentDetails: null,
  treeDepth: 3,
  expandedNodes: new Set<string>(),
  commissionStatusFilter: null,
  commissionLevelFilter: null,
  error: null,
};

/**
 * Partner store for managing partner program UI state
 */
export const usePartnerStore = create<PartnerState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_STATE,

      // Withdrawal flow actions
      setWithdrawalStep: (step) =>
        set({
          withdrawalStep: step,
          error: null,
        }),

      nextWithdrawalStep: () => {
        const currentIndex = WITHDRAWAL_STEP_ORDER.indexOf(get().withdrawalStep);
        if (currentIndex < WITHDRAWAL_STEP_ORDER.length - 1) {
          set({
            withdrawalStep: WITHDRAWAL_STEP_ORDER[currentIndex + 1],
            error: null,
          });
        }
      },

      prevWithdrawalStep: () => {
        const currentIndex = WITHDRAWAL_STEP_ORDER.indexOf(get().withdrawalStep);
        if (currentIndex > 0) {
          set({
            withdrawalStep: WITHDRAWAL_STEP_ORDER[currentIndex - 1],
            error: null,
          });
        }
      },

      setWithdrawalAmount: (amount) =>
        set({
          withdrawalAmount: Math.max(0, amount),
          error: null,
        }),

      setWithdrawalTaxStatus: (status) =>
        set({
          withdrawalTaxStatus: status,
          error: null,
        }),

      setWithdrawalPaymentDetails: (details) =>
        set({
          withdrawalPaymentDetails: details,
          error: null,
        }),

      resetWithdrawal: () =>
        set({
          withdrawalStep: 'amount',
          withdrawalAmount: 0,
          withdrawalTaxStatus: 'INDIVIDUAL',
          withdrawalPaymentDetails: null,
          error: null,
        }),

      // Referral tree actions
      setTreeDepth: (depth) =>
        set({
          treeDepth: Math.min(5, Math.max(1, depth)),
        }),

      toggleNode: (nodeId) =>
        set((state) => {
          const newExpanded = new Set(state.expandedNodes);
          if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
          } else {
            newExpanded.add(nodeId);
          }
          return { expandedNodes: newExpanded };
        }),

      expandAll: () =>
        set({
          // We'll track this by setting a special value
          expandedNodes: new Set(['__ALL__']),
        }),

      collapseAll: () =>
        set({
          expandedNodes: new Set<string>(),
        }),

      // Commission filter actions
      setCommissionStatusFilter: (status) =>
        set({
          commissionStatusFilter: status,
        }),

      setCommissionLevelFilter: (level) =>
        set({
          commissionLevelFilter: level,
        }),

      resetCommissionFilters: () =>
        set({
          commissionStatusFilter: null,
          commissionLevelFilter: null,
        }),

      // Error handling
      setError: (error) =>
        set({
          error,
        }),

      // Reset everything
      resetAll: () => set(DEFAULT_STATE),
    }),
    {
      name: 'mp-partner-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist essential data
        withdrawalStep: state.withdrawalStep,
        withdrawalAmount: state.withdrawalAmount,
        withdrawalTaxStatus: state.withdrawalTaxStatus,
        treeDepth: state.treeDepth,
        commissionStatusFilter: state.commissionStatusFilter,
        commissionLevelFilter: state.commissionLevelFilter,
      }),
      // Custom serialization for Set
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<PartnerState>),
        expandedNodes: new Set<string>(), // Always start with collapsed nodes
      }),
    },
  ),
);

/**
 * Helper selectors
 */
export const partnerSelectors = {
  /**
   * Check if node is expanded
   */
  isNodeExpanded: (state: PartnerState, nodeId: string) => {
    if (state.expandedNodes.has('__ALL__')) return true;
    return state.expandedNodes.has(nodeId);
  },

  /**
   * Check if withdrawal can proceed to next step
   */
  canProceedWithdrawal: (state: PartnerState, availableBalance: number, minimumWithdrawal: number) => {
    switch (state.withdrawalStep) {
      case 'amount':
        return (
          state.withdrawalAmount >= minimumWithdrawal &&
          state.withdrawalAmount <= availableBalance
        );
      case 'tax':
        return !!state.withdrawalTaxStatus;
      case 'payment':
        return !!state.withdrawalPaymentDetails;
      case 'confirm':
        return true;
      default:
        return false;
    }
  },

  /**
   * Get current withdrawal step index (0-based)
   */
  getWithdrawalStepIndex: (state: PartnerState) => {
    return WITHDRAWAL_STEP_ORDER.indexOf(state.withdrawalStep);
  },

  /**
   * Get total number of withdrawal steps
   */
  getTotalWithdrawalSteps: () => WITHDRAWAL_STEP_ORDER.length,

  /**
   * Check if any commission filters are active
   */
  hasActiveCommissionFilters: (state: PartnerState) => {
    return state.commissionStatusFilter !== null || state.commissionLevelFilter !== null;
  },
};

/**
 * Tax status labels in Russian
 */
export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  INDIVIDUAL: 'Физическое лицо (13%)',
  SELF_EMPLOYED: 'Самозанятый (4%)',
  ENTREPRENEUR: 'ИП (6%)',
  COMPANY: 'Юр. лицо (0% - самостоятельная уплата)',
};

/**
 * Tax rates by status
 */
export const TAX_RATES: Record<TaxStatus, number> = {
  INDIVIDUAL: 0.13,
  SELF_EMPLOYED: 0.04,
  ENTREPRENEUR: 0.06,
  COMPANY: 0,
};
