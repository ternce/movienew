import { getErrorMessage, isAuthError } from '../error-messages';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return getErrorMessage(this.code);
  }

  /**
   * Check if this is an authentication error requiring re-login
   */
  isAuthError(): boolean {
    return isAuthError(this.code);
  }
}

/**
 * Network error class for offline/connectivity failures
 */
export class NetworkError extends Error {
  constructor(message: string = 'Нет подключения к сети') {
    super(message);
    this.name = 'NetworkError';
  }
}
