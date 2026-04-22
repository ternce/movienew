import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Создать Short | Студия',
  description: 'Создание нового короткого видео на платформе',
};

export default function CreateShortLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
