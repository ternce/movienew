'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@movie-platform/shared';

interface StudioAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Studio authentication guard — ADMIN-only access
 * Redirects to login if not authenticated, to dashboard if not authorized
 */
export function StudioAuthGuard({ children }: StudioAuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace('/login?redirect=/studio');
      return;
    }

    if (user?.role !== UserRole.ADMIN) {
      router.replace('/dashboard');
      return;
    }

    setIsAuthorized(true);
  }, [isHydrated, isAuthenticated, user, router]);

  if (!isHydrated || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-mp-accent-primary" />
          <p className="text-sm text-mp-text-secondary">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return <>{children}</>;
}
