import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Withdrawal form step
 */
type WithdrawalStep = 'amount' | 'tax' | 'details' | 'confirm' | 'processing' | 'complete';

/**
 * Tax status type
 */
type TaxStatus = 'INDIVIDUAL' | 'SELF_EMPLOYED' | 'ENTREPRENEUR' | 'COMPANY';

/**
 * Bonus checkout state for applying bonuses to orders
 */
interface BonusCheckoutState {
  // Bonus application state
  appliedAmount: number;
  orderTotal: number;
  maxApplicable: number;

  // Actions
  setAppliedAmount: (amount: number) => void;
  setOrderTotal: (total: number) => void;
  setMaxApplicable: (max: number) => void;
  applyQuickAmount: (percent: number) => void;
  clearAppliedAmount: () => void;
}

/**
 * Bonus withdrawal data (state only, no actions)
 */
interface BonusWithdrawalData {
  withdrawalStep: WithdrawalStep;
  withdrawalAmount: number;
  taxStatus: TaxStatus;
  paymentDetails: {
    bankName?: string;
    accountNumber?: string;
    bik?: string;
    cardNumber?: string;
  };
  previewData: {
    currencyAmount: number;
    rate: number;
    estimatedTax: number;
    estimatedNet: number;
    taxRate: number;
  } | null;
  withdrawalId: string | null;
  error: string | null;
}

/**
 * Bonus withdrawal state (includes actions)
 */
interface BonusWithdrawalState extends BonusWithdrawalData {
  // Actions
  setWithdrawalStep: (step: WithdrawalStep) => void;
  nextWithdrawalStep: () => void;
  prevWithdrawalStep: () => void;
  setWithdrawalAmount: (amount: number) => void;
  setTaxStatus: (status: TaxStatus) => void;
  setPaymentDetails: (details: Partial<BonusWithdrawalState['paymentDetails']>) => void;
  setPreviewData: (data: BonusWithdrawalState['previewData']) => void;
  setWithdrawalId: (id: string | null) => void;
  setWithdrawalError: (error: string | null) => void;
  resetWithdrawal: () => void;
}

/**
 * User bonus preferences
 */
interface BonusPreferencesState {
  // Display preferences
  showExpiringAlert: boolean;
  expiringAlertDays: number; // Show alert when bonuses expire within this many days

  // Actions
  setShowExpiringAlert: (show: boolean) => void;
  setExpiringAlertDays: (days: number) => void;
}

/**
 * Combined bonus state
 */
interface BonusState extends BonusCheckoutState, BonusWithdrawalState, BonusPreferencesState {}

/**
 * Withdrawal step order
 */
const WITHDRAWAL_STEP_ORDER: WithdrawalStep[] = ['amount', 'tax', 'details', 'confirm', 'processing', 'complete'];

/**
 * Default checkout state
 */
const DEFAULT_CHECKOUT_STATE: Pick<BonusCheckoutState, 'appliedAmount' | 'orderTotal' | 'maxApplicable'> = {
  appliedAmount: 0,
  orderTotal: 0,
  maxApplicable: 0,
};

/**
 * Default withdrawal state
 */
const DEFAULT_WITHDRAWAL_STATE: Pick<
  BonusWithdrawalState,
  'withdrawalStep' | 'withdrawalAmount' | 'taxStatus' | 'paymentDetails' | 'previewData' | 'withdrawalId' | 'error'
> = {
  withdrawalStep: 'amount',
  withdrawalAmount: 1000, // Minimum withdrawal amount
  taxStatus: 'INDIVIDUAL',
  paymentDetails: {},
  previewData: null,
  withdrawalId: null,
  error: null,
};

/**
 * Default preferences state
 */
const DEFAULT_PREFERENCES_STATE: Pick<BonusPreferencesState, 'showExpiringAlert' | 'expiringAlertDays'> = {
  showExpiringAlert: true,
  expiringAlertDays: 30,
};

/**
 * Bonus store for managing checkout bonus application and withdrawals
 */
export const useBonusStore = create<BonusState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_CHECKOUT_STATE,
      ...DEFAULT_WITHDRAWAL_STATE,
      ...DEFAULT_PREFERENCES_STATE,

      // Checkout actions
      setAppliedAmount: (amount) =>
        set({
          appliedAmount: Math.min(Math.max(0, amount), get().maxApplicable),
        }),

      setOrderTotal: (total) =>
        set({
          orderTotal: total,
        }),

      setMaxApplicable: (max) =>
        set({
          maxApplicable: max,
          appliedAmount: Math.min(get().appliedAmount, max),
        }),

      applyQuickAmount: (percent) => {
        const { orderTotal, maxApplicable } = get();
        const targetAmount = (orderTotal * percent) / 100;
        const cappedAmount = Math.min(targetAmount, maxApplicable);
        set({ appliedAmount: Math.floor(cappedAmount * 100) / 100 });
      },

      clearAppliedAmount: () =>
        set({
          appliedAmount: 0,
          orderTotal: 0,
          maxApplicable: 0,
        }),

      // Withdrawal actions
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

      setTaxStatus: (status) =>
        set({
          taxStatus: status,
          previewData: null, // Reset preview when tax status changes
        }),

      setPaymentDetails: (details) =>
        set({
          paymentDetails: { ...get().paymentDetails, ...details },
        }),

      setPreviewData: (data) =>
        set({
          previewData: data,
        }),

      setWithdrawalId: (id) =>
        set({
          withdrawalId: id,
        }),

      setWithdrawalError: (error) =>
        set({
          error,
        }),

      resetWithdrawal: () =>
        set({
          ...DEFAULT_WITHDRAWAL_STATE,
        }),

      // Preferences actions
      setShowExpiringAlert: (show) =>
        set({
          showExpiringAlert: show,
        }),

      setExpiringAlertDays: (days) =>
        set({
          expiringAlertDays: Math.max(1, Math.min(365, days)),
        }),
    }),
    {
      name: 'mp-bonus-store',
      storage: createJSONStorage(() => {
        // Use sessionStorage for checkout state, localStorage for preferences
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return sessionStorage;
      }),
      partialize: (state) => ({
        // Persist checkout state in session
        appliedAmount: state.appliedAmount,
        // Persist withdrawal progress
        withdrawalStep: state.withdrawalStep,
        withdrawalAmount: state.withdrawalAmount,
        taxStatus: state.taxStatus,
        paymentDetails: state.paymentDetails,
      }),
    },
  ),
);

/**
 * Separate store for bonus preferences (persisted in localStorage)
 */
export const useBonusPreferencesStore = create<BonusPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES_STATE,

      setShowExpiringAlert: (show) =>
        set({
          showExpiringAlert: show,
        }),

      setExpiringAlertDays: (days) =>
        set({
          expiringAlertDays: Math.max(1, Math.min(365, days)),
        }),
    }),
    {
      name: 'mp-bonus-preferences',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Bonus validation error codes
 */
export type BonusValidationErrorCode =
  | 'INSUFFICIENT_BONUS_BALANCE'
  | 'BONUS_EXPIRED'
  | 'MAX_BONUS_EXCEEDED'
  | 'EXCEEDS_ORDER_TOTAL'
  | 'INVALID_AMOUNT';

/**
 * Bonus validation error
 */
export interface BonusValidationError {
  code: BonusValidationErrorCode;
  message: string;
}

/**
 * Map error codes to Russian messages
 */
export const bonusErrorMessages: Record<BonusValidationErrorCode, string> = {
  INSUFFICIENT_BONUS_BALANCE: 'Недостаточно бонусов на балансе',
  BONUS_EXPIRED: 'Срок действия бонусов истёк',
  MAX_BONUS_EXCEEDED: 'Превышен максимум оплаты бонусами (50%)',
  EXCEEDS_ORDER_TOTAL: 'Сумма бонусов превышает стоимость заказа',
  INVALID_AMOUNT: 'Некорректная сумма бонусов',
};

/**
 * Helper selectors for bonus store
 */
export const bonusSelectors = {
  /**
   * Get the amount to pay after bonus application
   */
  getAmountToPay: (orderTotal: number, appliedBonus: number): number => {
    return Math.max(0, orderTotal - appliedBonus);
  },

  /**
   * Get the maximum applicable bonus (50% of order)
   */
  getMaxApplicable: (orderTotal: number, balance: number): number => {
    const maxByPercent = orderTotal * 0.5; // Max 50%
    return Math.min(balance, maxByPercent, orderTotal);
  },

  /**
   * Check if order is fully covered by bonus
   */
  isFullyCoveredByBonus: (orderTotal: number, appliedBonus: number): boolean => {
    return appliedBonus >= orderTotal;
  },

  /**
   * Validate bonus amount for checkout
   */
  validateBonusAmount: (
    amount: number,
    balance: number,
    maxApplicable: number,
    orderTotal: number
  ): BonusValidationError | null => {
    if (amount < 0 || !Number.isFinite(amount)) {
      return {
        code: 'INVALID_AMOUNT',
        message: bonusErrorMessages.INVALID_AMOUNT,
      };
    }

    if (amount > balance) {
      return {
        code: 'INSUFFICIENT_BONUS_BALANCE',
        message: bonusErrorMessages.INSUFFICIENT_BONUS_BALANCE,
      };
    }

    if (amount > maxApplicable) {
      return {
        code: 'MAX_BONUS_EXCEEDED',
        message: bonusErrorMessages.MAX_BONUS_EXCEEDED,
      };
    }

    if (amount > orderTotal) {
      return {
        code: 'EXCEEDS_ORDER_TOTAL',
        message: bonusErrorMessages.EXCEEDS_ORDER_TOTAL,
      };
    }

    return null;
  },

  /**
   * Calculate applied bonus percentage
   */
  getAppliedPercent: (orderTotal: number, appliedBonus: number): number => {
    if (orderTotal === 0) return 0;
    return Math.round((appliedBonus / orderTotal) * 100);
  },

  /**
   * Format amount for display (Russian locale)
   */
  formatAmount: (amount: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Get tax rate for status
   */
  getTaxRate: (taxStatus: TaxStatus): number => {
    const rates: Record<TaxStatus, number> = {
      INDIVIDUAL: 0.13,
      SELF_EMPLOYED: 0.04,
      ENTREPRENEUR: 0.06,
      COMPANY: 0.06,
    };
    return rates[taxStatus] || 0.13;
  },

  /**
   * Get tax status label in Russian
   */
  getTaxStatusLabel: (taxStatus: TaxStatus): string => {
    const labels: Record<TaxStatus, string> = {
      INDIVIDUAL: 'Физическое лицо (НДФЛ 13%)',
      SELF_EMPLOYED: 'Самозанятый (НПД 4%)',
      ENTREPRENEUR: 'ИП (УСН 6%)',
      COMPANY: 'Юридическое лицо (6%)',
    };
    return labels[taxStatus] || taxStatus;
  },

  /**
   * Validate withdrawal step
   */
  canProceedWithdrawal: (state: BonusWithdrawalData, balance: number): boolean => {
    switch (state.withdrawalStep) {
      case 'amount':
        return state.withdrawalAmount >= 1000 && state.withdrawalAmount <= balance;
      case 'tax':
        return !!state.taxStatus;
      case 'details':
        return !!(state.paymentDetails.accountNumber && state.paymentDetails.bik);
      case 'confirm':
        return !!state.previewData;
      default:
        return false;
    }
  },
};
