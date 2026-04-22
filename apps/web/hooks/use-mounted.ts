'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to check if component is mounted
 * Useful for preventing hydration mismatches with client-only content
 *
 * @example
 * ```tsx
 * function Component() {
 *   const isMounted = useMounted();
 *
 *   if (!isMounted) {
 *     return <Skeleton />;
 *   }
 *
 *   return <ClientOnlyContent />;
 * }
 * ```
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

/**
 * Hook that returns null until mounted, then returns children
 * Wrapper for client-only rendering
 *
 * @example
 * ```tsx
 * function Component() {
 *   const content = useClientOnly(<ClientOnlyContent />);
 *   return content;
 * }
 * ```
 */
export function useClientOnly<T>(value: T): T | null {
  const mounted = useMounted();
  return mounted ? value : null;
}
