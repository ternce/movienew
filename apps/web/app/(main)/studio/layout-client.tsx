'use client';

import { StudioAuthGuard } from '@/components/studio/studio-auth-guard';
import { StudioSidebar, StudioMobileTabs } from '@/components/studio/studio-sidebar';

export function StudioLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioAuthGuard>
      <div className="mx-auto max-w-6xl flex gap-8">
        <StudioSidebar />
        <div className="min-w-0 flex-1">
          <StudioMobileTabs />
          {children}
        </div>
      </div>
    </StudioAuthGuard>
  );
}
