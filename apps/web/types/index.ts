// Re-export all types from shared package
export * from '@movie-platform/shared';

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: ApiError;
  meta?: PaginationMeta;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// =============================================================================
// Authentication Types
// =============================================================================

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Login response with tokens
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: import('@movie-platform/shared').User;
  expiresAt: string;
  sessionId?: string;
}

/**
 * Register request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  referralCode?: string;
  acceptTerms: boolean;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  sessionId?: string;
}

/**
 * Forgot password request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Reset password request
 */
export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

// =============================================================================
// Content Query Types
// =============================================================================

/**
 * Content list query parameters
 */
export interface ContentListParams {
  page?: number;
  limit?: number;
  contentType?: import('@movie-platform/shared').ContentType;
  ageCategory?: import('@movie-platform/shared').AgeCategory;
  categoryId?: string;
  tagIds?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'viewCount' | 'title' | 'rating';
  sortOrder?: 'asc' | 'desc';
  isFeatured?: boolean;
  isPublished?: boolean;
}

/**
 * Search query parameters
 */
export interface SearchParams {
  query: string;
  type?: 'all' | 'series' | 'clips' | 'shorts' | 'tutorials';
  limit?: number;
}

// =============================================================================
// User Profile Types
// =============================================================================

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  avatar?: string;
  phone?: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Base component props with className support
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Props for components that can be disabled
 */
export interface DisableableProps {
  disabled?: boolean;
}

/**
 * Props for components with loading state
 */
export interface LoadableProps {
  isLoading?: boolean;
}

// =============================================================================
// Navigation Types
// =============================================================================

/**
 * Navigation item
 */
export interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
  external?: boolean;
  children?: NavItem[];
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  title: string;
  href?: string;
}

// =============================================================================
// Form Types
// =============================================================================

/**
 * Form field error
 */
export interface FieldError {
  message: string;
  type: string;
}

/**
 * Generic form state
 */
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, FieldError>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// =============================================================================
// Genre Types
// =============================================================================

/**
 * Genre entity
 */
export interface Genre {
  id: string;
  name: string;
  slug: string;
  color: string;
  iconUrl?: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * User genre preference
 */
export interface UserGenrePreference {
  id: string;
  userId: string;
  genreId: string;
  color?: string;
  order: number;
  createdAt: string;
  genre: {
    id: string;
    name: string;
    slug: string;
    color: string;
    iconUrl?: string;
  };
}

/**
 * Add genre preference request
 */
export interface AddGenrePreferenceRequest {
  genreId: string;
  color?: string;
}

/**
 * Update genre preference request
 */
export interface UpdateGenrePreferenceRequest {
  color?: string;
  order?: number;
}

/**
 * Reorder genre preferences request
 */
export interface ReorderGenrePreferencesRequest {
  preferenceIds: string[];
}

// =============================================================================
// Subscription Types
// =============================================================================

/**
 * Subscription plan type
 */
export type SubscriptionPlanType = 'PREMIUM' | 'CONTENT_SPECIFIC';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';

/**
 * Subscription plan
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: SubscriptionPlanType;
  contentId?: string;
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
}

/**
 * User subscription
 */
export interface UserSubscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  cancelledAt?: string;
  daysRemaining: number;
}

/**
 * Content access check result
 */
export interface ContentAccessResult {
  contentId: string;
  hasAccess: boolean;
  subscriptionId?: string;
  reason?: string;
}

/**
 * Purchase subscription request
 */
export interface PurchaseSubscriptionRequest {
  planId: string;
  paymentMethod: PaymentMethodType;
  bonusAmount?: number;
  returnUrl?: string;
  autoRenew?: boolean;
}

/**
 * Cancel subscription request
 */
export interface CancelSubscriptionRequest {
  subscriptionId: string;
  immediate?: boolean;
  reason?: string;
}

/**
 * Toggle auto-renew request
 */
export interface ToggleAutoRenewRequest {
  subscriptionId: string;
  autoRenew: boolean;
}

// =============================================================================
// Payment Types
// =============================================================================

/**
 * Payment method types
 */
export type PaymentMethodType = 'CARD' | 'SBP' | 'BANK_TRANSFER';

/**
 * Transaction type
 */
export type TransactionType = 'SUBSCRIPTION' | 'STORE' | 'BONUS_PURCHASE' | 'WITHDRAWAL';

/**
 * Transaction status
 */
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

/**
 * Initiate payment request
 */
export interface InitiatePaymentRequest {
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethodType;
  bonusAmount?: number;
  referenceId?: string;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payment result
 */
export interface PaymentResult {
  transactionId: string;
  status: TransactionStatus;
  paymentMethod: PaymentMethodType;
  amount: number;
  bonusAmountUsed: number;
  amountToPay: number;
  redirectUrl?: string;
  qrCodeUrl?: string;
  expiresAt?: string;
  bankDetails?: BankDetails;
  invoiceNumber?: string;
  createdAt: string;
}

/**
 * Bank transfer details
 */
export interface BankDetails {
  bankName: string;
  bik: string;
  accountNumber: string;
  recipientName: string;
  inn: string;
  kpp: string;
}

/**
 * Payment status
 */
export interface PaymentStatus {
  transactionId: string;
  status: TransactionStatus;
  type: TransactionType;
  amount: number;
  createdAt: string;
  completedAt?: string;
}

/**
 * Transaction
 */
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  bonusAmountUsed: number;
  paymentMethod: PaymentMethodType;
  status: TransactionStatus;
  providerTransactionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

/**
 * Transaction query params
 */
export interface TransactionQueryParams {
  type?: TransactionType;
  status?: TransactionStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Refund request
 */
export interface RefundRequest {
  transactionId: string;
  amount?: number;
  reason?: string;
}

/**
 * Paginated list response
 */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// =============================================================================
// Partner Program Types
// =============================================================================

/**
 * Partner level enum
 */
export type PartnerLevel = 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

/**
 * Commission status
 */
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

/**
 * Withdrawal status
 */
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

/**
 * Tax status for Russian tax system
 */
export type TaxStatus = 'INDIVIDUAL' | 'SELF_EMPLOYED' | 'ENTREPRENEUR' | 'COMPANY';

/**
 * Partner level configuration
 */
export interface PartnerLevelConfig {
  level: PartnerLevel;
  name: string;
  minReferrals: number;
  minEarnings: number;
  commissionRate: number;
  benefits: string[];
}

/**
 * Partner dashboard data
 */
export interface PartnerDashboard {
  level: PartnerLevel;
  levelName: string;
  referralCode: string;
  referralUrl: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
  withdrawnAmount: number;
  currentMonthEarnings: number;
  previousMonthEarnings: number;
  levelProgress: LevelProgress;
  recentCommissions: Commission[];
}

/**
 * Level progress information
 */
export interface LevelProgress {
  currentLevel: PartnerLevel;
  nextLevel: PartnerLevel | null;
  referralsProgress: {
    current: number;
    required: number;
    percentage: number;
  };
  earningsProgress: {
    current: number;
    required: number;
    percentage: number;
  };
}

/**
 * Referral node in the tree
 */
export interface ReferralNode {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  level: number;
  registeredAt: string;
  isActive: boolean;
  totalPaid: number;
  commissionsGenerated: number;
  children?: ReferralNode[];
}

/**
 * Referral tree data
 */
export interface ReferralTree {
  nodes: ReferralNode[];
  totalCount: number;
  depth: number;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    byLevel: Record<number, number>;
  };
}

/**
 * Commission record
 */
export interface Commission {
  id: string;
  sourceUserId: string;
  sourceUser: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
  };
  transactionId: string;
  level: number;
  amount: number;
  rate: number;
  status: CommissionStatus;
  description?: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
}

/**
 * Commission query params
 */
export interface CommissionQueryParams {
  status?: CommissionStatus;
  level?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Commission list response
 */
export interface CommissionList {
  items: Commission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalAmount: number;
}

/**
 * Available balance info
 */
export interface AvailableBalance {
  available: number;
  pending: number;
  processing: number;
  minimumWithdrawal: number;
  canWithdraw: boolean;
}

/**
 * Tax calculation preview
 */
export interface TaxCalculation {
  grossAmount: number;
  taxStatus: TaxStatus;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  explanation: string;
}

/**
 * Payment details for withdrawal
 */
export interface PaymentDetails {
  type: 'card' | 'bank_account';
  cardNumber?: string;
  cardHolder?: string;
  bankAccount?: string;
  bankName?: string;
  bik?: string;
  recipientName?: string;
}

/**
 * Withdrawal record
 */
export interface Withdrawal {
  id: string;
  amount: number;
  taxStatus: TaxStatus;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  status: WithdrawalStatus;
  paymentDetails: PaymentDetails;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
}

/**
 * Withdrawal query params
 */
export interface WithdrawalQueryParams {
  status?: WithdrawalStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Withdrawal list response
 */
export interface WithdrawalList {
  items: Withdrawal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalAmount: number;
  totalNetAmount: number;
}

/**
 * Create withdrawal request
 */
export interface CreateWithdrawalRequest {
  amount: number;
  taxStatus: TaxStatus;
  paymentDetails: PaymentDetails;
}

/**
 * Payment method (saved)
 */
export interface SavedPaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  name: string;
  isDefault: boolean;
  maskedNumber: string;
  bankName?: string;
  createdAt: string;
}

// =============================================================================
// Admin Partner Types
// =============================================================================

/**
 * Admin partner stats
 */
export interface AdminPartnerStats {
  totalPartners: number;
  activePartners: number;
  newPartnersThisMonth: number;
  totalEarnings: number;
  pendingCommissions: number;
  pendingWithdrawals: number;
  completedWithdrawalsThisMonth: number;
  byLevel: Record<PartnerLevel, number>;
}

/**
 * Admin partner in list
 */
export interface AdminPartner {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  level: PartnerLevel;
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingBalance: number;
  availableBalance: number;
  withdrawnAmount: number;
  registeredAt: string;
  lastActivityAt?: string;
}

/**
 * Admin partner query params
 */
export interface AdminPartnerQueryParams {
  search?: string;
  level?: PartnerLevel;
  minEarnings?: number;
  hasBalance?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'totalEarnings' | 'totalReferrals' | 'registeredAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Admin partner list response
 */
export interface AdminPartnerList {
  items: AdminPartner[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Admin partner detail
 */
export interface AdminPartnerDetail extends AdminPartner {
  recentCommissions: Commission[];
  recentWithdrawals: Withdrawal[];
  referralTreePreview: ReferralNode[];
  directReferrals?: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    isActive: boolean;
    registeredAt: string;
  }>;
  referredBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
  };
  levelProgress?: {
    currentLevel: PartnerLevel;
    nextLevel: PartnerLevel | null;
    currentReferrals: number;
    requiredReferrals: number;
    currentEarnings: number;
    requiredEarnings: number;
  };
}

/**
 * Admin commission in list
 */
export interface AdminCommission extends Commission {
  partnerId: string;
  partnerEmail: string;
  partnerName: string;
}

/**
 * Admin commission query params
 */
export interface AdminCommissionQueryParams {
  status?: CommissionStatus;
  level?: number;
  partnerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Admin commission list response
 */
export interface AdminCommissionList {
  items: AdminCommission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalAmount: number;
}

/**
 * Admin withdrawal in list
 */
export interface AdminWithdrawal extends Withdrawal {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    referralCode: string;
  };
  processedAt?: string;
  processedBy?: string;
}

/**
 * Admin withdrawal query params
 */
export interface AdminWithdrawalQueryParams {
  status?: WithdrawalStatus;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Admin withdrawal list response
 */
export interface AdminWithdrawalList {
  items: AdminWithdrawal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalAmount: number;
  totalNetAmount: number;
}

/**
 * Admin withdrawal stats
 */
export interface AdminWithdrawalStats {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  processingCount: number;
  processingAmount: number;
  completedThisMonth: number;
  completedAmountThisMonth: number;
  completedAmount: number;
}

/**
 * Commission action response
 */
export interface CommissionActionResponse {
  success: boolean;
  message: string;
  commission: AdminCommission;
}

/**
 * Batch commission action response
 */
export interface BatchCommissionActionResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Withdrawal action response
 */
export interface WithdrawalActionResponse {
  success: boolean;
  message: string;
  withdrawal: AdminWithdrawal;
}
