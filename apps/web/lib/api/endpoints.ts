/**
 * API endpoint definitions and typed convenience methods.
 *
 * `endpoints` — centralized path constants for every API route.
 * `api` — thin wrappers around `request()` / `upload()` that add the
 *          `ApiResponse<T>` return type automatically.
 */

import type { ApiResponse } from '@/types';

import { request, upload, type RequestConfig } from './client';

// ============ Typed API methods ============

/**
 * API client with typed methods
 */
export const api = {
  /** GET request */
  get<T>(endpoint: string, config?: Omit<RequestConfig, 'body'>): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'GET' });
  },

  /** POST request */
  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'POST', body: data });
  },

  /** PUT request */
  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'PUT', body: data });
  },

  /** PATCH request */
  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'PATCH', body: data });
  },

  /** DELETE request */
  delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...config, method: 'DELETE' });
  },

  /** Upload file with multipart/form-data */
  upload<T>(endpoint: string, formData: FormData, config?: Omit<RequestConfig, 'body'>): Promise<ApiResponse<T>> {
    return upload<T>(endpoint, formData, config);
  },
};

// ============ Endpoint definitions ============

/**
 * Type-safe API endpoints
 */
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: (token: string) => `/auth/verify-email/${token}`,
  },

  // Users
  users: {
    me: '/users/me',
    profile: '/users/me/profile',
    password: '/users/me/password',
    uploadAvatar: '/users/me/avatar',
    verification: '/users/me/verification',
    verificationStatus: '/users/me/verification/status',
    requestEmailChange: '/users/me/email/request-code',
    confirmEmailChange: '/users/me/email/confirm',
  },

  // Content
  content: {
    list: '/content',
    detail: (slug: string) => `/content/${slug}`,
    featured: '/content/featured',
    search: '/content/search',
    recordView: (contentId: string) => `/content/${contentId}/view`,
  },

  // Comments
  comments: {
    list: (contentId: string) => `/content/${contentId}/comments`,
    create: (contentId: string) => `/content/${contentId}/comments`,
    delete: (contentId: string, commentId: string) =>
      `/content/${contentId}/comments/${commentId}`,
  },

  // Series
  series: {
    list: '/series',
    detail: (slug: string) => `/series/${slug}`,
    episodes: (seriesId: string) => `/series/${seriesId}/episodes`,
  },

  // Categories
  categories: {
    list: '/categories',
    tree: '/categories/tree',
  },

  // Watch history
  watchHistory: {
    list: '/users/me/watch-history',
    continueWatching: '/users/me/watch-history/continue',
    updateProgress: (contentId: string) => `/users/me/watch-history/${contentId}`,
  },

  // Subscriptions
  subscriptions: {
    plans: '/subscriptions/plans',
    plan: (id: string) => `/subscriptions/plans/${id}`,
    my: '/subscriptions/my',
    purchase: '/subscriptions/purchase',
    cancel: '/subscriptions/cancel',
    autoRenew: '/subscriptions/auto-renew',
    checkAccess: (contentId: string) => `/subscriptions/access/${contentId}`,
  },

  // Payments
  payments: {
    initiate: '/payments/initiate',
    status: (transactionId: string) => `/payments/status/${transactionId}`,
    transactions: '/payments/transactions',
    refund: '/payments/refund',
    complete: (transactionId: string) => `/payments/complete/${transactionId}`,
  },

  // Partners
  partners: {
    // Public
    levels: '/partners/levels',
    // User partner dashboard
    dashboard: '/partners/dashboard',
    referrals: '/partners/referrals',
    commissions: '/partners/commissions',
    commission: (id: string) => `/partners/commissions/${id}`,
    balance: '/partners/balance',
    withdrawals: '/partners/withdrawals',
    withdrawal: (id: string) => `/partners/withdrawals/${id}`,
    createWithdrawal: '/partners/withdrawals',
    taxPreview: '/partners/tax-preview',
    paymentMethods: '/partners/payment-methods',
    addPaymentMethod: '/partners/payment-methods',
    deletePaymentMethod: (id: string) => `/partners/payment-methods/${id}`,
  },

  // Admin Partners
  adminPartners: {
    // Partners management
    list: '/admin/partners',
    stats: '/admin/partners/stats',
    detail: (userId: string) => `/admin/partners/${userId}`,
    // Commission management
    commissions: '/admin/partners/commissions',
    approveCommission: (id: string) => `/admin/partners/commissions/${id}/approve`,
    rejectCommission: (id: string) => `/admin/partners/commissions/${id}/reject`,
    approveCommissionsBatch: '/admin/partners/commissions/approve-batch',
    // Withdrawal management
    withdrawalStats: '/admin/partners/withdrawals/stats',
    withdrawals: '/admin/partners/withdrawals',
    withdrawalDetail: (id: string) => `/admin/partners/withdrawals/${id}`,
    approveWithdrawal: (id: string) => `/admin/partners/withdrawals/${id}/approve`,
    rejectWithdrawal: (id: string) => `/admin/partners/withdrawals/${id}/reject`,
    completeWithdrawal: (id: string) => `/admin/partners/withdrawals/${id}/complete`,
  },

  // Bonuses
  bonuses: {
    balance: '/bonuses/balance',
    statistics: '/bonuses/statistics',
    transactions: '/bonuses/transactions',
    expiring: '/bonuses/expiring',
    maxApplicable: '/bonuses/max-applicable',
    withdrawalPreview: '/bonuses/withdrawal-preview',
    withdraw: '/bonuses/withdraw',
    rate: '/bonuses/rate',
  },

  // Admin Bonuses
  adminBonuses: {
    stats: '/admin/bonuses/stats',
    rates: '/admin/bonuses/rates',
    rate: (id: string) => `/admin/bonuses/rates/${id}`,
    campaigns: '/admin/bonuses/campaigns',
    campaign: (id: string) => `/admin/bonuses/campaigns/${id}`,
    executeCampaign: (id: string) => `/admin/bonuses/campaigns/${id}/execute`,
    cancelCampaign: (id: string) => `/admin/bonuses/campaigns/${id}/cancel`,
    userDetails: (userId: string) => `/admin/bonuses/users/${userId}`,
    adjustUserBalance: (userId: string) => `/admin/bonuses/users/${userId}/adjust`,
    export: '/admin/bonuses/export',
  },

  // Store
  store: {
    products: '/store/products',
    productById: (id: string) => `/store/products/${id}`,
    productBySlug: (slug: string) => `/store/products/slug/${slug}`,
    categories: '/store/products/categories',
    cart: '/store/cart',
    cartSummary: '/store/cart/summary',
    cartItems: '/store/cart/items',
    cartItem: (productId: string) => `/store/cart/items/${productId}`,
    orders: '/store/orders',
    order: (id: string) => `/store/orders/${id}`,
    cancelOrder: (id: string) => `/store/orders/${id}/cancel`,
  },

  // Users - Watchlist & Sessions
  userWatchlist: {
    list: '/users/me/watchlist',
    add: '/users/me/watchlist',
    remove: (contentId: string) => `/users/me/watchlist/${contentId}`,
  },
  userSessions: {
    list: '/users/me/sessions',
    terminate: (sessionId: string) => `/users/me/sessions/${sessionId}`,
    terminateAll: '/users/me/sessions',
  },

  // Notifications
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    unreadCount: '/notifications/unread-count',
    preferences: '/notifications/preferences',
    delete: (id: string) => `/notifications/${id}`,
    deleteAll: '/notifications',
  },

  // Documents
  documents: {
    list: '/documents',
    detail: (type: string) => `/documents/${type}`,
    accept: (type: string) => `/documents/${type}/accept`,
    pending: '/documents/pending',
  },

  // Admin Notifications
  adminNotifications: {
    templates: '/admin/notifications/templates',
    template: (id: string) => `/admin/notifications/templates/${id}`,
    send: '/admin/notifications/send',
    newsletters: '/admin/notifications/newsletters',
    newsletter: (id: string) => `/admin/notifications/newsletters/${id}`,
    sendNewsletter: (id: string) => `/admin/notifications/newsletters/${id}/send`,
    scheduleNewsletter: (id: string) => `/admin/notifications/newsletters/${id}/schedule`,
    cancelNewsletter: (id: string) => `/admin/notifications/newsletters/${id}/cancel`,
  },

  // Admin Documents
  adminDocuments: {
    list: '/admin/documents',
    detail: (id: string) => `/admin/documents/${id}`,
    publish: (id: string) => `/admin/documents/${id}/publish`,
    deactivate: (id: string) => `/admin/documents/${id}/deactivate`,
    acceptances: (id: string) => `/admin/documents/${id}/acceptances`,
    versions: (type: string) => `/admin/documents/types/${type}/versions`,
  },

  // Admin Audit
  adminAudit: {
    list: '/admin/audit',
    detail: (id: string) => `/admin/audit/${id}`,
  },

  // Admin Payments
  adminPayments: {
    transactions: '/admin/payments/transactions',
    transaction: (id: string) => `/admin/payments/transactions/${id}`,
    refund: (id: string) => `/admin/payments/transactions/${id}/refund`,
    stats: '/admin/payments/stats',
  },

  // Admin Content
  adminContent: {
    list: '/admin/content',
    detail: (id: string) => `/admin/content/${id}`,
    create: '/admin/content',
    update: (id: string) => `/admin/content/${id}`,
    delete: (id: string) => `/admin/content/${id}`,
    createSeries: '/admin/content/series',
    structure: (id: string) => `/admin/content/${id}/structure`,
    reorderStructure: (id: string) => `/admin/content/${id}/structure`,
    addEpisode: (id: string) => `/admin/content/${id}/episodes`,
    updateEpisode: (episodeId: string) => `/admin/content/episodes/${episodeId}`,
    deleteEpisode: (episodeId: string) => `/admin/content/episodes/${episodeId}`,
  },

  // Admin Dashboard
  adminDashboard: {
    overview: '/admin/dashboard',
    stats: '/admin/dashboard/stats',
  },

  // Admin Store
  adminStore: {
    products: '/admin/store/products',
    product: (id: string) => `/admin/store/products/${id}`,
    productStats: '/admin/store/products/stats',
    categories: '/admin/store/categories',
    category: (id: string) => `/admin/store/categories/${id}`,
    orders: '/admin/store/orders',
    order: (id: string) => `/admin/store/orders/${id}`,
    orderStatus: (id: string) => `/admin/store/orders/${id}/status`,
    orderStats: '/admin/store/orders/stats',
  },

  // Streaming
  streaming: {
    url: (contentId: string) => `/content/${contentId}/stream`,
  },

  // Admin Video
  adminVideo: {
    upload: (contentId: string) => `/admin/content/${contentId}/video/upload`,
    uploadUrl: (contentId: string) => `/admin/content/${contentId}/video/upload-url`,
    status: (contentId: string) => `/admin/content/${contentId}/video/status`,
    delete: (contentId: string) => `/admin/content/${contentId}/video`,
    thumbnails: (contentId: string) => `/admin/content/${contentId}/video/thumbnails`,
  },

  // Upload
  upload: {
    image: '/upload/image',
    video: '/upload/video',
  },

  // Admin Users
  adminUsers: {
    list: '/admin/users',
    detail: (userId: string) => `/admin/users/${userId}`,
    update: (userId: string) => `/admin/users/${userId}`,
  },

  // Genres
  genres: {
    list: '/genres',
    detail: (id: string) => `/genres/${id}`,
    bySlug: (slug: string) => `/genres/slug/${slug}`,
  },

  // User Genre Preferences
  userGenres: {
    list: '/users/me/genres',
    add: '/users/me/genres',
    update: (preferenceId: string) => `/users/me/genres/${preferenceId}`,
    remove: (preferenceId: string) => `/users/me/genres/${preferenceId}`,
    reorder: '/users/me/genres/reorder',
  },

  // Tags
  tags: {
    list: '/tags',
  },
} as const;
