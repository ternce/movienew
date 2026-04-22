import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Заказ — MoviePlatform',
  description: 'Детали заказа в магазине MoviePlatform.',
};

export default function OrderDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
