'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Commission, CommissionList } from '@/types';

import { CommissionStatusBadge } from './commission-status-badge';

interface CommissionTableProps {
  data?: CommissionList;
  isLoading?: boolean;
  showPagination?: boolean;
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

export function CommissionTable({
  data,
  isLoading,
  emptyMessage = 'Нет комиссий',
  className,
}: CommissionTableProps) {
  if (isLoading) {
    return <CommissionTableSkeleton className={className} />;
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
              <TableHead>От кого</TableHead>
              <TableHead className="text-center">Уровень</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="text-center">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((commission) => (
              <CommissionRow key={commission.id} commission={commission} />
            ))}
          </TableBody>
        </Table>
      </div>
      {data.total > 0 && (
        <CardContent className="border-t pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-mp-text-secondary">
              Всего: {data.total} комиссий
            </span>
            <span className="font-medium text-mp-text-primary">
              Сумма: {formatCurrency(data.totalAmount)}
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Commission row component
 */
function CommissionRow({ commission }: { commission: Commission }) {
  return (
    <TableRow>
      <TableCell className="text-mp-text-secondary">
        {formatDate(commission.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {commission.sourceUser.firstName} {commission.sourceUser.lastName}
          </span>
          <span className="text-xs text-mp-text-secondary">
            {commission.sourceUser.email}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-mp-surface text-sm font-medium">
          {commission.level}
        </span>
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(commission.amount)}
        <span className="ml-1 text-xs text-mp-text-secondary">
          ({(commission.rate * 100).toFixed(0)}%)
        </span>
      </TableCell>
      <TableCell className="text-center">
        <CommissionStatusBadge status={commission.status} size="sm" />
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton loader
 */
function CommissionTableSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>От кого</TableHead>
              <TableHead className="text-center">Уровень</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="text-center">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-6 rounded-full mx-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/**
 * Recent commissions (compact version for dashboard)
 */
interface RecentCommissionsProps {
  commissions?: Commission[];
  isLoading?: boolean;
  className?: string;
}

export function RecentCommissions({
  commissions,
  isLoading,
  className,
}: RecentCommissionsProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!commissions || commissions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Последние комиссии</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-mp-text-secondary">Нет комиссий</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Последние комиссии</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {commissions.slice(0, 5).map((commission) => (
          <div key={commission.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {commission.sourceUser.firstName}
              </p>
              <p className="text-xs text-mp-text-secondary">
                Уровень {commission.level}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatCurrency(commission.amount)}</p>
              <CommissionStatusBadge status={commission.status} size="sm" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
