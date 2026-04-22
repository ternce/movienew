'use client';

import { Copy, Check, BuildingOffice, FileText, WarningCircle } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { BankDetails } from '@/types';

interface BankTransferDetailsProps {
  bankDetails: BankDetails;
  amount: number;
  invoiceNumber?: string;
  onDownloadInvoice?: () => void;
  className?: string;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Detail row component with copy functionality
 */
function DetailRow({
  label,
  value,
  canCopy = true,
}: {
  label: string;
  value: string;
  canCopy?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="space-y-1">
        <span className="text-xs text-mp-text-disabled uppercase tracking-wider">
          {label}
        </span>
        <p className="font-mono text-sm text-mp-text-primary break-all">{value}</p>
      </div>
      {canCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="shrink-0 text-mp-text-secondary hover:text-mp-text-primary"
        >
          {copied ? (
            <Check className="h-4 w-4 text-mp-success-text" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}

export function BankTransferDetails({
  bankDetails,
  amount,
  invoiceNumber,
  onDownloadInvoice,
  className,
}: BankTransferDetailsProps) {
  const [allCopied, setAllCopied] = React.useState(false);

  const handleCopyAll = async () => {
    const text = `
Банк: ${bankDetails.bankName}
БИК: ${bankDetails.bik}
Расчётный счёт: ${bankDetails.accountNumber}
Получатель: ${bankDetails.recipientName}
ИНН: ${bankDetails.inn}
КПП: ${bankDetails.kpp}
Сумма: ${formatCurrency(amount)}
${invoiceNumber ? `Номер счёта: ${invoiceNumber}` : ''}
    `.trim();

    try {
      await navigator.clipboard.writeText(text);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mp-accent-primary/10">
            <BuildingOffice className="h-6 w-6 text-mp-accent-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-mp-text-primary">
              Банковский перевод
            </h3>
            <p className="text-sm text-mp-text-secondary">
              Реквизиты для оплаты
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyAll}
          leftIcon={allCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        >
          {allCopied ? 'Скопировано' : 'Копировать всё'}
        </Button>
      </div>

      {/* Amount and invoice */}
      <div className="rounded-lg bg-mp-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-mp-text-secondary">Сумма к оплате</span>
          <span className="text-xl font-bold text-mp-text-primary">
            {formatCurrency(amount)}
          </span>
        </div>
        {invoiceNumber && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-mp-text-secondary">Номер счёта</span>
              <span className="font-mono text-sm text-mp-text-primary">
                {invoiceNumber}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Bank details */}
      <div className="rounded-lg border border-mp-border bg-mp-bg-secondary">
        <DetailRow label="Наименование банка" value={bankDetails.bankName} />
        <Separator />
        <DetailRow label="БИК" value={bankDetails.bik} />
        <Separator />
        <DetailRow label="Расчётный счёт" value={bankDetails.accountNumber} />
        <Separator />
        <DetailRow label="Получатель" value={bankDetails.recipientName} />
        <Separator />
        <DetailRow label="ИНН" value={bankDetails.inn} />
        <Separator />
        <DetailRow label="КПП" value={bankDetails.kpp} />
      </div>

      {/* Download invoice button */}
      {onDownloadInvoice && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onDownloadInvoice}
          leftIcon={<FileText className="h-4 w-4" />}
        >
          Скачать счёт на оплату
        </Button>
      )}

      {/* Important notice */}
      <div className="flex items-start gap-3 rounded-lg bg-mp-warning-bg/30 p-4">
        <WarningCircle className="h-5 w-5 shrink-0 text-mp-warning-text" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-mp-warning-text">
            Важная информация
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-mp-text-secondary">
            <li>
              В назначении платежа укажите номер счёта{' '}
              {invoiceNumber && (
                <span className="font-mono font-medium text-mp-text-primary">
                  {invoiceNumber}
                </span>
              )}
            </li>
            <li>Оплата будет подтверждена в течение 1-3 рабочих дней</li>
            <li>Сохраните платёжное поручение до активации подписки</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
