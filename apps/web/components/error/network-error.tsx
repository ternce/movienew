'use client';

import { useEffect, useState, useCallback } from 'react';
import { WifiSlash, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';

/**
 * Network status hook
 */
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Initialize with actual value
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Mark that we recovered from offline
      if (!navigator.onLine === false) {
        setWasOffline(true);
        // Clear the "was offline" state after a delay
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}

/**
 * Offline indicator banner
 * Shows when the user loses network connection
 */
export function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all duration-300 ${
        isOnline
          ? 'bg-[var(--mp-success-bg)] text-[var(--mp-success-text)]'
          : 'bg-[var(--mp-error-bg)] text-[var(--mp-error-text)]'
      }`}
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <ArrowsClockwise className="h-4 w-4" />
            <span>Подключение восстановлено</span>
          </>
        ) : (
          <>
            <WifiSlash className="h-4 w-4" />
            <span>Нет подключения к интернету</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Network error component props
 */
interface NetworkErrorProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Network error component
 * Shows when a network request fails with retry option
 */
export function NetworkError({
  message = 'Не удалось загрузить данные',
  onRetry,
  retryLabel = 'Попробовать снова',
  className = '',
}: NetworkErrorProps) {
  const { isOnline } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 p-6 ${className}`}
      role="alert"
      data-testid="network-error"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mp-error-bg)]">
        {isOnline ? (
          <WarningCircle className="h-8 w-8 text-[var(--mp-error-text)]" />
        ) : (
          <WifiSlash className="h-8 w-8 text-[var(--mp-error-text)]" />
        )}
      </div>

      <div className="text-center">
        <p className="text-lg font-medium text-[var(--mp-text-primary)]">
          {isOnline ? message : 'Нет подключения к интернету'}
        </p>
        <p className="mt-1 text-sm text-[var(--mp-text-secondary)]">
          {isOnline
            ? 'Произошла ошибка при загрузке. Попробуйте ещё раз.'
            : 'Проверьте подключение и попробуйте снова.'}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={handleRetry}
          disabled={isRetrying || !isOnline}
          className="flex items-center gap-2 rounded-lg bg-[var(--mp-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="retry-button"
        >
          <ArrowsClockwise className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Загрузка...' : retryLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Full page network error
 */
export function FullPageNetworkError({
  message,
  onRetry,
  retryLabel,
}: NetworkErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--mp-bg-primary)]">
      <NetworkError message={message} onRetry={onRetry} retryLabel={retryLabel} />
    </div>
  );
}

/**
 * Inline network error for sections/components
 */
export function InlineNetworkError({
  message = 'Не удалось загрузить',
  onRetry,
}: NetworkErrorProps) {
  const { isOnline } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  return (
    <div
      className="flex items-center gap-3 rounded-lg bg-[var(--mp-error-bg)] p-3"
      role="alert"
      data-testid="inline-network-error"
    >
      <WarningCircle className="h-5 w-5 shrink-0 text-[var(--mp-error-text)]" />
      <span className="flex-1 text-sm text-[var(--mp-error-text)]">
        {isOnline ? message : 'Нет подключения'}
      </span>
      {onRetry && (
        <button
          onClick={handleRetry}
          disabled={isRetrying || !isOnline}
          className="text-sm font-medium text-[var(--mp-error-text)] underline hover:no-underline disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="inline-retry-button"
        >
          {isRetrying ? 'Загрузка...' : 'Повторить'}
        </button>
      )}
    </div>
  );
}

/**
 * HOC to wrap components with network error handling
 */
interface WithNetworkErrorProps {
  error: Error | null;
  onRetry?: () => void;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WithNetworkError({
  error,
  onRetry,
  children,
  fallback,
}: WithNetworkErrorProps) {
  if (!error) {
    return <>{children}</>;
  }

  // Check if it's a network error
  const isNetworkError =
    error.name === 'TypeError' ||
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('Failed to fetch');

  if (isNetworkError) {
    return fallback || <NetworkError onRetry={onRetry} />;
  }

  // Re-throw for error boundary to catch
  throw error;
}

/**
 * Toast notification for network status changes
 */
export function NetworkStatusToast() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (wasOffline && isOnline) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline]);

  if (!show) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform rounded-lg bg-[var(--mp-success-bg)] px-4 py-2 text-sm font-medium text-[var(--mp-success-text)] shadow-lg transition-all duration-300"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <ArrowsClockwise className="h-4 w-4" />
        <span>Подключение восстановлено</span>
      </div>
    </div>
  );
}

export default NetworkError;
