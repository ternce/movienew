'use client';

import { Play, CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { RatingBadge } from '@/components/ui/rating-badge';
import { ScrollReveal } from './scroll-reveal';

/* ---------- Mock data ---------- */

const popularItems = [
  { id: 1, title: 'Темные времена', year: '2024', rating: 8.7, genre: 'Драма', gradient: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 40%, #0d1520 100%)' },
  { id: 2, title: 'Пламя надежды', year: '2024', rating: 9.1, genre: 'Триллер', gradient: 'linear-gradient(135deg, #1a1005 0%, #2e1a0a 40%, #0d1520 100%)' },
  { id: 3, title: 'Бесконечность', year: '2023', rating: 8.4, genre: 'Фантастика', gradient: 'linear-gradient(135deg, #0a1a2e 0%, #0d2030 40%, #0a1520 100%)' },
];

const mockSeries = [
  { id: 1, title: 'Код судьбы', year: '2024', rating: 8.6, gradient: 'linear-gradient(135deg, #1a0a2e 0%, #C94BFF20 50%, #0d1520 100%)' },
  { id: 2, title: 'Грань реальности', year: '2024', rating: 8.9, gradient: 'linear-gradient(135deg, #0a1a2e 0%, #28E0C420 50%, #0d1520 100%)' },
  { id: 3, title: 'Последний рубеж', year: '2023', rating: 8.2, gradient: 'linear-gradient(135deg, #1a1005 0%, #FF6B5A20 50%, #0d1520 100%)' },
  { id: 4, title: 'Тёмный мир', year: '2024', rating: 9.0, gradient: 'linear-gradient(135deg, #15102a 0%, #C94BFF15 50%, #0a0c18 100%)' },
  { id: 5, title: 'Парадокс', year: '2023', rating: 8.5, gradient: 'linear-gradient(135deg, #0d1520 0%, #28E0C415 50%, #0a1a2e 100%)' },
  { id: 6, title: 'Сигнал', year: '2024', rating: 8.8, gradient: 'linear-gradient(135deg, #1a0a20 0%, #FF6B5A15 50%, #0d1520 100%)' },
];

const mockCourses = [
  { id: 1, title: 'Основы программирования', year: '2024', rating: 9.3, gradient: 'linear-gradient(135deg, #0a1a2e 0%, #28E0C420 50%, #0d1520 100%)' },
  { id: 2, title: 'Веб-разработка с нуля', year: '2024', rating: 9.0, gradient: 'linear-gradient(135deg, #0d1520 0%, #28E0C415 50%, #0a1a2e 100%)' },
  { id: 3, title: 'UI/UX дизайн', year: '2023', rating: 8.8, gradient: 'linear-gradient(135deg, #1a0a2e 0%, #C94BFF15 50%, #0a1a2e 100%)' },
  { id: 4, title: 'Мобильная разработка', year: '2024', rating: 8.6, gradient: 'linear-gradient(135deg, #15102a 0%, #28E0C415 50%, #0a0c18 100%)' },
  { id: 5, title: 'DevOps практики', year: '2023', rating: 8.9, gradient: 'linear-gradient(135deg, #0d1520 0%, #FF6B5A15 50%, #1a0a2e 100%)' },
  { id: 6, title: 'Анализ данных', year: '2024', rating: 9.1, gradient: 'linear-gradient(135deg, #1a1005 0%, #28E0C420 50%, #0d1520 100%)' },
];

/* ---------- Bento Grid ---------- */

function BentoGrid() {
  const featured = popularItems[0];
  const secondary = popularItems.slice(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
      {/* Large featured card — spans full height on desktop */}
      <div className="group relative rounded-2xl overflow-hidden border border-white/[0.08] aspect-[3/4] md:aspect-auto md:row-span-2 cursor-pointer">
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ background: featured.gradient }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <Play className="w-7 h-7 text-[#05060A] ml-1" weight="fill" />
          </div>
        </div>

        {/* Rating */}
        <div className="absolute top-4 right-4">
          <RatingBadge rating={featured.rating} />
        </div>

        {/* Info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
          <span className="text-xs text-mp-accent-secondary font-medium uppercase tracking-wider">
            {featured.genre}
          </span>
          <h3 className="text-xl md:text-2xl font-bold text-mp-text-primary mt-1">
            {featured.title}
          </h3>
          <p className="text-sm text-mp-text-secondary mt-1">{featured.year}</p>
        </div>
      </div>

      {/* Two medium stacked cards */}
      {secondary.map((item) => (
        <div
          key={item.id}
          className="group relative rounded-2xl overflow-hidden border border-white/[0.08] aspect-video cursor-pointer"
        >
          <div
            className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
            style={{ background: item.gradient }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

          {/* Play on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
              <Play className="w-5 h-5 text-[#05060A] ml-0.5" weight="fill" />
            </div>
          </div>

          <div className="absolute top-3 right-3">
            <RatingBadge rating={item.rating} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span className="text-xs text-mp-accent-secondary font-medium uppercase tracking-wider">
              {item.genre}
            </span>
            <h3 className="text-base md:text-lg font-bold text-mp-text-primary mt-1">
              {item.title}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Content Scroll Row ---------- */

interface ContentRowPreviewProps {
  title: string;
  href: string;
  items: typeof mockSeries;
  accentColor?: string;
}

function ContentRowPreview({
  title,
  href,
  items,
  accentColor,
}: ContentRowPreviewProps) {
  return (
    <div>
      <div className="flex items-end justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          {accentColor && (
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: accentColor }}
            />
          )}
          <h2 className="text-xl sm:text-2xl font-bold text-mp-text-primary">
            {title}
          </h2>
        </div>
        <Link
          href={href}
          className="text-mp-text-secondary hover:text-mp-text-primary flex items-center gap-1 text-sm font-medium transition-colors"
        >
          Смотреть все
          <CaretRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Scroll row with right fade */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 group w-[260px] sm:w-[280px]"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.06] bg-mp-surface mb-3 transition-transform duration-300 group-hover:-translate-y-1">
                <div
                  className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105"
                  style={{ background: item.gradient }}
                />
                <div className="absolute bottom-3 right-3">
                  <RatingBadge rating={item.rating} />
                </div>
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-[#05060A] ml-0.5" weight="fill" />
                  </div>
                </div>
              </div>
              <h3 className="font-medium text-mp-text-primary text-sm">
                {item.title}
              </h3>
              <p className="text-xs text-mp-text-secondary mt-1">
                {item.year}
              </p>
            </div>
          ))}
        </div>

        {/* Right gradient fade */}
        <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-[#05060A] to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

/* ---------- Main Section ---------- */

export function LandingContentPreview() {
  return (
    <section className="py-16 md:py-24 bg-[#05060A]">
      <div className="container mx-auto px-4 sm:px-6 space-y-14 md:space-y-20">
        {/* Bento Grid — "Популярное сейчас" */}
        <ScrollReveal>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-mp-text-primary mb-6 md:mb-8">
              Популярное сейчас
            </h2>
            <BentoGrid />
          </div>
        </ScrollReveal>

        {/* Scroll Row — "Сериалы" */}
        <ScrollReveal delay={0.1}>
          <ContentRowPreview
            title="Сериалы"
            href="/series"
            items={mockSeries}
          />
        </ScrollReveal>

        {/* Scroll Row — "Обучающие курсы" */}
        <ScrollReveal delay={0.15}>
          <ContentRowPreview
            title="Обучающие курсы"
            href="/tutorials"
            items={mockCourses}
            accentColor="#28E0C4"
          />
        </ScrollReveal>
      </div>
    </section>
  );
}
