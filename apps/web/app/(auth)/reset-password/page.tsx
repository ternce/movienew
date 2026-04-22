'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeSlash, Lock, WarningCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Пароль обязателен')
      .min(8, 'Пароль должен быть не менее 8 символов')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Пароль должен содержать заглавную букву, строчную букву и цифру'
      ),
    confirmPassword: z.string().min(1, 'Подтвердите пароль'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { resetPassword, isResettingPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    if (!token) return;
    resetPassword({ token, password: data.password, confirmPassword: data.confirmPassword });
  };

  if (!token) {
    return (
      <Card className="border-mp-border bg-mp-surface/50 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-mp-error-bg mx-auto mb-4 flex items-center justify-center">
            <WarningCircle className="w-8 h-8 text-mp-error-text" />
          </div>
          <h2 className="text-xl font-bold text-mp-text-primary mb-2">
            Ссылка недействительна
          </h2>
          <p className="text-mp-text-secondary mb-6">
            Ссылка для сброса пароля недействительна или устарела. Запросите новую.
          </p>
          <Button variant="gradient" asChild>
            <Link href="/forgot-password">
              Запросить новую ссылку
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
          Новый пароль
        </CardTitle>
        <CardDescription className="text-mp-text-secondary">
          Придумайте новый надёжный пароль
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-mp-text-primary"
            >
              Новый пароль
            </label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
              autoComplete="new-password"
              error={!!errors.password}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-mp-text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeSlash className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-mp-error-text">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-mp-text-primary"
            >
              Подтвердите пароль
            </label>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="hover:text-mp-text-primary transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeSlash className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-mp-error-text">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            isLoading={isResettingPassword}
          >
            Сбросить пароль
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-mp-text-secondary hover:text-mp-text-primary transition-colors"
          >
            Вернуться к входу
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
