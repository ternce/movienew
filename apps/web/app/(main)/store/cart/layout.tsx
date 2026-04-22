import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Корзина — MoviePlatform',
  description: 'Ваша корзина покупок в магазине MoviePlatform.',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
