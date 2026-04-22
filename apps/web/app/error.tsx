'use client';

import { Warning, ArrowsClockwise, House, Lifebuoy } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Error boundary component for route-level errors
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-mp-bg-primary">
      <div className="text-center max-w-md">
        {/* Error icon */}
        <div className="w-20 h-20 rounded-full bg-mp-error-bg flex items-center justify-center mx-auto mb-6">
          <Warning className="w-10 h-10 text-mp-error-text" />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-mp-text-primary mb-4">
          Что-то пошло не так
        </h1>

        <p className="text-mp-text-secondary mb-6">
          Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
          Попробуйте обновить страницу или вернуться на главную.
        </p>

        {/* Error digest for tracking (always shown if present) */}
        {error.digest && (
          <p className="text-xs text-mp-text-disabled mb-6 font-mono">
            Код ошибки: {error.digest}
          </p>
        )}

        {/* Error details (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 rounded-lg bg-mp-surface border border-mp-border text-left">
            <p className="text-sm font-mono text-mp-error-text break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="gradient" onClick={reset}>
            <ArrowsClockwise className="w-4 h-4" />
            Попробовать снова
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <House className="w-4 h-4" />
              На главную
            </Link>
          </Button>
        </div>

        {/* Support link */}
        <div className="mt-8">
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-sm text-mp-text-disabled hover:text-mp-text-secondary transition-colors"
          >
            <Lifebuoy className="w-3.5 h-3.5" />
            Связаться с поддержкой
          </Link>
        </div>
      </div>
    </div>
  );
}
