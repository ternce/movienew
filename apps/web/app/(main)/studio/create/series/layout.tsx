import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Создать сериал | Студия',
  description: 'Создание нового сериала на платформе',
};

export default function CreateSeriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
