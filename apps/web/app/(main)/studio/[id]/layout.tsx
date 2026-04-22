import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Редактировать — Студия',
  description: 'Редактирование контента на платформе',
};

export default function StudioEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
