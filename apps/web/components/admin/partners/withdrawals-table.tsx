'use client';

import { CreditCard, BuildingOffice, Eye, DotsThree } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { WithdrawalStatusBadge } from '@/components/partner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { AdminWithdrawal, AdminWithdrawalList } from '@/types';

interface AdminWithdrawalsTableProps {
  data?: AdminWithdrawalList;
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

export function AdminWithdrawalsTable({
  data,
  isLoading,
  emptyMessage = 'Нет заявок',
  className,
}: AdminWithdrawalsTableProps) {
  if (isLoading) {
    return <WithdrawalsTableSkeleton className={className} />;
  }

  if (!data || data.items.length === 0) {
    return (
      <Card className={cn('py-12 text-center', className)}>
        <p className="text-mp-text-secondary">{emptyMessage}</p>
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
              <TableHead>Пользователь</TableHead>
              <TableHead>Способ</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="text-right">К выплате</TableHead>
              <TableHead className="text-center">Статус</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((withdrawal) => (
              <WithdrawalRow key={withdrawal.id} withdrawal={withdrawal} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
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
    </Card>
  );
}

/**
 * Withdrawal row component
 */
function WithdrawalRow({ withdrawal }: { withdrawal: AdminWithdrawal }) {
  const PaymentIcon = withdrawal.paymentDetails.type === 'card' ? CreditCard : BuildingOffice;

  return (
    <TableRow>
      <TableCell className="text-mp-text-secondary">
        {formatDate(withdrawal.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {withdrawal.user.firstName} {withdrawal.user.lastName}
          </span>
          <span className="text-xs text-mp-text-secondary">
            {withdrawal.user.email}
          </span>
          <span className="text-xs text-mp-text-disabled font-mono">
            {withdrawal.user.referralCode}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <PaymentIcon className="h-4 w-4 text-mp-text-secondary" />
          <div className="flex flex-col">
            <span className="text-sm">
              {withdrawal.paymentDetails.type === 'card' ? 'Карта' : 'Счёт'}
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
          ({(withdrawal.taxRate * 100).toFixed(0)}%)
        </span>
      </TableCell>
      <TableCell className="text-right font-medium text-emerald-400">
        {formatCurrency(withdrawal.netAmount)}
      </TableCell>
      <TableCell className="text-center">
        <WithdrawalStatusBadge status={withdrawal.status} size="sm" />
        {withdrawal.rejectionReason && (
          <p className="mt-1 text-xs text-mp-error-text max-w-[150px] truncate">
            {withdrawal.rejectionReason}
          </p>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <DotsThree className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/partners/withdrawals/${withdrawal.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Подробнее
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton loader
 */
function WithdrawalsTableSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Способ</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="text-right">К выплате</TableHead>
              <TableHead className="text-center">Статус</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-28 mx-auto rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
