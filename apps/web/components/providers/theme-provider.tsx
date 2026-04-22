'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import * as React from 'react';

/**
 * Theme provider props
 */
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

/**
 * Theme provider wrapper around next-themes
 * Configured for MoviePlatform's dark-first design
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'mp-theme',
  enableSystem = false,
  disableTransitionOnChange = true,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
