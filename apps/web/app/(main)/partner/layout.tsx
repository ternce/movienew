import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Партнерская программа',
  description: 'Партнерская программа MoviePlatform — приглашайте друзей и зарабатывайте комиссии с 5 уровней.',
  openGraph: {
    title: 'Партнерская программа',
    description: 'Партнерская программа MoviePlatform — приглашайте друзей и зарабатывайте комиссии с 5 уровней.',
  },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
