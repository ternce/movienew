'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to check if a media query matches
 *
 * @param query - Media query string (e.g., '(min-width: 768px)')
 * @returns Whether the media query matches
 *
 * @example
 * ```tsx
 * function Component() {
 *   const isDesktop = useMediaQuery('(min-width: 1024px)');
 *   return isDesktop ? <DesktopView /> : <MobileView />;
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Create listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    media.addEventListener('change', listener);

    // Cleanup
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  // Return false during SSR and first render to match server HTML
  if (!mounted) return false;
  return matches;
}

/**
 * Predefined breakpoint hooks matching Tailwind CSS defaults
 */

/** Matches sm breakpoint (640px and up) */
export function useIsSm(): boolean {
  return useMediaQuery('(min-width: 640px)');
}

/** Matches md breakpoint (768px and up) */
export function useIsMd(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

/** Matches lg breakpoint (1024px and up) */
export function useIsLg(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/** Matches xl breakpoint (1280px and up) */
export function useIsXl(): boolean {
  return useMediaQuery('(min-width: 1280px)');
}

/** Matches 2xl breakpoint (1536px and up) */
export function useIs2Xl(): boolean {
  return useMediaQuery('(min-width: 1536px)');
}

/** Check if device is mobile (below md breakpoint) */
export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 768px)');
}

/** Check if device is tablet (md to lg) */
export function useIsTablet(): boolean {
  const isMd = useMediaQuery('(min-width: 768px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  return isMd && !isLg;
}

/** Check if device is desktop (lg and up) */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/** Check if user prefers reduced motion */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Check if user prefers dark color scheme */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}
