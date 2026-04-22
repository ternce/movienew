import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Шортсы',
  description: 'Короткие видео на MoviePlatform — за кадром, интересные факты и лучшие моменты.',
  openGraph: {
    title: 'Шортсы',
    description: 'Короткие видео на MoviePlatform.',
  },
};

export default function ShortsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
