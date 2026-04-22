import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Создать контент — Студия',
  description: 'Создание нового контента на платформе',
};

export default function StudioCreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
