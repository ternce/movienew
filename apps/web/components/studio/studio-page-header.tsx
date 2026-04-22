import * as React from 'react';

interface StudioPageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Reusable page header for studio pages
 */
export function StudioPageHeader({ title, description, action }: StudioPageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-mp-text-primary truncate">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-mp-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
