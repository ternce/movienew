import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Обучение',
  description: 'Видеокурсы по кинопроизводству: монтаж, цветокоррекция, сценарий, съёмка, звук и анимация от профессионалов индустрии.',
  openGraph: {
    title: 'Обучение',
    description: 'Видеокурсы по кинопроизводству от профессионалов индустрии.',
  },
};

export default function TutorialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
