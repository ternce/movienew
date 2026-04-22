'use client';

import { useEffect, useState } from 'react';
import { WifiSlash } from '@phosphor-icons/react';
import { toast } from 'sonner';

/**
 * Network status banner — shows persistent alert when offline,
 * auto-dismisses with success toast when back online.
 */
export function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Set initial state (only in browser)
    setIsOffline(!navigator.onLine);

    function handleOffline() {
      setIsOffline(true);
    }

    function handleOnline() {
      setIsOffline(false);
      toast.success('Подключение восстановлено');
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[100] bg-mp-error-bg border-b border-mp-error-text/20 px-4 py-2.5"
    >
      <div className="flex items-center justify-center gap-2 text-sm text-mp-error-text">
        <WifiSlash className="h-4 w-4 shrink-0" />
        <span>Нет подключения к интернету</span>
      </div>
    </div>
  );
}
