'use client';

import {
  Bell,
  CheckCircle,
  Envelope,
  Globe,
  Info,
  Key,
  Laptop,
  SpinnerGap,
  SignOut,
  Monitor,
  Gear,
  Shield,
  DeviceMobile,
  Warning,
} from '@phosphor-icons/react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useActiveSessions,
  useTerminateSession,
  useTerminateAllSessions,
} from '@/hooks/use-account';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth.store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/use-notifications';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ==============================
// Reset email schema
// ==============================

const resetEmailSchema = z.object({
  email: z.string().min(1, 'Email обязателен').email('Введите корректный email'),
});

type ResetEmailFormValues = z.infer<typeof resetEmailSchema>;

// ==============================
// Notification toggle config
// ==============================

const NOTIFICATION_TOGGLES = [
  {
    key: 'emailMarketing' as const,
    label: 'Email рассылки',
    description: 'Получать маркетинговые письма и промо-акции',
    icon: Bell,
  },
  {
    key: 'emailUpdates' as const,
    label: 'Обновления',
    description: 'Уведомления о новом контенте, подписках и платежах',
    icon: Bell,
  },
  {
    key: 'pushNotifications' as const,
    label: 'Push уведомления',
    description: 'Уведомления в реальном времени в браузере',
    icon: Bell,
  },
];

/**
 * Settings page with tabs
 */
export default function SettingsPage() {
  return (
    <div className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-mp-accent-primary/20 p-2">
            <Gear className="h-6 w-6 text-mp-accent-primary" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Настройки
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Управляйте уведомлениями, безопасностью и активными сессиями
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notifications">
        <TabsList className="mb-6">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Безопасность
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Monitor className="h-4 w-4" />
            Сессии
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==============================
// Notifications Tab
// ==============================

function NotificationsTab() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const handleToggle = (key: string, checked: boolean) => {
    updatePreferences.mutate(
      { [key]: checked },
      {
        onSuccess: () => {
          toast.success('Настройки уведомлений обновлены');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-5 w-9" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Настройки уведомлений</CardTitle>
        <CardDescription>
          Управляйте какие уведомления вы хотите получать
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {NOTIFICATION_TOGGLES.map((toggle, index) => {
            const value = preferences?.[toggle.key] ?? false;

            return (
              <React.Fragment key={toggle.key}>
                {index > 0 && <Separator />}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mp-surface">
                      <toggle.icon className="h-4 w-4 text-mp-text-secondary" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-mp-text-primary">
                        {toggle.label}
                      </Label>
                      <p className="mt-0.5 text-sm text-mp-text-secondary">
                        {toggle.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => handleToggle(toggle.key, checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ==============================
// Security Tab
// ==============================

function SecurityTab() {
  const { forgotPassword, isSendingResetEmail } = useAuth();
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ResetEmailFormValues>({
    resolver: zodResolver(resetEmailSchema),
    defaultValues: { email: '' },
  });

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = (data: ResetEmailFormValues) => {
    forgotPassword(
      { email: data.email },
      {
        onSettled: () => {
          setIsSubmitted(true);
          setCooldown(60);
        },
      }
    );
  };

  const handleResend = () => {
    const email = getValues('email');
    forgotPassword(
      { email },
      {
        onSettled: () => {
          setCooldown(60);
        },
      }
    );
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mp-success-bg">
              <CheckCircle className="h-8 w-8 text-mp-success-text" weight="fill" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-mp-text-primary">
              Проверьте почту
            </h2>
            <p className="mb-6 text-sm text-mp-text-secondary">
              Если аккаунт с указанным email существует, мы отправили ссылку для сброса пароля.
              Проверьте папку «Спам», если письмо не пришло.
            </p>

            <Button
              variant="outline"
              onClick={handleResend}
              disabled={cooldown > 0 || isSendingResetEmail}
              isLoading={isSendingResetEmail}
            >
              {cooldown > 0
                ? `Отправить повторно (${cooldown}с)`
                : 'Отправить повторно'}
            </Button>

            <Separator className="my-6" />

            <div className="flex items-start gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4 text-left">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-mp-text-secondary" />
              <p className="text-sm text-mp-text-secondary">
                После сброса пароля все активные сессии будут завершены и потребуется заново войти в аккаунт
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5 text-mp-accent-primary" />
          Сброс пароля
        </CardTitle>
        <CardDescription>
          Введите ваш email, и мы отправим ссылку для сброса пароля
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resetEmail">
              Email <span className="text-mp-accent-tertiary">*</span>
            </Label>
            <div className="relative">
              <Envelope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mp-text-disabled" />
              <Input
                id="resetEmail"
                type="email"
                placeholder="Введите ваш email"
                className="pl-10"
                error={!!errors.email}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-mp-error-text">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-mp-text-secondary" />
            <p className="text-sm text-mp-text-secondary">
              После сброса пароля все активные сессии будут завершены и потребуется заново войти в аккаунт
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="gradient"
              disabled={isSendingResetEmail}
              isLoading={isSendingResetEmail}
            >
              <Envelope className="mr-2 h-4 w-4" />
              Отправить ссылку для сброса
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ==============================
// Sessions Tab
// ==============================

function SessionsTab() {
  const { data: sessions, isLoading } = useActiveSessions();
  const terminateSession = useTerminateSession();
  const terminateAllSessions = useTerminateAllSessions();
  const { logout } = useAuth();

  const [showTerminateCurrentDialog, setShowTerminateCurrentDialog] = React.useState(false);
  const [pendingSessionId, setPendingSessionId] = React.useState<string | null>(null);

  const sessionsList = Array.isArray(sessions) ? sessions : sessions?.items || [];

  // Use the stored sessionId from login/refresh to reliably identify the current session
  const { sessionId: currentSessionId } = useAuthStore();

  const getDeviceIcon = (deviceInfo?: string) => {
    if (!deviceInfo) return Monitor;
    const info = deviceInfo.toLowerCase();
    if (info.includes('mobile') || info.includes('android') || info.includes('iphone')) {
      return DeviceMobile;
    }
    if (info.includes('tablet') || info.includes('ipad')) {
      return Laptop;
    }
    return Monitor;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-mp-border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-mp-accent-primary" />
              Активные сессии
            </CardTitle>
            <CardDescription className="mt-1">
              Управляйте устройствами, на которых выполнен вход в аккаунт
            </CardDescription>
          </div>
          {sessionsList.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-mp-accent-tertiary hover:text-mp-accent-tertiary"
              onClick={() => terminateAllSessions.mutate()}
              disabled={terminateAllSessions.isPending}
            >
              {terminateAllSessions.isPending ? (
                <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SignOut className="mr-2 h-4 w-4" />
              )}
              Завершить все другие сессии
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessionsList.length === 0 ? (
          <div className="py-8 text-center">
            <Monitor className="mx-auto mb-3 h-10 w-10 text-mp-text-disabled" />
            <p className="text-mp-text-secondary">Нет активных сессий</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessionsList.map((session: any) => {
              const DeviceIcon = getDeviceIcon(session.deviceInfo);
              const isCurrentSession = session.id === currentSessionId;
              const isTerminating =
                terminateSession.isPending &&
                terminateSession.variables === session.id;

              return (
                <div
                  key={session.id}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-mp-surface/50',
                    isCurrentSession
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-mp-border bg-mp-surface/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mp-surface">
                      <DeviceIcon className="h-5 w-5 text-mp-text-secondary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-mp-text-primary">
                          {session.deviceInfo || 'Неизвестное устройство'}
                        </p>
                        {isCurrentSession && (
                          <Badge variant="success" className="text-[10px]">
                            Это устройство
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-mp-text-secondary">
                        {session.ipAddress && (
                          <span>IP: {session.ipAddress}</span>
                        )}
                        {session.createdAt && (
                          <span>
                            Вход: {formatDate(session.createdAt, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-mp-accent-tertiary hover:border-mp-accent-tertiary/50 hover:text-mp-accent-tertiary"
                    onClick={() => {
                      if (isCurrentSession) {
                        setPendingSessionId(session.id);
                        setShowTerminateCurrentDialog(true);
                      } else {
                        terminateSession.mutate(session.id);
                      }
                    }}
                    disabled={isTerminating}
                  >
                    {isTerminating ? (
                      <SpinnerGap className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <SignOut className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Завершить
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={showTerminateCurrentDialog} onOpenChange={setShowTerminateCurrentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Warning className="h-5 w-5 text-mp-accent-tertiary" />
              Завершить текущую сессию?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вы будете выйдены из аккаунта на этом устройстве. Для продолжения работы потребуется повторный вход.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-mp-accent-tertiary text-white hover:bg-mp-accent-tertiary/90"
              onClick={() => {
                if (!pendingSessionId) return;
                terminateSession.mutate(pendingSessionId, {
                  onSuccess: () => {
                    logout();
                  },
                });
              }}
            >
              Завершить сессию
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
