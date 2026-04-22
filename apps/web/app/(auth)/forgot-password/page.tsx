'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Envelope, ArrowLeft, CheckCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Введите корректный email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { forgotPassword, isSendingResetEmail } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPassword(data, {
      onSuccess: () => setIsSubmitted(true),
      onError: () => setIsSubmitted(true), // Always show success for security
    });
  };

  if (isSubmitted) {
    return (
      <Card className="border-mp-border bg-mp-surface/50 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-mp-success-bg mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-mp-success-text" />
          </div>
          <h2 className="text-xl font-bold text-mp-text-primary mb-2">
            Проверьте почту
          </h2>
          <p className="text-mp-text-secondary mb-6 max-w-sm mx-auto">
            Инструкции по сбросу пароля отправлены на вашу почту. Проверьте также папку &laquo;Спам&raquo;.
          </p>
          <Button variant="outline" asChild>
            <Link href="/login">
              <ArrowLeft className="w-4 h-4" />
              Вернуться к входу
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-mp-border bg-mp-surface/50 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-mp-text-primary">
          Забыли пароль?
        </CardTitle>
        <CardDescription className="text-mp-text-secondary">
          Введите email, и мы отправим инструкции по сбросу пароля
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-mp-text-primary"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              leftIcon={<Envelope className="w-4 h-4" />}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-mp-error-text">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            isLoading={isSendingResetEmail}
          >
            Отправить инструкции
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-mp-text-secondary hover:text-mp-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к входу
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
