'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as React from 'react';

import { getQueryClient } from '@/lib/query-client';

/**
 * Query provider props
 */
interface QueryProviderProps {
  children: React.ReactNode;
  showDevtools?: boolean;
}

/**
 * TanStack Query provider with SSR-safe client initialization
 */
export function QueryProvider({
  children,
  showDevtools = process.env.NODE_ENV === 'development',
}: QueryProviderProps) {
  // Get query client (creates new on server, returns singleton on client)
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
