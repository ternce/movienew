'use client';

import { ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ScrollReveal } from './scroll-reveal';

const bgGradients = [
  'linear-gradient(135deg, #1a0a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 100%)',
  'linear-gradient(135deg, #1e1233 0%, #110e2e 100%)',
  'linear-gradient(135deg, #0d1b2a 0%, #1b2838 100%)',
  'linear-gradient(135deg, #170b26 0%, #1a1a2e 100%)',
  'linear-gradient(135deg, #0e1428 0%, #1c1230 100%)',
];

const avatarGradients = [
  'linear-gradient(135deg, #C94BFF, #8B5CF6)',
  'linear-gradient(135deg, #28E0C4, #06B6D4)',
  'linear-gradient(135deg, #FF6B5A, #F59E0B)',
  'linear-gradient(135deg, #3B82F6, #6366F1)',
  'linear-gradient(135deg, #EC4899, #C94BFF)',
];

export function LandingCTA() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background collage — gradient tiles, blurred + dimmed */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2 opacity-20">
        {bgGradients.map((gradient, i) => (
          <div
            key={i}
            className="overflow-hidden blur-sm brightness-50"
            style={{ background: gradient }}
          />
        ))}
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#05060A]/80" />

      {/* Violet radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(201,75,255,0.1) 0%, transparent 70%)',
        }}
      />

      <div className="relative container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-mp-text-primary mb-4 md:mb-6">
              Готовы начать смотреть?
            </h2>

            <p className="text-base sm:text-lg text-mp-text-secondary mb-8 leading-relaxed">
              Присоединяйтесь бесплатно. Отмена подписки в любой момент.
            </p>

            {/* Stacked avatars */}
            <div className="flex items-center justify-center mb-4">
              <div className="flex -space-x-3">
                {avatarGradients.map((gradient, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-[#05060A]"
                    style={{ zIndex: avatarGradients.length - i, background: gradient }}
                  />
                ))}
              </div>
            </div>

            <p className="text-sm text-mp-text-secondary mb-8">
              Присоединились{' '}
              <span className="text-mp-text-primary font-semibold">
                10,000+
              </span>{' '}
              зрителей
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
              <Button
                variant="gradient"
                size="xl"
                className="w-full sm:w-auto shadow-lg shadow-mp-accent-primary/25"
                asChild
              >
                <Link href="/register">
                  Начать бесплатно
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="glass" size="xl" className="w-full sm:w-auto" asChild>
                <Link href="/pricing">Узнать о тарифах</Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
