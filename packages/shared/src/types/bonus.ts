// Bonus transaction types
export enum BonusTransactionType {
  EARNED = 'EARNED',
  SPENT = 'SPENT',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
  ADJUSTMENT = 'ADJUSTMENT', // Admin adjustment
}

// Bonus source
export enum BonusSource {
  PARTNER = 'PARTNER', // From partner program
  PROMO = 'PROMO', // Promotional bonus
  REFUND = 'REFUND', // Refund as bonus
  REFERRAL_BONUS = 'REFERRAL_BONUS', // One-time referral bonus
  ACTIVITY = 'ACTIVITY', // Activity-based bonus
}

// Activity types for bonus earning
export enum ActivityType {
  FIRST_PURCHASE = 'FIRST_PURCHASE',
  STREAK_7_DAYS = 'STREAK_7_DAYS',
  STREAK_30_DAYS = 'STREAK_30_DAYS',
  PROFILE_COMPLETE = 'PROFILE_COMPLETE',
  FIRST_REVIEW = 'FIRST_REVIEW',
  REFERRAL_MILESTONE_5 = 'REFERRAL_MILESTONE_5',
  REFERRAL_MILESTONE_10 = 'REFERRAL_MILESTONE_10',
}

// Bonus campaign status
export enum BonusCampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Bonus campaign target type
export enum BonusCampaignTargetType {
  ALL = 'ALL',
  SEGMENT = 'SEGMENT',
  INDIVIDUAL = 'INDIVIDUAL',
}

// Bonus transaction with extended fields
export interface BonusTransaction {
  id: string;
  userId: string;
  type: BonusTransactionType;
  amount: number;
  source: BonusSource;
  referenceId?: string;
  referenceType?: string;
  description: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Bonus conversion rate
export interface BonusRate {
  id: string;
  fromCurrency: string; // BONUS
  toCurrency: string; // RUB
  rate: number; // e.g., 1 bonus = 1 ruble
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive?: boolean;
}

// Bonus statistics for user
export interface BonusStats {
  balance: number;
  pendingEarnings: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  expiringIn30Days: number;
}

// Bonus campaign
export interface BonusCampaign {
  id: string;
  name: string;
  description?: string;
  bonusAmount: number;
  targetType: BonusCampaignTargetType;
  targetCriteria?: Record<string, unknown>;
  status: BonusCampaignStatus;
  startDate: Date;
  endDate?: Date;
  expiryDays?: number;
  usedCount: number;
  usageLimit?: number;
  createdById: string;
  createdAt: Date;
  executedAt?: Date;
}

// Expiring bonus information
export interface ExpiringBonus {
  amount: number;
  expiresAt: Date;
  daysRemaining: number;
  transactionId: string;
}

// Withdrawal result
export interface WithdrawalResult {
  success: boolean;
  bonusAmount: number;
  currencyAmount: number;
  rate: number;
  taxAmount: number;
  netAmount: number;
  withdrawalId?: string;
  message?: string;
}

// Bonus withdrawal request
export interface BonusWithdrawal {
  id: string;
  userId: string;
  bonusAmount: number;
  currencyAmount: number;
  rate: number;
  taxStatus: string;
  taxAmount: number;
  netAmount: number;
  paymentDetails: Record<string, unknown>;
  status: string;
  processedById?: string;
  processedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

// User activity bonus tracking
export interface UserActivityBonus {
  id: string;
  userId: string;
  activityType: ActivityType;
  grantedAt: Date;
}

// Max applicable bonus calculation result
export interface MaxApplicableBonus {
  maxAmount: number;
  balance: number;
  maxPercent: number;
}

// Bonus balance response
export interface BonusBalance {
  balance: number;
  pendingEarnings: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}
