'use client';

import { Funnel } from '@phosphor-icons/react';
import * as React from 'react';

import {
  AdminWithdrawalsTable,
} from '@/components/admin/partners';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminWithdrawals,
  useAdminWithdrawalStats,
} from '@/hooks/use-admin-partner';
import type { WithdrawalStatus } from '@/types';

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
 * Admin withdrawals management page
 */
export default function AdminWithdrawalsPage() {
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<WithdrawalStatus | null>(null);

  const { data: withdrawals, isLoading } = useAdminWithdrawals({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  const { data: stats, isLoading: isLoadingStats } = useAdminWithdrawalStats();

  const hasFilters = !!statusFilter;

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Заявки на вывод"
        description="Обработка заявок на вывод средств"
      />

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="text-sm text-mp-text-secondary">Ожидают</div>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <div className="mt-1">
                <span className="text-2xl font-bold text-amber-400">
                  {stats?.pendingCount || 0}
                </span>
                <span className="ml-2 text-sm text-mp-text-secondary">
                  {formatCurrency(stats?.pendingAmount || 0)}
                </span>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-sm text-mp-text-secondary">Одобрены</div>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <div className="mt-1">
                <span className="text-2xl font-bold text-blue-400">
                  {stats?.approvedCount || 0}
                </span>
                <span className="ml-2 text-sm text-mp-text-secondary">
                  {formatCurrency(stats?.approvedAmount || 0)}
                </span>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-sm text-mp-text-secondary">В обработке</div>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <div className="mt-1">
                <span className="text-2xl font-bold text-purple-400">
                  {stats?.processingCount || 0}
                </span>
                <span className="ml-2 text-sm text-mp-text-secondary">
                  {formatCurrency(stats?.processingAmount || 0)}
                </span>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-sm text-mp-text-secondary">Выплачено всего</div>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <div className="mt-1">
                <span className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(stats?.completedAmount || 0)}
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Funnel className="h-4 w-4 text-mp-text-secondary" />
                <span className="text-sm font-medium">Фильтры:</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-mp-text-secondary">Статус</Label>
                <Select
                  value={statusFilter || 'all'}
                  onValueChange={(v) => {
                    setStatusFilter(v === 'all' ? null : (v as WithdrawalStatus));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="PENDING">Ожидает</SelectItem>
                    <SelectItem value="APPROVED">Одобрена</SelectItem>
                    <SelectItem value="PROCESSING">В обработке</SelectItem>
                    <SelectItem value="COMPLETED">Выплачена</SelectItem>
                    <SelectItem value="REJECTED">Отклонена</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter(null);
                    setPage(1);
                  }}
                >
                  Сбросить
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Withdrawals table */}
        <AdminWithdrawalsTable
          data={withdrawals}
          isLoading={isLoading}
          emptyMessage={
            hasFilters
              ? 'Нет заявок по выбранным фильтрам'
              : 'Нет заявок на вывод'
          }
        />

        {/* Pagination */}
        {withdrawals && withdrawals.totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={withdrawals.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </Container>
  );
}
