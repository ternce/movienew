'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

import { NetworkStatus } from '@/components/ui/network-status';
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
    // Subscribe to finish-hydration BEFORE triggering rehydrate so the
    // callback fires even if rehydrate completes synchronously.
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      useAuthStore.getState().setHydrated(true);
    });
    useAuthStore.persist.rehydrate();
    return unsub;
  }, []);

  return (
    <QueryProvider>
      <ThemeProvider>
        {children}
        <NetworkStatus />
        <Toaster />
      </ThemeProvider>
    </QueryProvider>
  );
}

// Re-export individual providers
export { ThemeProvider } from './theme-provider';
export { QueryProvider } from './query-provider';
