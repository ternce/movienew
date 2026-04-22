'use client';

import { AccountSidebar, AccountMobileTabs } from '@/components/account';

export function AccountLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl flex gap-8">
      <AccountSidebar />
      <div className="min-w-0 flex-1">
        <AccountMobileTabs />
        {children}
      </div>
    </div>
  );
}
