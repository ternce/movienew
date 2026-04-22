'use client';

import * as React from 'react';
import { z } from 'zod';
import { PencilSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/ui/otp-input';
import { useRequestEmailChange, useConfirmEmailChange } from '@/hooks/use-account';

type Step = 'display' | 'editing' | 'verifying';

const emailSchema = z.string().email('Укажите корректный email');

const COOLDOWN_SECONDS = 60;

interface EmailChangeSectionProps {
  currentEmail: string;
}

export function EmailChangeSection({ currentEmail }: EmailChangeSectionProps) {
  const [step, setStep] = React.useState<Step>('display');
  const [newEmail, setNewEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState('');
  const [otpValue, setOtpValue] = React.useState('');
  const [cooldown, setCooldown] = React.useState(0);

  const requestChange = useRequestEmailChange();
  const confirmChange = useConfirmEmailChange();

  // Cooldown timer
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCancel = () => {
    setStep('display');
    setNewEmail('');
    setEmailError('');
    setOtpValue('');
    setCooldown(0);
  };

  const handleRequestCode = () => {
    setEmailError('');

    const result = emailSchema.safeParse(newEmail.trim());
    if (!result.success) {
      setEmailError(result.error.errors[0]?.message || 'Некорректный email');
      return;
    }

    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError('Новый email совпадает с текущим');
      return;
    }

    requestChange.mutate(newEmail.trim(), {
      onSuccess: () => {
        setStep('verifying');
        setCooldown(COOLDOWN_SECONDS);
        setOtpValue('');
      },
    });
  };

  const handleResendCode = () => {
    if (cooldown > 0) return;

    requestChange.mutate(newEmail.trim(), {
      onSuccess: () => {
        setCooldown(COOLDOWN_SECONDS);
        setOtpValue('');
      },
    });
  };

  const handleConfirm = () => {
    if (otpValue.length !== 6) return;

    confirmChange.mutate(otpValue, {
      onSuccess: () => {
        handleCancel();
      },
    });
  };

  // Display state
  if (step === 'display') {
    return (
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            value={currentEmail}
            disabled
            className="cursor-not-allowed opacity-60"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 self-center"
            onClick={() => setStep('editing')}
          >
            <PencilSimple className="mr-1.5 h-4 w-4" />
            Изменить
          </Button>
        </div>
      </div>
    );
  }

  // Editing state — enter new email
  if (step === 'editing') {
    return (
      <div className="space-y-3">
        <Label htmlFor="newEmail">Новый email</Label>
        <Input
          id="newEmail"
          type="email"
          placeholder="Введите новый email"
          value={newEmail}
          onChange={(e) => {
            setNewEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          error={!!emailError}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleRequestCode();
            }
          }}
        />
        {emailError && (
          <p className="text-sm text-mp-error-text">{emailError}</p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="gradient"
            size="sm"
            onClick={handleRequestCode}
            disabled={!newEmail.trim() || requestChange.isPending}
            isLoading={requestChange.isPending}
          >
            Отправить код
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={requestChange.isPending}
          >
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  // Verifying state — enter OTP code
  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-1 block">Код подтверждения</Label>
        <p className="text-sm text-mp-text-secondary mb-3">
          Введите 6-значный код, отправленный на{' '}
          <span className="font-medium text-mp-text-primary">{newEmail}</span>
        </p>
        <OtpInput
          value={otpValue}
          onChange={setOtpValue}
          disabled={confirmChange.isPending}
          error={confirmChange.isError}
        />
      </div>

      {confirmChange.isError && (
        <p className="text-sm text-mp-error-text text-center">
          {confirmChange.error?.message || 'Неверный код'}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 justify-center">
        <Button
          type="button"
          variant="gradient"
          size="sm"
          onClick={handleConfirm}
          disabled={otpValue.length !== 6 || confirmChange.isPending}
          isLoading={confirmChange.isPending}
        >
          Подтвердить
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResendCode}
          disabled={cooldown > 0 || requestChange.isPending}
        >
          {cooldown > 0
            ? `Отправить заново (${cooldown}с)`
            : 'Отправить заново'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={confirmChange.isPending}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}
