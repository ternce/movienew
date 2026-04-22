import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Создать курс | Студия',
  description: 'Создание нового обучающего курса на платформе',
};

export default function CreateTutorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
