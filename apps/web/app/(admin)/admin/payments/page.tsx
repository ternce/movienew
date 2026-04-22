'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  CurrencyDollar,
  TrendUp,
  Hash,
  ArrowCounterClockwise,
  Eye,
  Copy,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useAdminTransactions,
  useAdminPaymentStats,
  useRefundTransaction,
  type AdminTransaction,
} from '@/hooks/use-admin-payments';

// ============ Helpers ============

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' \u20BD';
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) + '...' : id;
}

// ============ Badge Configs ============

const typeConfig: Record<string, { label: string; className: string }> = {
  SUBSCRIPTION: { label: 'Подписка', className: 'bg-blue-500/20 text-blue-400' },
  STORE: { label: 'Магазин', className: 'bg-green-500/20 text-green-400' },
  BONUS_PURCHASE: { label: 'Бонус', className: 'bg-purple-500/20 text-purple-400' },
  WITHDRAWAL: { label: 'Вывод', className: 'bg-orange-500/20 text-orange-400' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Ожидание', className: 'bg-yellow-500/20 text-yellow-400' },
  PROCESSING: { label: 'Обработка', className: 'bg-blue-500/20 text-blue-400' },
  COMPLETED: { label: 'Завершено', className: 'bg-green-500/20 text-green-400' },
  FAILED: { label: 'Ошибка', className: 'bg-red-500/20 text-red-400' },
  REFUNDED: { label: 'Возврат', className: 'bg-orange-500/20 text-orange-400' },
  CANCELLED: { label: 'Отменено', className: 'bg-gray-500/20 text-gray-400' },
};

// ============ Page Component ============

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);

  const { data: stats, isLoading: isLoadingStats } = useAdminPaymentStats();
  const { data: transactions, isLoading: isLoadingTransactions } = useAdminTransactions({
    page,
    limit,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    userId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });

  const refundMutation = useRefundTransaction();

  const hasFilters = search || statusFilter || typeFilter;

  // Filter by search (client-side for email/ID matching)
  const filteredItems = React.useMemo(() => {
    if (!transactions?.items) return [];
    if (!search) return transactions.items;

    const lowerSearch = search.toLowerCase();
    return transactions.items.filter(
      (t) =>
        t.userEmail.toLowerCase().includes(lowerSearch) ||
        t.id.toLowerCase().includes(lowerSearch)
    );
  }, [transactions?.items, search]);

  // ============ Columns ============

  const columns: ColumnDef<AdminTransaction>[] = React.useMemo(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ row }) => {
          const id = row.getValue('id') as string;
          return (
            <button
              className="flex items-center gap-1.5 font-mono text-xs text-mp-text-secondary hover:text-mp-text-primary transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(id);
                toast.success('ID скопирован');
              }}
              title={id}
            >
              {truncateId(id)}
              <Copy className="h-3 w-3" />
            </button>
          );
        },
      },
      {
        accessorKey: 'userEmail',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Эл. почта" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-mp-text-primary">
            {row.getValue('userEmail')}
          </span>
        ),
      },
      {
        accessorKey: 'type',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Тип" />
        ),
        cell: ({ row }) => {
          const type = row.getValue('type') as string;
          const config = typeConfig[type] || { label: type, className: 'bg-gray-500/20 text-gray-400' };
          return (
            <Badge className={config.className}>
              {config.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Сумма" className="justify-end" />
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium text-mp-text-primary">
            {formatCurrency(row.getValue('amount') as number)}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Статус" />
        ),
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          const config = statusConfig[status] || { label: status, className: 'bg-gray-500/20 text-gray-400' };
          return (
            <Badge className={config.className}>
              {config.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Дата" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-mp-text-secondary">
            {formatDate(row.getValue('createdAt') as string)}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const transaction = row.original;
          const actions = [
            {
              label: 'Просмотр',
              icon: Eye,
              onClick: () => router.push(`/admin/payments/${transaction.id}`),
            },
          ];

          if (transaction.status === 'COMPLETED') {
            actions.push({
              label: 'Возврат',
              icon: ArrowCounterClockwise,
              onClick: () => {
                if (confirm('Вы уверены, что хотите выполнить возврат этой транзакции?')) {
                  refundMutation.mutate(transaction.id);
                }
              },
              variant: 'destructive' as const,
              separator: true,
            } as typeof actions[0]);
          }

          return <DataTableRowActions row={row} actions={actions} />;
        },
      },
    ],
    [router, refundMutation]
  );

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Платежи"
        description="Управление транзакциями"
      />

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Общая выручка"
          value={isLoadingStats ? '...' : formatCurrency(stats?.totalRevenue ?? 0)}
          icon={CurrencyDollar}
        />
        <StatsCard
          title="Выручка за месяц"
          value={isLoadingStats ? '...' : formatCurrency(stats?.monthlyRevenue ?? 0)}
          icon={TrendUp}
        />
        <StatsCard
          title="Транзакций"
          value={isLoadingStats ? '...' : (stats?.transactionCount ?? 0).toLocaleString('ru-RU')}
          icon={Hash}
        />
        <StatsCard
          title="Возвраты"
          value={isLoadingStats ? '...' : (stats?.refundCount ?? 0).toLocaleString('ru-RU')}
          icon={ArrowCounterClockwise}
        />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <MagnifyingGlass className="h-4 w-4 text-mp-text-secondary" />
              <span className="text-sm font-medium text-mp-text-primary">Фильтры:</span>
            </div>

            <div className="flex-1 min-w-[200px] max-w-[300px] space-y-1">
              <Label className="text-xs text-mp-text-secondary">Поиск</Label>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Email или ID транзакции..."
              />
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
                  <SelectItem value="PENDING">Ожидание</SelectItem>
                  <SelectItem value="PROCESSING">Обработка</SelectItem>
                  <SelectItem value="COMPLETED">Завершено</SelectItem>
                  <SelectItem value="FAILED">Ошибка</SelectItem>
                  <SelectItem value="REFUNDED">Возврат</SelectItem>
                  <SelectItem value="CANCELLED">Отменено</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">Тип</Label>
              <Select
                value={typeFilter || 'all'}
                onValueChange={(v) => {
                  setTypeFilter(v === 'all' ? null : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="SUBSCRIPTION">Подписка</SelectItem>
                  <SelectItem value="STORE">Магазин</SelectItem>
                  <SelectItem value="BONUS_PURCHASE">Бонус</SelectItem>
                  <SelectItem value="WITHDRAWAL">Вывод</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter(null);
                  setTypeFilter(null);
                  setPage(1);
                }}
              >
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoadingTransactions}
        manualPagination
        pagination={
          transactions
            ? {
                page: transactions.page,
                limit: transactions.limit,
                total: transactions.total,
                totalPages: transactions.totalPages,
              }
            : undefined
        }
        onPaginationChange={(newPage) => {
          setPage(newPage);
        }}
      />
    </Container>
  );
}
