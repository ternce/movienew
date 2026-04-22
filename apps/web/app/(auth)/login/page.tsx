'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeSlash, Envelope, Lock } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

/**
 * Login form validation schema
 */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Введите корректный email'),
  password: z
    .string()
    .min(1, 'Пароль обязателен')
    .min(6, 'Пароль должен быть не менее 6 символов'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login page
 */
export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggingIn } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <Card className="border-mp-border bg-mp-surface/50 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-mp-text-primary">
          Вход в аккаунт
        </CardTitle>
        <CardDescription className="text-mp-text-secondary">
          Введите ваши данные для входа
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email field */}
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
              error={!!errors.email}
              leftIcon={<Envelope className="w-4 h-4" />}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-mp-error-text">{errors.email.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-mp-text-primary"
              >
                Пароль
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-mp-accent-primary hover:underline"
              >
                Забыли пароль?
              </Link>
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
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

          {/* Submit button */}
          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            isLoading={isLoggingIn}
          >
            Войти
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-mp-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-mp-surface px-2 text-mp-text-disabled">
              или
            </span>
          </div>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-mp-text-secondary">
          Нет аккаунта?{' '}
          <Link
            href="/register"
            className="text-mp-accent-primary hover:underline font-medium"
          >
            Зарегистрируйтесь
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
