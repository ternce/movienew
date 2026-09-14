'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

import { NetworkStatus } from '@/components/ui/network-status';
import { PwaInstallProvider } from '@/hooks/use-pwa-install';
import { getQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

const Toaster = dynamic(
  () => import('@/components/ui/toaster').then((m) => m.Toaster),
  { ssr: false },
);

import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

/**
 * Root providers props
 */
interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Combined providers for the application
 * Handles theme, query client, toast notifications, and auth hydration
 */
export function Providers({ children }: ProvidersProps) {
  // Hydrate auth store on mount (SSR-safe)
  React.useEffect(() => {
    let settled = false;
    // Subscribe to finish-hydration BEFORE triggering rehydrate so the
    // callback fires even if rehydrate completes synchronously.
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      settled = true;
      useAuthStore.getState().setHydrated(true);
    });
    Promise.resolve(useAuthStore.persist.rehydrate())
      .catch(() => {
        useAuthStore.getState().logout();
      })
      .finally(() => {
        if (!settled) {
          useAuthStore.getState().setHydrated(true);
        }
      });

    return unsub;
  }, []);

  React.useEffect(() => {
    const handleSessionExpired = () => {
      useAuthStore.getState().logout();
      getQueryClient().clear();
    };

    window.addEventListener('mp-auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('mp-auth-session-expired', handleSessionExpired);
    };
  }, []);

  return (
    <QueryProvider>
      <ThemeProvider>
        <PwaInstallProvider>
          {children}
          <NetworkStatus />
          <Toaster />
        </PwaInstallProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

// Re-export individual providers
export { ThemeProvider } from './theme-provider';
export { QueryProvider } from './query-provider';
