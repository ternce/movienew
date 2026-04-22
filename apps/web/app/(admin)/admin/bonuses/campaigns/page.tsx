'use client';

import {
  ArrowLeft,
  Funnel,
  Gift,
  DotsThree,
  Play,
  Plus,
  X,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminBonusCampaigns,
  useExecuteCampaign,
  useCancelCampaign,
  type BonusCampaignResponse,
} from '@/hooks/use-admin-bonus';

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
 * Admin bonus campaigns page
 */
export default function AdminBonusCampaignsPage() {
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  const { data, isLoading } = useAdminBonusCampaigns({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  const executeMutation = useExecuteCampaign();
  const cancelMutation = useCancelCampaign();

  const hasFilters = !!statusFilter;

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
        title="Бонусные кампании"
        description="Управление кампаниями начисления бонусов"
      >
        <Button asChild>
          <Link href="/admin/bonuses/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            Новая кампания
          </Link>
        </Button>
      </AdminPageHeader>

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
                value={statusFilter || 'all'}
                onValueChange={(v) => {
                  setStatusFilter(v === 'all' ? null : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="DRAFT">Черновик</SelectItem>
                  <SelectItem value="ACTIVE">Активна</SelectItem>
                  <SelectItem value="COMPLETED">Завершена</SelectItem>
                  <SelectItem value="CANCELLED">Отменена</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
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

      {/* Campaigns table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Начислений</TableHead>
                <TableHead>Даты</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-mp-text-secondary">
                    {hasFilters
                      ? 'Нет кампаний по выбранным фильтрам'
                      : 'Нет кампаний'}
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((campaign) => (
                  <CampaignRow
                    key={campaign.id}
                    campaign={campaign}
                    onExecute={() => executeMutation.mutate(campaign.id)}
                    onCancel={() => cancelMutation.mutate(campaign.id)}
                    isExecuting={executeMutation.isPending}
                    isCancelling={cancelMutation.isPending}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

/**
 * Campaign table row
 */
interface CampaignRowProps {
  campaign: BonusCampaignResponse;
  onExecute: () => void;
  onCancel: () => void;
  isExecuting: boolean;
  isCancelling: boolean;
}

function CampaignRow({
  campaign,
  onExecute,
  onCancel,
  isExecuting,
  isCancelling,
}: CampaignRowProps) {
  const targetTypeLabels = {
    ALL: 'Все пользователи',
    SEGMENT: 'Сегмент',
    INDIVIDUAL: 'Индивидуально',
  };

  const statusConfig = {
    DRAFT: { label: 'Черновик', color: 'bg-gray-500/20 text-gray-400' },
    ACTIVE: { label: 'Активна', color: 'bg-green-500/20 text-green-400' },
    COMPLETED: { label: 'Завершена', color: 'bg-blue-500/20 text-blue-400' },
    CANCELLED: { label: 'Отменена', color: 'bg-red-500/20 text-red-400' },
  };

  const canExecute = campaign.status === 'DRAFT' || campaign.status === 'ACTIVE';
  const canCancel = campaign.status === 'DRAFT' || campaign.status === 'ACTIVE';

  return (
    <TableRow>
      <TableCell>
        <div>
          <Link
            href={`/admin/bonuses/campaigns/${campaign.id}`}
            className="font-medium text-mp-text-primary hover:text-mp-accent-primary"
          >
            {campaign.name}
          </Link>
          {campaign.description && (
            <p className="text-xs text-mp-text-secondary line-clamp-1">
              {campaign.description}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell className="font-medium">
        {formatCurrency(campaign.bonusAmount)}
      </TableCell>
      <TableCell className="text-sm text-mp-text-secondary">
        {targetTypeLabels[campaign.targetType]}
      </TableCell>
      <TableCell>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            statusConfig[campaign.status].color
          }`}
        >
          {statusConfig[campaign.status].label}
        </span>
      </TableCell>
      <TableCell>
        {campaign.usedCount}
        {campaign.usageLimit && (
          <span className="text-mp-text-secondary">/{campaign.usageLimit}</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-mp-text-secondary">
        <div>
          С {new Date(campaign.startDate).toLocaleDateString('ru-RU')}
        </div>
        {campaign.endDate && (
          <div>По {new Date(campaign.endDate).toLocaleDateString('ru-RU')}</div>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <DotsThree className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/bonuses/campaigns/${campaign.id}`}>
                Подробнее
              </Link>
            </DropdownMenuItem>
            {campaign.status === 'DRAFT' && (
              <DropdownMenuItem asChild>
                <Link href={`/admin/bonuses/campaigns/${campaign.id}/edit`}>
                  Редактировать
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {canExecute && (
              <DropdownMenuItem
                onClick={onExecute}
                disabled={isExecuting}
                className="text-green-400"
              >
                <Play className="mr-2 h-4 w-4" />
                Выполнить
              </DropdownMenuItem>
            )}
            {canCancel && (
              <DropdownMenuItem
                onClick={onCancel}
                disabled={isCancelling}
                className="text-red-400"
              >
                <X className="mr-2 h-4 w-4" />
                Отменить
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
