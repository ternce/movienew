'use client';

import { UserCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Account error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="w-20 h-20 rounded-full bg-mp-error-bg flex items-center justify-center mx-auto">
          <UserCircle className="w-10 h-10 text-mp-error-text" />
        </div>
        <h2 className="text-xl font-semibold text-mp-text-primary">
          Ошибка аккаунта
        </h2>
        <p className="text-mp-text-secondary">
          Не удалось загрузить данные аккаунта. Попробуйте обновить страницу.
        </p>
        {error.digest && (
          <p className="text-xs text-mp-text-disabled font-mono">
            Код ошибки: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <ArrowsClockwise className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
          <Button onClick={() => window.history.back()} variant="outline">
            Назад
          </Button>
        </div>
      </div>
    </div>
  );
}
