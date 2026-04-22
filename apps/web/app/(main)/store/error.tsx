'use client';

import { Bag, ArrowsClockwise, ArrowLeft } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Store error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="w-20 h-20 rounded-full bg-mp-error-bg flex items-center justify-center mx-auto">
          <Bag className="w-10 h-10 text-mp-error-text" />
        </div>
        <h2 className="text-xl font-semibold text-mp-text-primary">
          Ошибка магазина
        </h2>
        <p className="text-mp-text-secondary">
          Произошла ошибка при загрузке магазина. Попробуйте обновить страницу или вернуться в каталог.
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
          <Button variant="outline" asChild>
            <Link href="/store">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться в каталог
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
