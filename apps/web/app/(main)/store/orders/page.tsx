'use client';

import { Package, Bag } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { OrderStatusBadge } from '@/components/store';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Pagination } from '@/components/ui/pagination';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrders } from '@/hooks/use-store';
import { useAuthStore } from '@/stores/auth.store';
import { OrderStatus } from '@movie-platform/shared';
import type { OrderQueryParams } from '@/types/store.types';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price);
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ACTIVE_STATUSES = [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED].join(',');

const TAB_FILTERS: Record<string, string | undefined> = {
  all: undefined,
  active: ACTIVE_STATUSES,
  delivered: OrderStatus.DELIVERED,
  cancelled: OrderStatus.CANCELLED,
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);

  const params: OrderQueryParams = {
    page: currentPage,
    limit: 10,
    status: TAB_FILTERS[activeTab],
  };

  const { data, isLoading } = useOrders(params);

  // Auth guard
  React.useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/login?returnUrl=/store/orders');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || !isAuthenticated) return null;

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  return (
    <Container size="lg" className="py-6">
      <h1 className="text-2xl font-bold text-mp-text-primary mb-6">Мои заказы</h1>

      {/* Filter tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="active">Активные</TabsTrigger>
          <TabsTrigger value="delivered">Доставленные</TabsTrigger>
          <TabsTrigger value="cancelled">Отменённые</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? null : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-mp-surface flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-mp-text-disabled" />
          </div>
          <h3 className="text-lg font-medium text-mp-text-primary mb-2">
            У вас пока нет заказов
          </h3>
          <p className="text-mp-text-secondary mb-4">
            Начните покупки в нашем магазине
          </p>
          <Button variant="outline" asChild>
            <Link href="/store">Перейти в магазин</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/store/orders/${order.id}`}
                className="block rounded-xl border border-mp-border p-4 hover:border-mp-accent-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-mp-text-secondary">
                      #{order.id.slice(0, 8)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span className="text-sm text-mp-text-secondary">
                    {formatRelativeDate(order.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* First item thumbnail placeholder */}
                    <div className="w-10 h-10 rounded bg-mp-surface-elevated flex items-center justify-center shrink-0">
                      <Bag className="w-4 h-4 text-mp-text-disabled" />
                    </div>
                    <span className="text-sm text-mp-text-secondary">
                      {order.items.length} {order.items.length === 1 ? 'товар' : order.items.length < 5 ? 'товара' : 'товаров'}
                    </span>
                  </div>
                  <span className="text-base font-semibold text-mp-text-primary">
                    {formatPrice(order.totalAmount)} ₽
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </Container>
  );
}
