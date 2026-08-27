'use client';

import { usePathname } from 'next/navigation';

import { PageTransition } from '@/components/layout/page-transition';

export default function MainTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith('/watch-party')) {
    return <>{children}</>;
  }

  return <PageTransition>{children}</PageTransition>;
}
