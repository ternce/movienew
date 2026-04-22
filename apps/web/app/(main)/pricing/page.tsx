'use client';

import { Crown, Check, Sparkle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { PlanCard, PlanComparisonTable } from '@/components/subscription';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscriptionPlans, useActiveSubscription } from '@/hooks';
import { useSubscriptionStore } from '@/stores/subscription.store';
import type { SubscriptionPlan } from '@/types';

/**
 * Pricing page - Display subscription plans
 */
export default function PricingPage() {
  const router = useRouter();
  const { data: plans, isLoading: isLoadingPlans, error } = useSubscriptionPlans();
  const { data: activeSubscription, isLoading: isLoadingActive } = useActiveSubscription();
  const setSelectedPlan = useSubscriptionStore((state) => state.setSelectedPlan);

  // Separate plans by type
  const premiumPlans = React.useMemo(
    () => plans?.filter((p) => p.type === 'PREMIUM') || [],
    [plans]
  );
  const contentPlans = React.useMemo(
    () => plans?.filter((p) => p.type === 'CONTENT_SPECIFIC') || [],
    [plans]
  );

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    router.push('/checkout');
  };

  const isLoading = isLoadingPlans || isLoadingActive;

  return (
    <Container size="xl" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-mp-accent-primary/10 px-4 py-2 text-sm font-medium text-mp-accent-primary">
          <Sparkle className="h-4 w-4" />
          Тарифные планы
        </div>
        <h1 className="mb-4 text-3xl font-bold text-mp-text-primary md:text-4xl">
          Выберите подходящий план
        </h1>
        <p className="mx-auto max-w-2xl text-mp-text-secondary">
          Получите доступ к эксклюзивному контенту, HD и 4K качеству, просмотру без
          рекламы и многим другим преимуществам
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-8 rounded-lg border border-mp-error-text/20 bg-mp-error-bg/50 p-6 text-center">
          <p className="text-mp-error-text">
            Не удалось загрузить тарифные планы. Попробуйте обновить страницу.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Обновить
          </Button>
        </div>
      )}

      {/* Active subscription notice */}
      {activeSubscription && (
        <div className="mb-8 rounded-lg border border-mp-accent-secondary/30 bg-mp-accent-secondary/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-mp-accent-secondary" />
              <div>
                <p className="font-medium text-mp-text-primary">
                  У вас есть активная подписка: {activeSubscription.plan.name}
                </p>
                <p className="text-sm text-mp-text-secondary">
                  Действует до{' '}
                  {new Date(activeSubscription.expiresAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/account/subscriptions">Управление</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Plans tabs */}
      <Tabs defaultValue="premium" className="mb-12">
        <TabsList className="mx-auto mb-8 grid w-fit grid-cols-2">
          <TabsTrigger value="premium" className="px-8">
            <Crown className="mr-2 h-4 w-4" />
            Premium
          </TabsTrigger>
          <TabsTrigger value="content" className="px-8">
            Отдельный контент
          </TabsTrigger>
        </TabsList>

        {/* Premium plans */}
        <TabsContent value="premium">
          {isLoading ? (
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-mp-border p-6">
                  <Skeleton className="mb-4 h-6 w-24" />
                  <Skeleton className="mb-2 h-8 w-32" />
                  <Skeleton className="mb-6 h-4 w-full" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                  <Skeleton className="mt-6 h-10 w-full" />
                </div>
              ))}
            </div>
          ) : premiumPlans.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-mp-text-secondary">
                Premium планы пока недоступны
              </p>
            </div>
          ) : (
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              {premiumPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={activeSubscription?.plan.id === plan.id}
                  onSelect={handleSelectPlan}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Content-specific plans */}
        <TabsContent value="content">
          {isLoading ? (
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-mp-border p-6">
                  <Skeleton className="mb-4 h-6 w-24" />
                  <Skeleton className="mb-2 h-8 w-32" />
                  <Skeleton className="mb-6 h-4 w-full" />
                  <Skeleton className="mt-6 h-10 w-full" />
                </div>
              ))}
            </div>
          ) : contentPlans.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-mp-text-secondary">
                Планы для отдельного контента пока недоступны
              </p>
              <p className="mt-2 text-sm text-mp-text-disabled">
                Вы можете приобрести доступ к конкретным сериалам на их страницах
              </p>
            </div>
          ) : (
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              {contentPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={activeSubscription?.plan.id === plan.id}
                  onSelect={handleSelectPlan}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Comparison table */}
      {!isLoading && premiumPlans.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-mp-text-primary">
            Сравнение планов
          </h2>
          <PlanComparisonTable
            plans={premiumPlans}
            currentPlanId={activeSubscription?.plan.id}
            onSelectPlan={handleSelectPlan}
          />
        </div>
      )}

      {/* FAQ section */}
      <div className="mt-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-mp-text-primary">
          Часто задаваемые вопросы
        </h2>
        <div className="mx-auto max-w-2xl space-y-4">
          <FaqItem
            question="Могу ли я отменить подписку в любое время?"
            answer="Да, вы можете отменить подписку в любой момент. При отмене вы сохраните доступ до конца оплаченного периода."
          />
          <FaqItem
            question="Какие способы оплаты поддерживаются?"
            answer="Мы принимаем банковские карты (Visa, Mastercard, МИР), СБП (оплата по QR-коду) и банковские переводы для юридических лиц."
          />
          <FaqItem
            question="Могу ли я использовать бонусы для оплаты?"
            answer="Да, накопленные бонусы можно использовать для частичной или полной оплаты подписки."
          />
          <FaqItem
            question="Что произойдёт при окончании подписки?"
            answer="Если включено автопродление, подписка будет автоматически продлена. В противном случае доступ к премиум-контенту прекратится."
          />
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 rounded-2xl bg-gradient-to-br from-mp-accent-primary/20 to-mp-accent-secondary/20 p-8 text-center md:p-12">
        <Crown className="mx-auto mb-4 h-12 w-12 text-mp-accent-primary" />
        <h2 className="mb-4 text-2xl font-bold text-mp-text-primary">
          Готовы начать?
        </h2>
        <p className="mb-6 text-mp-text-secondary">
          Выберите план и получите доступ к лучшему контенту уже сегодня
        </p>
        <Button
          variant="gradient"
          size="xl"
          onClick={() => {
            if (premiumPlans[0]) {
              handleSelectPlan(premiumPlans[0]);
            }
          }}
          disabled={isLoading || premiumPlans.length === 0}
        >
          Начать бесплатный период
        </Button>
      </div>
    </Container>
  );
}

/**
 * FAQ item component
 */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="rounded-lg border border-mp-border bg-mp-surface/50">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-mp-text-primary">{question}</span>
        <Check
          className={`h-5 w-5 text-mp-text-secondary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="border-t border-mp-border px-4 py-3">
          <p className="text-sm text-mp-text-secondary">{answer}</p>
        </div>
      )}
    </div>
  );
}
