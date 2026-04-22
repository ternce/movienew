import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Тарифы',
  description: 'Тарифные планы и подписки MoviePlatform — выберите подходящий план',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
