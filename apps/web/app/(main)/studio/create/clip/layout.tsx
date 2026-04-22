import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Создать клип | Студия',
  description: 'Создание нового клипа на платформе',
};

export default function CreateClipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
