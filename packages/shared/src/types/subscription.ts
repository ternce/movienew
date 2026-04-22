// Subscription plan types
export enum SubscriptionPlanType {
  SERIES = 'SERIES',
  TUTORIAL = 'TUTORIAL',
  PREMIUM = 'PREMIUM',
}

// Subscription status
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PAUSED = 'PAUSED',
}

// Subscription plan
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: SubscriptionPlanType;
  contentId?: string; // For individual series/tutorial subscriptions
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
}

// User subscription
export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date;
  autoRenew: boolean;
  cancelledAt?: Date;
}

// Subscription access
export interface SubscriptionAccess {
  id: string;
  subscriptionId: string;
  contentId: string;
  grantedAt: Date;
  revokedAt?: Date;
}
