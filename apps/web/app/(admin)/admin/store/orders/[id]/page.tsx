'use client';

import { ArrowLeft, SpinnerGap, FloppyDisk } from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useAdminOrderDetail,
  useUpdateOrderStatus,
} from '@/hooks/use-admin-store';

// ============ Helpers ============

function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount) + ' \u20BD'
  );
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

// ============ Badge Configs ============

const orderStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Ожидание', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
  PAID: { label: 'Оплачен', className: 'bg-blue-500/20 text-blue-400 border-transparent' },
  PROCESSING: { label: 'Обработка', className: 'bg-indigo-500/20 text-indigo-400 border-transparent' },
  SHIPPED: { label: 'Отправлен', className: 'bg-cyan-500/20 text-cyan-400 border-transparent' },
  DELIVERED: { label: 'Доставлен', className: 'bg-green-500/20 text-green-400 border-transparent' },
  CANCELLED: { label: 'Отменён', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
  REFUNDED: { label: 'Возврат', className: 'bg-orange-500/20 text-orange-400 border-transparent' },
};

/**
 * Admin order detail page
 */
export default function AdminStoreOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: order, isLoading } = useAdminOrderDetail(id);
  const updateStatus = useUpdateOrderStatus();

  // Status update form state
  const [newStatus, setNewStatus] = React.useState('');
  const [trackingNumber, setTrackingNumber] = React.useState('');

  // Pre-fill when order loads
  React.useEffect(() => {
    if (order) {
      setNewStatus(order.status);
      setTrackingNumber(order.trackingNumber || '');
    }
  }, [order]);

  const handleStatusUpdate = () => {
    if (!newStatus || newStatus === order?.status) return;

    updateStatus.mutate({
      id,
      status: newStatus,
    });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </Container>
    );
  }

  // Not found
  if (!order) {
    return (
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/store/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад к списку
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold text-mp-text-primary mb-2">
            Заказ не найден
          </h2>
          <p className="text-mp-text-secondary">
            Заказ с указанным ID не существует.
          </p>
        </div>
      </Container>
    );
  }

  const statusBadge = orderStatusConfig[order.status] || {
    label: order.status,
    className: 'bg-gray-500/20 text-gray-400 border-transparent',
  };

  return (
    <Container size="xl" className="py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/store/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title={`Заказ #${order.id.slice(0, 8)}`}
        description={`Создан ${formatDate(order.createdAt)}`}
        breadcrumbItems={[
          { label: 'Заказы', href: '/admin/store/orders' },
          { label: `Заказ #${order.id.slice(0, 8)}` },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Информация о заказе</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-mp-text-disabled mb-1">
                    ID заказа
                  </p>
                  <p className="text-sm font-mono text-mp-text-primary">
                    {order.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-mp-text-disabled mb-1">Статус</p>
                  <Badge className={statusBadge.className}>
                    {statusBadge.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-mp-text-disabled mb-1">
                    Покупатель
                  </p>
                  <p className="text-sm text-mp-text-primary">
                    {order.user.email}
                  </p>
                  {(order.user.firstName || order.user.lastName) && (
                    <p className="text-xs text-mp-text-secondary">
                      {[order.user.firstName, order.user.lastName]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-mp-text-disabled mb-1">Дата</p>
                  <p className="text-sm text-mp-text-primary">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-mp-text-disabled mb-1">Сумма</p>
                  <p className="text-sm font-medium text-mp-text-primary">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-mp-text-disabled mb-1">
                    Бонусы использовано
                  </p>
                  <p className="text-sm text-mp-text-secondary">
                    {order.bonusAmountUsed > 0
                      ? formatCurrency(order.bonusAmountUsed)
                      : '\u2014'}
                  </p>
                </div>
              </div>
              {order.trackingNumber && (
                <div>
                  <p className="text-xs text-mp-text-disabled mb-1">
                    Трек-номер
                  </p>
                  <p className="text-sm font-mono text-mp-text-primary">
                    {order.trackingNumber}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Товары в заказе</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-mp-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-mp-surface/50 hover:bg-mp-surface/50">
                      <TableHead>Товар</TableHead>
                      <TableHead className="text-center">Кол-во</TableHead>
                      <TableHead className="text-right">Цена</TableHead>
                      <TableHead className="text-right">Бонусы</TableHead>
                      <TableHead className="text-right">Итого</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={`${item.orderId}-${item.productId}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.product.images && item.product.images.length > 0 ? (
                              <img
                                src={item.product.images[0]}
                                alt={item.product.name}
                                className="h-10 w-10 rounded-md object-cover bg-mp-surface"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-mp-surface flex items-center justify-center text-mp-text-disabled text-xs">
                                N/A
                              </div>
                            )}
                            <span className="text-sm font-medium text-mp-text-primary">
                              {item.product.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-mp-text-secondary">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right text-mp-text-secondary">
                          {formatCurrency(item.priceAtPurchase)}
                        </TableCell>
                        <TableCell className="text-right text-mp-text-secondary">
                          {item.bonusUsed > 0
                            ? formatCurrency(item.bonusUsed)
                            : '\u2014'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-mp-text-primary">
                          {formatCurrency(item.quantity * item.priceAtPurchase)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Shipping address */}
          {order.shippingAddress && Object.keys(order.shippingAddress).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Адрес доставки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(order.shippingAddress).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs text-mp-text-disabled mb-1 capitalize">
                        {key}
                      </p>
                      <p className="text-sm text-mp-text-primary">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Обновить статус</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Статус заказа</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(orderStatusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trackingNumber">Трек-номер</Label>
                <Input
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Введите трек-номер"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleStatusUpdate}
                disabled={
                  updateStatus.isPending ||
                  !newStatus ||
                  newStatus === order.status
                }
              >
                {updateStatus.isPending ? (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FloppyDisk className="mr-2 h-4 w-4" />
                )}
                Сохранить
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
