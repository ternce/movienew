'use client';

import {
  CreditCard,
  Clock,
  XCircle,
  CheckCircle,
  Eye,
  CalendarPlus,
  Prohibit,
  Warning,
} from '@phosphor-icons/react';
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';

import { AdminPageHeader } from '@/components/admin/layout';
import { DataTable, DataTableColumnHeader, DataTableRowActions } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { cn } from '@/lib/utils';

/**
 * Subscription item type
 */
interface Subscription {
  id: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  planType: string;
  status: string;
  price: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  contentId?: string | null;
  contentTitle?: string | null;
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-mp-success-bg text-mp-success-text border-mp-success-text/20',
    CANCELLED: 'bg-mp-error-bg text-mp-error-text border-mp-error-text/20',
    EXPIRED: 'bg-gray-500/10 text-gray-400 border-gray-400/20',
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  };

  return (
    <Badge className={cn('capitalize', styles[status] || 'bg-mp-surface')}>
      {status.toLowerCase()}
    </Badge>
  );
}

/**
 * Plan type badge component
 */
function PlanTypeBadge({ planType }: { planType: string }) {
  const styles: Record<string, string> = {
    PREMIUM: 'bg-mp-accent-primary/10 text-mp-accent-primary border-mp-accent-primary/20',
    SERIES: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    TUTORIAL: 'bg-mp-accent-secondary/10 text-mp-accent-secondary border-mp-accent-secondary/20',
  };

  const labels: Record<string, string> = {
    PREMIUM: 'Премиум',
    SERIES: 'Сериалы',
    TUTORIAL: 'Обучение',
  };

  return (
    <Badge className={cn('capitalize', styles[planType] || 'bg-mp-surface')}>
      {labels[planType] || planType.toLowerCase()}
    </Badge>
  );
}

/**
 * Format currency in rubles
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(value / 100);
}

/**
 * Table columns definition
 */
const columns: ColumnDef<Subscription>[] = [
  {
    accessorKey: 'userEmail',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Пользователь" />
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-mp-text-primary">
          {row.original.userFirstName} {row.original.userLastName}
        </p>
        <p className="text-sm text-mp-text-secondary">
          {row.original.userEmail}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'planType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Тариф" />
    ),
    cell: ({ row }) => (
      <div className="space-y-1">
        <PlanTypeBadge planType={row.original.planType} />
        {row.original.contentTitle && (
          <p className="text-xs text-mp-text-secondary truncate max-w-[150px]">
            {row.original.contentTitle}
          </p>
        )}
      </div>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Статус" />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Цена" />
    ),
    cell: ({ row }) => (
      <span className="text-mp-text-primary font-medium">
        {formatCurrency(row.original.price)}
      </span>
    ),
  },
  {
    accessorKey: 'endDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Истекает" />
    ),
    cell: ({ row }) => {
      const endDate = new Date(row.original.endDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 7;
      const isExpired = daysUntilExpiry <= 0;

      return (
        <div className="space-y-1">
          <span className={cn(
            'text-sm',
            isExpired ? 'text-mp-error-text' :
            isExpiringSoon ? 'text-yellow-500' :
            'text-mp-text-secondary'
          )}>
            {endDate.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {isExpiringSoon && !isExpired && (
            <p className="text-xs text-yellow-500 flex items-center gap-1">
              <Warning className="h-3 w-3" />
              Осталось {daysUntilExpiry} дн.
            </p>
          )}
          {isExpired && (
            <p className="text-xs text-mp-error-text">Истекла</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'autoRenew',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Автопродление" />
    ),
    cell: ({ row }) => (
      <span className={cn(
        'text-sm',
        row.original.autoRenew ? 'text-mp-success-text' : 'text-mp-text-disabled'
      )}>
        {row.original.autoRenew ? 'Да' : 'Нет'}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DataTableRowActions
        row={row}
        actions={[
          {
            label: 'Подробнее',
            icon: Eye,
            onClick: (row) => {
              console.log('View', row.original.id);
            },
          },
          {
            label: 'Продлить подписку',
            icon: CalendarPlus,
            onClick: (row) => {
              console.log('Extend', row.original.id);
            },
          },
          {
            label: 'Отменить подписку',
            icon: Prohibit,
            onClick: (row) => {
              console.log('Cancel', row.original.id);
            },
            separator: true,
            variant: 'destructive',
          },
        ]}
      />
    ),
  },
];

/**
 * Mock data for demonstration
 */
const mockSubscriptions: Subscription[] = [
  {
    id: '1',
    userId: 'user-1',
    userEmail: 'john.doe@example.com',
    userFirstName: 'John',
    userLastName: 'Doe',
    planType: 'PREMIUM',
    status: 'ACTIVE',
    price: 99900,
    startDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    autoRenew: true,
  },
  {
    id: '2',
    userId: 'user-2',
    userEmail: 'jane.smith@example.com',
    userFirstName: 'Jane',
    userLastName: 'Smith',
    planType: 'SERIES',
    status: 'ACTIVE',
    price: 29900,
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    autoRenew: false,
    contentId: 'series-1',
    contentTitle: 'Breaking Bad: Complete Series',
  },
  {
    id: '3',
    userId: 'user-3',
    userEmail: 'bob.wilson@example.com',
    userFirstName: 'Bob',
    userLastName: 'Wilson',
    planType: 'TUTORIAL',
    status: 'CANCELLED',
    price: 49900,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    autoRenew: false,
    contentId: 'tutorial-1',
    contentTitle: 'Advanced React Patterns',
  },
  {
    id: '4',
    userId: 'user-4',
    userEmail: 'alice.johnson@example.com',
    userFirstName: 'Alice',
    userLastName: 'Johnson',
    planType: 'PREMIUM',
    status: 'EXPIRED',
    price: 99900,
    startDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    autoRenew: false,
  },
  {
    id: '5',
    userId: 'user-5',
    userEmail: 'charlie.brown@example.com',
    userFirstName: 'Charlie',
    userLastName: 'Brown',
    planType: 'SERIES',
    status: 'ACTIVE',
    price: 19900,
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    autoRenew: true,
    contentId: 'series-2',
    contentTitle: 'Game of Thrones',
  },
];

/**
 * Subscription Management page
 */
export default function SubscriptionManagementPage() {
  const [data] = React.useState<Subscription[]>(mockSubscriptions);

  // Calculate stats
  const stats = {
    active: data.filter((s) => s.status === 'ACTIVE').length,
    expiringSoon: data.filter((s) => {
      const daysUntil = Math.ceil(
        (new Date(s.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return s.status === 'ACTIVE' && daysUntil > 0 && daysUntil <= 7;
    }).length,
    cancelled: data.filter((s) => s.status === 'CANCELLED').length,
    revenue: data
      .filter((s) => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + s.price, 0),
  };

  return (
    <div>
      <AdminPageHeader
        title="Подписки"
        description="Управление подписками пользователей и тарифами"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title="Активные"
          value={stats.active}
          icon={CheckCircle}
          className="border-mp-success-text/20"
        />
        <StatsCard
          title="Скоро истекают"
          value={stats.expiringSoon}
          icon={Clock}
          className="border-yellow-500/20"
        />
        <StatsCard
          title="Отменённые"
          value={stats.cancelled}
          icon={XCircle}
          className="border-mp-error-text/20"
        />
        <StatsCard
          title="Месячный доход"
          value={formatCurrency(stats.revenue)}
          icon={CreditCard}
          trend={{ value: 12, isPositive: true }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        searchKey="userEmail"
        searchPlaceholder="Поиск по email..."
        filterOptions={[
          {
            id: 'status',
            title: 'Статус',
            options: [
              { label: 'Активные', value: 'ACTIVE' },
              { label: 'Отменённые', value: 'CANCELLED' },
              { label: 'Истёкшие', value: 'EXPIRED' },
              { label: 'Ожидание', value: 'PENDING' },
            ],
          },
          {
            id: 'planType',
            title: 'Тип тарифа',
            options: [
              { label: 'Премиум', value: 'PREMIUM' },
              { label: 'Сериалы', value: 'SERIES' },
              { label: 'Обучение', value: 'TUTORIAL' },
            ],
          },
        ]}
      />
    </div>
  );
}
