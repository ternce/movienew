'use client';

import {
  Warning,
  ArrowLeft,
  ArrowRight,
  Money,
  BuildingOffice,
  Check,
  CreditCard,
  SpinnerGap,
  User,
  Wallet,
} from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  useBonus,
  useWithdrawalPreview,
  useWithdrawBonus,
  formatBonusAmount,
} from '@/hooks/use-bonus';
import { useBonusStore, bonusSelectors } from '@/stores/bonus.store';

/**
 * Tax status options
 */
type TaxStatus = 'INDIVIDUAL' | 'SELF_EMPLOYED' | 'ENTREPRENEUR' | 'COMPANY';

const taxStatusOptions: {
  value: TaxStatus;
  label: string;
  description: string;
  rate: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'INDIVIDUAL',
    label: 'Физическое лицо',
    description: 'Стандартный налог на доходы физических лиц',
    rate: '13%',
    icon: User,
  },
  {
    value: 'SELF_EMPLOYED',
    label: 'Самозанятый',
    description: 'Налог на профессиональный доход',
    rate: '4%',
    icon: Money,
  },
  {
    value: 'ENTREPRENEUR',
    label: 'Индивидуальный предприниматель',
    description: 'Упрощённая система налогообложения',
    rate: '6%',
    icon: CreditCard,
  },
  {
    value: 'COMPANY',
    label: 'Юридическое лицо',
    description: 'Компания или организация',
    rate: '6%',
    icon: BuildingOffice,
  },
];

/**
 * Multi-step bonus withdrawal form
 */
interface BonusWithdrawalFormProps {
  className?: string;
  onComplete?: (withdrawalId: string) => void;
  onCancel?: () => void;
}

export function BonusWithdrawalForm({
  className,
  onComplete,
  onCancel,
}: BonusWithdrawalFormProps) {
  const { balance, rate } = useBonus();

  const {
    withdrawalStep,
    withdrawalAmount,
    taxStatus,
    paymentDetails,
    previewData,
    error,
    setWithdrawalStep,
    setWithdrawalAmount,
    setTaxStatus,
    setPaymentDetails,
    setPreviewData,
    setWithdrawalId,
    setWithdrawalError,
    nextWithdrawalStep,
    prevWithdrawalStep,
    resetWithdrawal,
  } = useBonusStore();

  const { data: preview, isLoading: isLoadingPreview } = useWithdrawalPreview(
    withdrawalAmount,
    taxStatus
  );

  const withdrawMutation = useWithdrawBonus();

  // Update preview data when it changes
  React.useEffect(() => {
    if (preview) {
      setPreviewData({
        currencyAmount: preview.currencyAmount,
        rate: preview.rate,
        estimatedTax: preview.estimatedTax,
        estimatedNet: preview.estimatedNet,
        taxRate: preview.taxRate,
      });
    }
  }, [preview, setPreviewData]);

  const canProceed = bonusSelectors.canProceedWithdrawal(
    {
      withdrawalStep,
      withdrawalAmount,
      taxStatus,
      paymentDetails,
      previewData,
      withdrawalId: null,
      error: null,
    },
    balance
  );

  const handleSubmit = async () => {
    setWithdrawalStep('processing');
    setWithdrawalError(null);

    try {
      const result = await withdrawMutation.mutateAsync({
        amount: withdrawalAmount,
        taxStatus,
        paymentDetails,
      });

      if (result.success && result.withdrawalId) {
        setWithdrawalId(result.withdrawalId);
        setWithdrawalStep('complete');
        onComplete?.(result.withdrawalId);
      } else {
        setWithdrawalError(result.message || 'Ошибка при создании заявки');
        setWithdrawalStep('confirm');
      }
    } catch (err) {
      setWithdrawalError(
        err instanceof Error ? err.message : 'Произошла ошибка'
      );
      setWithdrawalStep('confirm');
    }
  };

  const handleCancel = () => {
    resetWithdrawal();
    onCancel?.();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress indicator */}
      <StepIndicator currentStep={withdrawalStep} />

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {withdrawalStep === 'amount' && (
            <AmountStep
              balance={balance}
              amount={withdrawalAmount}
              rate={rate}
              onAmountChange={setWithdrawalAmount}
            />
          )}

          {withdrawalStep === 'tax' && (
            <TaxStatusStep
              selectedStatus={taxStatus}
              onStatusChange={setTaxStatus}
            />
          )}

          {withdrawalStep === 'details' && (
            <PaymentDetailsStep
              details={paymentDetails}
              onDetailsChange={setPaymentDetails}
            />
          )}

          {withdrawalStep === 'confirm' && (
            <ConfirmationStep
              amount={withdrawalAmount}
              taxStatus={taxStatus}
              paymentDetails={paymentDetails}
              preview={previewData}
              isLoadingPreview={isLoadingPreview}
              error={error}
            />
          )}

          {withdrawalStep === 'processing' && <ProcessingStep />}

          {withdrawalStep === 'complete' && (
            <CompleteStep
              amount={withdrawalAmount}
              netAmount={previewData?.estimatedNet ?? 0}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      {withdrawalStep !== 'processing' && withdrawalStep !== 'complete' && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={withdrawalStep === 'amount' ? handleCancel : prevWithdrawalStep}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {withdrawalStep === 'amount' ? 'Отмена' : 'Назад'}
          </Button>

          {withdrawalStep === 'confirm' ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed || withdrawMutation.isPending}
            >
              {withdrawMutation.isPending && (
                <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
              )}
              Подтвердить вывод
            </Button>
          ) : (
            <Button onClick={nextWithdrawalStep} disabled={!canProceed}>
              Далее
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {withdrawalStep === 'complete' && (
        <div className="flex justify-center">
          <Button onClick={resetWithdrawal}>Новый вывод</Button>
        </div>
      )}
    </div>
  );
}

/**
 * Step indicator
 */
const steps = [
  { key: 'amount', label: 'Сумма' },
  { key: 'tax', label: 'Статус' },
  { key: 'details', label: 'Реквизиты' },
  { key: 'confirm', label: 'Подтверждение' },
];

function StepIndicator({ currentStep }: { currentStep: string }) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  const isComplete = currentStep === 'complete';
  const isProcessing = currentStep === 'processing';

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isPast = index < currentIndex || isComplete;
        const isFuture = index > currentIndex && !isComplete;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  isActive && 'bg-mp-accent-primary text-white',
                  isPast && 'bg-green-500 text-white',
                  isFuture && 'bg-mp-surface text-mp-text-disabled'
                )}
              >
                {isPast ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  'mt-1 text-xs',
                  isActive && 'text-mp-accent-primary',
                  isPast && 'text-green-400',
                  isFuture && 'text-mp-text-disabled'
                )}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2',
                  index < currentIndex || isComplete
                    ? 'bg-green-500'
                    : 'bg-mp-surface'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Step 1: Amount selection
 */
function AmountStep({
  balance,
  amount,
  rate,
  onAmountChange,
}: {
  balance: number;
  amount: number;
  rate: number;
  onAmountChange: (amount: number) => void;
}) {
  const minAmount = 1000;
  const maxAmount = balance;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-mp-text-primary">
          Выберите сумму для вывода
        </h3>
        <p className="mt-1 text-sm text-mp-text-secondary">
          Доступно: {formatBonusAmount(balance)} ₽ бонусов
        </p>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <Input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(Number(e.target.value))}
            min={minAmount}
            max={maxAmount}
            className="mx-auto w-48 text-center text-2xl font-bold"
          />
          <span className="text-mp-text-secondary">₽ бонусов</span>
        </div>

        <Slider
          value={[amount]}
          min={minAmount}
          max={maxAmount}
          step={100}
          onValueChange={([value]) => onAmountChange(value)}
          className="py-4"
        />

        <div className="flex justify-between text-sm text-mp-text-secondary">
          <span>Мин: {formatBonusAmount(minAmount)} ₽</span>
          <span>Макс: {formatBonusAmount(maxAmount)} ₽</span>
        </div>

        {amount < minAmount && (
          <p className="text-center text-sm text-red-400">
            Минимальная сумма для вывода: {formatBonusAmount(minAmount)} ₽
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Step 2: Tax status selection
 */
function TaxStatusStep({
  selectedStatus,
  onStatusChange,
}: {
  selectedStatus: TaxStatus;
  onStatusChange: (status: TaxStatus) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-mp-text-primary">
          Выберите налоговый статус
        </h3>
        <p className="mt-1 text-sm text-mp-text-secondary">
          От статуса зависит размер удерживаемого налога
        </p>
      </div>

      <RadioGroup
        value={selectedStatus}
        onValueChange={(value) => onStatusChange(value as TaxStatus)}
        className="space-y-3"
      >
        {taxStatusOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Label
              key={option.value}
              htmlFor={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors',
                selectedStatus === option.value
                  ? 'border-mp-accent-primary bg-mp-accent-primary/5'
                  : 'border-mp-border hover:border-mp-border/80 hover:bg-mp-surface/50'
              )}
            >
              <RadioGroupItem value={option.value} id={option.value} />
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mp-surface">
                <Icon className="h-5 w-5 text-mp-text-secondary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-mp-text-primary">
                  {option.label}
                </p>
                <p className="text-sm text-mp-text-secondary">
                  {option.description}
                </p>
              </div>
              <span className="text-lg font-semibold text-mp-accent-secondary">
                {option.rate}
              </span>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}

/**
 * Step 3: Payment details
 */
interface PaymentDetails {
  bankName?: string;
  accountNumber?: string;
  bik?: string;
  cardNumber?: string;
}

function PaymentDetailsStep({
  details,
  onDetailsChange,
}: {
  details: PaymentDetails;
  onDetailsChange: (details: Partial<PaymentDetails>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-mp-text-primary">
          Введите реквизиты для перевода
        </h3>
        <p className="mt-1 text-sm text-mp-text-secondary">
          Укажите банковские реквизиты для получения средств
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bankName">Название банка</Label>
          <Input
            id="bankName"
            value={details.bankName ?? ''}
            onChange={(e) => onDetailsChange({ bankName: e.target.value })}
            placeholder="Сбербанк"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountNumber">Расчётный счёт</Label>
          <Input
            id="accountNumber"
            value={details.accountNumber ?? ''}
            onChange={(e) => onDetailsChange({ accountNumber: e.target.value })}
            placeholder="40817810000000000000"
            maxLength={20}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bik">БИК</Label>
          <Input
            id="bik"
            value={details.bik ?? ''}
            onChange={(e) => onDetailsChange({ bik: e.target.value })}
            placeholder="044525225"
            maxLength={9}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardNumber">Номер карты (опционально)</Label>
          <Input
            id="cardNumber"
            value={details.cardNumber ?? ''}
            onChange={(e) => onDetailsChange({ cardNumber: e.target.value })}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Step 4: Confirmation
 */
function ConfirmationStep({
  amount,
  taxStatus,
  paymentDetails,
  preview,
  isLoadingPreview,
  error,
}: {
  amount: number;
  taxStatus: TaxStatus;
  paymentDetails: {
    bankName?: string;
    accountNumber?: string;
    bik?: string;
  };
  preview: {
    currencyAmount: number;
    rate: number;
    estimatedTax: number;
    estimatedNet: number;
    taxRate: number;
  } | null;
  isLoadingPreview: boolean;
  error: string | null;
}) {
  const taxOption = taxStatusOptions.find((o) => o.value === taxStatus);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-mp-text-primary">
          Проверьте данные
        </h3>
        <p className="mt-1 text-sm text-mp-text-secondary">
          Убедитесь, что всё верно перед подтверждением
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-red-400">
          <Warning className="h-4 w-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Amount summary */}
        <div className="rounded-lg border border-mp-border bg-mp-surface/50 p-4">
          <h4 className="mb-3 font-medium text-mp-text-primary">
            Сумма вывода
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-mp-text-secondary">Бонусов</span>
              <span className="font-medium">{formatBonusAmount(amount)} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mp-text-secondary">Курс конвертации</span>
              <span className="font-medium">1:1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mp-text-secondary">
                Налог ({taxOption?.rate})
              </span>
              <span className="font-medium text-red-400">
                −{formatBonusAmount(preview?.estimatedTax ?? 0)} ₽
              </span>
            </div>
            <div className="border-t border-mp-border pt-2">
              <div className="flex justify-between">
                <span className="font-medium text-mp-text-primary">
                  К получению
                </span>
                <span className="text-lg font-bold text-green-400">
                  {isLoadingPreview ? (
                    '...'
                  ) : (
                    `${formatBonusAmount(preview?.estimatedNet ?? 0)} ₽`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment details summary */}
        <div className="rounded-lg border border-mp-border bg-mp-surface/50 p-4">
          <h4 className="mb-3 font-medium text-mp-text-primary">Реквизиты</h4>
          <div className="space-y-2 text-sm">
            {paymentDetails.bankName && (
              <div className="flex justify-between">
                <span className="text-mp-text-secondary">Банк</span>
                <span className="font-medium">{paymentDetails.bankName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-mp-text-secondary">Счёт</span>
              <span className="font-mono font-medium">
                {paymentDetails.accountNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-mp-text-secondary">БИК</span>
              <span className="font-mono font-medium">
                {paymentDetails.bik}
              </span>
            </div>
          </div>
        </div>

        {/* Tax status */}
        <div className="rounded-lg border border-mp-border bg-mp-surface/50 p-4">
          <h4 className="mb-1 font-medium text-mp-text-primary">
            Налоговый статус
          </h4>
          <p className="text-sm text-mp-text-secondary">{taxOption?.label}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Processing step
 */
function ProcessingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <SpinnerGap className="h-12 w-12 animate-spin text-mp-accent-primary" />
      <p className="mt-4 text-lg font-medium text-mp-text-primary">
        Обработка заявки...
      </p>
      <p className="mt-1 text-sm text-mp-text-secondary">
        Пожалуйста, подождите
      </p>
    </div>
  );
}

/**
 * Complete step
 */
function CompleteStep({
  amount,
  netAmount,
}: {
  amount: number;
  netAmount: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
        <Check className="h-8 w-8 text-green-400" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-mp-text-primary">
        Заявка создана!
      </h3>
      <p className="mt-2 text-center text-mp-text-secondary">
        Заявка на вывод {formatBonusAmount(amount)} ₽ бонусов принята.
        <br />
        Вы получите {formatBonusAmount(netAmount)} ₽ на указанные реквизиты.
      </p>
      <p className="mt-4 text-sm text-mp-text-secondary">
        Обычно вывод обрабатывается в течение 3-5 рабочих дней.
      </p>
    </div>
  );
}
