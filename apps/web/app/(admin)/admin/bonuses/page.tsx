'use client';

import {
  Gift,
  TrendUp,
  TrendDown,
  Clock,
  Users,
  ArrowRight,
  Heartbeat,
  Wallet,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminBonusStats,
  useAdminBonusRates,
  useAdminBonusCampaigns,
} from '@/hooks/use-admin-bonus';

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Admin bonuses overview page
 */
export default function AdminBonusesPage() {
  const { data: stats, isLoading: isLoadingStats } = useAdminBonusStats();
  const { data: rates, isLoading: isLoadingRates } = useAdminBonusRates();
  const { data: campaigns, isLoading: isLoadingCampaigns } = useAdminBonusCampaigns({
    status: 'ACTIVE',
    limit: 5,
  });

  const currentRate = rates?.find((r) => r.isActive);

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Бонусная система"
        description="Управление бонусами, курсами и кампаниями"
      >
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/bonuses/rates">Курсы</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/bonuses/campaigns">Кампании</Link>
          </Button>
        </div>
      </AdminPageHeader>

      {/* Quick stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Gift}
          iconColor="text-mp-accent-secondary"
          label="Общий баланс"
          value={stats?.totalBalance}
          isLoading={isLoadingStats}
          formatFn={formatCurrency}
        />
        <StatsCard
          icon={TrendUp}
          iconColor="text-green-400"
          label="Всего начислено"
          value={stats?.totalEarned}
          isLoading={isLoadingStats}
          formatFn={formatCurrency}
        />
        <StatsCard
          icon={TrendDown}
          iconColor="text-red-400"
          label="Всего потрачено"
          value={stats?.totalSpent}
          isLoading={isLoadingStats}
          formatFn={formatCurrency}
        />
        <StatsCard
          icon={Clock}
          iconColor="text-yellow-400"
          label="Истекает (30 дней)"
          value={stats?.expiringIn30Days}
          isLoading={isLoadingStats}
          formatFn={formatCurrency}
          highlight={(stats?.expiringIn30Days ?? 0) > 0}
        />
      </div>

      {/* Secondary stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Users}
          iconColor="text-blue-400"
          label="Активных пользователей"
          value={stats?.activeUsers}
          isLoading={isLoadingStats}
        />
        <StatsCard
          icon={Wallet}
          iconColor="text-purple-400"
          label="Выведено"
          value={stats?.totalWithdrawn}
          isLoading={isLoadingStats}
          formatFn={formatCurrency}
        />
        <StatsCard
          icon={Heartbeat}
          iconColor="text-cyan-400"
          label="Транзакций сегодня"
          value={stats?.transactionsToday}
          isLoading={isLoadingStats}
        />
        <StatsCard
          icon={Heartbeat}
          iconColor="text-emerald-400"
          label="Транзакций за месяц"
          value={stats?.transactionsThisMonth}
          isLoading={isLoadingStats}
        />
      </div>

      {/* Content cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Текущий курс</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/bonuses/rates">
                Управление
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingRates ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : currentRate ? (
              <div>
                <p className="text-3xl font-bold text-mp-text-primary">
                  1 бонус = {currentRate.rate} ₽
                </p>
                <p className="mt-1 text-sm text-mp-text-secondary">
                  Действует с{' '}
                  {new Date(currentRate.effectiveFrom).toLocaleDateString('ru-RU')}
                  {currentRate.effectiveTo && (
                    <> до {new Date(currentRate.effectiveTo).toLocaleDateString('ru-RU')}</>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-mp-text-secondary">Курс не установлен</p>
            )}
          </CardContent>
        </Card>

        {/* Active campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Активные кампании</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/bonuses/campaigns">
                Все кампании
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingCampaigns ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : campaigns?.items?.length ? (
              <div className="space-y-3">
                {campaigns.items.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between rounded-lg border border-mp-border bg-mp-surface/50 p-3"
                  >
                    <div>
                      <p className="font-medium text-mp-text-primary">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-mp-text-secondary">
                        {formatCurrency(campaign.bonusAmount)} • {campaign.usedCount} начислений
                      </p>
                    </div>
                    <CampaignStatusBadge status={campaign.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-mp-text-secondary">Нет активных кампаний</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/admin/bonuses/rates/new"
              title="Новый курс"
              description="Создать курс конвертации"
            />
            <QuickAction
              href="/admin/bonuses/campaigns/new"
              title="Новая кампания"
              description="Запустить бонусную кампанию"
            />
            <QuickAction
              href="/admin/bonuses/users"
              title="Пользователи"
              description="Управление балансами"
            />
            <QuickAction
              href="/admin/bonuses/export"
              title="Экспорт"
              description="Выгрузить отчёт"
            />
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}

/**
 * Stats card component
 */
interface StatsCardProps {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: number | undefined;
  isLoading?: boolean;
  formatFn?: (value: number) => string;
  highlight?: boolean;
}

function StatsCard({
  icon: Icon,
  iconColor,
  label,
  value,
  isLoading,
  formatFn = (v) => v.toString(),
  highlight,
}: StatsCardProps) {
  return (
    <Card className={highlight ? 'border-yellow-500/30 bg-yellow-500/5' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg bg-mp-surface p-2 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            {isLoading ? (
              <>
                <Skeleton className="mb-1 h-6 w-20" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <p
                  className={`text-xl font-bold ${
                    highlight ? 'text-yellow-400' : 'text-mp-text-primary'
                  }`}
                >
                  {formatFn(value ?? 0)}
                </p>
                <p className="text-sm text-mp-text-secondary">{label}</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Campaign status badge
 */
function CampaignStatusBadge({
  status,
}: {
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}) {
  const config = {
    DRAFT: { label: 'Черновик', color: 'bg-gray-500/20 text-gray-400' },
    ACTIVE: { label: 'Активна', color: 'bg-green-500/20 text-green-400' },
    COMPLETED: { label: 'Завершена', color: 'bg-blue-500/20 text-blue-400' },
    CANCELLED: { label: 'Отменена', color: 'bg-red-500/20 text-red-400' },
  };

  const { label, color } = config[status];

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

/**
 * Quick action card
 */
function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-lg border border-mp-border bg-mp-surface/50 p-4 transition-colors hover:bg-mp-surface"
    >
      <p className="font-medium text-mp-text-primary">{title}</p>
      <p className="mt-1 text-sm text-mp-text-secondary">{description}</p>
    </Link>
  );
}
