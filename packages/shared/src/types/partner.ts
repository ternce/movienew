// Partner commission status
export enum CommissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

// Withdrawal request status
export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

// Tax status
export enum TaxStatus {
  INDIVIDUAL = 'INDIVIDUAL', // Physical person
  SELF_EMPLOYED = 'SELF_EMPLOYED', // Self-employed (samozanyaty)
  ENTREPRENEUR = 'ENTREPRENEUR', // Individual entrepreneur (IP)
  COMPANY = 'COMPANY', // Legal entity
}

// Partner level configuration
export interface PartnerLevel {
  id: string;
  levelNumber: number; // 1-5
  name: string;
  commissionRate: number; // Percentage
  minReferrals: number;
  minTeamVolume: number;
  benefits: string[];
}

// Partner relationship (referral tree)
export interface PartnerRelationship {
  id: string;
  partnerId: string; // The partner (upline)
  referralId: string; // The referred user (downline)
  level: number; // 1-5 (depth in tree)
  createdAt: Date;
}

// Partner commission
export interface PartnerCommission {
  id: string;
  partnerId: string;
  sourceUserId: string;
  sourceTransactionId: string;
  level: number;
  amount: number;
  status: CommissionStatus;
  createdAt: Date;
  paidAt?: Date;
}

// Withdrawal request
export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentDetails: {
    type: 'card' | 'bank_account';
    cardNumber?: string;
    bankAccount?: string;
    bankName?: string;
    bik?: string;
    recipientName?: string;
  };
  taxStatus: TaxStatus;
  taxAmount: number;
  status: WithdrawalStatus;
  processedBy?: string;
  processedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

// Partner statistics (computed)
export interface PartnerStats {
  userId: string;
  currentLevel: number;
  totalReferrals: number;
  activeReferrals: number;
  teamSize: number;
  totalEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}
