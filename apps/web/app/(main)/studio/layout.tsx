import type { Metadata } from 'next';

import { StudioLayoutClient } from './layout-client';

export const metadata: Metadata = {
  title: 'Студия — MoviePlatform',
  description: 'Создавайте и управляйте контентом на платформе',
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudioLayoutClient>{children}</StudioLayoutClient>;
}
