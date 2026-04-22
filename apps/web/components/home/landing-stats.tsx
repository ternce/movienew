'use client';

import {
  useMotionValue,
  useSpring,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import { useEffect, useRef } from 'react';

import { ScrollReveal } from './scroll-reveal';

interface StatItemProps {
  value: number;
  suffix: string;
  label: string;
}

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 2000, bounce: 0 });
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (inView) {
      motionValue.set(value);
    } else {
      // Fallback: if IntersectionObserver hasn't fired within 2s, animate anyway
      const timer = setTimeout(() => {
        motionValue.set(value);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [inView, motionValue, value]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent =
          Math.round(latest).toLocaleString('ru-RU') + suffix;
      }
    });
    return unsubscribe;
  }, [springValue, suffix]);

  const formatted = value.toLocaleString('ru-RU') + suffix;

  if (prefersReducedMotion) {
    return (
      <span ref={ref} className="text-3xl sm:text-4xl md:text-5xl font-bold text-mp-text-primary">
        {formatted}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className="text-3xl sm:text-4xl md:text-5xl font-bold text-mp-text-primary"
    >
      {formatted}
    </span>
  );
}

function StatItem({ value, suffix, label }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-4">
      <AnimatedCounter value={value} suffix={suffix} />
      <span className="text-sm text-mp-text-secondary font-medium">
        {label}
      </span>
    </div>
  );
}

const stats = [
  { value: 10000, suffix: '+', label: 'Единиц контента' },
  { value: 50000, suffix: '+', label: 'Зрителей' },
  { value: 4, suffix: 'K', label: 'Качество видео' },
  { value: 24, suffix: '/7', label: 'Поддержка' },
];

export function LandingStats() {
  return (
    <section className="py-14 md:py-20 bg-[#05060A] relative">
      {/* Subtle violet glow behind */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(201,75,255,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-6 md:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0">
              {stats.map((stat, i) => (
                <div key={i} className="relative">
                  <StatItem {...stat} />
                  {/* Glass divider — hidden on last item and on mobile between rows */}
                  {i < stats.length - 1 && (
                    <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
