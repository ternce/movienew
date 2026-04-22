/**
 * Modular API client — barrel re-exports.
 *
 * Import from '@/lib/api' (or the backward-compatible '@/lib/api-client').
 */

// Error classes
export { ApiError, NetworkError } from './errors';

// Auth token management
export {
  getAuthToken,
  getRefreshToken,
  setTokens,
  clearAuthState,
  attemptTokenRefresh,
} from './auth';

// Core request infrastructure
export { request, upload, buildUrl, API_BASE_URL, DEFAULT_TIMEOUT, MAX_RETRIES } from './client';
export type { RequestConfig } from './client';

// Typed API methods & endpoint definitions
export { api, endpoints } from './endpoints';

// Response normalizers
export {
  LEVEL_NUMBER_TO_NAME,
  normalizePartnerLevel,
  normalizePartnerLevels,
  normalizePartnerDashboard,
  normalizePartnerBalance,
  normalizeSubscriptionPlanFeatures,
  normalizeSubscriptionPlans,
} from './normalizers';
