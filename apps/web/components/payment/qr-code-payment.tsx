'use client';

import { Clock, ArrowsClockwise, DeviceMobile, Copy, Check } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QRCodePaymentProps {
  qrCodeUrl: string;
  expiresAt?: string;
  amount?: number;
  onRefresh?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Format remaining time
 */
function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Истёк';

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `0:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function QRCodePayment({
  qrCodeUrl,
  expiresAt,
  amount,
  onRefresh,
  onCancel,
  isLoading = false,
  className,
}: QRCodePaymentProps) {
  const [timeRemaining, setTimeRemaining] = React.useState<string>('');
  const [isExpired, setIsExpired] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Update timer
  React.useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const expired = now >= expiry;

      setIsExpired(expired);
      setTimeRemaining(formatTimeRemaining(expiresAt));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={cn('space-y-6 text-center', className)}>
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-mp-text-primary">
          Оплата через СБП
        </h3>
        <p className="text-sm text-mp-text-secondary">
          Отсканируйте QR-код в мобильном приложении вашего банка
        </p>
      </div>

      {/* QR Code */}
      <div className="relative mx-auto">
        <div
          className={cn(
            'relative inline-block rounded-2xl border-4 border-white bg-white p-4 shadow-lg',
            isExpired && 'opacity-50'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeUrl}
            alt="QR код для оплаты"
            className="h-48 w-48"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Expired overlay */}
          {isExpired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-mp-bg-primary/90">
              <Clock className="mb-2 h-8 w-8 text-mp-error-text" />
              <span className="text-sm font-medium text-mp-error-text">
                QR-код истёк
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timer and amount */}
      <div className="flex items-center justify-center gap-6">
        {expiresAt && !isExpired && (
          <div className="flex items-center gap-2 text-mp-text-secondary">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-sm">{timeRemaining}</span>
          </div>
        )}

        {amount && (
          <div className="text-lg font-bold text-mp-text-primary">
            {formatCurrency(amount)}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="space-y-3 rounded-lg bg-mp-surface p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mp-accent-primary/20 text-xs font-medium text-mp-accent-primary">
            1
          </div>
          <p className="text-sm text-mp-text-secondary text-left">
            Откройте приложение банка, поддерживающего СБП
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mp-accent-primary/20 text-xs font-medium text-mp-accent-primary">
            2
          </div>
          <p className="text-sm text-mp-text-secondary text-left">
            Выберите оплату по QR-коду и отсканируйте код
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mp-accent-primary/20 text-xs font-medium text-mp-accent-primary">
            3
          </div>
          <p className="text-sm text-mp-text-secondary text-left">
            Подтвердите оплату — статус обновится автоматически
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        {isExpired && onRefresh ? (
          <Button
            variant="gradient"
            className="flex-1"
            onClick={onRefresh}
            isLoading={isLoading}
            leftIcon={<ArrowsClockwise className="h-4 w-4" />}
          >
            Получить новый QR-код
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyLink}
              leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            >
              {copied ? 'Скопировано' : 'Скопировать ссылку'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              asChild
            >
              <a href={qrCodeUrl} target="_blank" rel="noopener noreferrer">
                <DeviceMobile className="mr-2 h-4 w-4" />
                Открыть на телефоне
              </a>
            </Button>
          </>
        )}
      </div>

      {/* Cancel */}
      {onCancel && (
        <Button variant="ghost" onClick={onCancel} className="text-mp-text-secondary">
          Отменить оплату
        </Button>
      )}
    </div>
  );
}
