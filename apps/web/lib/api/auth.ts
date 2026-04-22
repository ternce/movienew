/**
 * Auth token management for the API client.
 *
 * Handles reading/writing tokens from localStorage (Zustand persisted store),
 * token refresh with deduplication, and auth-state cleanup on failure.
 */

/** Token refresh state to prevent multiple concurrent refresh attempts */
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Get auth token from storage (client-side only)
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const storage = localStorage.getItem('mp-auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      return parsed.state?.accessToken || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Get refresh token from storage (client-side only)
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const storage = localStorage.getItem('mp-auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      return parsed.state?.refreshToken || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Update tokens in storage
 */
export function setTokens(accessToken: string, refreshToken?: string, sessionId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const storage = localStorage.getItem('mp-auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      parsed.state = {
        ...parsed.state,
        accessToken,
        refreshToken: refreshToken || parsed.state?.refreshToken,
        sessionId: sessionId || parsed.state?.sessionId,
      };
      localStorage.setItem('mp-auth-storage', JSON.stringify(parsed));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Clear auth state (on failed refresh)
 */
export function clearAuthState(): void {
  if (typeof window === 'undefined') return;

  // Clear auth cookies so middleware knows user is unauthenticated
  document.cookie = 'mp-auth-token=;path=/;max-age=0';
  document.cookie = 'mp-authenticated=;path=/;max-age=0';

  try {
    const storage = localStorage.getItem('mp-auth-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      parsed.state = {
        ...parsed.state,
        accessToken: null,
        refreshToken: null,
        sessionId: null,
        isAuthenticated: false,
        user: null,
      };
      localStorage.setItem('mp-auth-storage', JSON.stringify(parsed));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Attempt to refresh the access token.
 * Deduplicates concurrent refresh attempts — only one network request is made.
 *
 * NOTE: This function needs API_BASE_URL, which is injected by the client module
 * via `configureAuth()` at module load time to avoid circular imports.
 */
let _apiBaseUrl = '';

/** Called once from client.ts to inject the base URL */
export function configureAuth(apiBaseUrl: string): void {
  _apiBaseUrl = apiBaseUrl;
}

export async function attemptTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for that result
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${_apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        clearAuthState();
        return false;
      }

      const data = await response.json();
      if (data.success && data.data?.accessToken) {
        setTokens(data.data.accessToken, data.data.refreshToken, data.data.sessionId);
        return true;
      }

      clearAuthState();
      return false;
    } catch {
      clearAuthState();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
