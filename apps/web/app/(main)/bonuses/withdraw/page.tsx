'use client';

import { ArrowLeft, Wallet, WarningCircle, Question, Info } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { BonusWithdrawalForm } from '@/components/bonus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import { useBonus, formatBonusAmount } from '@/hooks/use-bonus';
import { useBonusStore } from '@/stores/bonus.store';

const MIN_WITHDRAWAL_AMOUNT = 1000;

/**
 * Bonus withdrawal page
 */
export default function BonusWithdrawPage() {
  const router = useRouter();
  const { balance, rate, isLoading } = useBonus();
  const { resetWithdrawal } = useBonusStore();

  // Reset withdrawal state on mount
  React.useEffect(() => {
    resetWithdrawal();
  }, [resetWithdrawal]);

  const canWithdraw = balance >= MIN_WITHDRAWAL_AMOUNT;

  const handleComplete = (withdrawalId: string) => {
    // Optional: redirect or show success message
  };

  const handleCancel = () => {
    router.push('/bonuses');
  };

  return (
    <Container size="lg" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/bonuses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к бонусам
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <Wallet className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Вывод бонусов
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Конвертируйте бонусы в рубли и переводите на банковский счёт
        </p>
      </div>

      {/* Balance info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {isLoading ? (
              <>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-8 w-32" />
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-mp-text-secondary">
                    Доступно для вывода
                  </p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {formatBonusAmount(balance)} ₽
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-mp-text-secondary">
                    Курс конвертации
                  </p>
                  <p className="text-lg font-medium text-mp-text-primary">
                    1 бонус = {rate} ₽
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Can't withdraw message */}
      {!isLoading && !canWithdraw && (
        <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <WarningCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-mp-text-primary">
                  Недостаточно бонусов для вывода
                </p>
                <p className="mt-1 text-sm text-mp-text-secondary">
                  Минимальная сумма для вывода:{' '}
                  <span className="font-medium">
                    {formatBonusAmount(MIN_WITHDRAWAL_AMOUNT)} ₽
                  </span>
                  . Вам не хватает{' '}
                  <span className="font-medium text-yellow-400">
                    {formatBonusAmount(MIN_WITHDRAWAL_AMOUNT - balance)} ₽
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal form */}
      {canWithdraw && (
        <BonusWithdrawalForm
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      )}

      {/* Information cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-blue-400" />
              Как работает вывод
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-mp-text-secondary">
              <li className="flex gap-2">
                <span className="font-medium text-mp-accent-secondary">1.</span>
                Выберите сумму для вывода (от {formatBonusAmount(MIN_WITHDRAWAL_AMOUNT)} ₽)
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-mp-accent-secondary">2.</span>
                Укажите ваш налоговый статус для расчёта удержания
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-mp-accent-secondary">3.</span>
                Введите банковские реквизиты для перевода
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-mp-accent-secondary">4.</span>
                Подтвердите заявку и ожидайте перевод
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Question className="h-4 w-4 text-purple-400" />
              Часто задаваемые вопросы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-mp-text-primary">
                  Сколько времени занимает вывод?
                </p>
                <p className="text-mp-text-secondary">
                  Обычно 3-5 рабочих дней после одобрения заявки.
                </p>
              </div>
              <div>
                <p className="font-medium text-mp-text-primary">
                  Какой минимум для вывода?
                </p>
                <p className="text-mp-text-secondary">
                  Минимальная сумма: {formatBonusAmount(MIN_WITHDRAWAL_AMOUNT)} ₽
                </p>
              </div>
              <div>
                <p className="font-medium text-mp-text-primary">
                  Какие налоги удерживаются?
                </p>
                <p className="text-mp-text-secondary">
                  Зависит от вашего статуса: от 4% (самозанятые) до 13% (физлица).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
