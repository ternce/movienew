'use client';

import { Wallet, ArrowLeft, Plus } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { WithdrawalTable, WithdrawalStatusBadge } from '@/components/partner';
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
import { useWithdrawals, usePartnerBalance } from '@/hooks/use-partner';
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
 * Withdrawals history page
 */
export default function PartnerWithdrawalsPage() {
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  const { data: balance, isLoading: isBalanceLoading } = usePartnerBalance();
  const { data, isLoading } = useWithdrawals({
    status: statusFilter as WithdrawalStatus | undefined,
    page,
    limit: 20,
  });

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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Wallet className="h-6 w-6 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
                Выводы средств
              </h1>
            </div>
            <p className="text-mp-text-secondary">
              История ваших заявок на вывод
            </p>
          </div>

          <Button
            variant="gradient"
            asChild
            disabled={!balance?.canWithdraw}
          >
            <Link href="/partner/withdrawals/new">
              <Plus className="mr-2 h-4 w-4" />
              Новый вывод
            </Link>
          </Button>
        </div>
      </div>

      {/* Balance card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isBalanceLoading ? (
              <>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </>
            ) : balance ? (
              <>
                <div>
                  <p className="text-sm text-mp-text-secondary">Доступно</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(balance.available)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">Ожидает</p>
                  <p className="text-xl font-medium text-mp-text-primary">
                    {formatCurrency(balance.pending)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">В обработке</p>
                  <p className="text-xl font-medium text-mp-text-primary">
                    {formatCurrency(balance.processing)}
                  </p>
                </div>
              </>
            ) : null}
          </div>
          {balance && !balance.canWithdraw && (
            <p className="text-sm text-mp-text-secondary mt-3 pt-3 border-t">
              Минимальная сумма для вывода: {formatCurrency(balance.minimumWithdrawal)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">Статус</Label>
              <Select
                value={statusFilter || 'all'}
                onValueChange={(v) => {
                  setStatusFilter(v === 'all' ? null : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="PENDING">На рассмотрении</SelectItem>
                  <SelectItem value="APPROVED">Одобрена</SelectItem>
                  <SelectItem value="PROCESSING">Обрабатывается</SelectItem>
                  <SelectItem value="COMPLETED">Выполнена</SelectItem>
                  <SelectItem value="REJECTED">Отклонена</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statusFilter && (
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

      {/* Withdrawal table */}
      <WithdrawalTable
        data={data}
        isLoading={isLoading}
        emptyMessage={
          statusFilter
            ? 'Нет заявок по выбранному статусу'
            : 'У вас пока нет заявок на вывод'
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
