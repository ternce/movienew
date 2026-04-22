import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Товар — Магазин MoviePlatform',
  description: 'Подробная информация о товаре в магазине MoviePlatform.',
};

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
