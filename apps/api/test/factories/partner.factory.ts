/**
 * Partner Factory for Tests
 *
 * Generates test partner data including commissions, relationships, and withdrawals.
 */

import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { createMockUser, createPartnerUser, MockUser } from './user.factory';

// Commission status
export enum CommissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

// Withdrawal status
export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

// Tax status
export enum TaxStatus {
  INDIVIDUAL = 'INDIVIDUAL',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  ENTREPRENEUR = 'ENTREPRENEUR',
  COMPANY = 'COMPANY',
}

// Commission rates by level (from shared constants)
export const COMMISSION_RATES = {
  1: 0.10, // 10%
  2: 0.05, // 5%
  3: 0.03, // 3%
  4: 0.02, // 2%
  5: 0.01, // 1%
};

// Tax rates by status
export const TAX_RATES = {
  [TaxStatus.INDIVIDUAL]: 0.13, // 13%
  [TaxStatus.SELF_EMPLOYED]: 0.04, // 4%
  [TaxStatus.ENTREPRENEUR]: 0.06, // 6%
  [TaxStatus.COMPANY]: 0.0, // 0%
};

export interface MockPartnerCommission {
  id: string;
  partnerId: string;
  sourceUserId: string;
  sourceTransactionId: string;
  level: number;
  rate: Prisma.Decimal;
  amount: Prisma.Decimal;
  status: CommissionStatus;
  createdAt: Date;
  paidAt: Date | null;
}

export interface MockPartnerRelationship {
  id: string;
  partnerId: string;
  referralId: string;
  level: number;
  createdAt: Date;
}

export interface MockWithdrawalRequest {
  id: string;
  userId: string;
  amount: Prisma.Decimal;
  currency: string;
  paymentDetails: Record<string, unknown>;
  taxStatus: TaxStatus;
  taxAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
  status: WithdrawalStatus;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommissionOptions {
  id?: string;
  partnerId?: string;
  sourceUserId?: string;
  sourceTransactionId?: string;
  level?: number;
  amount?: number;
  status?: CommissionStatus;
  createdAt?: Date;
  paidAt?: Date | null;
}

export interface CreateRelationshipOptions {
  id?: string;
  partnerId?: string;
  referralId?: string;
  level?: number;
  createdAt?: Date;
}

export interface CreateWithdrawalOptions {
  id?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  paymentDetails?: Record<string, unknown>;
  taxStatus?: TaxStatus;
  status?: WithdrawalStatus;
  processedAt?: Date | null;
}

/**
 * Create a mock partner commission
 */
export function createMockCommission(options: CreateCommissionOptions = {}): MockPartnerCommission {
  const id = options.id || uuidv4();
  const level = options.level ?? 1;
  const rate = COMMISSION_RATES[level as keyof typeof COMMISSION_RATES] || 0;
  const baseAmount = options.amount ?? 1000;
  const commissionAmount = baseAmount * rate;

  return {
    id,
    partnerId: options.partnerId || uuidv4(),
    sourceUserId: options.sourceUserId || uuidv4(),
    sourceTransactionId: options.sourceTransactionId || uuidv4(),
    level,
    rate: new Prisma.Decimal(rate),
    amount: new Prisma.Decimal(commissionAmount),
    status: options.status || CommissionStatus.PENDING,
    createdAt: options.createdAt || new Date(),
    paidAt: options.paidAt ?? null,
  };
}

/**
 * Create a pending commission
 */
export function createPendingCommission(
  partnerId: string,
  amount: number,
  level: number = 1,
): MockPartnerCommission {
  return createMockCommission({
    partnerId,
    amount,
    level,
    status: CommissionStatus.PENDING,
  });
}

/**
 * Create an approved commission
 */
export function createApprovedCommission(
  partnerId: string,
  amount: number,
  level: number = 1,
): MockPartnerCommission {
  return createMockCommission({
    partnerId,
    amount,
    level,
    status: CommissionStatus.APPROVED,
  });
}

/**
 * Create a mock partner relationship
 */
export function createMockRelationship(
  options: CreateRelationshipOptions = {},
): MockPartnerRelationship {
  return {
    id: options.id || uuidv4(),
    partnerId: options.partnerId || uuidv4(),
    referralId: options.referralId || uuidv4(),
    level: options.level ?? 1,
    createdAt: options.createdAt || new Date(),
  };
}

/**
 * Create a 5-level referral tree
 * Returns users and relationships for testing commission calculation
 */
export function create5LevelReferralTree(rootPartnerId?: string): {
  users: MockUser[];
  relationships: MockPartnerRelationship[];
} {
  const users: MockUser[] = [];
  const relationships: MockPartnerRelationship[] = [];

  // Root partner at level 0
  const rootPartner = createPartnerUser({
    id: rootPartnerId || uuidv4(),
    firstName: 'Root',
    lastName: 'Partner',
  });
  users.push(rootPartner);

  // Create 5 levels of referrals
  let previousUser = rootPartner;
  for (let level = 1; level <= 5; level++) {
    const referral = createMockUser({
      firstName: `Level${level}`,
      lastName: 'Referral',
      referredById: previousUser.id,
    });
    users.push(referral);

    // Create relationship from root to this referral
    relationships.push(
      createMockRelationship({
        partnerId: rootPartner.id,
        referralId: referral.id,
        level,
      }),
    );

    previousUser = referral;
  }

  return { users, relationships };
}

/**
 * Create a mock withdrawal request
 */
export function createMockWithdrawal(options: CreateWithdrawalOptions = {}): MockWithdrawalRequest {
  const id = options.id || uuidv4();
  const amount = options.amount ?? 10000;
  const taxStatus = options.taxStatus || TaxStatus.INDIVIDUAL;
  const taxRate = TAX_RATES[taxStatus];
  const taxAmount = amount * taxRate;
  const netAmount = amount - taxAmount;
  const now = new Date();

  return {
    id,
    userId: options.userId || uuidv4(),
    amount: new Prisma.Decimal(amount),
    currency: options.currency || 'RUB',
    paymentDetails: options.paymentDetails || {
      bankName: 'Test Bank',
      accountNumber: '40817810000000000001',
      bik: '044525225',
    },
    taxStatus,
    taxAmount: new Prisma.Decimal(taxAmount),
    netAmount: new Prisma.Decimal(netAmount),
    status: options.status || WithdrawalStatus.PENDING,
    processedAt: options.processedAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create commissions at all 5 levels for testing
 */
export function createCommissionsAtAllLevels(
  sourceTransactionId: string,
  sourceUserId: string,
  baseAmount: number,
  partnerIds: string[],
): MockPartnerCommission[] {
  const commissions: MockPartnerCommission[] = [];

  for (let level = 1; level <= Math.min(5, partnerIds.length); level++) {
    commissions.push(
      createMockCommission({
        partnerId: partnerIds[level - 1],
        sourceUserId,
        sourceTransactionId,
        level,
        amount: baseAmount,
        status: CommissionStatus.PENDING,
      }),
    );
  }

  return commissions;
}

/**
 * Calculate expected commission amount for a level
 */
export function calculateExpectedCommission(baseAmount: number, level: number): number {
  const rate = COMMISSION_RATES[level as keyof typeof COMMISSION_RATES] || 0;
  return baseAmount * rate;
}

/**
 * Calculate expected tax amount for a status
 */
export function calculateExpectedTax(amount: number, taxStatus: TaxStatus): number {
  const rate = TAX_RATES[taxStatus];
  return amount * rate;
}

/**
 * Partner factory object with all creation methods
 */
export const partnerFactory = {
  createCommission: createMockCommission,
  createPendingCommission,
  createApprovedCommission,
  createRelationship: createMockRelationship,
  create5LevelReferralTree,
  createWithdrawal: createMockWithdrawal,
  createCommissionsAtAllLevels,
  calculateExpectedCommission,
  calculateExpectedTax,
  COMMISSION_RATES,
  TAX_RATES,
};

export default partnerFactory;
