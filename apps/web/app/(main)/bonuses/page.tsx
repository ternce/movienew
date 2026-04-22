'use client';

import { Gift, ClockCounterClockwise, Wallet, TrendUp, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import {
  BonusBalanceCard,
  BonusExpiringAlert,
  BonusStatsSummary,
  RecentTransactions,
  MonthlyComparisonCard,
} from '@/components/bonus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { useBonus } from '@/hooks/use-bonus';

/**
 * Bonus dashboard page
 */
export default function BonusDashboardPage() {
  const { balance, isLoading } = useBonus();

  return (
    <Container size="xl" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-mp-accent-secondary/20">
            <Gift className="h-6 w-6 text-mp-accent-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Мои бонусы
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Зарабатывайте бонусы и используйте их при оплате или выводите на счёт
        </p>
      </div>

      {/* Expiring alert */}
      <BonusExpiringAlert variant="banner" className="mb-6" />

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button
          variant="outline"
          asChild
          className="justify-start gap-3 h-auto py-4"
        >
          <Link href="/bonuses/history">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <ClockCounterClockwise className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">История</p>
              <p className="text-xs text-mp-text-secondary">
                Все транзакции
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-mp-text-secondary" />
          </Link>
        </Button>

        <Button
          variant="outline"
          asChild
          className="justify-start gap-3 h-auto py-4"
        >
          <Link href="/bonuses/withdraw">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">Вывести</p>
              <p className="text-xs text-mp-text-secondary">
                На банковский счёт
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-mp-text-secondary" />
          </Link>
        </Button>

        <Button
          variant="outline"
          asChild
          className="justify-start gap-3 h-auto py-4"
        >
          <Link href="/pricing">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mp-accent-primary/20 text-mp-accent-primary">
              <TrendUp className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">Использовать</p>
              <p className="text-xs text-mp-text-secondary">
                При покупке подписки
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-mp-text-secondary" />
          </Link>
        </Button>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Balance card - spans 2 columns */}
        <div className="lg:col-span-2">
          <BonusBalanceCard showActions={false} className="h-full" />
        </div>

        {/* Monthly comparison */}
        <MonthlyComparisonCard />
      </div>

      {/* Statistics */}
      <BonusStatsSummary className="mt-6" />

      {/* Recent transactions */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClockCounterClockwise className="h-5 w-5 text-blue-400" />
            Последние операции
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/bonuses/history">
              Все операции
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <RecentTransactions limit={5} />
        </CardContent>
      </Card>

      {/* How to earn section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Как заработать бонусы?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <EarningMethod
              icon="👥"
              title="Партнёрская программа"
              description="Приглашайте друзей и получайте комиссию с их покупок"
              link="/partner"
            />
            <EarningMethod
              icon="🎁"
              title="Промо-акции"
              description="Участвуйте в акциях и получайте бонусы"
              link="#"
            />
            <EarningMethod
              icon="⭐"
              title="Активность"
              description="Получайте бонусы за активность на платформе"
              link="#"
            />
            <EarningMethod
              icon="💰"
              title="Возвраты"
              description="При возврате средства начисляются бонусами"
              link="#"
            />
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}

/**
 * Earning method card
 */
function EarningMethod({
  icon,
  title,
  description,
  link,
}: {
  icon: string;
  title: string;
  description: string;
  link: string;
}) {
  return (
    <Link
      href={link}
      className="flex gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4 transition-colors hover:bg-mp-surface"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-mp-text-primary">{title}</p>
        <p className="mt-1 text-sm text-mp-text-secondary">{description}</p>
      </div>
    </Link>
  );
}
