import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Главная — MoviePlatform',
  description: 'Смотрите сериалы, обучающие курсы и эксклюзивный контент на MoviePlatform',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
