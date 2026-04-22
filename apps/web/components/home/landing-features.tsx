'use client';

import {
  Play,
  Sparkle,
  Users,
  Shield,
  Monitor,
  Brain,
} from '@phosphor-icons/react';

import { ScrollReveal } from './scroll-reveal';

interface Feature {
  icon: typeof Play;
  title: string;
  description: string;
  accent: string; // hex
  glowColor: string; // rgba for shadow
}

const features: Feature[] = [
  {
    icon: Play,
    title: 'HD Качество',
    description:
      'Смотрите в Full HD и 4K с адаптивным стримингом на любом устройстве',
    accent: '#C94BFF',
    glowColor: 'rgba(201,75,255,0.25)',
  },
  {
    icon: Sparkle,
    title: 'Бонусная система',
    description:
      'Получайте бонусы за активность и тратьте их на любой контент платформы',
    accent: '#28E0C4',
    glowColor: 'rgba(40,224,196,0.25)',
  },
  {
    icon: Users,
    title: 'Партнерская программа',
    description:
      'Приглашайте друзей и получайте до 15% от их платежей на 5 уровнях',
    accent: '#FF6B5A',
    glowColor: 'rgba(255,107,90,0.25)',
  },
  {
    icon: Shield,
    title: 'Безопасность',
    description:
      'Возрастные ограничения и надёжная защита вашего аккаунта и данных',
    accent: '#4ADE80',
    glowColor: 'rgba(74,222,128,0.25)',
  },
  {
    icon: Monitor,
    title: 'Мультиустройства',
    description:
      'Смотрите на телефоне, планшете, ноутбуке или телевизоре без ограничений',
    accent: '#3B82F6',
    glowColor: 'rgba(59,130,246,0.25)',
  },
  {
    icon: Brain,
    title: 'Умные рекомендации',
    description:
      'Персональные подборки на основе ваших предпочтений и истории просмотров',
    accent: '#F59E0B',
    glowColor: 'rgba(245,158,11,0.25)',
  },
];

export function LandingFeatures() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Section bg: subtle violet radial */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #05060A 0%, #080B12 30%, #080B12 70%, #05060A 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,75,255,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="max-w-lg mb-10 md:mb-14">
            <h2 className="text-xl sm:text-2xl font-bold text-mp-text-primary mb-3">
              Почему выбирают нас
            </h2>
            <p className="text-mp-text-secondary leading-relaxed">
              Платформа, созданная для удобства и качественного контента
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.map((feature, i) => (
            <ScrollReveal key={i} delay={i * 0.08}>
              <div className="group relative h-full">
                {/* Gradient border — visible on hover */}
                <div
                  className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${feature.accent}40, transparent 60%)`,
                  }}
                />

                {/* Card content */}
                <div className="relative p-6 rounded-2xl bg-[#10131C] border border-white/[0.06] hover:border-transparent transition-colors duration-300 h-full">
                  {/* Icon with accent glow */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-shadow duration-300"
                    style={{
                      background: `${feature.accent}15`,
                      boxShadow: `0 0 0 ${feature.glowColor}`,
                    }}
                  >
                    <feature.icon
                      className="w-5 h-5 transition-colors duration-300"
                      style={{ color: feature.accent }}
                    />
                  </div>

                  <h3 className="font-semibold text-mp-text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-mp-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
