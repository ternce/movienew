import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Оформление заказа — MoviePlatform',
  description: 'Оформите заказ в магазине MoviePlatform.',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
