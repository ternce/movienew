'use client';

import { CreditCard, BuildingOffice } from '@phosphor-icons/react';
import * as React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Withdrawal, WithdrawalList } from '@/types';

import { WithdrawalStatusBadge } from './withdrawal-status-badge';

interface WithdrawalTableProps {
  data?: WithdrawalList;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

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
 * Format date
 */
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function WithdrawalTable({
  data,
  isLoading,
  emptyMessage = 'Нет заявок на вывод',
  className,
}: WithdrawalTableProps) {
  if (isLoading) {
    return <WithdrawalTableSkeleton className={className} />;
  }

  if (!data || data.items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <p className="text-mp-text-secondary">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Способ</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="text-right">К выплате</TableHead>
              <TableHead className="text-center">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((withdrawal) => (
              <WithdrawalRow key={withdrawal.id} withdrawal={withdrawal} />
            ))}
          </TableBody>
        </Table>
      </div>
      {data.total > 0 && (
        <CardContent className="border-t pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-mp-text-secondary">
              Всего: {data.total} заявок
            </span>
            <div className="text-right">
              <span className="text-mp-text-secondary mr-4">
                Сумма: {formatCurrency(data.totalAmount)}
              </span>
              <span className="font-medium text-mp-text-primary">
                К выплате: {formatCurrency(data.totalNetAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Withdrawal row component
 */
function WithdrawalRow({ withdrawal }: { withdrawal: Withdrawal }) {
  const PaymentIcon = withdrawal.paymentDetails.type === 'card' ? CreditCard : BuildingOffice;

  return (
    <TableRow>
      <TableCell className="text-mp-text-secondary">
        {formatDate(withdrawal.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <PaymentIcon className="h-4 w-4 text-mp-text-secondary" />
          <div className="flex flex-col">
            <span className="text-sm">
              {withdrawal.paymentDetails.type === 'card' ? 'Карта' : 'Банк. счёт'}
            </span>
            <span className="text-xs text-mp-text-secondary">
              {withdrawal.paymentDetails.cardNumber ||
                withdrawal.paymentDetails.bankAccount}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(withdrawal.amount)}
        <span className="ml-1 text-xs text-mp-text-secondary">
          (налог {(withdrawal.taxRate * 100).toFixed(0)}%)
        </span>
      </TableCell>
      <TableCell className="text-right font-medium text-emerald-400">
        {formatCurrency(withdrawal.netAmount)}
      </TableCell>
      <TableCell className="text-center">
        <WithdrawalStatusBadge status={withdrawal.status} size="sm" />
        {withdrawal.rejectionReason && (
          <p className="mt-1 text-xs text-mp-error-text max-w-[200px] truncate">
            {withdrawal.rejectionReason}
          </p>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton loader
 */
function WithdrawalTableSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Способ</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="text-right">К выплате</TableHead>
              <TableHead className="text-center">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-28 mx-auto rounded-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
