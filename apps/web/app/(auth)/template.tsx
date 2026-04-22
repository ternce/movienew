'use client';

import { PageTransition } from '@/components/layout/page-transition';

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition variant="fade">{children}</PageTransition>;
}
