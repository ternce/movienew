'use client';

import {
  Users,
  CreditCard,
  ShieldCheck,
  Wallet,
  FilmStrip,
  Bag,
  TrendUp,
  Clock,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import dynamic from 'next/dynamic';

import { AdminPageHeader } from '@/components/admin/layout';
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const AreaChartCard = dynamic(
  () => import('@/components/admin/charts/area-chart-card').then((m) => m.AreaChartCard),
  { loading: () => <Skeleton className="h-[280px] w-full rounded-lg" /> }
);
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { cn } from '@/lib/utils';

// ============ Helpers ============

function formatCurrency(value: number): string {
  return (
    new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(value) + ' \u20BD'
  );
}

function formatShortCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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

// ============ Badge Configs ============

const transactionStatusConfig: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: 'Завершён', className: 'bg-green-500/20 text-green-400 border-transparent' },
  PENDING: { label: 'Ожидание', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
  PROCESSING: { label: 'Обработка', className: 'bg-blue-500/20 text-blue-400 border-transparent' },
  FAILED: { label: 'Ошибка', className: 'bg-red-500/20 text-red-400 border-transparent' },
  REFUNDED: { label: 'Возврат', className: 'bg-orange-500/20 text-orange-400 border-transparent' },
};

const transactionTypeLabels: Record<string, string> = {
  SUBSCRIPTION: 'Подписка',
  PURCHASE: 'Покупка',
  WITHDRAWAL: 'Вывод',
  BONUS: 'Бонус',
  REFUND: 'Возврат',
};

/**
 * Admin Dashboard page with real API data and charts
 */
export default function AdminDashboardPage() {
  const { data: dashboard, isLoading } = useAdminDashboard();

  const stats = dashboard?.stats;

  return (
    <div>
      <AdminPageHeader
        title="Панель управления"
        description="Обзор статистики платформы MoviePlatform"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Пользователи"
          value={isLoading ? '...' : (stats?.totalUsers?.toLocaleString() ?? '0')}
          description={
            isLoading
              ? 'Загрузка...'
              : `+${stats?.newUsersToday ?? 0} сегодня`
          }
          icon={Users}
        />
        <StatsCard
          title="Подписки"
          value={isLoading ? '...' : (stats?.activeSubscriptions?.toLocaleString() ?? '0')}
          description="Активных подписок"
          icon={CreditCard}
        />
        <StatsCard
          title="Выручка (мес.)"
          value={isLoading ? '...' : formatCurrency(stats?.monthlyRevenue ?? 0)}
          description="За текущий месяц"
          icon={TrendUp}
        />
        <StatsCard
          title="Контент"
          value={isLoading ? '...' : (stats?.contentCount?.toLocaleString() ?? '0')}
          description="Единиц контента"
          icon={FilmStrip}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        <AreaChartCard
          title="Выручка по месяцам"
          description="Подписки и магазин за последние 6 месяцев"
          data={dashboard?.revenueByMonth ?? []}
          xAxisKey="period"
          series={[
            { key: 'subscriptionRevenue', label: 'Подписки', color: '#C94BFF' },
            { key: 'storeRevenue', label: 'Магазин', color: '#28E0C4' },
          ]}
          isLoading={isLoading}
          height={280}
          formatValue={formatShortCurrency}
          formatXAxis={formatMonth}
        />
        <AreaChartCard
          title="Рост пользователей"
          description="Новые регистрации за последние 30 дней"
          data={dashboard?.userGrowth ?? []}
          xAxisKey="date"
          series={[
            { key: 'totalUsers', label: 'Всего', color: '#C94BFF' },
            { key: 'newUsers', label: 'Новые', color: '#28E0C4', type: 'line' },
          ]}
          isLoading={isLoading}
          height={280}
          formatXAxis={(v) => {
            const parts = v.split('-');
            return parts.length === 3 ? `${parts[2]}.${parts[1]}` : v;
          }}
        />
      </div>

      {/* Pending Actions */}
      <h2 className="mt-8 mb-4 text-lg font-semibold text-mp-text-primary">
        Требуют внимания
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          title="Верификации"
          count={isLoading ? 0 : (stats?.pendingVerifications ?? 0)}
          icon={ShieldCheck}
          href="/admin/verifications"
          color="accent"
        />
        <ActionCard
          title="Выводы средств"
          count={isLoading ? 0 : (stats?.pendingWithdrawals ?? 0)}
          icon={Wallet}
          href="/admin/payments"
          color="warning"
        />
        <ActionCard
          title="Заказы"
          count={isLoading ? 0 : (stats?.pendingOrders ?? 0)}
          icon={Bag}
          href="/admin/store/orders"
          color="info"
        />
        <ActionCard
          title="Истекающие подписки"
          count={0}
          icon={Clock}
          href="/admin/subscriptions"
          color="error"
        />
      </div>

      {/* Recent Transactions */}
      <h2 className="mt-8 mb-4 text-lg font-semibold text-mp-text-primary">
        Последние транзакции
      </h2>
      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-mp-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : dashboard?.recentTransactions && dashboard.recentTransactions.length > 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {dashboard.recentTransactions.map((tx) => {
                const statusBadge = transactionStatusConfig[tx.status] || {
                  label: tx.status,
                  className: 'bg-gray-500/20 text-gray-400 border-transparent',
                };

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between border-b border-mp-border pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mp-surface text-mp-text-secondary text-xs font-medium">
                        {tx.userEmail.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-mp-text-primary">
                          {tx.userEmail}
                        </p>
                        <p className="text-xs text-mp-text-secondary">
                          {transactionTypeLabels[tx.type] || tx.type} &middot; {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                      <span className="text-sm font-medium text-mp-text-primary">
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-mp-text-secondary">
              Нет транзакций для отображения
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Action card component for pending items
 */
interface ActionCardProps {
  title: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color?: 'accent' | 'warning' | 'info' | 'error';
}

function ActionCard({ title, count, icon: Icon, href, color = 'accent' }: ActionCardProps) {
  const colorStyles = {
    accent: 'bg-mp-accent-primary/10 text-mp-accent-primary',
    warning: 'bg-orange-500/10 text-orange-500',
    info: 'bg-blue-500/10 text-blue-500',
    error: 'bg-mp-error-text/10 text-mp-error-text',
  };

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-mp-border bg-mp-bg-secondary p-4 transition-colors hover:bg-mp-surface"
    >
      <div className={cn('rounded-lg p-2.5', colorStyles[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-mp-text-secondary">{title}</p>
        <p className="text-xl font-bold text-mp-text-primary">{count}</p>
      </div>
    </Link>
  );
}
