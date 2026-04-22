'use client';

import { CheckCircle, XCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { api, endpoints } from '@/lib/api-client';

export default function VerifyEmailPage() {
  const params = useParams();
  const token = params.token as string;

  const verifyMutation = useMutation({
    mutationFn: async () => {
      await api.get(endpoints.auth.verifyEmail(token));
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Card className="border-mp-border bg-mp-surface/50 backdrop-blur-sm">
      <CardContent className="pt-8 pb-8 text-center">
        {verifyMutation.isPending && (
          <>
            <div className="mb-4 flex justify-center">
              <Spinner size="xl" />
            </div>
            <h2 className="text-xl font-bold text-mp-text-primary mb-2">
              Подтверждение email...
            </h2>
            <p className="text-mp-text-secondary">
              Пожалуйста, подождите
            </p>
          </>
        )}

        {verifyMutation.isSuccess && (
          <>
            <div className="w-16 h-16 rounded-full bg-mp-success-bg mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-mp-success-text" />
            </div>
            <h2 className="text-xl font-bold text-mp-text-primary mb-2">
              Email подтверждён
            </h2>
            <p className="text-mp-text-secondary mb-6">
              Ваш email успешно подтверждён. Теперь вы можете войти в аккаунт.
            </p>
            <Button variant="gradient" asChild>
              <Link href="/login">Войти в аккаунт</Link>
            </Button>
          </>
        )}

        {verifyMutation.isError && (
          <>
            <div className="w-16 h-16 rounded-full bg-mp-error-bg mx-auto mb-4 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-mp-error-text" />
            </div>
            <h2 className="text-xl font-bold text-mp-text-primary mb-2">
              Ссылка устарела
            </h2>
            <p className="text-mp-text-secondary mb-6">
              Ссылка для подтверждения email недействительна или устарела.
            </p>
            <Button variant="gradient" asChild>
              <Link href="/login">Перейти к входу</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
