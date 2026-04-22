import AuthLayoutClient from './layout-client';

// Force dynamic rendering to skip static prerendering
export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
