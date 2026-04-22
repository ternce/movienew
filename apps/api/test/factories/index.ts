/**
 * Test Factories Index
 *
 * Re-exports all test factories for convenient importing.
 * Uses named re-exports to avoid naming conflicts between factories.
 */

// ── User factory ──────────────────────────────────────────────────────
export {
  // Types & interfaces
  MockUser,
  CreateUserOptions,
  // Constants
  DEFAULT_PASSWORD,
  DEFAULT_PASSWORD_HASH,
  // Enums (re-exported from Prisma)
  AgeCategory,
  UserRole,
  VerificationStatus,
  VerificationMethod,
  // Functions
  generateReferralCode,
  getAgeCategory,
  createMockUser,
  createAdultUser,
  createMinorUser,
  createAdminUser,
  createPartnerUser,
  createModeratorUser,
  createInactiveUser,
  createVerifiedUser,
  createReferralChain,
} from './user.factory';
export { default as userFactory } from './user.factory';

// ── Content factory ───────────────────────────────────────────────────
export {
  // Types & interfaces
  MockContent,
  MockCategory,
  MockTag,
  MockGenre,
  MockWatchHistory,
  CreateContentOptions,
  CreateCategoryOptions as CreateContentCategoryOptions,
  CreateTagOptions,
  CreateGenreOptions,
  CreateWatchHistoryOptions,
  // Enums (re-exported from Prisma)
  ContentStatus,
  ContentType,
  // Functions
  generateSlug as generateContentSlug,
  createMockContent,
  createPublishedContent,
  createDraftContent,
  createFreeContent,
  createAdultContent,
  createChildContent,
  createSeriesContent,
  createClipContent,
  createShortContent,
  createTutorialContent,
  createMockCategory,
  createMockTag,
  createMockGenre,
  createMockWatchHistory,
  createContentWithRelations,
  // Factory objects
  categoryFactory,
  tagFactory,
  genreFactory,
  watchHistoryFactory,
} from './content.factory';
export { default as contentFactory } from './content.factory';

// ── Bonus factory ─────────────────────────────────────────────────────
export {
  // Types & interfaces
  MockBonusTransaction,
  MockPartnerCommission as MockBonusCommission,
  MockBonusCampaign,
  MockBonusWithdrawal,
  MockUserActivityBonus,
  MockBonusRate,
  CreateBonusTransactionOptions,
  CreatePartnerCommissionOptions as CreateBonusCommissionOptions,
  CreateBonusCampaignOptions,
  CreateBonusWithdrawalOptions,
  CreateBonusRateOptions,
  // Enums
  BonusTransactionType,
  BonusSource,
  // Functions
  createMockBonusTransaction,
  createEarnTransaction,
  createSpendTransaction,
  createAdjustmentTransaction,
  createMockBonusRate,
  createUserWithBalance,
  createTransactionHistory,
  createExpiringTransaction,
  createExpiredTransaction,
  createMockCommission as createMockBonusCommission,
  createMockCampaign,
  createMockWithdrawal as createMockBonusWithdrawal,
  createMockUserActivityBonus,
  createUserWithReferrer,
} from './bonus.factory';
export { default as bonusFactory } from './bonus.factory';

// ── Partner factory ───────────────────────────────────────────────────
export {
  // Types & interfaces
  MockPartnerCommission,
  MockPartnerRelationship,
  MockWithdrawalRequest,
  CreateCommissionOptions as CreatePartnerCommissionOptions,
  CreateRelationshipOptions,
  CreateWithdrawalOptions as CreatePartnerWithdrawalOptions,
  // Enums
  CommissionStatus as PartnerCommissionStatus,
  WithdrawalStatus as PartnerWithdrawalStatus,
  TaxStatus as PartnerTaxStatus,
  // Constants
  COMMISSION_RATES,
  TAX_RATES,
  // Functions
  createMockCommission as createMockPartnerCommission,
  createPendingCommission,
  createApprovedCommission,
  createMockRelationship,
  create5LevelReferralTree,
  createMockWithdrawal as createMockPartnerWithdrawal,
  createCommissionsAtAllLevels,
  calculateExpectedCommission,
  calculateExpectedTax,
} from './partner.factory';
export { default as partnerFactory } from './partner.factory';

// ── Product factory ───────────────────────────────────────────────────
export {
  // Types & interfaces
  MockProduct,
  MockProductCategory,
  CreateProductOptions,
  CreateCategoryOptions as CreateProductCategoryOptions,
  // Enums
  ProductStatus,
  // Functions
  createMockProduct,
  createActiveProduct,
  createOutOfStockProduct,
  createInactiveProduct,
  createProductWithBonusPrice,
  createMockProductCategory,
  createCategoryHierarchy,
  createProductsForCategory,
  createProductsWithPriceRange,
} from './product.factory';
export { default as productFactory } from './product.factory';

// ── Subscription factory ──────────────────────────────────────────────
export {
  // Types & interfaces
  MockSubscriptionPlan,
  MockUserSubscription,
  MockSubscriptionAccess,
  CreatePlanOptions,
  CreateUserSubscriptionOptions,
  CreateAccessOptions,
  // Enums
  SubscriptionType,
  SubscriptionStatus,
  // Functions
  createMockSubscriptionPlan,
  createPremiumPlan,
  createContentPlan,
  createTutorialPlan,
  createInactivePlan,
  createMockUserSubscription,
  createActiveSubscription,
  createExpiredSubscription,
  createCancelledSubscription,
  createPausedSubscription,
  createMockSubscriptionAccess,
  createSubscriptionAboutToExpire,
  calculateDaysRemaining,
} from './subscription.factory';
export { default as subscriptionFactory } from './subscription.factory';

// ── Order factory ─────────────────────────────────────────────────────
export {
  // Types & interfaces
  ShippingAddress,
  MockOrder,
  MockOrderItem,
  CartItem,
  CreateOrderOptions,
  CreateOrderItemOptions,
  // Enums
  OrderStatus,
  // Constants
  DEFAULT_SHIPPING_ADDRESS,
  // Functions
  createMockOrder,
  createPendingOrder,
  createPaidOrder,
  createShippedOrder,
  createCancelledOrder,
  createOrderWithBonus,
  createMockOrderItem,
  createOrderItemsFromProducts,
  createOrderWithItems,
  calculateCartTotal,
  createCartData,
  createOrderHistory,
  canCancelOrder,
} from './order.factory';
export { default as orderFactory } from './order.factory';

// ── Transaction factory ───────────────────────────────────────────────
export {
  // Types & interfaces
  MockTransaction,
  CreateTransactionOptions,
  // Enums (re-exported from Prisma)
  TransactionType,
  TransactionStatus,
  PaymentMethodType,
  // Functions
  createMockTransaction,
  createPendingTransaction,
  createCompletedTransaction,
  createFailedTransaction,
  createRefundedTransaction,
  createSubscriptionTransaction,
  createStoreTransaction,
  createBonusPurchaseTransaction,
  createCardPaymentTransaction,
  createSbpPaymentTransaction,
  createBankTransferTransaction,
  createTransactionWithBonus,
  createFullyBonusCoveredTransaction,
} from './transaction.factory';
export { default as transactionFactory } from './transaction.factory';
