/**
 * Transaction Factory for Tests
 *
 * Generates test transaction data with realistic values.
 * Supports different transaction types and statuses.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethodType,
  Prisma,
} from '@prisma/client';

// Re-export for convenience
export { TransactionType, TransactionStatus, PaymentMethodType };

export interface MockTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: Prisma.Decimal;
  currency: string;
  bonusAmountUsed: Prisma.Decimal;
  paymentMethod: PaymentMethodType;
  status: TransactionStatus;
  providerTransactionId: string | null;
  metadata: Prisma.JsonValue;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionOptions {
  id?: string;
  userId?: string;
  type?: TransactionType;
  amount?: number;
  currency?: string;
  bonusAmountUsed?: number;
  paymentMethod?: PaymentMethodType;
  status?: TransactionStatus;
  providerTransactionId?: string | null;
  metadata?: Record<string, unknown>;
  completedAt?: Date | null;
}

/**
 * Create a mock transaction with default values
 */
export function createMockTransaction(options: CreateTransactionOptions = {}): MockTransaction {
  const id = options.id || uuidv4();
  const status = options.status || TransactionStatus.PENDING;

  return {
    id,
    userId: options.userId || uuidv4(),
    type: options.type || TransactionType.SUBSCRIPTION,
    amount: new Prisma.Decimal(options.amount ?? 499),
    currency: options.currency || 'RUB',
    bonusAmountUsed: new Prisma.Decimal(options.bonusAmountUsed ?? 0),
    paymentMethod: options.paymentMethod || PaymentMethodType.CARD,
    status,
    providerTransactionId: options.providerTransactionId ?? (status === TransactionStatus.COMPLETED ? `yookassa_${id.slice(0, 8)}` : null),
    metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : null,
    completedAt: options.completedAt ?? (status === TransactionStatus.COMPLETED ? new Date() : null),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create a pending transaction
 */
export function createPendingTransaction(options: Omit<CreateTransactionOptions, 'status' | 'completedAt'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    status: TransactionStatus.PENDING,
    completedAt: null,
  });
}

/**
 * Create a completed transaction
 */
export function createCompletedTransaction(options: Omit<CreateTransactionOptions, 'status'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    status: TransactionStatus.COMPLETED,
    completedAt: options.completedAt || new Date(),
  });
}

/**
 * Create a failed transaction
 */
export function createFailedTransaction(options: Omit<CreateTransactionOptions, 'status' | 'completedAt'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    status: TransactionStatus.FAILED,
    completedAt: null,
  });
}

/**
 * Create a refunded transaction
 */
export function createRefundedTransaction(options: Omit<CreateTransactionOptions, 'status'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    status: TransactionStatus.REFUNDED,
    completedAt: new Date(),
  });
}

/**
 * Create a subscription payment transaction
 */
export function createSubscriptionTransaction(options: Omit<CreateTransactionOptions, 'type'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    type: TransactionType.SUBSCRIPTION,
    amount: options.amount ?? 499,
    metadata: {
      subscriptionPlanId: options.metadata?.subscriptionPlanId || uuidv4(),
      ...options.metadata,
    },
  });
}

/**
 * Create a store purchase transaction
 */
export function createStoreTransaction(options: Omit<CreateTransactionOptions, 'type'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    type: TransactionType.STORE,
    metadata: {
      orderId: options.metadata?.orderId || uuidv4(),
      ...options.metadata,
    },
  });
}

/**
 * Create a bonus purchase transaction
 */
export function createBonusPurchaseTransaction(options: Omit<CreateTransactionOptions, 'type'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    type: TransactionType.BONUS_PURCHASE,
    bonusAmountUsed: 0, // No bonus can be used for buying bonuses
  });
}

/**
 * Create a CARD payment transaction
 */
export function createCardPaymentTransaction(options: Omit<CreateTransactionOptions, 'paymentMethod'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    paymentMethod: PaymentMethodType.CARD,
    metadata: {
      provider: 'yookassa',
      ...options.metadata,
    },
  });
}

/**
 * Create an SBP payment transaction
 */
export function createSbpPaymentTransaction(options: Omit<CreateTransactionOptions, 'paymentMethod'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    paymentMethod: PaymentMethodType.SBP,
    metadata: {
      provider: 'sbp',
      qrCodeUrl: `https://sbp.example.com/qr/${options.id || uuidv4()}`,
      ...options.metadata,
    },
  });
}

/**
 * Create a bank transfer transaction
 */
export function createBankTransferTransaction(options: Omit<CreateTransactionOptions, 'paymentMethod'> = {}): MockTransaction {
  return createMockTransaction({
    ...options,
    paymentMethod: PaymentMethodType.BANK_TRANSFER,
    metadata: {
      provider: 'bank_transfer',
      invoiceNumber: `INV-${Date.now()}`,
      ...options.metadata,
    },
  });
}

/**
 * Create a transaction with bonus applied
 */
export function createTransactionWithBonus(
  bonusAmount: number,
  options: Omit<CreateTransactionOptions, 'bonusAmountUsed'> = {},
): MockTransaction {
  const amount = options.amount ?? 499;
  const finalAmount = Math.max(0, amount - bonusAmount);

  return createMockTransaction({
    ...options,
    amount: amount,
    bonusAmountUsed: bonusAmount,
    metadata: {
      bonusApplied: bonusAmount,
      amountAfterBonus: finalAmount,
      ...options.metadata,
    },
  });
}

/**
 * Create a fully bonus-covered transaction
 */
export function createFullyBonusCoveredTransaction(options: Omit<CreateTransactionOptions, 'bonusAmountUsed' | 'paymentMethod'> = {}): MockTransaction {
  const amount = options.amount ?? 499;

  return createMockTransaction({
    ...options,
    amount: amount,
    bonusAmountUsed: amount,
    paymentMethod: PaymentMethodType.CARD, // Default, but doesn't matter since fully covered
    status: TransactionStatus.COMPLETED,
    completedAt: new Date(),
    metadata: {
      bonusApplied: amount,
      amountAfterBonus: 0,
      fullyCoveredByBonus: true,
      ...options.metadata,
    },
  });
}

/**
 * Transaction factory object
 */
export const transactionFactory = {
  create: createMockTransaction,
  createPending: createPendingTransaction,
  createCompleted: createCompletedTransaction,
  createFailed: createFailedTransaction,
  createRefunded: createRefundedTransaction,
  createSubscription: createSubscriptionTransaction,
  createStore: createStoreTransaction,
  createBonusPurchase: createBonusPurchaseTransaction,
  createCardPayment: createCardPaymentTransaction,
  createSbpPayment: createSbpPaymentTransaction,
  createBankTransfer: createBankTransferTransaction,
  createWithBonus: createTransactionWithBonus,
  createFullyBonusCovered: createFullyBonusCoveredTransaction,
};

export default transactionFactory;
