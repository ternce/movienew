import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PaymentMethodType } from '@/types';
import type { ShippingAddressDto } from '@/types/store.types';

type CheckoutStep = 'shipping' | 'payment' | 'review' | 'processing' | 'complete';

interface CheckoutState {
  shippingAddress: ShippingAddressDto | null;
  paymentMethod: PaymentMethodType;
  bonusAmount: number;
  checkoutStep: CheckoutStep;
  orderId: string | null;
  transactionId: string | null;
  error: string | null;

  setShippingAddress: (address: ShippingAddressDto) => void;
  setPaymentMethod: (method: PaymentMethodType) => void;
  setBonusAmount: (amount: number) => void;
  setCheckoutStep: (step: CheckoutStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setOrderId: (id: string | null) => void;
  setTransactionId: (id: string | null) => void;
  setError: (error: string | null) => void;
  resetCheckout: () => void;
}

const STEP_ORDER: CheckoutStep[] = ['shipping', 'payment', 'review', 'processing', 'complete'];

const DEFAULT_STATE = {
  shippingAddress: null,
  paymentMethod: 'CARD' as PaymentMethodType,
  bonusAmount: 0,
  checkoutStep: 'shipping' as CheckoutStep,
  orderId: null,
  transactionId: null,
  error: null,
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setShippingAddress: (address) =>
        set({ shippingAddress: address, error: null }),

      setPaymentMethod: (method) =>
        set({ paymentMethod: method, error: null }),

      setBonusAmount: (amount) =>
        set({ bonusAmount: Math.max(0, amount), error: null }),

      setCheckoutStep: (step) =>
        set({ checkoutStep: step, error: null }),

      nextStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().checkoutStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          set({ checkoutStep: STEP_ORDER[currentIndex + 1], error: null });
        }
      },

      prevStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().checkoutStep);
        if (currentIndex > 0) {
          set({ checkoutStep: STEP_ORDER[currentIndex - 1], error: null });
        }
      },

      setOrderId: (id) => set({ orderId: id }),
      setTransactionId: (id) => set({ transactionId: id }),
      setError: (error) => set({ error }),

      resetCheckout: () => set(DEFAULT_STATE),
    }),
    {
      name: 'mp-store-checkout',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        shippingAddress: state.shippingAddress,
        paymentMethod: state.paymentMethod,
        bonusAmount: state.bonusAmount,
        checkoutStep: state.checkoutStep,
        orderId: state.orderId,
        transactionId: state.transactionId,
      }),
    },
  ),
);

export const checkoutSelectors = {
  getAmountToPay: (state: CheckoutState) => (cartTotal: number) => {
    return Math.max(0, cartTotal - state.bonusAmount);
  },

  canProceedToNext: (state: CheckoutState) => {
    switch (state.checkoutStep) {
      case 'shipping':
        return !!state.shippingAddress;
      case 'payment':
        return !!state.paymentMethod;
      case 'review':
        return true;
      default:
        return false;
    }
  },
};
