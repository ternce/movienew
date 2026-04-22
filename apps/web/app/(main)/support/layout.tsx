import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Поддержка',
  description: 'Свяжитесь с нашей командой поддержки или найдите ответ в разделе часто задаваемых вопросов.',
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
