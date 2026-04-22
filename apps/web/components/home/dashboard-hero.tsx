'use client';

import { HeroSection, type HeroContent } from '@/components/content';
import { HeroSkeleton } from './hero-skeleton';

interface DashboardHeroProps {
  content: HeroContent | null;
  isLoading: boolean;
}

/**
 * Dashboard hero section connected to real API data.
 * Falls back to a gradient welcome hero if no content is available.
 */
export function DashboardHero({ content, isLoading }: DashboardHeroProps) {
  if (isLoading) {
    return <HeroSkeleton />;
  }

  if (!content) {
    return (
      <section className="relative w-full h-[250px] sm:h-[320px] md:h-[420px] rounded-2xl overflow-hidden bg-mp-surface">
        {/* Animated gradient mesh welcome hero — violet→cyan→coral */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(201,75,255,0.2) 0%, rgba(40,224,196,0.12) 40%, rgba(255,107,90,0.08) 70%, rgba(16,19,28,1) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 70% 30%, rgba(201,75,255,0.1) 0%, transparent 60%)',
          }}
        />
        <div className="relative h-full flex flex-col justify-end p-6 md:p-10 max-w-xl">
          <h1 className="text-2xl md:text-4xl font-bold text-mp-text-primary mb-3 tracking-tight">
            Добро пожаловать
          </h1>
          <p className="text-mp-text-secondary text-sm md:text-base leading-relaxed">
            Откройте для себя тысячи сериалов, курсов и эксклюзивного контента
          </p>
        </div>
      </section>
    );
  }

  return (
    <HeroSection
      content={content}
    />
  );
}
