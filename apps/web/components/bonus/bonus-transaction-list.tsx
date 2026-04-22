'use client';

import { Funnel, ClockCounterClockwise, ArrowsClockwise, X } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { BonusTransaction, BonusQueryParams } from '@/hooks/use-bonus';
import { useBonusHistory } from '@/hooks/use-bonus';

import {
  BonusTransactionItem,
  BonusTransactionItemSkeleton,
} from './bonus-transaction-item';

/**
 * Filter options
 */
const typeOptions = [
  { value: 'all', label: 'Все типы' },
  { value: 'EARNED', label: 'Начислено' },
  { value: 'SPENT', label: 'Списано' },
  { value: 'WITHDRAWN', label: 'Выведено' },
  { value: 'EXPIRED', label: 'Истекло' },
  { value: 'ADJUSTMENT', label: 'Корректировка' },
];

const sourceOptions = [
  { value: 'all', label: 'Все источники' },
  { value: 'PARTNER', label: 'Партнёрская программа' },
  { value: 'PROMO', label: 'Промо-акция' },
  { value: 'REFUND', label: 'Возврат' },
  { value: 'REFERRAL_BONUS', label: 'Реферальный бонус' },
  { value: 'ACTIVITY', label: 'Активность' },
];

/**
 * Bonus transaction list with filters
 */
interface BonusTransactionListProps {
  initialParams?: BonusQueryParams;
  showFilters?: boolean;
  limit?: number;
  compact?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function BonusTransactionList({
  initialParams,
  showFilters = true,
  limit = 10,
  compact = false,
  emptyMessage = 'История транзакций пуста',
  className,
}: BonusTransactionListProps) {
  const [params, setParams] = React.useState<BonusQueryParams>({
    page: 1,
    limit,
    ...initialParams,
  });

  const { data, isLoading, isError, refetch } = useBonusHistory(params);

  const transactions = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? 1;
  const totalPages = Math.ceil(total / limit);

  const hasFilters = params.type || params.source;

  const clearFilters = () => {
    setParams({ page: 1, limit });
  };

  const handleTypeChange = (value: string) => {
    setParams((prev) => ({
      ...prev,
      type: value === 'all' ? undefined : value,
      page: 1,
    }));
  };

  const handleSourceChange = (value: string) => {
    setParams((prev) => ({
      ...prev,
      source: value === 'all' ? undefined : value,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={params.type || 'all'}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={params.source || 'all'}
            onValueChange={handleSourceChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Сбросить
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="ml-auto"
            title="Обновить"
          >
            <ArrowsClockwise className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <BonusTransactionItemSkeleton key={i} compact={compact} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-mp-border bg-mp-surface/50 py-12 text-center">
          <p className="text-mp-text-secondary">
            Не удалось загрузить историю
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="mt-2"
          >
            Попробовать снова
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-mp-border bg-mp-surface/50 py-12 text-center">
          <ClockCounterClockwise className="mb-3 h-10 w-10 text-mp-text-disabled" />
          <p className="text-mp-text-secondary">{emptyMessage}</p>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="mt-2"
            >
              Сбросить фильтры
            </Button>
          )}
        </div>
      )}

      {/* Transaction list */}
      {!isLoading && !isError && transactions.length > 0 && (
        <div className={cn('space-y-3', compact && 'divide-y divide-mp-border space-y-0')}>
          {transactions.map((transaction) => (
            <BonusTransactionItem
              key={transaction.id}
              transaction={transaction}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-mp-text-secondary">
            Показано {(currentPage - 1) * limit + 1}–
            {Math.min(currentPage * limit, total)} из {total}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact transaction list for widgets
 */
interface RecentTransactionsProps {
  limit?: number;
  className?: string;
}

export function RecentTransactions({
  limit = 5,
  className,
}: RecentTransactionsProps) {
  const { data, isLoading } = useBonusHistory({ limit, page: 1 });

  const transactions = data?.items ?? [];

  if (isLoading) {
    return (
      <div className={cn('space-y-0 divide-y divide-mp-border', className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <BonusTransactionItemSkeleton key={i} compact />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={cn('py-8 text-center text-sm text-mp-text-secondary', className)}>
        Нет недавних транзакций
      </div>
    );
  }

  return (
    <div className={cn('space-y-0 divide-y divide-mp-border', className)}>
      {transactions.map((transaction) => (
        <BonusTransactionItem
          key={transaction.id}
          transaction={transaction}
          compact
          showBadges={false}
        />
      ))}
    </div>
  );
}
