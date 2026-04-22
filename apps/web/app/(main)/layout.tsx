import MainLayoutClient from './layout-client';

// Force dynamic rendering to skip static prerendering
export const dynamic = 'force-dynamic';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayoutClient>{children}</MainLayoutClient>;
}
