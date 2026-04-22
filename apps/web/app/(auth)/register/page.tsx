'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeSlash, Envelope, Lock, User, Calendar, Gift } from '@phosphor-icons/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

/**
 * Registration form validation schema
 */
const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'Имя обязательно')
      .min(2, 'Имя должно быть не менее 2 символов'),
    lastName: z
      .string()
      .min(1, 'Фамилия обязательна')
      .min(2, 'Фамилия должна быть не менее 2 символов'),
    email: z
      .string()
      .min(1, 'Email обязателен')
      .email('Введите корректный email'),
    dateOfBirth: z
      .string()
      .min(1, 'Дата рождения обязательна'),
    password: z
      .string()
      .min(1, 'Пароль обязателен')
      .min(8, 'Пароль должен быть не менее 8 символов')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Пароль должен содержать заглавную букву, строчную букву и цифру'
      ),
    confirmPassword: z.string().min(1, 'Подтвердите пароль'),
    referralCode: z.string().optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Необходимо принять условия использования' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Registration page
 */
export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref') || '';

  const { register: registerUser, isRegistering } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
      referralCode,
      acceptTerms: undefined,
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      password: data.password,
      referralCode: data.referralCode || undefined,
      acceptTerms: data.acceptTerms,
    });
  };

  return (
    <Card className="border-mp-border bg-mp-surface/50 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-mp-text-primary">
          Создать аккаунт
        </CardTitle>
        <CardDescription className="text-mp-text-secondary">
          Заполните форму для регистрации
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="firstName"
                className="text-sm font-medium text-mp-text-primary"
              >
                Имя
              </label>
              <Input
                id="firstName"
                placeholder="Иван"
                autoComplete="given-name"
                error={!!errors.firstName}
                leftIcon={<User className="w-4 h-4" />}
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="text-sm text-mp-error-text">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="lastName"
                className="text-sm font-medium text-mp-text-primary"
              >
                Фамилия
              </label>
              <Input
                id="lastName"
                placeholder="Иванов"
                autoComplete="family-name"
                error={!!errors.lastName}
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="text-sm text-mp-error-text">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

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

          {/* Date of birth */}
          <div className="space-y-2">
            <label
              htmlFor="dateOfBirth"
              className="text-sm font-medium text-mp-text-primary"
            >
              Дата рождения
            </label>
            <Input
              id="dateOfBirth"
              type="date"
              autoComplete="bday"
              error={!!errors.dateOfBirth}
              leftIcon={<Calendar className="w-4 h-4" />}
              {...register('dateOfBirth')}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-mp-error-text">
                {errors.dateOfBirth.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-mp-text-primary"
            >
              Пароль
            </label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
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

          {/* Confirm password */}
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
              placeholder="••••••••"
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

          {/* Referral code */}
          <div className="space-y-2">
            <label
              htmlFor="referralCode"
              className="text-sm font-medium text-mp-text-primary"
            >
              Реферальный код{' '}
              <span className="text-mp-text-disabled">(необязательно)</span>
            </label>
            <Input
              id="referralCode"
              placeholder="ABC123"
              error={!!errors.referralCode}
              leftIcon={<Gift className="w-4 h-4" />}
              {...register('referralCode')}
            />
          </div>

          {/* Terms acceptance */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="acceptTerms"
              className="mt-1 h-4 w-4 rounded border-mp-border bg-mp-surface text-mp-accent-primary focus:ring-mp-accent-primary focus:ring-offset-mp-bg-primary"
              {...register('acceptTerms')}
            />
            <label htmlFor="acceptTerms" className="text-sm text-mp-text-secondary">
              Я принимаю{' '}
              <Link
                href="/documents/terms"
                className="text-mp-accent-primary hover:underline"
                target="_blank"
              >
                условия использования
              </Link>{' '}
              и{' '}
              <Link
                href="/documents/privacy"
                className="text-mp-accent-primary hover:underline"
                target="_blank"
              >
                политику конфиденциальности
              </Link>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-mp-error-text">
              {errors.acceptTerms.message}
            </p>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            isLoading={isRegistering}
          >
            Зарегистрироваться
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

        {/* Login link */}
        <p className="text-center text-sm text-mp-text-secondary">
          Уже есть аккаунт?{' '}
          <Link
            href="/login"
            className="text-mp-accent-primary hover:underline font-medium"
          >
            Войдите
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
