'use client';

import { ArrowRight, CaretDown, FilmStrip, Television, Sparkle } from '@phosphor-icons/react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';

const ease = [0.16, 1, 0.3, 1];

const floatingCards = [
  { icon: FilmStrip, label: '10K+', sub: 'фильмов', delay: 0.8 },
  { icon: Television, label: '4K', sub: 'качество', delay: 1.0 },
  { icon: Sparkle, label: '0₽', sub: 'старт', delay: 1.2 },
];

const particles = [
  { size: 3, x: '15%', y: '20%', duration: 6, color: 'rgba(201,75,255,0.4)' },
  { size: 2, x: '80%', y: '30%', duration: 8, color: 'rgba(40,224,196,0.3)' },
  { size: 4, x: '60%', y: '70%', duration: 7, color: 'rgba(201,75,255,0.3)' },
  { size: 2, x: '30%', y: '60%', duration: 9, color: 'rgba(255,107,90,0.3)' },
  { size: 3, x: '85%', y: '80%', duration: 5, color: 'rgba(40,224,196,0.4)' },
  { size: 2, x: '45%', y: '15%', duration: 10, color: 'rgba(201,75,255,0.25)' },
];

export function LandingHero() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Parallax: image moves at 0.2x speed
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  const animate = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease },
        };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100dvh] flex items-end md:items-center overflow-hidden"
    >
      {/* Full-bleed background image with parallax */}
      <motion.div
        className="absolute inset-0"
        style={prefersReducedMotion ? {} : { y: bgY }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0a0c18 0%, #15102a 30%, #1a0a20 50%, #0d1520 70%, #080b12 100%)',
          }}
        />
        {/* Decorative gradient orbs for cinematic feel */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 40% 50% at 70% 40%, rgba(201,75,255,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 30% 40% at 20% 60%, rgba(40,224,196,0.08) 0%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* Gradient overlays — ACTUALLY VISIBLE */}
      {/* Bottom-to-top dark gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, #05060A 0%, rgba(5,6,10,0.85) 40%, rgba(5,6,10,0.4) 70%, rgba(5,6,10,0.6) 100%)',
        }}
      />

      {/* Left-to-right reading gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(5,6,10,0.8) 0%, rgba(5,6,10,0.3) 50%, transparent 100%)',
        }}
      />

      {/* Subtle violet radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 30% 50%, rgba(201,75,255,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Animated particles */}
      {!prefersReducedMotion &&
        particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              left: p.x,
              top: p.y,
              background: p.color,
              animation: `float-particle ${p.duration}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}

      {/* Content */}
      <div className="relative container mx-auto px-4 sm:px-6 pb-24 md:pb-0 pt-24 md:pt-0">
        <div className="flex items-center justify-between">
          <div className="max-w-2xl">
            {/* Eyebrow badge */}
            <motion.div {...animate(0.3)}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08] mb-6 md:mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-mp-accent-secondary animate-pulse" />
                <span className="text-sm text-mp-text-secondary font-medium">
                  Стриминговая платформа нового поколения
                </span>
              </div>
            </motion.div>

            {/* Gradient text title */}
            <motion.h1
              {...animate(0.5)}
              className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold leading-[1.05] tracking-tight mb-5 md:mb-6"
            >
              <span className="text-gradient-vivid">Смотрите то,</span>
              <br />
              <span className="text-mp-text-primary">что вдохновляет</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              {...animate(0.7)}
              className="text-base sm:text-lg text-mp-text-secondary max-w-lg mb-8 md:mb-10 leading-relaxed"
            >
              Тысячи сериалов, обучающих курсов и эксклюзивного контента.
              Смотрите в любое время, с любого устройства.
            </motion.p>

            {/* CTAs */}
            <motion.div
              {...animate(0.9)}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
            >
              <Button variant="gradient" size="xl" className="w-full sm:w-auto shadow-lg shadow-mp-accent-primary/25" asChild>
                <Link href="/register">
                  Начать бесплатно
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="glass" size="xl" className="w-full sm:w-auto" asChild>
                <Link href="/pricing">Узнать о тарифах</Link>
              </Button>
            </motion.div>
          </div>

          {/* Floating glass stat cards — desktop only */}
          <div className="hidden lg:flex flex-col gap-4 mr-8">
            {floatingCards.map((card, i) => (
              <motion.div
                key={i}
                initial={prefersReducedMotion ? {} : { opacity: 0, x: 40 }}
                animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                transition={
                  prefersReducedMotion
                    ? {}
                    : { duration: 0.7, delay: card.delay, ease }
                }
              >
                <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] min-w-[180px]">
                  <div className="w-10 h-10 rounded-xl bg-mp-accent-primary/15 flex items-center justify-center">
                    <card.icon className="w-5 h-5 text-mp-accent-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-mp-text-primary">
                      {card.label}
                    </div>
                    <div className="text-xs text-mp-text-secondary">
                      {card.sub}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
      >
        <span className="text-xs text-mp-text-disabled font-medium tracking-widest uppercase">
          Прокрутите
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <CaretDown className="w-5 h-5 text-mp-text-disabled" />
        </motion.div>
      </motion.div>
    </section>
  );
}
