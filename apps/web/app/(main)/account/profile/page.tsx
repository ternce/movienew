'use client';

import { Calendar, Key, FloppyDisk, User } from '@phosphor-icons/react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarUpload } from '@/components/account/avatar-upload';
import { EmailChangeSection } from '@/components/account/email-change-section';
import { useProfile, useUpdateProfile } from '@/hooks/use-account';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate } from '@/lib/utils';

// ==============================
// Zod schema
// ==============================

const profileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(50, 'Максимум 50 символов'),
  lastName: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(50, 'Максимум 50 символов'),
  phone: z
    .string()
    .regex(/^\+7\d{10}$/, 'Формат: +7XXXXXXXXXX')
    .or(z.literal(''))
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ==============================
// Role labels
// ==============================

const ROLE_LABELS: Record<string, string> = {
  USER: 'Пользователь',
  ADMIN: 'Администратор',
  MODERATOR: 'Модератор',
  PARTNER: 'Партнёр',
};

/**
 * Profile edit page
 */
export default function ProfilePage() {
  const { user } = useAuthStore();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
    },
  });

  // Pre-fill form when profile data loads
  React.useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate(
      {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
      },
      {
        onSuccess: () => {
          reset(data);
        },
        onError: () => {
          toast.error('Не удалось обновить профиль');
        },
      }
    );
  };

  const displayName = [
    profile?.firstName || user?.firstName,
    profile?.lastName || user?.lastName,
  ]
    .filter(Boolean)
    .join(' ') || 'Пользователь';

  if (isLoading) {
    return (
      <div className="py-8 md:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="mb-6 h-24 w-full rounded-xl" />
        <Card>
          <CardContent className="space-y-6 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-mp-accent-primary/20 p-2">
            <User className="h-6 w-6 text-mp-accent-primary" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Профиль
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Управляйте вашими личными данными
        </p>
      </div>

      {/* Avatar section */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <AvatarUpload
            currentAvatarUrl={profile?.avatarUrl || user?.avatarUrl}
            userName={displayName}
          />
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Личные данные</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* First name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">
                Имя <span className="text-mp-accent-tertiary">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="Введите имя"
                error={!!errors.firstName}
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="text-sm text-mp-error-text">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            {/* Last name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Фамилия <span className="text-mp-accent-tertiary">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Введите фамилию"
                error={!!errors.lastName}
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="text-sm text-mp-error-text">
                  {errors.lastName.message}
                </p>
              )}
            </div>

            {/* Email change */}
            <EmailChangeSection
              currentEmail={user?.email || profile?.email || ''}
            />

            <Separator />

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7XXXXXXXXXX"
                error={!!errors.phone}
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-mp-error-text">
                  {errors.phone.message}
                </p>
              )}
              <p className="text-xs text-mp-text-secondary">
                Формат: +7XXXXXXXXXX
              </p>
            </div>

            <Separator />

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="gradient"
                disabled={!isDirty || updateProfile.isPending}
                isLoading={updateProfile.isPending}
              >
                <FloppyDisk className="mr-2 h-4 w-4" />
                Сохранить
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Read-only info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Информация об аккаунте</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Date of birth */}
            {user?.dateOfBirth && (
              <div className="flex items-start gap-3 rounded-lg border border-mp-border bg-mp-surface/30 p-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-mp-text-secondary" />
                <div>
                  <p className="text-xs text-mp-text-secondary">Дата рождения</p>
                  <p className="text-sm font-medium text-mp-text-primary">
                    {formatDate(user.dateOfBirth, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Age category */}
            {user?.ageCategory && (
              <div className="flex items-start gap-3 rounded-lg border border-mp-border bg-mp-surface/30 p-3">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-mp-text-secondary" />
                <div>
                  <p className="text-xs text-mp-text-secondary">Возрастная категория</p>
                  <AgeBadge age={user.ageCategory} className="mt-1" />
                </div>
              </div>
            )}

            {/* Role */}
            {user?.role && (
              <div className="flex items-start gap-3 rounded-lg border border-mp-border bg-mp-surface/30 p-3">
                <Key className="mt-0.5 h-4 w-4 shrink-0 text-mp-text-secondary" />
                <div>
                  <p className="text-xs text-mp-text-secondary">Роль</p>
                  <p className="text-sm font-medium text-mp-text-primary">
                    {ROLE_LABELS[user.role] || user.role}
                  </p>
                </div>
              </div>
            )}

            {/* Registration date */}
            {user?.createdAt && (
              <div className="flex items-start gap-3 rounded-lg border border-mp-border bg-mp-surface/30 p-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-mp-text-secondary" />
                <div>
                  <p className="text-xs text-mp-text-secondary">Дата регистрации</p>
                  <p className="text-sm font-medium text-mp-text-primary">
                    {formatDate(user.createdAt, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Referral code */}
            {user?.referralCode && (
              <div className="flex items-start gap-3 rounded-lg border border-mp-border bg-mp-surface/30 p-3">
                <Key className="mt-0.5 h-4 w-4 shrink-0 text-mp-text-secondary" />
                <div>
                  <p className="text-xs text-mp-text-secondary">Реферальный код</p>
                  <p className="text-sm font-mono font-medium text-mp-text-primary">
                    {user.referralCode}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
