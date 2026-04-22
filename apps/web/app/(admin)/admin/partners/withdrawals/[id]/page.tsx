'use client';

import { ArrowLeft, CreditCard, Buildings, User, Calendar } from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { WithdrawalActions } from '@/components/admin/partners';
import { WithdrawalStatusBadge } from '@/components/partner';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminWithdrawalDetail,
  useApproveWithdrawal,
  useRejectWithdrawal,
  useCompleteWithdrawal,
} from '@/hooks/use-admin-partner';

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
 * Format date
 */
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Tax status labels
 */
const TAX_STATUS_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Физическое лицо (13%)',
  SELF_EMPLOYED: 'Самозанятый (4%)',
  ENTREPRENEUR: 'ИП (6%)',
  COMPANY: 'Юрлицо (0%)',
};

/**
 * Admin withdrawal detail page
 */
export default function AdminWithdrawalDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: withdrawal, isLoading } = useAdminWithdrawalDetail(id);

  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();
  const completeWithdrawal = useCompleteWithdrawal();

  const handleApprove = () => {
    approveWithdrawal.mutate(id);
  };

  const handleReject = (reason: string) => {
    rejectWithdrawal.mutate({ id, reason });
  };

  const handleComplete = () => {
    completeWithdrawal.mutate(id);
  };

  if (isLoading) {
    return (
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    );
  }

  if (!withdrawal) {
    return (
      <Container size="xl" className="py-8">
        <Card className="py-12 text-center">
          <p className="text-mp-text-secondary">Заявка не найдена</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/partners/withdrawals">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться к списку
            </Link>
          </Button>
        </Card>
      </Container>
    );
  }

  const PaymentIcon = withdrawal.paymentDetails.type === 'card' ? CreditCard : Buildings;

  return (
    <Container size="xl" className="py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/partners/withdrawals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title={`Заявка #${withdrawal.id.slice(0, 8)}`}
        description={`Создана ${formatDate(withdrawal.createdAt)}`}
      >
        <WithdrawalStatusBadge status={withdrawal.status} />
      </AdminPageHeader>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Сумма</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-sm text-mp-text-secondary">Запрошено</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(withdrawal.amount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-mp-text-secondary">Налог ({(withdrawal.taxRate * 100).toFixed(0)}%)</div>
                  <div className="text-xl font-medium text-mp-error-text">
                    -{formatCurrency(withdrawal.taxAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-mp-text-secondary">К выплате</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(withdrawal.netAmount)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Пользователь
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-mp-text-secondary">Имя</div>
                  <div className="font-medium">
                    {withdrawal.user.firstName} {withdrawal.user.lastName}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-mp-text-secondary">Email</div>
                  <div className="font-medium">{withdrawal.user.email}</div>
                </div>
                <div>
                  <div className="text-sm text-mp-text-secondary">Реферальный код</div>
                  <div className="font-mono text-mp-text-secondary">
                    {withdrawal.user.referralCode}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-mp-text-secondary">Налоговый статус</div>
                  <div className="font-medium">
                    {TAX_STATUS_LABELS[withdrawal.taxStatus] || withdrawal.taxStatus}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PaymentIcon className="h-4 w-4" />
                Реквизиты для выплаты
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawal.paymentDetails.type === 'card' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-sm text-mp-text-secondary">Номер карты</div>
                    <div className="font-mono font-medium">
                      {withdrawal.paymentDetails.cardNumber}
                    </div>
                  </div>
                  {withdrawal.paymentDetails.cardHolder && (
                    <div>
                      <div className="text-sm text-mp-text-secondary">Держатель карты</div>
                      <div className="font-medium">
                        {withdrawal.paymentDetails.cardHolder}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-sm text-mp-text-secondary">Расчётный счёт</div>
                    <div className="font-mono font-medium">
                      {withdrawal.paymentDetails.bankAccount}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-mp-text-secondary">БИК</div>
                    <div className="font-mono font-medium">
                      {withdrawal.paymentDetails.bik}
                    </div>
                  </div>
                  {withdrawal.paymentDetails.bankName && (
                    <div className="sm:col-span-2">
                      <div className="text-sm text-mp-text-secondary">Банк</div>
                      <div className="font-medium">
                        {withdrawal.paymentDetails.bankName}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rejection reason */}
          {withdrawal.rejectionReason && (
            <Card className="border-mp-error-text/30 bg-mp-error-bg/30">
              <CardHeader>
                <CardTitle className="text-lg text-mp-error-text">
                  Причина отклонения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-mp-text-primary">{withdrawal.rejectionReason}</p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                История
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-mp-text-secondary" />
                  <div>
                    <div className="text-sm font-medium">Заявка создана</div>
                    <div className="text-xs text-mp-text-secondary">
                      {formatDate(withdrawal.createdAt)}
                    </div>
                  </div>
                </div>

                {withdrawal.status !== 'PENDING' && withdrawal.processedAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                    <div>
                      <div className="text-sm font-medium">
                        {withdrawal.status === 'REJECTED' ? 'Отклонена' : 'Одобрена'}
                      </div>
                      <div className="text-xs text-mp-text-secondary">
                        {formatDate(withdrawal.processedAt)}
                        {withdrawal.processedBy && (
                          <span className="ml-2">
                            Администратор: {withdrawal.processedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {withdrawal.status === 'COMPLETED' && withdrawal.completedAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                    <div>
                      <div className="text-sm font-medium">Выплачена</div>
                      <div className="text-xs text-mp-text-secondary">
                        {formatDate(withdrawal.completedAt)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <WithdrawalActions
            withdrawal={withdrawal}
            onApprove={handleApprove}
            onReject={handleReject}
            onComplete={handleComplete}
            isApproving={approveWithdrawal.isPending}
            isRejecting={rejectWithdrawal.isPending}
            isCompleting={completeWithdrawal.isPending}
          />

          {/* Quick info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-mp-text-secondary">ID заявки</span>
                <span className="font-mono">{withdrawal.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mp-text-secondary">Способ</span>
                <span>{withdrawal.paymentDetails.type === 'card' ? 'Карта' : 'Счёт'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mp-text-secondary">Налог</span>
                <span>{(withdrawal.taxRate * 100).toFixed(0)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Partner link */}
          <Card>
            <CardContent className="p-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/partners/${withdrawal.user.id}`}>
                  <User className="mr-2 h-4 w-4" />
                  Профиль партнёра
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
