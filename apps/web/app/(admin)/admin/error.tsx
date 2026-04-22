'use client';

import { GearSix, ArrowsClockwise, House } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin panel error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="w-20 h-20 rounded-full bg-mp-error-bg flex items-center justify-center mx-auto">
          <GearSix className="w-10 h-10 text-mp-error-text" />
        </div>
        <h2 className="text-xl font-semibold text-mp-text-primary">
          Ошибка панели управления
        </h2>
        <p className="text-mp-text-secondary">
          Произошла ошибка в панели управления. Попробуйте обновить страницу или перейти на главную.
        </p>
        {error.digest && (
          <p className="text-xs text-mp-text-disabled font-mono">
            Код ошибки: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 rounded-lg bg-mp-surface border border-mp-border text-left">
            <p className="text-sm font-mono text-mp-error-text break-all">
              {error.message}
            </p>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <ArrowsClockwise className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/dashboard">
              <House className="mr-2 h-4 w-4" />
              На главную
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
