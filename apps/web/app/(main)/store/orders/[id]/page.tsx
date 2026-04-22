'use client';

import { ArrowLeft, Copy, Check, Package } from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { OrderStatusBadge, OrderStatusTimeline } from '@/components/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOrder, useCancelOrder } from '@/hooks/use-store';
import { useAuthStore } from '@/stores/auth.store';
import { OrderStatus } from '@movie-platform/shared';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { isAuthenticated, isHydrated } = useAuthStore();

  const { data: order, isLoading, error } = useOrder(orderId);
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder();
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [copiedTracking, setCopiedTracking] = React.useState(false);

  // Auth guard
  React.useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push(`/login?returnUrl=/store/orders/${orderId}`);
    }
  }, [isAuthenticated, isHydrated, router, orderId]);

  if (!isHydrated || !isAuthenticated) return null;

  const canCancel = order && (order.status === OrderStatus.PENDING || order.status === OrderStatus.PAID);

  const handleCancel = () => {
    cancelOrder(orderId);
    setShowCancelDialog(false);
  };

  const handleCopyTracking = async () => {
    if (!order?.trackingNumber) return;
    await navigator.clipboard.writeText(order.trackingNumber);
    setCopiedTracking(true);
    toast.success('Номер отслеживания скопирован');
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  if (error) {
    return (
      <Container size="lg" className="py-12 text-center">
        <h1 className="text-xl font-bold text-mp-text-primary mb-2">Заказ не найден</h1>
        <Button variant="outline" asChild>
          <Link href="/store/orders">Назад к заказам</Link>
        </Button>
      </Container>
    );
  }

  if (isLoading || !order) return null;

  return (
    <Container size="lg" className="py-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-mp-text-secondary mb-6">
        <Link href="/store" className="hover:text-mp-text-primary transition-colors">
          Магазин
        </Link>
        <span>/</span>
        <Link href="/store/orders" className="hover:text-mp-text-primary transition-colors">
          Мои заказы
        </Link>
        <span>/</span>
        <span className="text-mp-text-primary">Заказ #{order.id.slice(0, 8)}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-mp-text-primary flex items-center gap-3">
            Заказ #{order.id.slice(0, 8)}
            <OrderStatusBadge status={order.status} />
          </h1>
          <p className="text-sm text-mp-text-secondary mt-1">
            от {formatDate(order.createdAt)}
          </p>
        </div>

        {canCancel && (
          <Button
            variant="outline"
            className="text-mp-error-text border-mp-error-text/30 hover:bg-mp-error-bg"
            onClick={() => setShowCancelDialog(true)}
            disabled={isCancelling}
          >
            {isCancelling ? 'Отмена...' : 'Отменить заказ'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статус заказа</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusTimeline currentStatus={order.status} />
            </CardContent>
          </Card>

          {/* Items table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Товары</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-mp-border">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 py-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-mp-surface-elevated shrink-0">
                      {item.productImage ? (
                        <Image
                          src={item.productImage}
                          alt={item.productName}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-mp-text-disabled" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-mp-text-primary truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-mp-text-secondary">
                        {formatPrice(item.priceAtPurchase)} ₽ × {item.quantity}
                      </p>
                    </div>

                    <div className="text-sm font-semibold text-mp-text-primary shrink-0">
                      {formatPrice(item.total)} ₽
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Адрес доставки</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-mp-text-secondary space-y-1">
              <p className="text-mp-text-primary font-medium">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.phone}</p>
              <p>{order.shippingAddress.postalCode}, {order.shippingAddress.city}</p>
              <p>{order.shippingAddress.address}</p>
              {order.shippingAddress.instructions && (
                <p className="italic">{order.shippingAddress.instructions}</p>
              )}
            </CardContent>
          </Card>

          {/* Tracking number */}
          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Отслеживание</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-mp-text-primary">{order.trackingNumber}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopyTracking}
                  >
                    {copiedTracking ? (
                      <Check className="w-4 h-4 text-mp-success-text" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment summary sidebar */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Оплата</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-mp-text-secondary">Товары</span>
                <span className="text-mp-text-primary">{formatPrice(order.totalAmount)} ₽</span>
              </div>
              {order.bonusAmountUsed > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-mp-accent-secondary">Бонусы</span>
                  <span className="text-mp-accent-secondary">−{formatPrice(order.bonusAmountUsed)} ₽</span>
                </div>
              )}
              <div className="border-t border-mp-border pt-3">
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-mp-text-primary">Оплачено</span>
                  <span className="text-xl font-bold text-mp-text-primary">
                    {formatPrice(order.amountPaid)} ₽
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Button variant="ghost" asChild>
          <Link href="/store/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к заказам
          </Link>
        </Button>
      </div>

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отменить заказ?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите отменить заказ #{order.id.slice(0, 8)}? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Нет, оставить
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Отмена...' : 'Да, отменить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
