import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Магазин — MoviePlatform',
  description: 'Магазин MoviePlatform — мерч, аксессуары и подарки для любителей кино.',
  openGraph: {
    title: 'Магазин — MoviePlatform',
    description: 'Магазин MoviePlatform — мерч, аксессуары и подарки для любителей кино.',
  },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
