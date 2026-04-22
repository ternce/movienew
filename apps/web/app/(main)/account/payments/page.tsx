'use client';

import { CalendarDots, CreditCard, ClockCounterClockwise, X } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import {
  TransactionCard,
  TransactionCardSkeleton,
} from '@/components/payment';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTransactionHistory } from '@/hooks';
import { cn } from '@/lib/utils';
import type { TransactionType, TransactionStatus } from '@/types';

const TRANSACTION_TYPES: { value: string; label: string }[] = [
  { value: 'all', label: 'Все типы' },
  { value: 'SUBSCRIPTION', label: 'Подписки' },
  { value: 'STORE', label: 'Магазин' },
  { value: 'BONUS_PURCHASE', label: 'Покупка бонусов' },
  { value: 'WITHDRAWAL', label: 'Выводы' },
];

const TRANSACTION_STATUSES: { value: string; label: string }[] = [
  { value: 'all', label: 'Все статусы' },
  { value: 'COMPLETED', label: 'Завершённые' },
  { value: 'PENDING', label: 'Ожидают' },
  { value: 'FAILED', label: 'Неудачные' },
  { value: 'CANCELLED', label: 'Отменённые' },
  { value: 'REFUNDED', label: 'Возвраты' },
];

const DATE_RANGES: { value: string; label: string; days: number | null }[] = [
  { value: 'all', label: 'За всё время', days: null },
  { value: '7d', label: 'За 7 дней', days: 7 },
  { value: '30d', label: 'За 30 дней', days: 30 },
  { value: '3m', label: 'За 3 месяца', days: 90 },
  { value: '1y', label: 'За год', days: 365 },
];

/**
 * Payment history page
 */
export default function PaymentHistoryPage() {
  // Filters
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState(1);

  // Calculate date range
  const dateFrom = React.useMemo(() => {
    const range = DATE_RANGES.find((r) => r.value === dateRange);
    if (!range?.days) return undefined;
    const date = new Date();
    date.setDate(date.getDate() - range.days);
    return date.toISOString();
  }, [dateRange]);

  // Build query params
  const queryParams = React.useMemo(
    () => ({
      type: typeFilter !== 'all' ? (typeFilter as TransactionType) : undefined,
      status: statusFilter !== 'all' ? (statusFilter as TransactionStatus) : undefined,
      dateFrom,
      page: currentPage,
      limit: 10,
    }),
    [typeFilter, statusFilter, dateFrom, currentPage]
  );

  const { data, isLoading, error } = useTransactionHistory(queryParams);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, dateRange]);

  const totalPages = data ? Math.ceil(data.total / 10) : 0;

  const handleClearFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setDateRange('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || dateRange !== 'all';

  // Calculate summary stats
  const stats = React.useMemo(() => {
    if (!data?.items) return null;

    const completed = data.items.filter((t) => t.status === 'COMPLETED');
    const totalAmount = completed.reduce((sum, t) => sum + t.amount, 0);
    const totalBonus = completed.reduce((sum, t) => sum + t.bonusAmountUsed, 0);

    return {
      total: data.total,
      completedCount: completed.length,
      totalAmount,
      totalBonus,
    };
  }, [data]);

  return (
    <div className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-mp-accent-primary/20 p-2">
              <CreditCard className="h-6 w-6 text-mp-accent-primary" />
            </div>
            <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
              История платежей
            </h1>
          </div>
          <p className="text-mp-text-secondary">
            Все ваши транзакции и платежи
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href="/account/subscriptions">
            <CreditCard className="mr-2 h-4 w-4" />
            Мои подписки
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-mp-text-secondary">Всего транзакций</p>
              <p className="text-2xl font-bold text-mp-text-primary">
                {stats.total}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-mp-text-secondary">Успешных</p>
              <p className="text-2xl font-bold text-mp-success-text">
                {stats.completedCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-mp-text-secondary">Общая сумма</p>
              <p className="text-2xl font-bold text-mp-text-primary">
                {new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 0,
                }).format(stats.totalAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-mp-text-secondary">Использовано бонусов</p>
              <p className="text-2xl font-bold text-mp-accent-secondary">
                {new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 0,
                }).format(stats.totalBonus)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Тип транзакции" />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <CalendarDots className="mr-2 h-4 w-4 text-mp-text-secondary" />
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="mr-1 h-3 w-3" />
              Сбросить
            </Button>
          )}
        </div>

        {data && data.items.length > 0 && (
          <p className="text-sm text-mp-text-secondary">
            Показано {data.items.length} из {data.total} транзакций
          </p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Card className="py-8 text-center">
          <CardContent>
            <p className="text-mp-error-text">
              Не удалось загрузить историю платежей
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <TransactionCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && data?.items.length === 0 && (
        <Card className="py-12 text-center">
          <CardContent>
            <ClockCounterClockwise className="mx-auto mb-4 h-12 w-12 text-mp-text-disabled" />
            <h2 className="mb-2 text-xl font-semibold text-mp-text-primary">
              {hasActiveFilters
                ? 'Транзакции не найдены'
                : 'История платежей пуста'}
            </h2>
            <p className="mb-6 text-mp-text-secondary">
              {hasActiveFilters
                ? 'Попробуйте изменить параметры фильтрации'
                : 'Ваши платежи будут отображаться здесь'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={handleClearFilters}>
                Сбросить фильтры
              </Button>
            ) : (
              <Button variant="gradient" asChild>
                <Link href="/pricing">Оформить подписку</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction list */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <>
          <div className="space-y-4">
            {data.items.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
