'use client';

import { ArrowLeft, Check, Shield, Lock } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import {
  PaymentMethodSelector,
  BonusApplicator,
  PaymentSummary,
  QRCodePayment,
  BankTransferDetails,
  PaymentStatusPolling,
} from '@/components/payment';
import { RenewalToggleWithDescription } from '@/components/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import { usePurchaseSubscription, usePaymentStatus, handlePaymentRedirect } from '@/hooks';
import { useBonusBalance, useMaxApplicable, useExpiringBonuses } from '@/hooks/use-bonus';
import { useSubscriptionStore, subscriptionSelectors } from '@/stores/subscription.store';

/**
 * Checkout page - Complete subscription purchase
 */
export default function CheckoutPage() {
  const router = useRouter();

  // Store state
  const {
    selectedPlan,
    paymentMethod,
    bonusAmount,
    autoRenew,
    checkoutStep,
    transactionId,
    setPaymentMethod,
    setBonusAmount,
    setAutoRenew,
    setCheckoutStep,
    setTransactionId,
    setError,
    resetCheckout,
  } = useSubscriptionStore();

  // Computed values
  const amountToPay = useSubscriptionStore(subscriptionSelectors.getAmountToPay);
  const isFullyCoveredByBonus = useSubscriptionStore(
    subscriptionSelectors.isFullyCoveredByBonus
  );

  // API hooks
  const { mutateAsync: purchaseAsync, isPending: isPurchasing } =
    usePurchaseSubscription();
  const paymentStatus = usePaymentStatus(transactionId || undefined);

  // Bonus data from API
  const { data: bonusData, isLoading: isBonusLoading, error: bonusError } = useBonusBalance();
  const { data: maxApplicableData, isLoading: isMaxApplicableLoading } = useMaxApplicable(
    selectedPlan?.price ?? 0
  );
  const { data: expiringData } = useExpiringBonuses(1); // Check bonuses expiring within 24 hours

  // Derived bonus values
  const bonusBalance = bonusData?.balance ?? 0;
  const maxApplicable = maxApplicableData?.maxAmount ?? 0;
  const hasExpiringBonuses = (expiringData?.totalExpiring ?? 0) > 0;
  const isBonusDataReady = !isBonusLoading && !isMaxApplicableLoading;

  // Payment result state
  const [paymentResult, setPaymentResult] = React.useState<{
    type: 'QR' | 'BANK_TRANSFER';
    url?: string;
    details?: Record<string, string>;
  } | null>(null);

  // Redirect to pricing if no plan selected
  React.useEffect(() => {
    if (!selectedPlan) {
      router.push('/pricing');
    }
  }, [selectedPlan, router]);

  // Handle payment status changes
  React.useEffect(() => {
    if (paymentStatus.isCompleted) {
      setCheckoutStep('complete');
    } else if (paymentStatus.isFailed) {
      setError('Платёж не прошёл. Попробуйте ещё раз.');
      setCheckoutStep('payment');
    }
  }, [paymentStatus.isCompleted, paymentStatus.isFailed, setCheckoutStep, setError]);

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    try {
      setCheckoutStep('processing');

      const result = await purchaseAsync({
        planId: selectedPlan.id,
        paymentMethod,
        bonusAmount: bonusAmount > 0 ? bonusAmount : undefined,
        autoRenew,
        returnUrl: `${window.location.origin}/payment/callback`,
      });

      setTransactionId(result.transactionId);

      // Handle different payment results
      if (result.status === 'COMPLETED') {
        // Bonus covered full amount
        setCheckoutStep('complete');
      } else {
        // Handle redirect or show QR/bank details
        const redirectResult = handlePaymentRedirect(result);

        if (redirectResult) {
          if (redirectResult.type === 'QR') {
            setPaymentResult({ type: 'QR', url: redirectResult.url });
            setCheckoutStep('confirm');
          } else if (redirectResult.type === 'BANK_TRANSFER') {
            setPaymentResult({
              type: 'BANK_TRANSFER',
              details: redirectResult.details as unknown as Record<string, string>,
            });
            setCheckoutStep('confirm');
          }
        }
        // Card payments will redirect automatically via handlePaymentRedirect
      }
    } catch (error) {
      setCheckoutStep('payment');
      toast.error('Не удалось обработать платёж');
    }
  };

  const handleCancel = () => {
    resetCheckout();
    router.push('/pricing');
  };

  if (!selectedPlan) {
    return null;
  }

  return (
    <Container size="lg" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/pricing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к тарифам
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
          Оформление подписки
        </h1>
      </div>

      {/* Checkout steps */}
      <div className="mb-8 flex items-center justify-center gap-4">
        {['payment', 'confirm', 'complete'].map((step, index) => {
          const isActive = checkoutStep === step;
          const isPast =
            ['payment', 'confirm', 'complete'].indexOf(checkoutStep) > index;
          const labels = ['Оплата', 'Подтверждение', 'Готово'];

          return (
            <React.Fragment key={step}>
              {index > 0 && (
                <div
                  className={`h-px w-8 ${isPast ? 'bg-mp-accent-primary' : 'bg-mp-border'}`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isActive || isPast
                      ? 'bg-mp-accent-primary text-white'
                      : 'bg-mp-surface text-mp-text-secondary'
                  }`}
                >
                  {isPast ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`hidden text-sm sm:inline ${
                    isActive ? 'text-mp-text-primary' : 'text-mp-text-secondary'
                  }`}
                >
                  {labels[index]}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Payment step */}
          {checkoutStep === 'payment' && (
            <div className="space-y-6">
              {/* Plan summary card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Выбранный план</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-mp-text-primary">
                        {selectedPlan.name}
                      </h3>
                      <p className="text-sm text-mp-text-secondary">
                        {selectedPlan.description}
                      </p>
                    </div>
                    <Button variant="ghost" asChild size="sm">
                      <Link href="/pricing">Изменить</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Bonus applicator */}
              {isBonusLoading ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Использовать бонусы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 flex-1" />
                        <Skeleton className="h-8 flex-1" />
                        <Skeleton className="h-8 flex-1" />
                        <Skeleton className="h-8 flex-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : bonusBalance > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Использовать бонусы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BonusApplicator
                      availableBalance={bonusBalance}
                      maxApplicable={maxApplicable}
                      appliedAmount={bonusAmount}
                      onApply={setBonusAmount}
                      orderTotal={selectedPlan.price}
                      hasExpiringBonuses={hasExpiringBonuses}
                      expiringAmount={expiringData?.totalExpiring}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Payment method */}
              {!isFullyCoveredByBonus && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Способ оплаты</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodSelector
                      selected={paymentMethod}
                      onSelect={setPaymentMethod}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Auto-renewal */}
              <RenewalToggleWithDescription
                autoRenew={autoRenew}
                onToggle={setAutoRenew}
                planName={selectedPlan.name}
                price={selectedPlan.price}
                currency={selectedPlan.currency}
              />

              {/* Action buttons */}
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={handleCancel}>
                  Отмена
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={handlePurchase}
                  isLoading={isPurchasing}
                >
                  {isFullyCoveredByBonus ? 'Оформить бесплатно' : 'Перейти к оплате'}
                </Button>
              </div>
            </div>
          )}

          {/* Processing step */}
          {checkoutStep === 'processing' && (
            <Card className="py-12 text-center">
              <CardContent>
                <PaymentStatusPolling
                  status="PENDING"
                  isPolling
                  className="mx-auto max-w-sm"
                />
              </CardContent>
            </Card>
          )}

          {/* Confirm step - QR or Bank transfer */}
          {checkoutStep === 'confirm' && paymentResult && (
            <Card>
              <CardContent className="p-6">
                {paymentResult.type === 'QR' && paymentResult.url && (
                  <QRCodePayment
                    qrCodeUrl={paymentResult.url}
                    amount={amountToPay}
                    onCancel={handleCancel}
                  />
                )}
                {paymentResult.type === 'BANK_TRANSFER' && paymentResult.details && (
                  <BankTransferDetails
                    bankDetails={{
                      bankName: paymentResult.details.bankName || '',
                      bik: paymentResult.details.bik || '',
                      accountNumber: paymentResult.details.accountNumber || '',
                      recipientName: paymentResult.details.recipientName || '',
                      inn: paymentResult.details.inn || '',
                      kpp: paymentResult.details.kpp || '',
                    }}
                    amount={amountToPay}
                    invoiceNumber={transactionId || undefined}
                  />
                )}

                {/* Polling status */}
                {transactionId && (
                  <div className="mt-6">
                    <PaymentStatusPolling
                      status={paymentStatus.status?.status || 'PENDING'}
                      isPolling={paymentStatus.isPending}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Complete step */}
          {checkoutStep === 'complete' && (
            <Card className="py-12 text-center">
              <CardContent>
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-mp-success-bg">
                  <Check className="h-10 w-10 text-mp-success-text" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-mp-text-primary">
                  Подписка оформлена!
                </h2>
                <p className="mb-6 text-mp-text-secondary">
                  Теперь вам доступен весь контент по подписке {selectedPlan.name}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button variant="gradient" asChild>
                    <Link href="/dashboard">Перейти к просмотру</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/account/subscriptions">Мои подписки</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <PaymentSummary
              subtotal={selectedPlan.price}
              bonusDiscount={bonusAmount}
              total={amountToPay}
              currency={selectedPlan.currency}
              planName={selectedPlan.name}
              planDescription={selectedPlan.description}
            />

            {/* Security badges */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-mp-surface/50 p-3">
                <Shield className="h-5 w-5 text-mp-accent-secondary" />
                <div>
                  <p className="text-sm font-medium text-mp-text-primary">
                    Безопасная оплата
                  </p>
                  <p className="text-xs text-mp-text-secondary">
                    256-bit SSL шифрование
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-mp-surface/50 p-3">
                <Lock className="h-5 w-5 text-mp-accent-secondary" />
                <div>
                  <p className="text-sm font-medium text-mp-text-primary">
                    Защита данных
                  </p>
                  <p className="text-xs text-mp-text-secondary">
                    Мы не храним данные карт
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
