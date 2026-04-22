'use client';

import { ShareNetwork, ArrowLeft, Gift, Users, Coins, TrendUp } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { PartnerInviteCard, PartnerLevelBadge } from '@/components/partner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import { usePartnerDashboard, usePartnerLevels } from '@/hooks/use-partner';

/**
 * Invite page with referral info
 */
export default function PartnerInvitePage() {
  const { data: dashboard, isLoading: isDashboardLoading } = usePartnerDashboard();
  const { data: levels, isLoading: isLevelsLoading } = usePartnerLevels();

  const isLoading = isDashboardLoading || isLevelsLoading;

  return (
    <Container size="lg" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/partner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к дашборду
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-mp-accent-primary/20">
            <ShareNetwork className="h-6 w-6 text-mp-accent-primary" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Пригласить друзей
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Делитесь ссылкой и зарабатывайте с каждой покупки рефералов
        </p>
      </div>

      {/* Invite card */}
      <PartnerInviteCard
        referralCode={dashboard?.referralCode}
        referralUrl={dashboard?.referralUrl}
        isLoading={isLoading}
        className="mb-8"
      />

      {/* How it works */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-mp-accent-secondary" />
            Как это работает
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HowItWorksStep
              icon={Users}
              step={1}
              title="Пригласите друга"
              description="Поделитесь своей уникальной ссылкой или кодом"
            />
            <HowItWorksStep
              icon={Coins}
              step={2}
              title="Друг делает покупку"
              description="Вы получаете комиссию с каждой его оплаты"
            />
            <HowItWorksStep
              icon={TrendUp}
              step={3}
              title="Растите в уровнях"
              description="Чем больше рефералов, тем выше ваш статус"
            />
          </div>
        </CardContent>
      </Card>

      {/* Commission rates */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Комиссионные ставки</CardTitle>
          <CardDescription>
            Получайте комиссию до 5 уровней вглубь вашей структуры
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {[
              { level: 1, rate: 10, color: 'bg-mp-accent-primary' },
              { level: 2, rate: 5, color: 'bg-mp-accent-secondary' },
              { level: 3, rate: 3, color: 'bg-yellow-500' },
              { level: 4, rate: 2, color: 'bg-orange-500' },
              { level: 5, rate: 1, color: 'bg-red-500' },
            ].map(({ level, rate, color }) => (
              <div
                key={level}
                className="text-center p-4 rounded-lg bg-mp-surface"
              >
                <div
                  className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white font-bold mx-auto mb-2`}
                >
                  {level}
                </div>
                <p className="text-2xl font-bold">{rate}%</p>
                <p className="text-xs text-mp-text-secondary">Уровень {level}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Partner levels */}
      <Card>
        <CardHeader>
          <CardTitle>Уровни партнёра</CardTitle>
          <CardDescription>
            Повышайте уровень и получайте дополнительные бонусы
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLevelsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : levels ? (
            <div className="space-y-3">
              {levels.map((level) => (
                <div
                  key={level.level}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    dashboard?.level === level.level
                      ? 'border-mp-accent-primary bg-mp-accent-primary/10'
                      : 'border-mp-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <PartnerLevelBadge level={level.level} size="lg" />
                    <div>
                      <p className="font-medium">{level.name}</p>
                      <p className="text-sm text-mp-text-secondary">
                        {level.minReferrals}+ рефералов •{' '}
                        {level.minEarnings.toLocaleString('ru-RU')}+ ₽
                      </p>
                    </div>
                  </div>
                  {dashboard?.level === level.level && (
                    <span className="text-xs px-2 py-1 rounded-full bg-mp-accent-primary/20 text-mp-accent-primary">
                      Текущий
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
}

/**
 * How it works step component
 */
interface HowItWorksStepProps {
  icon: React.ElementType;
  step: number;
  title: string;
  description: string;
}

function HowItWorksStep({ icon: Icon, step, title, description }: HowItWorksStepProps) {
  return (
    <div className="text-center">
      <div className="relative inline-block mb-4">
        <div className="w-16 h-16 rounded-full bg-mp-surface flex items-center justify-center">
          <Icon className="h-8 w-8 text-mp-accent-secondary" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-mp-accent-primary flex items-center justify-center text-xs font-bold text-white">
          {step}
        </div>
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-mp-text-secondary">{description}</p>
    </div>
  );
}
