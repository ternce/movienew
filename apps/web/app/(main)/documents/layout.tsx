import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Правовые документы — MoviePlatform',
  description: 'Пользовательское соглашение, политика конфиденциальности и другие правовые документы MoviePlatform.',
  openGraph: {
    title: 'Правовые документы — MoviePlatform',
    description: 'Правовые документы MoviePlatform.',
  },
};

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
