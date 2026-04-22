import { QueryClient, type Mutation, isServer } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from './error-messages';

/**
 * Create a new QueryClient instance with default options
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (garbage collection time)
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Don't retry on 401/403/404 errors
          if (error instanceof Error && 'status' in error) {
            const status = (error as Error & { status: number }).status;
            if (status === 401 || status === 403 || status === 404) {
              return false;
            }
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: false,
        onError: (error, _variables, _context, mutation: Mutation) => {
          // Log mutation errors in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Mutation error:', error);
          }

          // Skip global toast if mutation opts into manual handling
          const meta = mutation.options.meta as
            | { skipGlobalError?: boolean }
            | undefined;
          if (meta?.skipGlobalError) return;

          // Show toast with user-friendly error message
          const message = getApiErrorMessage(error);
          toast.error(message);
        },
      },
    },
  });
}

/**
 * Browser query client singleton
 * We need to ensure we only create one instance on the client
 */
let browserQueryClient: QueryClient | undefined;

/**
 * Get the appropriate QueryClient instance
 * - Server: Always creates a new instance (request isolation)
 * - Browser: Returns singleton instance (state persistence)
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  }

  // Browser: make a new query client if we don't already have one
  // This is very important, so we don't re-make a new client if React
  // suspends during the initial render. This may not be needed if we
  // have a suspense boundary BELOW the creation of the query client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}

/**
 * Query keys factory for consistent key management
 */
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    detail: (id: string) => [...queryKeys.users.all, id] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
    verification: () => [...queryKeys.users.all, 'verification'] as const,
  },

  // Content
  content: {
    all: ['content'] as const,
    lists: () => [...queryKeys.content.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.content.lists(), params] as const,
    details: () => [...queryKeys.content.all, 'detail'] as const,
    detail: (slug: string) => [...queryKeys.content.details(), slug] as const,
    featured: () => [...queryKeys.content.all, 'featured'] as const,
    search: (query: string) => [...queryKeys.content.all, 'search', query] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    list: (contentId: string) => [...queryKeys.comments.all, 'list', contentId] as const,
  },

  // Series
  series: {
    all: ['series'] as const,
    lists: () => [...queryKeys.series.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.series.lists(), params] as const,
    detail: (slug: string) => [...queryKeys.series.all, 'detail', slug] as const,
    episodes: (seriesId: string) => [...queryKeys.series.all, seriesId, 'episodes'] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    tree: () => [...queryKeys.categories.all, 'tree'] as const,
  },

  // Watch history
  watchHistory: {
    all: ['watchHistory'] as const,
    list: () => [...queryKeys.watchHistory.all, 'list'] as const,
    continueWatching: () => [...queryKeys.watchHistory.all, 'continue'] as const,
    progress: (contentId: string) => [...queryKeys.watchHistory.all, 'progress', contentId] as const,
  },

  // Subscriptions
  subscriptions: {
    all: ['subscriptions'] as const,
    plans: () => [...queryKeys.subscriptions.all, 'plans'] as const,
    plan: (id: string) => [...queryKeys.subscriptions.all, 'plan', id] as const,
    my: () => [...queryKeys.subscriptions.all, 'my'] as const,
    active: () => [...queryKeys.subscriptions.all, 'active'] as const,
    access: (contentId: string) => [...queryKeys.subscriptions.all, 'access', contentId] as const,
  },

  // Payments
  payments: {
    all: ['payments'] as const,
    status: (transactionId: string) => [...queryKeys.payments.all, 'status', transactionId] as const,
    transactions: (params?: Record<string, unknown>) =>
      [...queryKeys.payments.all, 'transactions', params] as const,
  },

  // Partners
  partners: {
    all: ['partners'] as const,
    // Public
    levels: () => [...queryKeys.partners.all, 'levels'] as const,
    // User dashboard
    dashboard: () => [...queryKeys.partners.all, 'dashboard'] as const,
    referrals: (depth?: number) => [...queryKeys.partners.all, 'referrals', { depth }] as const,
    commissions: (params?: Record<string, unknown>) =>
      [...queryKeys.partners.all, 'commissions', params] as const,
    commission: (id: string) => [...queryKeys.partners.all, 'commission', id] as const,
    balance: () => [...queryKeys.partners.all, 'balance'] as const,
    withdrawals: (params?: Record<string, unknown>) =>
      [...queryKeys.partners.all, 'withdrawals', params] as const,
    withdrawal: (id: string) => [...queryKeys.partners.all, 'withdrawal', id] as const,
    taxPreview: (amount: number, taxStatus: string) =>
      [...queryKeys.partners.all, 'taxPreview', { amount, taxStatus }] as const,
    paymentMethods: () => [...queryKeys.partners.all, 'paymentMethods'] as const,
  },

  // Admin Partners
  adminPartners: {
    all: ['adminPartners'] as const,
    // Partners list
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.adminPartners.all, 'list', params] as const,
    stats: () => [...queryKeys.adminPartners.all, 'stats'] as const,
    detail: (userId: string) => [...queryKeys.adminPartners.all, 'detail', userId] as const,
    // Commissions
    commissions: (params?: Record<string, unknown>) =>
      [...queryKeys.adminPartners.all, 'commissions', params] as const,
    // Withdrawals
    withdrawalStats: () => [...queryKeys.adminPartners.all, 'withdrawalStats'] as const,
    withdrawals: (params?: Record<string, unknown>) =>
      [...queryKeys.adminPartners.all, 'withdrawals', params] as const,
    withdrawalDetail: (id: string) =>
      [...queryKeys.adminPartners.all, 'withdrawalDetail', id] as const,
  },

  // Bonuses
  bonuses: {
    all: ['bonuses'] as const,
    balance: () => [...queryKeys.bonuses.all, 'balance'] as const,
    statistics: () => [...queryKeys.bonuses.all, 'statistics'] as const,
    transactions: (params?: Record<string, unknown>) =>
      [...queryKeys.bonuses.all, 'transactions', params] as const,
    expiring: (days?: number) =>
      [...queryKeys.bonuses.all, 'expiring', { days }] as const,
    maxApplicable: (orderTotal: number) =>
      [...queryKeys.bonuses.all, 'maxApplicable', { orderTotal }] as const,
    rate: () => [...queryKeys.bonuses.all, 'rate'] as const,
  },

  // Admin Bonuses
  adminBonuses: {
    all: ['adminBonuses'] as const,
    stats: () => [...queryKeys.adminBonuses.all, 'stats'] as const,
    rates: () => [...queryKeys.adminBonuses.all, 'rates'] as const,
    campaigns: (params?: Record<string, unknown>) =>
      [...queryKeys.adminBonuses.all, 'campaigns', params] as const,
    campaign: (id: string) => [...queryKeys.adminBonuses.all, 'campaign', id] as const,
    userDetails: (userId: string) =>
      [...queryKeys.adminBonuses.all, 'userDetails', userId] as const,
  },

  // Store
  store: {
    all: ['store'] as const,
    products: (params?: Record<string, unknown>) =>
      [...queryKeys.store.all, 'products', params] as const,
    categories: () => [...queryKeys.store.all, 'categories'] as const,
    product: (slug: string) => [...queryKeys.store.all, 'product', slug] as const,
    cart: () => [...queryKeys.store.all, 'cart'] as const,
    cartSummary: () => [...queryKeys.store.all, 'cartSummary'] as const,
    orders: (params?: Record<string, unknown>) =>
      [...queryKeys.store.all, 'orders', params] as const,
    order: (id: string) => [...queryKeys.store.all, 'order', id] as const,
  },

  // Watchlist
  watchlist: {
    all: ['watchlist'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.watchlist.all, 'list', params] as const,
  },

  // User Sessions
  sessions: {
    all: ['sessions'] as const,
    list: () => [...queryKeys.sessions.all, 'list'] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.notifications.all, 'list', params] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread'] as const,
    preferences: () => [...queryKeys.notifications.all, 'preferences'] as const,
  },

  // Documents
  documents: {
    all: ['documents'] as const,
    list: () => [...queryKeys.documents.all, 'list'] as const,
    detail: (type: string) => [...queryKeys.documents.all, type] as const,
    pending: () => [...queryKeys.documents.all, 'pending'] as const,
  },

  // Admin Notifications
  adminNotifications: {
    all: ['adminNotifications'] as const,
    templates: (params?: Record<string, unknown>) =>
      [...queryKeys.adminNotifications.all, 'templates', params] as const,
    template: (id: string) =>
      [...queryKeys.adminNotifications.all, 'template', id] as const,
    newsletters: (params?: Record<string, unknown>) =>
      [...queryKeys.adminNotifications.all, 'newsletters', params] as const,
    newsletter: (id: string) =>
      [...queryKeys.adminNotifications.all, 'newsletter', id] as const,
  },

  // Admin Documents
  adminDocuments: {
    all: ['adminDocuments'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.adminDocuments.all, 'list', params] as const,
    detail: (id: string) =>
      [...queryKeys.adminDocuments.all, 'detail', id] as const,
    acceptances: (id: string, params?: Record<string, unknown>) =>
      [...queryKeys.adminDocuments.all, 'acceptances', id, params] as const,
    versions: (type: string) =>
      [...queryKeys.adminDocuments.all, 'versions', type] as const,
  },

  // Admin Audit
  adminAudit: {
    all: ['adminAudit'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.adminAudit.all, 'list', params] as const,
    detail: (id: string) =>
      [...queryKeys.adminAudit.all, 'detail', id] as const,
  },

  // Admin Payments
  adminPayments: {
    all: ['adminPayments'] as const,
    transactions: (params?: Record<string, unknown>) =>
      [...queryKeys.adminPayments.all, 'transactions', params] as const,
    transaction: (id: string) =>
      [...queryKeys.adminPayments.all, 'transaction', id] as const,
    stats: () => [...queryKeys.adminPayments.all, 'stats'] as const,
  },

  // Admin Dashboard
  adminDashboard: {
    all: ['adminDashboard'] as const,
    overview: () => [...queryKeys.adminDashboard.all, 'overview'] as const,
    stats: () => [...queryKeys.adminDashboard.all, 'stats'] as const,
  },

  // Admin Store
  adminStore: {
    all: ['adminStore'] as const,
    products: (params?: Record<string, unknown>) =>
      [...queryKeys.adminStore.all, 'products', params] as const,
    product: (id: string) =>
      [...queryKeys.adminStore.all, 'product', id] as const,
    productStats: () =>
      [...queryKeys.adminStore.all, 'productStats'] as const,
    categories: () =>
      [...queryKeys.adminStore.all, 'categories'] as const,
    orders: (params?: Record<string, unknown>) =>
      [...queryKeys.adminStore.all, 'orders', params] as const,
    order: (id: string) =>
      [...queryKeys.adminStore.all, 'order', id] as const,
    orderStats: () =>
      [...queryKeys.adminStore.all, 'orderStats'] as const,
  },

  // Streaming
  streaming: {
    all: ['streaming'] as const,
    url: (contentId: string) => [...queryKeys.streaming.all, 'url', contentId] as const,
  },

  // Admin Video
  adminVideo: {
    all: ['adminVideo'] as const,
    status: (contentId: string) => [...queryKeys.adminVideo.all, 'status', contentId] as const,
    uploadUrl: (contentId: string) => [...queryKeys.adminVideo.all, 'uploadUrl', contentId] as const,
  },

  // Admin Content
  adminContent: {
    all: ['adminContent'] as const,
    lists: () => [...queryKeys.adminContent.all, 'list'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.adminContent.all, 'list', params] as const,
    detail: (id: string) =>
      [...queryKeys.adminContent.all, 'detail', id] as const,
    structure: (id: string) =>
      [...queryKeys.adminContent.all, id, 'structure'] as const,
  },

  // Admin Users
  adminUsers: {
    all: ['adminUsers'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.adminUsers.all, 'list', params] as const,
    detail: (userId: string) =>
      [...queryKeys.adminUsers.all, 'detail', userId] as const,
  },

  // Genres
  genres: {
    all: ['genres'] as const,
    list: () => [...queryKeys.genres.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.genres.all, 'detail', id] as const,
    bySlug: (slug: string) => [...queryKeys.genres.all, 'slug', slug] as const,
  },

  // User Genre Preferences
  userGenres: {
    all: ['userGenres'] as const,
    list: () => [...queryKeys.userGenres.all, 'list'] as const,
  },

  // Tags
  tags: {
    all: ['tags'] as const,
    list: () => [...queryKeys.tags.all, 'list'] as const,
  },
} as const;
