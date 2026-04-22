import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'О платформе — MoviePlatform',
  description: 'MoviePlatform — платформа нового поколения для просмотра видеоконтента с партнёрской программой и бонусной системой.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
