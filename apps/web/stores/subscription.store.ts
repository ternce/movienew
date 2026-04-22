import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SubscriptionPlan, PaymentMethodType } from '@/types';

/**
 * Checkout step type
 */
type CheckoutStep = 'plan' | 'payment' | 'confirm' | 'processing' | 'complete';

/**
 * Subscription/checkout state interface
 */
interface SubscriptionState {
  // Selected plan state
  selectedPlan: SubscriptionPlan | null;

  // Payment state
  paymentMethod: PaymentMethodType;
  bonusAmount: number;
  autoRenew: boolean;

  // Checkout flow state
  checkoutStep: CheckoutStep;
  transactionId: string | null;

  // Error state
  error: string | null;

  // Actions - Plan selection
  setSelectedPlan: (plan: SubscriptionPlan | null) => void;
  clearSelectedPlan: () => void;

  // Actions - Payment configuration
  setPaymentMethod: (method: PaymentMethodType) => void;
  setBonusAmount: (amount: number) => void;
  setAutoRenew: (autoRenew: boolean) => void;

  // Actions - Checkout flow
  setCheckoutStep: (step: CheckoutStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setTransactionId: (id: string | null) => void;

  // Actions - Error handling
  setError: (error: string | null) => void;

  // Actions - Reset
  resetCheckout: () => void;
  resetAll: () => void;
}

/**
 * Step order for navigation
 */
const STEP_ORDER: CheckoutStep[] = ['plan', 'payment', 'confirm', 'processing', 'complete'];

/**
 * Default state values
 */
const DEFAULT_STATE = {
  selectedPlan: null,
  paymentMethod: 'CARD' as PaymentMethodType,
  bonusAmount: 0,
  autoRenew: true,
  checkoutStep: 'plan' as CheckoutStep,
  transactionId: null,
  error: null,
};

/**
 * Subscription store for managing checkout flow
 */
export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_STATE,

      // Plan selection
      setSelectedPlan: (plan) =>
        set({
          selectedPlan: plan,
          error: null,
        }),

      clearSelectedPlan: () =>
        set({
          selectedPlan: null,
          bonusAmount: 0,
        }),

      // Payment configuration
      setPaymentMethod: (method) =>
        set({
          paymentMethod: method,
          error: null,
        }),

      setBonusAmount: (amount) =>
        set({
          bonusAmount: Math.max(0, amount),
          error: null,
        }),

      setAutoRenew: (autoRenew) =>
        set({
          autoRenew,
        }),

      // Checkout flow
      setCheckoutStep: (step) =>
        set({
          checkoutStep: step,
          error: null,
        }),

      nextStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().checkoutStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          set({
            checkoutStep: STEP_ORDER[currentIndex + 1],
            error: null,
          });
        }
      },

      prevStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().checkoutStep);
        if (currentIndex > 0) {
          set({
            checkoutStep: STEP_ORDER[currentIndex - 1],
            error: null,
          });
        }
      },

      setTransactionId: (id) =>
        set({
          transactionId: id,
        }),

      // Error handling
      setError: (error) =>
        set({
          error,
        }),

      // Reset checkout flow (keep selected plan)
      resetCheckout: () =>
        set({
          paymentMethod: 'CARD',
          bonusAmount: 0,
          autoRenew: true,
          checkoutStep: 'plan',
          transactionId: null,
          error: null,
        }),

      // Reset everything
      resetAll: () => set(DEFAULT_STATE),
    }),
    {
      name: 'mp-subscription-checkout',
      storage: createJSONStorage(() => sessionStorage), // Use session storage - checkout state shouldn't persist between sessions
      partialize: (state) => ({
        // Only persist essential checkout data
        selectedPlan: state.selectedPlan,
        paymentMethod: state.paymentMethod,
        bonusAmount: state.bonusAmount,
        autoRenew: state.autoRenew,
        checkoutStep: state.checkoutStep,
        transactionId: state.transactionId,
      }),
    },
  ),
);

/**
 * Helper selectors
 */
export const subscriptionSelectors = {
  /**
   * Get the total amount to pay after bonus
   */
  getAmountToPay: (state: SubscriptionState) => {
    if (!state.selectedPlan) return 0;
    return Math.max(0, state.selectedPlan.price - state.bonusAmount);
  },

  /**
   * Check if bonus covers full amount
   */
  isFullyCoveredByBonus: (state: SubscriptionState) => {
    if (!state.selectedPlan) return false;
    return state.bonusAmount >= state.selectedPlan.price;
  },

  /**
   * Check if checkout can proceed to next step
   */
  canProceed: (state: SubscriptionState) => {
    switch (state.checkoutStep) {
      case 'plan':
        return !!state.selectedPlan;
      case 'payment':
        return !!state.paymentMethod;
      case 'confirm':
        return true;
      default:
        return false;
    }
  },
};
