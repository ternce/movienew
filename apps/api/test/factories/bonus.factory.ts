/**
 * Bonus Factory for Tests
 *
 * Generates test bonus data including transactions and rates.
 */

import { v4 as uuidv4 } from 'uuid';
import { Prisma, TaxStatus, WithdrawalStatus, CommissionStatus } from '@prisma/client';
import { createMockUser, MockUser } from './user.factory';

// Bonus transaction types
export enum BonusTransactionType {
  EARNED = 'EARNED',
  SPENT = 'SPENT',
  ADJUSTMENT = 'ADJUSTMENT',
  EXPIRED = 'EXPIRED',
  WITHDRAWN = 'WITHDRAWN',
}

// Bonus sources
export enum BonusSource {
  PARTNER = 'PARTNER',
  PARTNER_COMMISSION = 'PARTNER_COMMISSION',
  PROMO = 'PROMO',
  REFUND = 'REFUND',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  PURCHASE = 'PURCHASE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  STORE = 'STORE',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  ACTIVITY = 'ACTIVITY',
}

export interface MockBonusTransaction {
  id: string;
  userId: string;
  type: BonusTransactionType;
  amount: Prisma.Decimal;
  source: BonusSource;
  referenceId: string | null;
  referenceType: string | null;
  description: string;
  expiresAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface MockPartnerCommission {
  id: string;
  partnerId: string;
  sourceUserId: string;
  sourceTransactionId: string;
  amount: Prisma.Decimal;
  level: number;
  status: CommissionStatus;
  paidAt: Date | null;
  createdAt: Date;
}

export interface MockBonusCampaign {
  id: string;
  name: string;
  description: string | null;
  bonusAmount: Prisma.Decimal;
  targetType: 'ALL' | 'SEGMENT' | 'INDIVIDUAL';
  targetCriteria: Record<string, unknown>;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: Date;
  endDate: Date | null;
  usageLimit: number | null;
  usedCount: number;
  createdById: string;
  createdAt: Date;
}

export interface MockBonusWithdrawal {
  id: string;
  userId: string;
  bonusAmount: number;
  currencyAmount: number;
  rate: number;
  taxStatus: TaxStatus;
  taxAmount: number;
  netAmount: number;
  paymentDetails: Record<string, unknown>;
  status: WithdrawalStatus;
  createdAt: Date;
}

export interface MockUserActivityBonus {
  id: string;
  userId: string;
  activityType: string;
  createdAt: Date;
}

export interface MockBonusRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: Prisma.Decimal;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBonusTransactionOptions {
  id?: string;
  userId?: string;
  type?: BonusTransactionType;
  amount?: number;
  source?: BonusSource;
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface CreatePartnerCommissionOptions {
  id?: string;
  partnerId?: string;
  sourceUserId?: string;
  sourceTransactionId?: string;
  amount?: number;
  level?: number;
  status?: CommissionStatus;
  paidAt?: Date | null;
}

export interface CreateBonusCampaignOptions {
  id?: string;
  name?: string;
  description?: string | null;
  bonusAmount?: number;
  targetType?: 'ALL' | 'SEGMENT' | 'INDIVIDUAL';
  targetCriteria?: Record<string, unknown>;
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate?: Date;
  endDate?: Date | null;
  usageLimit?: number | null;
  usedCount?: number;
  createdById?: string;
}

export interface CreateBonusWithdrawalOptions {
  id?: string;
  userId?: string;
  bonusAmount?: number;
  currencyAmount?: number;
  rate?: number;
  taxStatus?: TaxStatus;
  taxAmount?: number;
  netAmount?: number;
  paymentDetails?: Record<string, unknown>;
  status?: WithdrawalStatus;
}

export interface CreateBonusRateOptions {
  id?: string;
  fromCurrency?: string;
  toCurrency?: string;
  rate?: number;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  isActive?: boolean;
}

/**
 * Create a mock bonus transaction
 */
export function createMockBonusTransaction(
  options: CreateBonusTransactionOptions = {},
): MockBonusTransaction {
  const id = options.id || uuidv4();
  const type = options.type || BonusTransactionType.EARNED;
  const amount = options.amount ?? 100;

  // Default expiry is 365 days from now for EARNED transactions
  let expiresAt = options.expiresAt;
  if (expiresAt === undefined && type === BonusTransactionType.EARNED) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);
  }

  return {
    id,
    userId: options.userId || uuidv4(),
    type,
    amount: new Prisma.Decimal(type === BonusTransactionType.SPENT ? -Math.abs(amount) : amount),
    source: options.source || BonusSource.PROMO,
    referenceId: options.referenceId ?? null,
    referenceType: options.referenceType ?? null,
    description: options.description || `Test ${type.toLowerCase()} transaction`,
    expiresAt: expiresAt ?? null,
    metadata: options.metadata || {},
    createdAt: options.createdAt || new Date(),
  };
}

/**
 * Create an EARNED bonus transaction
 */
export function createEarnTransaction(
  userId: string,
  amount: number,
  source: BonusSource = BonusSource.PROMO,
): MockBonusTransaction {
  return createMockBonusTransaction({
    userId,
    type: BonusTransactionType.EARNED,
    amount,
    source,
    description: `Earned ${amount} bonuses from ${source}`,
  });
}

/**
 * Create a SPENT bonus transaction
 */
export function createSpendTransaction(
  userId: string,
  amount: number,
  referenceId?: string,
  referenceType?: string,
): MockBonusTransaction {
  return createMockBonusTransaction({
    userId,
    type: BonusTransactionType.SPENT,
    amount,
    source: BonusSource.PURCHASE,
    referenceId,
    referenceType,
    description: `Spent ${amount} bonuses`,
  });
}

/**
 * Create an ADJUSTMENT bonus transaction
 */
export function createAdjustmentTransaction(
  userId: string,
  amount: number,
  adminId?: string,
): MockBonusTransaction {
  return createMockBonusTransaction({
    userId,
    type: BonusTransactionType.ADJUSTMENT,
    amount,
    source: BonusSource.ADMIN_ADJUSTMENT,
    referenceId: adminId,
    referenceType: 'Admin',
    description: amount >= 0 ? `Admin added ${amount} bonuses` : `Admin deducted ${Math.abs(amount)} bonuses`,
  });
}

/**
 * Create a mock bonus rate
 */
export function createMockBonusRate(options: CreateBonusRateOptions = {}): MockBonusRate {
  const id = options.id || uuidv4();
  const now = new Date();

  return {
    id,
    fromCurrency: options.fromCurrency || 'BONUS',
    toCurrency: options.toCurrency || 'RUB',
    rate: new Prisma.Decimal(options.rate ?? 1),
    effectiveFrom: options.effectiveFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    effectiveTo: options.effectiveTo ?? null,
    isActive: options.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a user with a specific bonus balance
 */
export function createUserWithBalance(bonusBalance: number): MockUser {
  return createMockUser({ bonusBalance });
}

/**
 * Create multiple transactions for a user (for history testing)
 */
export function createTransactionHistory(
  userId: string,
  count: number = 10,
): MockBonusTransaction[] {
  const transactions: MockBonusTransaction[] = [];
  const types = [BonusTransactionType.EARNED, BonusTransactionType.SPENT];
  const sources = [BonusSource.PROMO, BonusSource.PURCHASE, BonusSource.PARTNER_COMMISSION];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const source = sources[i % sources.length];
    const daysAgo = count - i;

    transactions.push(
      createMockBonusTransaction({
        userId,
        type,
        amount: (i + 1) * 50,
        source,
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      }),
    );
  }

  return transactions;
}

/**
 * Create an expiring bonus transaction (expires within specified days)
 */
export function createExpiringTransaction(
  userId: string,
  amount: number,
  daysUntilExpiry: number,
): MockBonusTransaction {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysUntilExpiry);

  return createMockBonusTransaction({
    userId,
    type: BonusTransactionType.EARNED,
    amount,
    source: BonusSource.PROMO,
    expiresAt,
    description: `Expiring bonus (${daysUntilExpiry} days remaining)`,
    metadata: { expiryDays: daysUntilExpiry },
  });
}

/**
 * Create an already expired bonus transaction
 */
export function createExpiredTransaction(
  userId: string,
  amount: number,
  daysAgoExpired: number = 1,
): MockBonusTransaction {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() - daysAgoExpired);

  return createMockBonusTransaction({
    userId,
    type: BonusTransactionType.EARNED,
    amount,
    source: BonusSource.PROMO,
    expiresAt,
    description: 'Expired bonus',
    metadata: { expired: true },
  });
}

/**
 * Create a mock partner commission
 */
export function createMockCommission(
  options: CreatePartnerCommissionOptions = {},
): MockPartnerCommission {
  return {
    id: options.id || uuidv4(),
    partnerId: options.partnerId || uuidv4(),
    sourceUserId: options.sourceUserId || uuidv4(),
    sourceTransactionId: options.sourceTransactionId || uuidv4(),
    amount: new Prisma.Decimal(options.amount ?? 100),
    level: options.level ?? 1,
    status: options.status ?? CommissionStatus.APPROVED,
    paidAt: options.paidAt ?? null,
    createdAt: new Date(),
  };
}

/**
 * Create a mock bonus campaign
 */
export function createMockCampaign(
  options: CreateBonusCampaignOptions = {},
): MockBonusCampaign {
  const now = new Date();
  const startDate = options.startDate || new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

  return {
    id: options.id || uuidv4(),
    name: options.name || 'Test Campaign',
    description: options.description ?? 'Test campaign description',
    bonusAmount: new Prisma.Decimal(options.bonusAmount ?? 100),
    targetType: options.targetType || 'ALL',
    targetCriteria: options.targetCriteria || {},
    status: options.status || 'ACTIVE',
    startDate,
    endDate: options.endDate ?? null,
    usageLimit: options.usageLimit ?? null,
    usedCount: options.usedCount ?? 0,
    createdById: options.createdById || uuidv4(),
    createdAt: now,
  };
}

/**
 * Create a mock bonus withdrawal
 */
export function createMockWithdrawal(
  options: CreateBonusWithdrawalOptions = {},
): MockBonusWithdrawal {
  const bonusAmount = options.bonusAmount ?? 1000;
  const rate = options.rate ?? 1;
  const currencyAmount = options.currencyAmount ?? bonusAmount * rate;
  const taxAmount = options.taxAmount ?? currencyAmount * 0.13;
  const netAmount = options.netAmount ?? currencyAmount - taxAmount;

  return {
    id: options.id || uuidv4(),
    userId: options.userId || uuidv4(),
    bonusAmount,
    currencyAmount,
    rate,
    taxStatus: options.taxStatus ?? TaxStatus.INDIVIDUAL,
    taxAmount,
    netAmount,
    paymentDetails: options.paymentDetails || {},
    status: options.status ?? WithdrawalStatus.PENDING,
    createdAt: new Date(),
  };
}

/**
 * Create a mock user activity bonus record
 */
export function createMockUserActivityBonus(
  userId: string,
  activityType: string,
): MockUserActivityBonus {
  return {
    id: uuidv4(),
    userId,
    activityType,
    createdAt: new Date(),
  };
}

/**
 * Create a user with referral (referredById set)
 */
export function createUserWithReferrer(referrerId: string, bonusBalance: number = 0): MockUser & { referredById: string } {
  const user = createMockUser({ bonusBalance });
  return {
    ...user,
    referredById: referrerId,
  };
}

/**
 * Bonus factory object with all creation methods
 */
export const bonusFactory = {
  createTransaction: createMockBonusTransaction,
  createEarnTransaction,
  createSpendTransaction,
  createAdjustmentTransaction,
  createExpiringTransaction,
  createExpiredTransaction,
  createRate: createMockBonusRate,
  createUserWithBalance,
  createUserWithReferrer,
  createTransactionHistory,
  createCommission: createMockCommission,
  createCampaign: createMockCampaign,
  createWithdrawal: createMockWithdrawal,
  createUserActivityBonus: createMockUserActivityBonus,
};

export default bonusFactory;
