'use client';

import {
  Package,
  CheckCircle,
  NotePencil,
  Warning,
  Plus,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { DataTable } from '@/components/admin/data-table/data-table';
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { productColumns } from '@/components/admin/store/product-columns';
import { Badge } from '@/components/ui/badge';
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
  useAdminProducts,
  useAdminProductStats,
  useDeleteProduct,
} from '@/hooks/use-admin-store';

/**
 * Admin products list page
 */
export default function AdminStoreProductsPage() {
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  const { data: stats, isLoading: isLoadingStats } = useAdminProductStats();
  const { data: products, isLoading: isLoadingProducts } = useAdminProducts({
    page,
    limit,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const deleteMutation = useDeleteProduct();

  const hasFilters = search || statusFilter;

  // Listen for delete events from row actions
  React.useEffect(() => {
    const handler = (e: CustomEvent<{ id: string; name: string }>) => {
      const { id, name } = e.detail;
      if (window.confirm(`Вы уверены, что хотите удалить товар "${name}"?`)) {
        deleteMutation.mutate(id);
      }
    };

    window.addEventListener(
      'admin:delete-product' as never,
      handler as EventListener
    );
    return () => {
      window.removeEventListener(
        'admin:delete-product' as never,
        handler as EventListener
      );
    };
  }, [deleteMutation]);

  // Filter by search (client-side for name matching)
  const filteredItems = React.useMemo(() => {
    if (!products?.items) return [];
    if (!search) return products.items;

    const lowerSearch = search.toLowerCase();
    return products.items.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerSearch) ||
        p.slug.toLowerCase().includes(lowerSearch)
    );
  }, [products?.items, search]);

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Товары"
        description="Управление товарами магазина"
      >
        <Button asChild>
          <Link href="/admin/store/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Добавить товар
          </Link>
        </Button>
      </AdminPageHeader>

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Всего"
          value={
            isLoadingStats
              ? '...'
              : (stats?.totalProducts ?? 0).toLocaleString('ru-RU')
          }
          icon={Package}
        />
        <StatsCard
          title="Активные"
          value={
            isLoadingStats
              ? '...'
              : (stats?.activeCount ?? 0).toLocaleString('ru-RU')
          }
          icon={CheckCircle}
        />
        <StatsCard
          title="Черновики"
          value={
            isLoadingStats
              ? '...'
              : (stats?.draftCount ?? 0).toLocaleString('ru-RU')
          }
          icon={NotePencil}
        />
        <StatsCard
          title="Нет в наличии"
          value={
            isLoadingStats
              ? '...'
              : (stats?.outOfStockCount ?? 0).toLocaleString('ru-RU')
          }
          icon={Warning}
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
                placeholder="Название товара..."
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
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="DRAFT">Черновик</SelectItem>
                  <SelectItem value="ACTIVE">Активен</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Нет в наличии</SelectItem>
                  <SelectItem value="DISCONTINUED">Снят</SelectItem>
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
        columns={productColumns}
        data={filteredItems}
        isLoading={isLoadingProducts}
        manualPagination
        pagination={
          products
            ? {
                page: products.page,
                limit: products.limit,
                total: products.total,
                totalPages: products.totalPages,
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
