'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@movie-platform/shared';

interface AdminAuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Admin authentication guard that protects admin routes
 * Redirects to login if not authenticated or to dashboard if not authorized
 */
export function AdminAuthGuard({
  children,
  allowedRoles = [UserRole.ADMIN, UserRole.MODERATOR],
}: AdminAuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!isHydrated) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      router.replace('/login?redirect=/admin/dashboard');
      return;
    }

    // Check if user has admin/moderator role
    if (!user?.role || !allowedRoles.includes(user.role as UserRole)) {
      // User doesn't have required role - redirect to main dashboard
      router.replace('/dashboard');
      return;
    }

    // User is authorized
    setIsAuthorized(true);
  }, [isHydrated, isAuthenticated, user, allowedRoles, router]);

  // Show loading state while checking auth
  if (!isHydrated || isAuthorized === null) {
    return (
      <div className="fixed inset-0 bg-mp-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-mp-accent-primary" />
          <p className="text-sm text-mp-text-secondary">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Not authorized - this will briefly show before redirect
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook to check admin role
 */
export function useRequireAdmin(allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.MODERATOR]) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  React.useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace('/login?redirect=/admin/dashboard');
      return;
    }

    if (!user?.role || !allowedRoles.includes(user.role as UserRole)) {
      router.replace('/dashboard');
    }
  }, [isHydrated, isAuthenticated, user, allowedRoles, router]);

  return {
    isAuthorized:
      isHydrated &&
      isAuthenticated &&
      user?.role &&
      allowedRoles.includes(user.role as UserRole),
    isLoading: !isHydrated,
    user,
  };
}
