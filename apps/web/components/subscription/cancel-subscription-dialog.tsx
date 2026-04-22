'use client';

import { Warning, Calendar, Check } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import type { UserSubscription } from '@/types';

interface CancelSubscriptionDialogProps {
  subscription: UserSubscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (immediate: boolean, reason?: string) => void;
  isLoading?: boolean;
}

/**
 * Format date in Russian locale
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function CancelSubscriptionDialog({
  subscription,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: CancelSubscriptionDialogProps) {
  const [cancelType, setCancelType] = React.useState<'end_of_period' | 'immediate'>(
    'end_of_period'
  );
  const [reason, setReason] = React.useState('');

  const handleConfirm = () => {
    onConfirm(cancelType === 'immediate', reason || undefined);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setCancelType('end_of_period');
      setReason('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warning className="h-5 w-5 text-mp-warning-text" />
            Отмена подписки
          </DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите отменить подписку{' '}
            <span className="font-medium text-mp-text-primary">
              {subscription.plan.name}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cancel type selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-mp-text-primary">
              Когда отменить?
            </Label>

            {/* End of period option */}
            <button
              type="button"
              onClick={() => setCancelType('end_of_period')}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-all',
                cancelType === 'end_of_period'
                  ? 'border-mp-accent-primary bg-mp-accent-primary/5'
                  : 'border-mp-border hover:border-mp-border/80 hover:bg-mp-surface'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    cancelType === 'end_of_period'
                      ? 'border-mp-accent-primary bg-mp-accent-primary'
                      : 'border-mp-border'
                  )}
                >
                  {cancelType === 'end_of_period' && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="space-y-1">
                  <span className="block font-medium text-mp-text-primary">
                    По окончании периода
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-mp-text-secondary">
                    <Calendar className="h-3.5 w-3.5" />
                    Доступ сохранится до {formatDate(subscription.expiresAt)}
                  </span>
                </div>
              </div>
            </button>

            {/* Immediate option */}
            <button
              type="button"
              onClick={() => setCancelType('immediate')}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-all',
                cancelType === 'immediate'
                  ? 'border-mp-error-text/50 bg-mp-error-bg/30'
                  : 'border-mp-border hover:border-mp-border/80 hover:bg-mp-surface'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    cancelType === 'immediate'
                      ? 'border-mp-error-text bg-mp-error-text'
                      : 'border-mp-border'
                  )}
                >
                  {cancelType === 'immediate' && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="space-y-1">
                  <span className="block font-medium text-mp-text-primary">
                    Немедленно
                  </span>
                  <span className="text-sm text-mp-error-text">
                    Доступ будет прекращён сразу, возврат средств не предусмотрен
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm text-mp-text-secondary">
              Причина отмены (необязательно)
            </Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Расскажите, почему вы отменяете подписку..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Warning for immediate cancellation */}
          {cancelType === 'immediate' && (
            <div className="rounded-lg bg-mp-error-bg/50 p-3 text-sm text-mp-error-text">
              <div className="flex items-start gap-2">
                <Warning className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  При немедленной отмене вы потеряете доступ к контенту и оставшееся
                  время подписки ({subscription.daysRemaining} дн.)
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            variant={cancelType === 'immediate' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {cancelType === 'immediate' ? 'Отменить сейчас' : 'Отменить подписку'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
