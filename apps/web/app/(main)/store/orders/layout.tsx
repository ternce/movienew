import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Мои заказы — MoviePlatform',
  description: 'История заказов в магазине MoviePlatform.',
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
