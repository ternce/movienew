'use client';

import { Check, X, Money } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AdminWithdrawal, WithdrawalStatus } from '@/types';

interface WithdrawalActionsProps {
  withdrawal: AdminWithdrawal;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onComplete: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isCompleting?: boolean;
  className?: string;
}

export function WithdrawalActions({
  withdrawal,
  onApprove,
  onReject,
  onComplete,
  isApproving,
  isRejecting,
  isCompleting,
  className,
}: WithdrawalActionsProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const handleRejectConfirm = () => {
    if (rejectReason.trim()) {
      onReject(rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
    }
  };

  const canApprove = withdrawal.status === 'PENDING';
  const canReject = withdrawal.status === 'PENDING' || withdrawal.status === 'APPROVED';
  const canComplete = withdrawal.status === 'APPROVED' || withdrawal.status === 'PROCESSING';

  if (!canApprove && !canReject && !canComplete) {
    return null;
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Действия</CardTitle>
          <CardDescription>
            Управление заявкой на вывод
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {canApprove && (
            <Button
              className="w-full"
              onClick={onApprove}
              disabled={isApproving}
            >
              <Check className="mr-2 h-4 w-4" />
              {isApproving ? 'Одобрение...' : 'Одобрить заявку'}
            </Button>
          )}

          {canComplete && (
            <Button
              variant="default"
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500"
              onClick={onComplete}
              disabled={isCompleting}
            >
              <Money className="mr-2 h-4 w-4" />
              {isCompleting ? 'Обработка...' : 'Отметить выплату'}
            </Button>
          )}

          {canReject && (
            <Button
              variant="outline"
              className="w-full text-mp-error-text hover:bg-mp-error-bg/50"
              onClick={() => setRejectDialogOpen(true)}
            >
              <X className="mr-2 h-4 w-4" />
              Отклонить
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить заявку</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения. Она будет отображаться пользователю.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Причина отклонения</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Например: Недостаточно документов для проверки..."
              rows={4}
            />
            <p className="text-xs text-mp-text-secondary">
              Минимум 10 символов
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectReason.trim().length < 10 || isRejecting}
            >
              {isRejecting ? 'Отклонение...' : 'Отклонить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Compact action buttons for table row
 */
interface WithdrawalRowActionsProps {
  status: WithdrawalStatus;
  onApprove: () => void;
  onReject: () => void;
  onComplete: () => void;
  isApproving?: boolean;
  isCompleting?: boolean;
}

export function WithdrawalRowActions({
  status,
  onApprove,
  onReject,
  onComplete,
  isApproving,
  isCompleting,
}: WithdrawalRowActionsProps) {
  const canApprove = status === 'PENDING';
  const canReject = status === 'PENDING' || status === 'APPROVED';
  const canComplete = status === 'APPROVED' || status === 'PROCESSING';

  return (
    <div className="flex gap-1">
      {canApprove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
          onClick={onApprove}
          disabled={isApproving}
          title="Одобрить"
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
      {canComplete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
          onClick={onComplete}
          disabled={isCompleting}
          title="Отметить выплату"
        >
          <Money className="h-4 w-4" />
        </Button>
      )}
      {canReject && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-mp-error-text hover:text-red-400 hover:bg-red-500/10"
          onClick={onReject}
          title="Отклонить"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
