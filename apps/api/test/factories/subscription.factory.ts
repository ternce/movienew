/**
 * Subscription Factory for Tests
 *
 * Generates test subscription plans and user subscription data.
 */

import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

// Subscription plan types
export enum SubscriptionType {
  PREMIUM = 'PREMIUM',
  CONTENT = 'CONTENT',
  TUTORIAL = 'TUTORIAL',
}

// Subscription status
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PAUSED = 'PAUSED',
}

export interface MockSubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: SubscriptionType;
  price: Prisma.Decimal;
  currency: string;
  durationDays: number;
  contentId: string | null;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockUserSubscription {
  id: string;
  userId: string;
  planId: string;
  transactionId: string | null;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date;
  autoRenew: boolean;
  cancelledAt: Date | null;
  pausedAt: Date | null;
  resumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockSubscriptionAccess {
  id: string;
  userId: string;
  subscriptionId: string;
  contentId: string;
  grantedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreatePlanOptions {
  id?: string;
  name?: string;
  description?: string;
  type?: SubscriptionType;
  price?: number;
  currency?: string;
  durationDays?: number;
  contentId?: string | null;
  features?: string[];
  isActive?: boolean;
}

export interface CreateUserSubscriptionOptions {
  id?: string;
  userId?: string;
  planId?: string;
  transactionId?: string | null;
  status?: SubscriptionStatus;
  startedAt?: Date;
  expiresAt?: Date;
  autoRenew?: boolean;
  cancelledAt?: Date | null;
  pausedAt?: Date | null;
  resumedAt?: Date | null;
}

export interface CreateAccessOptions {
  id?: string;
  userId?: string;
  subscriptionId?: string;
  contentId?: string;
  grantedAt?: Date;
  revokedAt?: Date | null;
}

/**
 * Create a mock subscription plan
 */
export function createMockSubscriptionPlan(options: CreatePlanOptions = {}): MockSubscriptionPlan {
  const id = options.id || uuidv4();
  const type = options.type || SubscriptionType.PREMIUM;
  const now = new Date();

  return {
    id,
    name: options.name || `${type} Plan`,
    description: options.description || `Description for ${type} subscription`,
    type,
    price: new Prisma.Decimal(options.price ?? 999),
    currency: options.currency || 'RUB',
    durationDays: options.durationDays ?? 30,
    contentId: options.contentId ?? null,
    features: options.features || ['Feature 1', 'Feature 2', 'Feature 3'],
    isActive: options.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a premium subscription plan
 */
export function createPremiumPlan(options: Omit<CreatePlanOptions, 'type'> = {}): MockSubscriptionPlan {
  return createMockSubscriptionPlan({
    ...options,
    type: SubscriptionType.PREMIUM,
    name: options.name || 'Premium Subscription',
    price: options.price ?? 1499,
    features: options.features || [
      'Unlimited access to all content',
      'Ad-free experience',
      'HD video quality',
      'Offline downloads',
    ],
  });
}

/**
 * Create a content-specific subscription plan
 */
export function createContentPlan(
  contentId: string,
  options: Omit<CreatePlanOptions, 'type' | 'contentId'> = {},
): MockSubscriptionPlan {
  return createMockSubscriptionPlan({
    ...options,
    type: SubscriptionType.CONTENT,
    contentId,
    name: options.name || 'Series Subscription',
    price: options.price ?? 499,
    features: options.features || ['Access to selected series', 'HD quality'],
  });
}

/**
 * Create a tutorial subscription plan
 */
export function createTutorialPlan(options: Omit<CreatePlanOptions, 'type'> = {}): MockSubscriptionPlan {
  return createMockSubscriptionPlan({
    ...options,
    type: SubscriptionType.TUTORIAL,
    name: options.name || 'Tutorial Access',
    price: options.price ?? 299,
    features: options.features || ['Access to video tutorials', 'Downloadable materials'],
  });
}

/**
 * Create an inactive subscription plan
 */
export function createInactivePlan(options: Omit<CreatePlanOptions, 'isActive'> = {}): MockSubscriptionPlan {
  return createMockSubscriptionPlan({
    ...options,
    isActive: false,
  });
}

/**
 * Create a mock user subscription
 */
export function createMockUserSubscription(
  options: CreateUserSubscriptionOptions = {},
): MockUserSubscription {
  const id = options.id || uuidv4();
  const now = new Date();
  const startedAt = options.startedAt || now;
  const durationMs = 30 * 24 * 60 * 60 * 1000; // 30 days default
  const expiresAt = options.expiresAt || new Date(startedAt.getTime() + durationMs);

  return {
    id,
    userId: options.userId || uuidv4(),
    planId: options.planId || uuidv4(),
    transactionId: options.transactionId ?? null,
    status: options.status || SubscriptionStatus.ACTIVE,
    startedAt,
    expiresAt,
    autoRenew: options.autoRenew ?? true,
    cancelledAt: options.cancelledAt ?? null,
    pausedAt: options.pausedAt ?? null,
    resumedAt: options.resumedAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create an active subscription
 */
export function createActiveSubscription(
  userId: string,
  planId: string,
  durationDays: number = 30,
): MockUserSubscription {
  const now = new Date();
  return createMockUserSubscription({
    userId,
    planId,
    status: SubscriptionStatus.ACTIVE,
    startedAt: now,
    expiresAt: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000),
    autoRenew: true,
  });
}

/**
 * Create an expired subscription
 */
export function createExpiredSubscription(userId: string, planId: string): MockUserSubscription {
  const now = new Date();
  const expiredDaysAgo = 7;
  return createMockUserSubscription({
    userId,
    planId,
    status: SubscriptionStatus.EXPIRED,
    startedAt: new Date(now.getTime() - 37 * 24 * 60 * 60 * 1000), // Started 37 days ago
    expiresAt: new Date(now.getTime() - expiredDaysAgo * 24 * 60 * 60 * 1000), // Expired 7 days ago
    autoRenew: false,
  });
}

/**
 * Create a cancelled subscription
 */
export function createCancelledSubscription(
  userId: string,
  planId: string,
  immediate: boolean = true,
): MockUserSubscription {
  const now = new Date();
  const startedAt = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // Started 15 days ago

  return createMockUserSubscription({
    userId,
    planId,
    status: immediate ? SubscriptionStatus.CANCELLED : SubscriptionStatus.ACTIVE,
    startedAt,
    expiresAt: immediate
      ? now
      : new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
    autoRenew: false,
    cancelledAt: now,
  });
}

/**
 * Create a paused subscription
 */
export function createPausedSubscription(userId: string, planId: string): MockUserSubscription {
  const now = new Date();
  return createMockUserSubscription({
    userId,
    planId,
    status: SubscriptionStatus.PAUSED,
    startedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // Frozen at 20 days remaining
    autoRenew: true,
    pausedAt: now,
  });
}

/**
 * Create a mock subscription access record
 */
export function createMockSubscriptionAccess(options: CreateAccessOptions = {}): MockSubscriptionAccess {
  const now = new Date();
  return {
    id: options.id || uuidv4(),
    userId: options.userId || uuidv4(),
    subscriptionId: options.subscriptionId || uuidv4(),
    contentId: options.contentId || uuidv4(),
    grantedAt: options.grantedAt || now,
    revokedAt: options.revokedAt ?? null,
    createdAt: now,
  };
}

/**
 * Create subscription about to expire (for renewal testing)
 */
export function createSubscriptionAboutToExpire(
  userId: string,
  planId: string,
  daysUntilExpiry: number = 3,
): MockUserSubscription {
  const now = new Date();
  return createMockUserSubscription({
    userId,
    planId,
    status: SubscriptionStatus.ACTIVE,
    startedAt: new Date(now.getTime() - (30 - daysUntilExpiry) * 24 * 60 * 60 * 1000),
    expiresAt: new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000),
    autoRenew: true,
  });
}

/**
 * Calculate days remaining for a subscription
 */
export function calculateDaysRemaining(expiresAt: Date): number {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

/**
 * Subscription factory object with all creation methods
 */
export const subscriptionFactory = {
  createPlan: createMockSubscriptionPlan,
  createPremiumPlan,
  createContentPlan,
  createTutorialPlan,
  createInactivePlan,
  createSubscription: createMockUserSubscription,
  createActive: createActiveSubscription,
  createExpired: createExpiredSubscription,
  createCancelled: createCancelledSubscription,
  createPaused: createPausedSubscription,
  createAccess: createMockSubscriptionAccess,
  createAboutToExpire: createSubscriptionAboutToExpire,
  calculateDaysRemaining,
};

export default subscriptionFactory;
