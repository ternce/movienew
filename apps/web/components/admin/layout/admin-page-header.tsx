'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { AdminBreadcrumbs } from './admin-breadcrumbs';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // Actions slot
  className?: string;
  breadcrumbItems?: { label: string; href?: string }[];
}

/**
 * Admin page header with title, breadcrumbs, and optional actions
 */
export function AdminPageHeader({
  title,
  description,
  children,
  className,
  breadcrumbItems,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      <AdminBreadcrumbs customItems={breadcrumbItems} className="mb-4" />

      {/* Title row with optional actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-mp-text-primary">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-mp-text-secondary">{description}</p>
          )}
        </div>

        {/* Actions slot */}
        {children && (
          <div className="flex items-center gap-3 shrink-0">{children}</div>
        )}
      </div>
    </div>
  );
}
