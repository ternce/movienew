'use client';

import { AdminHeader, AdminSidebar } from '@/components/admin/layout';
import { AdminAuthGuard } from '@/components/admin/guards';

/**
 * Admin panel layout with sidebar navigation and authentication guard
 */
export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-mp-bg-primary">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main content area */}
        <div className="min-h-screen transition-all duration-300 ml-0 md:ml-[250px]">
          {/* Header */}
          <AdminHeader />

          {/* Page content with top padding for header */}
          <main className="pt-16 p-4 md:p-6 min-h-screen">{children}</main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
