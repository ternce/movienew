'use client';

import { Coins, ArrowLeft, Funnel } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { CommissionTable, CommissionStatusBadge } from '@/components/partner';
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
import { useCommissions } from '@/hooks/use-partner';
import { usePartnerStore } from '@/stores/partner.store';
import type { CommissionStatus } from '@/types';

/**
 * Commission history page
 */
export default function PartnerCommissionsPage() {
  const [page, setPage] = React.useState(1);
  const {
    commissionStatusFilter,
    commissionLevelFilter,
    setCommissionStatusFilter,
    setCommissionLevelFilter,
    resetCommissionFilters,
  } = usePartnerStore();

  const { data, isLoading } = useCommissions({
    status: commissionStatusFilter as CommissionStatus | undefined,
    level: commissionLevelFilter || undefined,
    page,
    limit: 20,
  });

  const hasFilters = commissionStatusFilter || commissionLevelFilter;

  return (
    <Container size="xl" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/partner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к дашборду
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-yellow-500/20">
            <Coins className="h-6 w-6 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            История комиссий
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Комиссии с покупок ваших рефералов
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Funnel className="h-4 w-4 text-mp-text-secondary" />
              <span className="text-sm font-medium">Фильтры:</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">Статус</Label>
              <Select
                value={commissionStatusFilter || 'all'}
                onValueChange={(v) => {
                  setCommissionStatusFilter(v === 'all' ? null : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="PENDING">Ожидает</SelectItem>
                  <SelectItem value="APPROVED">Одобрена</SelectItem>
                  <SelectItem value="PAID">Выплачена</SelectItem>
                  <SelectItem value="CANCELLED">Отменена</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">Уровень</Label>
              <Select
                value={commissionLevelFilter?.toString() || 'all'}
                onValueChange={(v) => {
                  setCommissionLevelFilter(v === 'all' ? null : parseInt(v, 10));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      Уровень {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetCommissionFilters();
                  setPage(1);
                }}
              >
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Commission table */}
      <CommissionTable
        data={data}
        isLoading={isLoading}
        emptyMessage={
          hasFilters
            ? 'Нет комиссий по выбранным фильтрам'
            : 'У вас пока нет комиссий'
        }
      />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </Container>
  );
}
