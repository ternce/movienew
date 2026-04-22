import AdminLayoutClient from './layout-client';

// Force dynamic rendering to skip static prerendering
export const dynamic = 'force-dynamic';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
