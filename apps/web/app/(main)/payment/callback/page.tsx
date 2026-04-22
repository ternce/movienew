'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { PaymentStatusIndicator } from '@/components/payment';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentStatus } from '@/hooks';
import { useSubscriptionStore } from '@/stores/subscription.store';

/**
 * Payment callback page - Handle payment provider redirects
 */
export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();

  // Get transaction ID from URL or store
  const urlTransactionId = searchParams.get('transactionId') || searchParams.get('orderId');
  const storeTransactionId = useSubscriptionStore((state) => state.transactionId);
  const resetCheckout = useSubscriptionStore((state) => state.resetCheckout);

  const transactionId = urlTransactionId || storeTransactionId;

  // Fetch payment status
  const {
    status,
    isLoading,
    error,
    isCompleted,
    isFailed,
    isCancelled,
    refetch,
  } = usePaymentStatus(transactionId || undefined);

  // Reset checkout on successful payment
  React.useEffect(() => {
    if (isCompleted) {
      resetCheckout();
    }
  }, [isCompleted, resetCheckout]);

  // No transaction ID
  if (!transactionId) {
    return (
      <Container size="sm" className="py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <PaymentStatusIndicator
              status="FAILED"
              message="Транзакция не найдена. Проверьте историю платежей."
              onViewDetails={() => {}}
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button variant="outline" asChild>
                <Link href="/account/payments">История платежей</Link>
              </Button>
              <Button variant="gradient" asChild>
                <Link href="/pricing">Оформить подписку</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Loading state
  if (isLoading && !status) {
    return (
      <Container size="sm" className="py-12">
        <Card>
          <CardContent className="py-12">
            <div className="space-y-4 text-center">
              <Skeleton className="mx-auto h-20 w-20 rounded-full" />
              <Skeleton className="mx-auto h-6 w-48" />
              <Skeleton className="mx-auto h-4 w-64" />
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container size="sm" className="py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <PaymentStatusIndicator
              status="FAILED"
              transactionId={transactionId}
              message="Не удалось получить статус платежа"
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="sm" className="py-12">
      <Card>
        <CardContent className="py-12">
          <PaymentStatusIndicator
            status={status?.status || 'PENDING'}
            transactionId={transactionId}
            onRetry={isFailed ? () => window.location.href = '/pricing' : undefined}
            onViewDetails={
              isCompleted
                ? () => window.location.href = '/dashboard'
                : isFailed || isCancelled
                  ? () => window.location.href = '/account/payments'
                  : undefined
            }
          />

          {/* Additional actions based on status */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isCompleted && (
              <>
                <Button variant="gradient" asChild>
                  <Link href="/dashboard">Перейти к просмотру</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/account/subscriptions">Мои подписки</Link>
                </Button>
              </>
            )}

            {isFailed && (
              <>
                <Button variant="gradient" asChild>
                  <Link href="/pricing">Попробовать снова</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/account/payments">История платежей</Link>
                </Button>
              </>
            )}

            {isCancelled && (
              <>
                <Button variant="gradient" asChild>
                  <Link href="/pricing">Выбрать план</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">На главную</Link>
                </Button>
              </>
            )}

            {!isCompleted && !isFailed && !isCancelled && (
              <Button variant="outline" asChild>
                <Link href="/dashboard">Вернуться на главную</Link>
              </Button>
            )}
          </div>

          {/* Transaction details */}
          {status && (
            <div className="mt-8 rounded-lg bg-mp-surface p-4">
              <h3 className="mb-3 text-sm font-medium text-mp-text-primary">
                Детали транзакции
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-mp-text-secondary">ID транзакции</dt>
                  <dd className="font-mono text-mp-text-primary">{transactionId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mp-text-secondary">Сумма</dt>
                  <dd className="font-medium text-mp-text-primary">
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(status.amount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mp-text-secondary">Дата</dt>
                  <dd className="text-mp-text-primary">
                    {new Date(status.createdAt).toLocaleString('ru-RU')}
                  </dd>
                </div>
                {status.completedAt && (
                  <div className="flex justify-between">
                    <dt className="text-mp-text-secondary">Завершено</dt>
                    <dd className="text-mp-text-primary">
                      {new Date(status.completedAt).toLocaleString('ru-RU')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
