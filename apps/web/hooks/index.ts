// Hooks index
export { useAuth } from './use-auth';
export { useDebounce, useDebouncedCallback, useDebouncedCallbackImmediate } from './use-debounce';
export {
  useKeyboardShortcuts,
  useVideoPlayerShortcuts,
  useNavigationShortcuts,
} from './use-keyboard-shortcuts';
export { useIsMobile, useIsTablet, useIsDesktop, useMediaQuery } from './use-media-query';
export { useMounted } from './use-mounted';
export {
  useScrollReveal,
  useStaggeredReveal,
  useParallax,
  useScrollDirection,
} from './use-scroll-reveal';
export { useUserGenres, useGenres } from './use-user-genres';
export {
  useSubscription,
  useSubscriptionPlans,
  useSubscriptionPlan,
  useMySubscriptions,
  useActiveSubscription,
  useContentAccess,
  usePurchaseSubscription,
  useCancelSubscription,
  useToggleAutoRenew,
} from './use-subscription';
export {
  usePayment,
  usePaymentStatus,
  useTransactionHistory,
  useInitiatePayment,
  useRequestRefund,
  handlePaymentRedirect,
} from './use-payment';
export {
  useBonus,
  useBonusBalance,
  useBonusStatistics,
  useBonusHistory,
  useBonusRate,
  useExpiringBonuses,
  useMaxApplicable,
  useWithdrawalPreview,
  useWithdrawBonus,
  formatBonusAmount,
  getBonusTypeLabel,
  getBonusSourceLabel,
  getBonusTypeColor,
} from './use-bonus';
export { useSearchSuggestions, useSearchResults } from './use-search';
export {
  useAdminBonus,
  useAdminBonusStats,
  useAdminBonusRates,
  useCreateBonusRate,
  useUpdateBonusRate,
  useAdminBonusCampaigns,
  useAdminBonusCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  useExecuteCampaign,
  useCancelCampaign,
  useAdminUserBonusDetails,
  useAdjustUserBalance,
} from './use-admin-bonus';
export {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './use-notifications';
export { useNotificationSocket } from './use-notification-socket';
export {
  useDocuments,
  useDocument,
  usePendingDocuments,
  useAcceptDocument,
  getDocumentTypeLabel,
  documentTypeLabels,
} from './use-documents';
export {
  useAdminContent,
  useAdminContentDetail,
  useCreateContent,
  useUpdateContent,
  useDeleteContent,
} from './use-admin-content';
export {
  useAdminUsers,
  useAdminUserDetail,
  useUpdateAdminUser,
} from './use-admin-users';
export {
  useProfile,
  useUpdateProfile,
  useVerificationStatus,
  useSubmitVerification,
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchHistory,
  useActiveSessions,
  useTerminateSession,
  useTerminateAllSessions,
} from './use-account';
export {
  useAdminTemplates,
  useAdminTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSendNotification,
  useAdminNewsletters,
  useAdminNewsletter,
  useCreateNewsletter,
  useUpdateNewsletter,
  useSendNewsletter,
  useScheduleNewsletter,
  useCancelNewsletter,
} from './use-admin-notifications';
export {
  useAdminDocuments,
  useAdminDocument,
  useCreateDocument,
  useUpdateDocument,
  usePublishDocument,
  useDeactivateDocument,
  useDocumentAcceptances,
  useDocumentVersions,
} from './use-admin-documents';
export {
  useAdminAuditLogs,
  useAdminAuditLog,
} from './use-admin-audit';
export {
  useAdminTransactions,
  useAdminTransaction,
  useRefundTransaction,
  useAdminPaymentStats,
} from './use-admin-payments';
