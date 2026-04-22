import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Просмотр — MoviePlatform',
  description: 'Смотрите видео онлайн на MoviePlatform',
};

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
