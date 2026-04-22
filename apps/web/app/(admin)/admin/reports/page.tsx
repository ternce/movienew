'use client';

import {
  CurrencyDollar,
  Users,
  FilmStrip,
  Crown,
  GitBranch,
  Bag,
} from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

const AreaChartCard = dynamic(
  () => import('@/components/admin/charts/area-chart-card').then((m) => m.AreaChartCard),
  { loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> }
);
const BarChartCard = dynamic(
  () => import('@/components/admin/charts/bar-chart-card').then((m) => m.BarChartCard),
  { loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> }
);
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Container } from '@/components/ui/container';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { useAdminPaymentStats } from '@/hooks/use-admin-payments';

// ============ Helpers ============

function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount) + ' \u20BD'
  );
}

function formatShortCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

function formatMonth(period: string): string {
  const months: Record<string, string> = {
    '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр',
    '05': 'Май', '06': 'Июн', '07': 'Июл', '08': 'Авг',
    '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек',
  };
  const parts = period.split('-');
  if (parts.length === 2) return months[parts[1]] || period;
  return period;
}

// ============ Page Component ============

export default function AdminReportsPage() {
  const { data: dashboard, isLoading: isLoadingDashboard } = useAdminDashboard();
  const { data: paymentStats, isLoading: isLoadingPaymentStats } = useAdminPaymentStats();

  const stats = dashboard?.stats;
  const isLoading = isLoadingDashboard || isLoadingPaymentStats;

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Отчёты"
        description="Аналитика и статистика платформы"
      />

      {/* Metric cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Выручка"
          value={
            isLoading
              ? '...'
              : formatCurrency(paymentStats?.totalRevenue ?? stats?.monthlyRevenue ?? 0)
          }
          icon={CurrencyDollar}
          description="Общая выручка платформы"
        />
        <StatsCard
          title="Пользователи"
          value={isLoading ? '...' : (stats?.totalUsers?.toLocaleString() ?? '0')}
          icon={Users}
          description="Зарегистрировано"
        />
        <StatsCard
          title="Контент"
          value={isLoading ? '...' : (stats?.contentCount?.toLocaleString() ?? '0')}
          icon={FilmStrip}
          description="Единиц контента"
        />
        <StatsCard
          title="Подписки"
          value={isLoading ? '...' : (stats?.activeSubscriptions?.toLocaleString() ?? '0')}
          icon={Crown}
          description="Активных подписок"
        />
        <StatsCard
          title="Партнёры"
          value={isLoading ? '...' : '0'}
          icon={GitBranch}
          description="В партнёрской программе"
        />
        <StatsCard
          title="Заказы"
          value={isLoading ? '...' : (stats?.pendingOrders?.toLocaleString() ?? '0')}
          icon={Bag}
          description="Ожидающих обработки"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <AreaChartCard
          title="График выручки"
          description="Динамика выручки за последние 12 месяцев"
          data={dashboard?.revenueByMonth ?? []}
          xAxisKey="period"
          series={[
            { key: 'subscriptionRevenue', label: 'Подписки', color: '#C94BFF' },
            { key: 'storeRevenue', label: 'Магазин', color: '#28E0C4' },
            { key: 'totalRevenue', label: 'Итого', color: '#FF6B5A', type: 'line' },
          ]}
          isLoading={isLoadingDashboard}
          height={320}
          formatValue={formatShortCurrency}
          formatXAxis={formatMonth}
        />
        <AreaChartCard
          title="Рост пользователей"
          description="Регистрации новых пользователей за 30 дней"
          data={dashboard?.userGrowth ?? []}
          xAxisKey="date"
          series={[
            { key: 'totalUsers', label: 'Всего', color: '#C94BFF' },
            { key: 'newUsers', label: 'Новые', color: '#28E0C4', type: 'line' },
          ]}
          isLoading={isLoadingDashboard}
          height={320}
          formatXAxis={(v) => {
            const parts = v.split('-');
            return parts.length === 3 ? `${parts[2]}.${parts[1]}` : v;
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <BarChartCard
          title="Выручка по источникам"
          description="Сравнение подписок и магазина по месяцам"
          data={dashboard?.revenueByMonth ?? []}
          xAxisKey="period"
          series={[
            { key: 'subscriptionRevenue', label: 'Подписки', color: '#C94BFF', stackId: 'revenue' },
            { key: 'storeRevenue', label: 'Магазин', color: '#28E0C4', stackId: 'revenue' },
          ]}
          isLoading={isLoadingDashboard}
          height={300}
          formatValue={formatShortCurrency}
          formatXAxis={formatMonth}
        />
      </div>
    </Container>
  );
}
