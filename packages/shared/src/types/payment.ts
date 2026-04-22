// Payment method types
export enum PaymentMethodType {
  CARD = 'CARD',
  SBP = 'SBP',
  BANK_TRANSFER = 'BANK_TRANSFER',
  QR = 'QR',
}

// Transaction types
export enum TransactionType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  STORE = 'STORE',
  BONUS_PURCHASE = 'BONUS_PURCHASE',
  WITHDRAWAL = 'WITHDRAWAL',
}

// Transaction status
export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

// Invoice status
export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// Payment method
export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  details: Record<string, unknown>; // Encrypted
  isDefault: boolean;
  createdAt: Date;
}

// Transaction
export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  bonusAmountUsed: number;
  paymentMethod: PaymentMethodType;
  externalPaymentId?: string;
  status: TransactionStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

// Invoice (for bank transfers)
export interface Invoice {
  id: string;
  userId: string;
  transactionId: string;
  amount: number;
  currency: string;
  dueDate: Date;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    bik: string;
    correspondentAccount: string;
    inn: string;
    kpp: string;
    paymentPurpose: string;
  };
  qrCodeUrl?: string;
  status: InvoiceStatus;
  paidAt?: Date;
}
