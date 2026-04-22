/**
 * Core HTTP request infrastructure for the API client.
 *
 * Provides `request()` and `upload()` with automatic:
 * - Token attachment & refresh on 401
 * - Retry with exponential backoff
 * - AbortController-based timeout
 * - Network-error detection
 */

import type { ApiResponse } from '@/types';

import { ApiError, NetworkError } from './errors';
import {
  getAuthToken,
  attemptTokenRefresh,
  configureAuth,
} from './auth';

// ============ Constants ============

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const DEFAULT_TIMEOUT = 30_000;

export const MAX_RETRIES = 3;

// Inject base URL into auth module so it can call /auth/refresh
configureAuth(API_BASE_URL);

// ============ Request config type ============

export interface RequestConfig extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Skip auto-refresh for this request */
  skipRefresh?: boolean;
  /** Skip auth header for this request */
  skipAuth?: boolean;
  /** Request timeout in ms (default: 30s) */
  timeout?: number;
  /** Max retry attempts (default: 3 for GET, 0 for mutations) */
  retries?: number;
}

// ============ Internal helpers ============

/** Check if an error is a network/connectivity failure */
function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('networkerror') ||
      msg.includes('load failed')
    );
  }
  return false;
}

/** Check if an HTTP status code is retryable */
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/** Sleep for exponential backoff: 1s, 2s, 4s */
function backoffDelay(attempt: number): Promise<void> {
  const ms = Math.min(1000 * 2 ** attempt, 8000);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build URL with query parameters */
export function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/** Execute a single fetch with AbortController timeout */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Превышено время ожидания запроса', 408, 'SRV_003');
    }
    if (isNetworkError(error)) {
      throw new NetworkError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Redirect to login page */
function redirectToLogin(): void {
  if (typeof window === 'undefined') return;

  // Ensure cookies are cleared before redirecting to prevent middleware redirect loop
  document.cookie = 'mp-auth-token=;path=/;max-age=0';
  document.cookie = 'mp-authenticated=;path=/;max-age=0';

  // Store current URL for redirect after login
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== '/login') {
    sessionStorage.setItem('mp-redirect-after-login', currentPath);
  }

  window.location.href = '/login';
}

// ============ Public API ============

/**
 * Make an API request with automatic token refresh, retry, and timeout
 */
export async function request<T>(
  endpoint: string,
  config: RequestConfig = {},
): Promise<T> {
  const {
    params,
    body,
    headers: customHeaders,
    skipRefresh,
    skipAuth,
    timeout = DEFAULT_TIMEOUT,
    retries,
    ...init
  } = config;

  const method = (init.method || 'GET').toUpperCase();
  // Default: retry GETs up to MAX_RETRIES, no retries for mutations
  const maxRetries = retries ?? (method === 'GET' ? MAX_RETRIES : 0);

  // Build URL with query params
  const url = buildUrl(endpoint, params);

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
  };

  // Add auth token if available (client-side only)
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const fetchOpts: RequestInit = {
    ...init,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  };

  // Retry loop
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let response = await fetchWithTimeout(url, fetchOpts, timeout);

      // Handle 401 - attempt token refresh (only on first attempt)
      if (response.status === 401 && !skipRefresh && !skipAuth && attempt === 0) {
        const refreshed = await attemptTokenRefresh();

        if (refreshed) {
          const newToken = getAuthToken();
          if (newToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
            fetchOpts.headers = headers;
          }
          response = await fetchWithTimeout(url, fetchOpts, timeout);
        } else {
          redirectToLogin();
          throw new ApiError('Session expired', 401, 'AUTH_002');
        }
      }

      // Parse response
      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle errors
      if (!response.ok) {
        const errorData = data as {
          message?: string;
          code?: string;
          details?: Record<string, string[]>;
        };
        const apiError = new ApiError(
          errorData?.message || `Request failed with status ${response.status}`,
          response.status,
          errorData?.code,
          errorData?.details,
        );

        // Retry on retryable status codes
        if (isRetryableStatus(response.status) && attempt < maxRetries) {
          lastError = apiError;
          await backoffDelay(attempt);
          continue;
        }

        throw apiError;
      }

      return data as T;
    } catch (error) {
      // Don't retry auth errors or non-retryable ApiErrors
      if (error instanceof ApiError && !isRetryableStatus(error.status)) {
        throw error;
      }

      // Retry on network errors
      if (isNetworkError(error) && attempt < maxRetries) {
        lastError = error;
        await backoffDelay(attempt);
        continue;
      }

      // Last attempt — throw
      if (attempt >= maxRetries) {
        throw error;
      }

      lastError = error;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new ApiError('Request failed', 500, 'SRV_001');
}

/**
 * Upload file with multipart/form-data.
 * Includes automatic 401 → refresh → retry logic.
 */
export async function upload<T>(
  endpoint: string,
  formData: FormData,
  config?: Omit<RequestConfig, 'body'>,
): Promise<ApiResponse<T>> {
  const { headers: customHeaders, skipAuth, ...init } = config || {};

  const url = buildUrl(endpoint);

  const headers: HeadersInit = {
    // Don't set Content-Type for FormData - browser will set it with boundary
    Accept: 'application/json',
    ...customHeaders,
  };

  // Add auth token
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  let response = await fetch(url, {
    ...init,
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  // Handle 401 - attempt token refresh
  if (response.status === 401 && !skipAuth) {
    const refreshed = await attemptTokenRefresh();

    if (refreshed) {
      const newToken = getAuthToken();
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      }

      response = await fetch(url, {
        ...init,
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
    } else {
      redirectToLogin();
      throw new ApiError('Session expired', 401, 'AUTH_002');
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data?.message || 'Upload failed',
      response.status,
      data?.code,
      data?.details,
    );
  }

  return data as ApiResponse<T>;
}
