import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Уведомления | MoviePlatform',
  description: 'Просматривайте и управляйте вашими уведомлениями',
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
