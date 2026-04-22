import type { Metadata } from 'next';

import { AccountLayoutClient } from './layout-client';

export const metadata: Metadata = {
  title: 'Мой аккаунт — MoviePlatform',
  description: 'Управляйте профилем, подписками и настройками вашего аккаунта',
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
