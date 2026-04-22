import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Бонусы',
  description: 'Управляйте бонусами на MoviePlatform — баланс, история начислений и вывод средств.',
  openGraph: {
    title: 'Бонусы',
    description: 'Управляйте бонусами на MoviePlatform — баланс, история начислений и вывод средств.',
  },
};

export default function BonusesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
