'use client';

import {
  ArrowLeft,
  Check,
  DotsThree,
  Plus,
  TrendUp,
  X,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
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
import {
  useAdminBonusRates,
  useUpdateBonusRate,
  type BonusRateResponse,
} from '@/hooks/use-admin-bonus';

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Admin bonus rates page
 */
export default function AdminBonusRatesPage() {
  const { data: rates, isLoading } = useAdminBonusRates();
  const updateMutation = useUpdateBonusRate();

  const activeRate = rates?.find((r) => r.isActive);
  const inactiveRates = rates?.filter((r) => !r.isActive) ?? [];

  const handleDeactivate = (id: string) => {
    updateMutation.mutate({ id, isActive: false });
  };

  const handleActivate = (id: string) => {
    updateMutation.mutate({ id, isActive: true });
  };

  return (
    <Container size="xl" className="py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/admin/bonuses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к бонусам
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title="Курсы бонусов"
        description="Управление курсами конвертации бонусов"
      >
        <Button asChild>
          <Link href="/admin/bonuses/rates/new">
            <Plus className="mr-2 h-4 w-4" />
            Новый курс
          </Link>
        </Button>
      </AdminPageHeader>

      {/* Active rate */}
      <Card className="mb-6 border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
              <TrendUp className="h-4 w-4" />
            </div>
            Текущий курс
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : activeRate ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-mp-text-primary">
                  1 бонус = {activeRate.rate} ₽
                </p>
                <p className="mt-1 text-sm text-mp-text-secondary">
                  Действует с {formatDate(activeRate.effectiveFrom)}
                  {activeRate.effectiveTo && (
                    <> до {formatDate(activeRate.effectiveTo)}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
                  Активен
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <DotsThree className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/bonuses/rates/${activeRate.id}/edit`}>
                        Редактировать
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeactivate(activeRate.id)}
                      className="text-red-400"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Деактивировать
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-mp-text-secondary mb-4">
                Нет активного курса. Создайте новый курс или активируйте существующий.
              </p>
              <Button asChild>
                <Link href="/admin/bonuses/rates/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Создать курс
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">История курсов</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Курс</TableHead>
                <TableHead>Валюты</TableHead>
                <TableHead>Действует с</TableHead>
                <TableHead>Действует до</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : inactiveRates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-mp-text-secondary">
                    Нет неактивных курсов
                  </TableCell>
                </TableRow>
              ) : (
                inactiveRates.map((rate) => (
                  <RateRow
                    key={rate.id}
                    rate={rate}
                    onActivate={() => handleActivate(rate.id)}
                    isUpdating={updateMutation.isPending}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">О курсах бонусов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-mp-text-secondary">
            <p>
              <strong className="text-mp-text-primary">Курс конвертации</strong> определяет,
              сколько рублей пользователь получит при выводе бонусов.
            </p>
            <p>
              При создании нового курса он автоматически становится активным,
              а предыдущий курс деактивируется.
            </p>
            <p>
              Курс также влияет на отображение стоимости бонусов в рублях
              в интерфейсе пользователя.
            </p>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}

/**
 * Rate table row
 */
interface RateRowProps {
  rate: BonusRateResponse;
  onActivate: () => void;
  isUpdating: boolean;
}

function RateRow({ rate, onActivate, isUpdating }: RateRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        1:{rate.rate}
      </TableCell>
      <TableCell className="text-mp-text-secondary">
        {rate.fromCurrency} → {rate.toCurrency}
      </TableCell>
      <TableCell>{formatDate(rate.effectiveFrom)}</TableCell>
      <TableCell>
        {rate.effectiveTo ? formatDate(rate.effectiveTo) : '—'}
      </TableCell>
      <TableCell>
        <span className="rounded-md bg-gray-500/20 px-2 py-0.5 text-xs font-medium text-gray-400">
          Неактивен
        </span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <DotsThree className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onActivate}
              disabled={isUpdating}
              className="text-green-400"
            >
              <Check className="mr-2 h-4 w-4" />
              Активировать
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/bonuses/rates/${rate.id}/edit`}>
                Редактировать
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
