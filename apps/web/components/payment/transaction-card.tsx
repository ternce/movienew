'use client';

import {
  CreditCard,
  QrCode,
  BuildingOffice,
  Crown,
  Bag,
  Gift,
  ArrowDownLeft,
  CaretRight,
} from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';
import type { Transaction, TransactionType, PaymentMethodType } from '@/types';

import { PaymentStatusBadge } from './payment-status-indicator';

interface TransactionCardProps {
  transaction: Transaction;
  onClick?: () => void;
  className?: string;
}

/**
 * Get transaction type icon and label
 */
function getTransactionTypeConfig(type: TransactionType) {
  switch (type) {
    case 'SUBSCRIPTION':
      return {
        icon: Crown,
        label: 'Подписка',
        color: 'text-mp-accent-primary',
        bgColor: 'bg-mp-accent-primary/10',
      };
    case 'STORE':
      return {
        icon: Bag,
        label: 'Магазин',
        color: 'text-mp-accent-tertiary',
        bgColor: 'bg-mp-accent-tertiary/10',
      };
    case 'BONUS_PURCHASE':
      return {
        icon: Gift,
        label: 'Покупка бонусов',
        color: 'text-mp-accent-secondary',
        bgColor: 'bg-mp-accent-secondary/10',
      };
    case 'WITHDRAWAL':
      return {
        icon: ArrowDownLeft,
        label: 'Вывод средств',
        color: 'text-mp-warning-text',
        bgColor: 'bg-mp-warning-bg/50',
      };
    default:
      return {
        icon: CreditCard,
        label: type,
        color: 'text-mp-text-secondary',
        bgColor: 'bg-mp-surface',
      };
  }
}

/**
 * Get payment method icon
 */
function getPaymentMethodIcon(method: PaymentMethodType) {
  switch (method) {
    case 'CARD':
      return CreditCard;
    case 'SBP':
      return QrCode;
    case 'BANK_TRANSFER':
      return BuildingOffice;
    default:
      return CreditCard;
  }
}

/**
 * Get payment method label
 */
function getPaymentMethodLabel(method: PaymentMethodType): string {
  switch (method) {
    case 'CARD':
      return 'Карта';
    case 'SBP':
      return 'СБП';
    case 'BANK_TRANSFER':
      return 'Перевод';
    default:
      return method;
  }
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format currency
 */
function formatCurrency(amount: number, currency: string = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TransactionCard({
  transaction,
  onClick,
  className,
}: TransactionCardProps) {
  const typeConfig = getTransactionTypeConfig(transaction.type);
  const TypeIcon = typeConfig.icon;
  const PaymentIcon = getPaymentMethodIcon(transaction.paymentMethod);

  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        'group rounded-xl border border-mp-border bg-mp-bg-secondary p-4 transition-all',
        isClickable && 'cursor-pointer hover:border-mp-border/80 hover:bg-mp-surface/50',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-start gap-4">
        {/* Type icon */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            typeConfig.bgColor
          )}
        >
          <TypeIcon className={cn('h-6 w-6', typeConfig.color)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              {/* Type label */}
              <h3 className="font-medium text-mp-text-primary">
                {typeConfig.label}
              </h3>

              {/* Date and payment method */}
              <div className="flex items-center gap-3 text-xs text-mp-text-secondary">
                <span>{formatDate(transaction.createdAt)}</span>
                <span className="text-mp-text-disabled">•</span>
                <span>{formatTime(transaction.createdAt)}</span>
                <span className="text-mp-text-disabled">•</span>
                <span className="flex items-center gap-1">
                  <PaymentIcon className="h-3 w-3" />
                  {getPaymentMethodLabel(transaction.paymentMethod)}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="text-right">
              <p className="font-semibold text-mp-text-primary">
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              {transaction.bonusAmountUsed > 0 && (
                <p className="text-xs text-mp-accent-secondary">
                  +{formatCurrency(transaction.bonusAmountUsed)} бонусов
                </p>
              )}
            </div>
          </div>

          {/* Status and arrow */}
          <div className="mt-3 flex items-center justify-between">
            <PaymentStatusBadge status={transaction.status} size="sm" />

            {isClickable && (
              <CaretRight className="h-4 w-4 text-mp-text-disabled transition-transform group-hover:translate-x-1 group-hover:text-mp-text-secondary" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact transaction row for tables
 */
interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
  className?: string;
}

export function TransactionRow({
  transaction,
  onClick,
  className,
}: TransactionRowProps) {
  const typeConfig = getTransactionTypeConfig(transaction.type);
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg p-3 transition-colors',
        onClick && 'cursor-pointer hover:bg-mp-surface/50',
        className
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          typeConfig.bgColor
        )}
      >
        <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-mp-text-primary">
          {typeConfig.label}
        </p>
        <p className="text-xs text-mp-text-secondary">
          {formatDate(transaction.createdAt)}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p className="text-sm font-medium text-mp-text-primary">
          {formatCurrency(transaction.amount, transaction.currency)}
        </p>
        <PaymentStatusBadge status={transaction.status} size="sm" />
      </div>
    </div>
  );
}

/**
 * Transaction list skeleton
 */
export function TransactionCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-mp-border bg-mp-bg-secondary p-4',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-mp-surface" />
        <div className="flex-1 space-y-3">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-mp-surface" />
              <div className="h-3 w-32 animate-pulse rounded bg-mp-surface" />
            </div>
            <div className="h-5 w-20 animate-pulse rounded bg-mp-surface" />
          </div>
          <div className="h-6 w-24 animate-pulse rounded-full bg-mp-surface" />
        </div>
      </div>
    </div>
  );
}
