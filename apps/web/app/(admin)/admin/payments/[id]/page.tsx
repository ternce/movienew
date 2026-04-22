'use client';

import {
  ArrowLeft,
  Copy,
  CreditCard,
  Calendar,
  User,
  Hash,
  FileText,
  CurrencyDollar,
  Gift,
  Globe,
  ArrowCounterClockwise,
  Warning,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminTransaction,
  useRefundTransaction,
} from '@/hooks/use-admin-payments';

// ============ Helpers ============

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    maximumFractionDigits: 2,
  }).format(amount) + ' \u20BD';
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

const typeConfig: Record<string, { label: string; className: string }> = {
  SUBSCRIPTION: { label: 'Подписка', className: 'bg-blue-500/20 text-blue-400' },
  STORE: { label: 'Магазин', className: 'bg-green-500/20 text-green-400' },
  BONUS_PURCHASE: { label: 'Бонус', className: 'bg-purple-500/20 text-purple-400' },
  WITHDRAWAL: { label: 'Вывод', className: 'bg-orange-500/20 text-orange-400' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Ожидание', className: 'bg-yellow-500/20 text-yellow-400' },
  PROCESSING: { label: 'Обработка', className: 'bg-blue-500/20 text-blue-400' },
  COMPLETED: { label: 'Завершено', className: 'bg-green-500/20 text-green-400' },
  FAILED: { label: 'Ошибка', className: 'bg-red-500/20 text-red-400' },
  REFUNDED: { label: 'Возврат', className: 'bg-orange-500/20 text-orange-400' },
  CANCELLED: { label: 'Отменено', className: 'bg-gray-500/20 text-gray-400' },
};

// ============ Page Component ============

export default function AdminPaymentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: transaction, isLoading } = useAdminTransaction(id);
  const refundMutation = useRefundTransaction();

  // Loading state
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
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    );
  }

  // Not found
  if (!transaction) {
    return (
      <Container size="xl" className="py-8">
        <Card className="py-12 text-center">
          <p className="text-mp-text-secondary">Транзакция не найдена</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/payments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться к списку
            </Link>
          </Button>
        </Card>
      </Container>
    );
  }

  const typeInfo = typeConfig[transaction.type] || { label: transaction.type, className: 'bg-gray-500/20 text-gray-400' };
  const statusInfo = statusConfig[transaction.status] || { label: transaction.status, className: 'bg-gray-500/20 text-gray-400' };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован`);
  };

  return (
    <Container size="xl" className="py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/payments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title="Детали транзакции"
        description={`ID: ${transaction.id}`}
        breadcrumbItems={[
          { label: 'Платежи', href: '/admin/payments' },
          { label: `Транзакция ${transaction.id.slice(0, 8)}...` },
        ]}
      >
        {transaction.status === 'COMPLETED' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <ArrowCounterClockwise className="mr-2 h-4 w-4" />
                Возврат
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Подтверждение возврата</DialogTitle>
                <DialogDescription>
                  Вы уверены, что хотите выполнить возврат для этой транзакции?
                  Сумма: {formatCurrency(transaction.amount)}. Это действие нельзя отменить.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 rounded-lg border border-mp-error-bg bg-mp-error-bg/30 p-3">
                <Warning className="h-5 w-5 text-mp-error-text shrink-0" />
                <p className="text-sm text-mp-error-text">
                  Средства будут возвращены пользователю. Связанные подписки или товары будут отменены.
                </p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Отмена</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => refundMutation.mutate(transaction.id)}
                  disabled={refundMutation.isPending}
                >
                  {refundMutation.isPending ? 'Обработка...' : 'Подтвердить возврат'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AdminPageHeader>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transaction details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Информация о транзакции</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow
                icon={Hash}
                label="ID транзакции"
                value={transaction.id}
                copyable
                onCopy={() => copyToClipboard(transaction.id, 'ID')}
              />
              <DetailRow
                icon={User}
                label="Email пользователя"
                value={transaction.userEmail}
                copyable
                onCopy={() => copyToClipboard(transaction.userEmail, 'Email')}
              />
              <DetailRow
                icon={FileText}
                label="Тип"
                value={
                  <Badge className={typeInfo.className}>
                    {typeInfo.label}
                  </Badge>
                }
              />
              <DetailRow
                icon={CurrencyDollar}
                label="Сумма"
                value={
                  <span className="text-lg font-bold text-mp-text-primary">
                    {formatCurrency(transaction.amount)}
                  </span>
                }
              />
              <DetailRow
                icon={Globe}
                label="Валюта"
                value={transaction.currency || 'RUB'}
              />
              {transaction.bonusUsed > 0 && (
                <DetailRow
                  icon={Gift}
                  label="Бонусы использованы"
                  value={formatCurrency(transaction.bonusUsed)}
                />
              )}
              <DetailRow
                icon={CreditCard}
                label="Способ оплаты"
                value={transaction.paymentMethod || 'Не указан'}
              />
              {transaction.externalId && (
                <DetailRow
                  icon={Hash}
                  label="Внешний ID"
                  value={transaction.externalId}
                  copyable
                  onCopy={() => copyToClipboard(transaction.externalId!, 'Внешний ID')}
                />
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Метаданные</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto rounded-lg bg-mp-surface p-4 text-sm text-mp-text-secondary font-mono max-h-64">
                  {JSON.stringify(transaction.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статус</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`${statusInfo.className} text-sm px-3 py-1`}>
                {statusInfo.label}
              </Badge>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Даты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-mp-text-secondary" />
                <div>
                  <div className="text-sm text-mp-text-secondary">Создано</div>
                  <div className="text-mp-text-primary">{formatDate(transaction.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-mp-text-secondary" />
                <div>
                  <div className="text-sm text-mp-text-secondary">Обновлено</div>
                  <div className="text-mp-text-primary">{formatDate(transaction.updatedAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}

// ============ Detail Row Component ============

interface DetailRowProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
  onCopy?: () => void;
}

function DetailRow({ icon: Icon, label, value, copyable, onCopy }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-1 text-mp-text-secondary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-mp-text-secondary">{label}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {typeof value === 'string' ? (
            <span className="text-mp-text-primary font-mono text-sm break-all">
              {value}
            </span>
          ) : (
            value
          )}
          {copyable && onCopy && (
            <button
              onClick={onCopy}
              className="text-mp-text-secondary hover:text-mp-text-primary transition-colors shrink-0"
              title="Копировать"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
