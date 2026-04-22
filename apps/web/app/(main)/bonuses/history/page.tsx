'use client';

import { ArrowLeft, ClockCounterClockwise, DownloadSimple, Funnel } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import {
  BonusTransactionList,
  BonusStatsRow,
} from '@/components/bonus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBonusHistory, formatBonusAmount } from '@/hooks/use-bonus';
import type { BonusQueryParams } from '@/hooks/use-bonus';

/**
 * Bonus transaction history page
 */
export default function BonusHistoryPage() {
  const [filters, setFilters] = React.useState<BonusQueryParams>({
    page: 1,
    limit: 20,
  });

  const { data } = useBonusHistory(filters);
  const total = data?.total ?? 0;

  const handleFilterChange = (key: keyof BonusQueryParams, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 });
  };

  const hasActiveFilters = filters.type || filters.source || filters.fromDate || filters.toDate;

  return (
    <Container size="xl" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/bonuses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к бонусам
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ClockCounterClockwise className="h-6 w-6 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
                История бонусов
              </h1>
            </div>
            <p className="text-mp-text-secondary">
              Все операции с вашими бонусами
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-mp-text-secondary">
              Всего операций: <span className="font-medium">{total}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <BonusStatsRow className="mb-6" />

      {/* Filters card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Funnel className="h-4 w-4" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Type filter */}
            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">Тип операции</Label>
              <Select
                value={filters.type || 'all'}
                onValueChange={(v) => handleFilterChange('type', v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="EARNED">Начислено</SelectItem>
                  <SelectItem value="SPENT">Списано</SelectItem>
                  <SelectItem value="WITHDRAWN">Выведено</SelectItem>
                  <SelectItem value="EXPIRED">Истекло</SelectItem>
                  <SelectItem value="ADJUSTMENT">Корректировка</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source filter */}
            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">Источник</Label>
              <Select
                value={filters.source || 'all'}
                onValueChange={(v) => handleFilterChange('source', v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Все источники" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  <SelectItem value="PARTNER">Партнёрская программа</SelectItem>
                  <SelectItem value="PROMO">Промо-акция</SelectItem>
                  <SelectItem value="REFUND">Возврат</SelectItem>
                  <SelectItem value="REFERRAL_BONUS">Реферальный бонус</SelectItem>
                  <SelectItem value="ACTIVITY">Активность</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">С даты</Label>
              <Input
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) => handleFilterChange('fromDate', e.target.value || undefined)}
                className="w-[160px]"
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">По дату</Label>
              <Input
                type="date"
                value={filters.toDate || ''}
                onChange={(e) => handleFilterChange('toDate', e.target.value || undefined)}
                className="w-[160px]"
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction list */}
      <Card>
        <CardContent className="pt-6">
          <BonusTransactionList
            initialParams={filters}
            showFilters={false}
            limit={20}
            emptyMessage={
              hasActiveFilters
                ? 'Нет операций по выбранным фильтрам'
                : 'История операций пуста'
            }
          />
        </CardContent>
      </Card>
    </Container>
  );
}
