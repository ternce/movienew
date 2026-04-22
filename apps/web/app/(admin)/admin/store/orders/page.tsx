'use client';

import {
  Bag,
  Clock,
  Gear,
  Truck,
  CheckCircle,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import * as React from 'react';

import { DataTable } from '@/components/admin/data-table/data-table';
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { orderColumns } from '@/components/admin/store/order-columns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  useAdminOrders,
  useAdminOrderStats,
} from '@/hooks/use-admin-store';

// ============ Badge Configs ============

const orderStatusConfig: Record<string, { label: string; value: string }> = {
  PENDING: { label: 'Ожидание', value: 'PENDING' },
  PAID: { label: 'Оплачен', value: 'PAID' },
  PROCESSING: { label: 'Обработка', value: 'PROCESSING' },
  SHIPPED: { label: 'Отправлен', value: 'SHIPPED' },
  DELIVERED: { label: 'Доставлен', value: 'DELIVERED' },
  CANCELLED: { label: 'Отменён', value: 'CANCELLED' },
  REFUNDED: { label: 'Возврат', value: 'REFUNDED' },
};

/**
 * Admin orders list page
 */
export default function AdminStoreOrdersPage() {
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  const { data: stats, isLoading: isLoadingStats } = useAdminOrderStats();
  const { data: orders, isLoading: isLoadingOrders } = useAdminOrders({
    page,
    limit,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const hasFilters = search || statusFilter;

  // Filter by search (client-side for email/ID matching)
  const filteredItems = React.useMemo(() => {
    if (!orders?.items) return [];
    if (!search) return orders.items;

    const lowerSearch = search.toLowerCase();
    return orders.items.filter(
      (o) =>
        o.user.email.toLowerCase().includes(lowerSearch) ||
        o.id.toLowerCase().includes(lowerSearch)
    );
  }, [orders?.items, search]);

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Заказы"
        description="Управление заказами"
      />

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Всего"
          value={
            isLoadingStats
              ? '...'
              : (stats?.totalOrders ?? 0).toLocaleString('ru-RU')
          }
          icon={Bag}
        />
        <StatsCard
          title="Ожидание"
          value={
            isLoadingStats
              ? '...'
              : (stats?.pendingCount ?? 0).toLocaleString('ru-RU')
          }
          icon={Clock}
        />
        <StatsCard
          title="Обработка"
          value={
            isLoadingStats
              ? '...'
              : (stats?.processingCount ?? 0).toLocaleString('ru-RU')
          }
          icon={Gear}
        />
        <StatsCard
          title="Отправлено"
          value={
            isLoadingStats
              ? '...'
              : (stats?.shippedCount ?? 0).toLocaleString('ru-RU')
          }
          icon={Truck}
        />
        <StatsCard
          title="Доставлено"
          value={
            isLoadingStats
              ? '...'
              : (stats?.deliveredCount ?? 0).toLocaleString('ru-RU')
          }
          icon={CheckCircle}
        />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <MagnifyingGlass className="h-4 w-4 text-mp-text-secondary" />
              <span className="text-sm font-medium text-mp-text-primary">
                Фильтры:
              </span>
            </div>

            <div className="flex-1 min-w-[200px] max-w-[300px] space-y-1">
              <Label className="text-xs text-mp-text-secondary">Поиск</Label>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Email или ID заказа..."
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
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {Object.entries(orderStatusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
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
                  setSearch('');
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

      {/* Data Table */}
      <DataTable
        columns={orderColumns}
        data={filteredItems}
        isLoading={isLoadingOrders}
        manualPagination
        pagination={
          orders
            ? {
                page: orders.page,
                limit: orders.limit,
                total: orders.total,
                totalPages: orders.totalPages,
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
