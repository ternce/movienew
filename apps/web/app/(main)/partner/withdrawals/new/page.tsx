'use client';

import { Wallet, ArrowLeft, ArrowRight, Check, CreditCard, Buildings } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { TaxCalculator, TaxPreviewInline } from '@/components/partner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { usePartnerBalance, useTaxPreview, useCreateWithdrawal } from '@/hooks/use-partner';
import {
  usePartnerStore,
  partnerSelectors,
  TAX_STATUS_LABELS,
  TAX_RATES,
} from '@/stores/partner.store';
import type { TaxStatus, PaymentDetails } from '@/types';

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
 * New withdrawal page - multi-step form
 */
export default function NewWithdrawalPage() {
  const router = useRouter();
  const { data: balance, isLoading: isBalanceLoading } = usePartnerBalance();
  const createWithdrawal = useCreateWithdrawal();

  const {
    withdrawalStep,
    withdrawalAmount,
    withdrawalTaxStatus,
    withdrawalPaymentDetails,
    setWithdrawalStep,
    nextWithdrawalStep,
    prevWithdrawalStep,
    setWithdrawalAmount,
    setWithdrawalTaxStatus,
    setWithdrawalPaymentDetails,
    resetWithdrawal,
  } = usePartnerStore();

  // Tax preview
  const { data: taxCalculation, isLoading: isTaxLoading } = useTaxPreview(
    withdrawalAmount,
    withdrawalTaxStatus
  );

  // Validate amount
  const amountError = React.useMemo(() => {
    if (!balance) return null;
    if (withdrawalAmount < balance.minimumWithdrawal) {
      return `Минимум ${formatCurrency(balance.minimumWithdrawal)}`;
    }
    if (withdrawalAmount > balance.available) {
      return `Максимум ${formatCurrency(balance.available)}`;
    }
    return null;
  }, [withdrawalAmount, balance]);

  const canProceed = React.useMemo(() => {
    if (!balance) return false;
    return partnerSelectors.canProceedWithdrawal(
      { withdrawalStep, withdrawalAmount, withdrawalTaxStatus, withdrawalPaymentDetails } as never,
      balance.available,
      balance.minimumWithdrawal
    );
  }, [withdrawalStep, withdrawalAmount, withdrawalTaxStatus, withdrawalPaymentDetails, balance]);

  // Handle submit
  const handleSubmit = async () => {
    if (!withdrawalPaymentDetails) return;

    try {
      await createWithdrawal.mutateAsync({
        amount: withdrawalAmount,
        taxStatus: withdrawalTaxStatus,
        paymentDetails: withdrawalPaymentDetails,
      });
      resetWithdrawal();
      router.push('/partner/withdrawals');
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Don't reset on unmount - user might navigate back
    };
  }, []);

  const steps = [
    { key: 'amount', label: 'Сумма' },
    { key: 'tax', label: 'Налог' },
    { key: 'payment', label: 'Реквизиты' },
    { key: 'confirm', label: 'Подтверждение' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === withdrawalStep);

  return (
    <Container size="md" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/partner/withdrawals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К истории выводов
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <Wallet className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary">
            Вывод средств
          </h1>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div
                className={`flex flex-col items-center ${
                  index <= currentStepIndex
                    ? 'text-mp-accent-primary'
                    : 'text-mp-text-disabled'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStepIndex
                      ? 'bg-mp-accent-primary text-white'
                      : index === currentStepIndex
                      ? 'border-2 border-mp-accent-primary'
                      : 'border-2 border-mp-border'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    index < currentStepIndex ? 'bg-mp-accent-primary' : 'bg-mp-border'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step content */}
      <Card>
        {withdrawalStep === 'amount' && (
          <>
            <CardHeader>
              <CardTitle>Сумма вывода</CardTitle>
              <CardDescription>
                Введите сумму, которую хотите вывести
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {balance && (
                <div className="p-3 rounded-lg bg-mp-surface">
                  <p className="text-sm text-mp-text-secondary">Доступно для вывода</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(balance.available)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Сумма (₽)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={balance?.minimumWithdrawal || 100}
                  max={balance?.available || 0}
                  value={withdrawalAmount || ''}
                  onChange={(e) => setWithdrawalAmount(Number(e.target.value))}
                  placeholder="Введите сумму"
                />
                {amountError && (
                  <p className="text-sm text-mp-error-text">{amountError}</p>
                )}
              </div>

              {withdrawalAmount > 0 && (
                <TaxPreviewInline
                  amount={withdrawalAmount}
                  taxStatus={withdrawalTaxStatus}
                />
              )}
            </CardContent>
          </>
        )}

        {withdrawalStep === 'tax' && (
          <TaxCalculator
            amount={withdrawalAmount}
            taxStatus={withdrawalTaxStatus}
            taxCalculation={taxCalculation}
            isLoading={isTaxLoading}
            onTaxStatusChange={setWithdrawalTaxStatus}
          />
        )}

        {withdrawalStep === 'payment' && (
          <PaymentDetailsStep
            details={withdrawalPaymentDetails}
            onDetailsChange={setWithdrawalPaymentDetails}
          />
        )}

        {withdrawalStep === 'confirm' && (
          <>
            <CardHeader>
              <CardTitle>Подтверждение</CardTitle>
              <CardDescription>
                Проверьте данные перед отправкой заявки
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-mp-text-secondary">Сумма вывода</span>
                  <span className="font-medium">{formatCurrency(withdrawalAmount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-mp-text-secondary">Налоговый статус</span>
                  <span className="font-medium">{TAX_STATUS_LABELS[withdrawalTaxStatus]}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-mp-text-secondary">Налог</span>
                  <span className="text-mp-error-text">
                    -{formatCurrency(Math.round(withdrawalAmount * TAX_RATES[withdrawalTaxStatus]))}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-mp-text-secondary">Способ получения</span>
                  <span className="font-medium">
                    {withdrawalPaymentDetails?.type === 'card' ? 'Карта' : 'Банковский счёт'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-mp-text-secondary">Реквизиты</span>
                  <span className="font-medium">
                    {withdrawalPaymentDetails?.cardNumber || withdrawalPaymentDetails?.bankAccount}
                  </span>
                </div>
                <div className="flex justify-between py-2 pt-4 border-t-2">
                  <span className="font-medium">К выплате</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {formatCurrency(
                      withdrawalAmount - Math.round(withdrawalAmount * TAX_RATES[withdrawalTaxStatus])
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* Navigation buttons */}
        <Separator />
        <CardContent className="pt-4">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevWithdrawalStep}
              disabled={withdrawalStep === 'amount'}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>

            {withdrawalStep === 'confirm' ? (
              <Button
                variant="gradient"
                onClick={handleSubmit}
                disabled={createWithdrawal.isPending}
              >
                {createWithdrawal.isPending ? 'Отправка...' : 'Подтвердить'}
              </Button>
            ) : (
              <Button
                onClick={nextWithdrawalStep}
                disabled={!canProceed}
              >
                Далее
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}

/**
 * Payment details step component
 */
interface PaymentDetailsStepProps {
  details: PaymentDetails | null;
  onDetailsChange: (details: PaymentDetails | null) => void;
}

function PaymentDetailsStep({ details, onDetailsChange }: PaymentDetailsStepProps) {
  const [type, setType] = React.useState<'card' | 'bank_account'>(details?.type || 'card');
  const [cardNumber, setCardNumber] = React.useState(details?.cardNumber || '');
  const [bankAccount, setBankAccount] = React.useState(details?.bankAccount || '');
  const [bankName, setBankName] = React.useState(details?.bankName || '');
  const [bik, setBik] = React.useState(details?.bik || '');
  const [recipientName, setRecipientName] = React.useState(details?.recipientName || '');

  React.useEffect(() => {
    if (recipientName) {
      const newDetails: PaymentDetails = {
        type,
        recipientName,
        ...(type === 'card'
          ? { cardNumber }
          : { bankAccount, bankName, bik }),
      };
      onDetailsChange(newDetails);
    } else {
      onDetailsChange(null);
    }
  }, [type, cardNumber, bankAccount, bankName, bik, recipientName, onDetailsChange]);

  return (
    <>
      <CardHeader>
        <CardTitle>Платёжные реквизиты</CardTitle>
        <CardDescription>
          Укажите реквизиты для получения средств
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment type selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('card')}
            className={`p-4 rounded-lg border text-left transition-colors ${
              type === 'card'
                ? 'border-mp-accent-primary bg-mp-accent-primary/10'
                : 'border-mp-border hover:border-mp-text-secondary'
            }`}
          >
            <CreditCard className={`h-5 w-5 mb-2 ${type === 'card' ? 'text-mp-accent-primary' : 'text-mp-text-secondary'}`} />
            <p className="font-medium">Банковская карта</p>
            <p className="text-xs text-mp-text-secondary">Visa, MasterCard, МИР</p>
          </button>
          <button
            type="button"
            onClick={() => setType('bank_account')}
            className={`p-4 rounded-lg border text-left transition-colors ${
              type === 'bank_account'
                ? 'border-mp-accent-primary bg-mp-accent-primary/10'
                : 'border-mp-border hover:border-mp-text-secondary'
            }`}
          >
            <Buildings className={`h-5 w-5 mb-2 ${type === 'bank_account' ? 'text-mp-accent-primary' : 'text-mp-text-secondary'}`} />
            <p className="font-medium">Банковский счёт</p>
            <p className="text-xs text-mp-text-secondary">Расчётный счёт</p>
          </button>
        </div>

        {/* Card fields */}
        {type === 'card' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Номер карты</Label>
              <Input
                id="card-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
            </div>
          </div>
        )}

        {/* Bank account fields */}
        {type === 'bank_account' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank-account">Номер счёта</Label>
              <Input
                id="bank-account"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, '').slice(0, 20))}
                placeholder="40702810000000000000"
                maxLength={20}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank-name">Название банка</Label>
                <Input
                  id="bank-name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Сбербанк"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bik">БИК</Label>
                <Input
                  id="bik"
                  value={bik}
                  onChange={(e) => setBik(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="044525225"
                  maxLength={9}
                />
              </div>
            </div>
          </div>
        )}

        {/* Recipient name */}
        <div className="space-y-2">
          <Label htmlFor="recipient-name">ФИО получателя</Label>
          <Input
            id="recipient-name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Иванов Иван Иванович"
          />
        </div>
      </CardContent>
    </>
  );
}
