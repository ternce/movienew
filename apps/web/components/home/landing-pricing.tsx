'use client';

import { Check, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollReveal } from './scroll-reveal';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  featured: boolean;
  badge?: string;
  buttonVariant: 'ghost' | 'gradient' | 'outline';
}

const plans: PricingPlan[] = [
  {
    name: 'Базовый',
    price: '0₽',
    period: 'навсегда',
    description: 'Для знакомства с платформой',
    features: [
      'Доступ к бесплатному контенту',
      'SD качество (480p)',
      'Просмотр на 1 устройстве',
      'Базовые рекомендации',
    ],
    featured: false,
    buttonVariant: 'ghost',
  },
  {
    name: 'Стандарт',
    price: '299₽',
    period: '/мес',
    description: 'Всё, что нужно для комфортного просмотра',
    features: [
      'Весь каталог сериалов и курсов',
      'Full HD качество (1080p)',
      'Просмотр на 3 устройствах',
      'Бонусная программа',
      'Без рекламы',
    ],
    featured: true,
    badge: 'Популярный',
    buttonVariant: 'gradient',
  },
  {
    name: 'Премиум',
    price: '599₽',
    period: '/мес',
    description: 'Максимум возможностей',
    features: [
      'Ранний доступ к новинкам',
      '4K Ultra HD + HDR',
      'Просмотр на 5 устройствах',
      'Приоритетная поддержка',
      'Партнерская программа',
    ],
    featured: false,
    buttonVariant: 'outline',
  },
];

export function LandingPricing() {
  return (
    <section className="py-16 md:py-24 bg-[#05060A] relative">
      {/* Subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 50% 30%, rgba(201,75,255,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative container mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-xl sm:text-2xl font-bold text-mp-text-primary mb-3">
              Выберите свой тариф
            </h2>
            <p className="text-mp-text-secondary max-w-md mx-auto">
              Начните бесплатно и переходите на премиум, когда будете готовы
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div
                className={cn(
                  'relative rounded-2xl h-full',
                  plan.featured && 'md:-mt-4 md:mb-[-16px]'
                )}
              >
                {/* Gradient border for featured card */}
                {plan.featured && (
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-mp-accent-primary/40 via-mp-accent-secondary/20 to-transparent" />
                )}

                <div
                  className={cn(
                    'relative rounded-2xl p-6 md:p-7 h-full flex flex-col',
                    plan.featured
                      ? 'bg-[#10131C]'
                      : 'bg-white/[0.02] border border-white/[0.06]'
                  )}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-mp-accent-primary to-mp-accent-secondary text-white shadow-lg shadow-mp-accent-primary/20">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-mp-text-primary mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-mp-text-secondary">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <span className="text-3xl md:text-4xl font-bold text-mp-text-primary">
                      {plan.price}
                    </span>
                    <span className="text-sm text-mp-text-secondary ml-1">
                      {plan.period}
                    </span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check
                          className={cn(
                            'w-4 h-4 mt-0.5 flex-shrink-0',
                            plan.featured
                              ? 'text-mp-accent-secondary'
                              : 'text-mp-text-disabled'
                          )}
                        />
                        <span className="text-sm text-mp-text-secondary">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.buttonVariant}
                    size="lg"
                    className="w-full justify-center"
                    asChild
                  >
                    <Link href="/register">
                      Начать
                      {plan.featured && <ArrowRight className="w-4 h-4" />}
                    </Link>
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3}>
          <div className="text-center mt-8 md:mt-10">
            <Link
              href="/pricing"
              className="text-sm text-mp-text-secondary hover:text-mp-accent-primary transition-colors inline-flex items-center gap-1"
            >
              Подробнее о тарифах
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
