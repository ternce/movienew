'use client';

import { Eye, DotsThree } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { PartnerLevelBadge } from '@/components/partner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import type { AdminPartner, AdminPartnerList } from '@/types';

interface PartnersTableProps {
  data?: AdminPartnerList;
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

export function PartnersTable({
  data,
  isLoading,
  emptyMessage = 'Нет партнёров',
  className,
}: PartnersTableProps) {
  if (isLoading) {
    return <PartnersTableSkeleton className={className} />;
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
              <TableHead>Партнёр</TableHead>
              <TableHead className="text-center">Уровень</TableHead>
              <TableHead className="text-center">Рефералы</TableHead>
              <TableHead className="text-right">Заработок</TableHead>
              <TableHead className="text-right">Баланс</TableHead>
              <TableHead className="text-center">Регистрация</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((partner) => (
              <PartnerRow key={partner.id} partner={partner} />
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/**
 * Partner row component
 */
function PartnerRow({ partner }: { partner: AdminPartner }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {partner.firstName} {partner.lastName}
          </span>
          <span className="text-xs text-mp-text-secondary">{partner.email}</span>
          <span className="text-xs text-mp-text-disabled font-mono">
            {partner.referralCode}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <PartnerLevelBadge level={partner.level} size="sm" />
      </TableCell>
      <TableCell className="text-center">
        <div>
          <span className="font-medium">{partner.totalReferrals}</span>
          <span className="text-xs text-mp-text-secondary ml-1">
            ({partner.activeReferrals} акт.)
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(partner.totalEarnings)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span className="text-emerald-400 font-medium">
            {formatCurrency(partner.availableBalance)}
          </span>
          {partner.pendingBalance > 0 && (
            <span className="text-xs text-mp-text-secondary">
              +{formatCurrency(partner.pendingBalance)} ожид.
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center text-mp-text-secondary">
        {formatDate(partner.registeredAt)}
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
              <Link href={`/admin/partners/${partner.id}`}>
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
function PartnersTableSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Партнёр</TableHead>
              <TableHead className="text-center">Уровень</TableHead>
              <TableHead className="text-center">Рефералы</TableHead>
              <TableHead className="text-right">Заработок</TableHead>
              <TableHead className="text-right">Баланс</TableHead>
              <TableHead className="text-center">Регистрация</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
