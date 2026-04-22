'use client';

import {
  ArrowLeft,
  User,
  Envelope,
  Calendar,
  Shield,
  ShieldCheck,
  Gift,
  Prohibit,
  UserCheck,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAdminUserDetail,
  useUpdateAdminUser,
} from '@/hooks/use-admin-users';

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format date with time
 */
function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Role badge
 */
function getRoleBadge(role: string) {
  const config: Record<string, { label: string; className: string }> = {
    ADMIN: { label: 'Админ', className: 'bg-purple-500/20 text-purple-400 border-transparent' },
    MODERATOR: { label: 'Модератор', className: 'bg-blue-500/20 text-blue-400 border-transparent' },
    PARTNER: { label: 'Партнёр', className: 'bg-green-500/20 text-green-400 border-transparent' },
    BUYER: { label: 'Покупатель', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
    GUEST: { label: 'Гость', className: 'bg-gray-500/20 text-gray-300 border-transparent' },
    MINOR: { label: 'Несовершеннолетний', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
  };
  const { label, className } = config[role] || { label: role, className: '' };
  return <Badge className={className}>{label}</Badge>;
}

/**
 * Verification status badge
 */
function getVerificationBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    VERIFIED: { label: 'Верифицирован', className: 'bg-green-500/20 text-green-400 border-transparent' },
    PENDING: { label: 'На проверке', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
    UNVERIFIED: { label: 'Не верифицирован', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
    REJECTED: { label: 'Отклонён', className: 'bg-red-500/20 text-red-400 border-transparent' },
  };
  const { label, className } = config[status] || { label: status, className: '' };
  return <Badge className={className}>{label}</Badge>;
}

/**
 * Transaction status badge
 */
function getTransactionStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    COMPLETED: { label: 'Завершён', className: 'bg-green-500/20 text-green-400 border-transparent' },
    PENDING: { label: 'Ожидает', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
    FAILED: { label: 'Ошибка', className: 'bg-red-500/20 text-red-400 border-transparent' },
    CANCELLED: { label: 'Отменён', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
    REFUNDED: { label: 'Возврат', className: 'bg-blue-500/20 text-blue-400 border-transparent' },
  };
  const { label, className } = config[status] || { label: status, className: '' };
  return <Badge className={className}>{label}</Badge>;
}

/**
 * Admin user detail page
 */
export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const { data: user, isLoading } = useAdminUserDetail(userId);
  const updateUser = useUpdateAdminUser();

  const handleRoleChange = (newRole: string) => {
    updateUser.mutate({ userId, role: newRole });
  };

  const handleToggleActive = () => {
    if (!user) return;
    const newStatus = user.isActive !== false;
    updateUser.mutate({ userId, isActive: !newStatus });
  };

  if (isLoading) {
    return (
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="xl" className="py-8">
        <Card className="py-12 text-center">
          <p className="text-mp-text-secondary">Пользователь не найден</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться к списку
            </Link>
          </Button>
        </Card>
      </Container>
    );
  }

  const fullName = `${user.firstName} ${user.lastName || ''}`.trim();

  return (
    <Container size="xl" className="py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title={fullName || user.email}
        description={fullName ? user.email : 'Профиль пользователя'}
        breadcrumbItems={[
          { label: 'Пользователи', href: '/admin/users' },
          { label: fullName || user.email },
        ]}
      >
        {getRoleBadge(user.role)}
      </AdminPageHeader>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User info card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Информация о пользователе</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Envelope className="h-4 w-4 mt-1 text-mp-text-secondary" />
                  <div>
                    <div className="text-sm text-mp-text-secondary">Email</div>
                    <div className="font-medium">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-1 text-mp-text-secondary" />
                  <div>
                    <div className="text-sm text-mp-text-secondary">Имя</div>
                    <div className="font-medium">{fullName || '-'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 mt-1 text-mp-text-secondary" />
                  <div>
                    <div className="text-sm text-mp-text-secondary">Роль</div>
                    <div className="mt-1">{getRoleBadge(user.role)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 mt-1 text-mp-text-secondary" />
                  <div>
                    <div className="text-sm text-mp-text-secondary">Верификация</div>
                    <div className="mt-1">{getVerificationBadge(user.verificationStatus)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Gift className="h-4 w-4 mt-1 text-mp-text-secondary" />
                  <div>
                    <div className="text-sm text-mp-text-secondary">Бонусный баланс</div>
                    <div className="font-medium text-mp-accent-secondary">
                      {formatCurrency(user.bonusBalance || 0)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-1 text-mp-text-secondary" />
                  <div>
                    <div className="text-sm text-mp-text-secondary">Регистрация</div>
                    <div className="font-medium">{formatDate(user.createdAt)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="subscriptions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="subscriptions">Подписки</TabsTrigger>
              <TabsTrigger value="transactions">Транзакции</TabsTrigger>
              <TabsTrigger value="bonuses">Бонусы</TabsTrigger>
              <TabsTrigger value="sessions">Сессии</TabsTrigger>
            </TabsList>

            {/* Subscriptions tab */}
            <TabsContent value="subscriptions">
              {user.subscriptions && user.subscriptions.length > 0 ? (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>План</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Начало</TableHead>
                          <TableHead>Окончание</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">
                              {sub.planName}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  sub.status === 'ACTIVE'
                                    ? 'bg-green-500/20 text-green-400 border-transparent'
                                    : 'bg-gray-500/20 text-gray-400 border-transparent'
                                }
                              >
                                {sub.status === 'ACTIVE' ? 'Активна' : sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-mp-text-secondary">
                              {formatDate(sub.startedAt)}
                            </TableCell>
                            <TableCell className="text-mp-text-secondary">
                              {formatDate(sub.expiresAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ) : (
                <Card className="py-8 text-center">
                  <p className="text-mp-text-secondary">Нет подписок</p>
                </Card>
              )}
            </TabsContent>

            {/* Transactions tab */}
            <TabsContent value="transactions">
              {user.recentTransactions && user.recentTransactions.length > 0 ? (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Тип</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Дата</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.recentTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-medium">
                              {tx.type}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell>
                              {getTransactionStatusBadge(tx.status)}
                            </TableCell>
                            <TableCell className="text-mp-text-secondary">
                              {formatDateTime(tx.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ) : (
                <Card className="py-8 text-center">
                  <p className="text-mp-text-secondary">Нет транзакций</p>
                </Card>
              )}
            </TabsContent>

            {/* Bonuses tab */}
            <TabsContent value="bonuses">
              {user.bonusTransactions && user.bonusTransactions.length > 0 ? (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Тип</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Источник</TableHead>
                          <TableHead>Дата</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.bonusTransactions.map((bt) => (
                          <TableRow key={bt.id}>
                            <TableCell className="font-medium">
                              {bt.type}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  bt.amount > 0
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }
                              >
                                {bt.amount > 0 ? '+' : ''}
                                {formatCurrency(bt.amount)}
                              </span>
                            </TableCell>
                            <TableCell className="text-mp-text-secondary">
                              {bt.source}
                            </TableCell>
                            <TableCell className="text-mp-text-secondary">
                              {formatDateTime(bt.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ) : (
                <Card className="py-8 text-center">
                  <p className="text-mp-text-secondary">Нет бонусных операций</p>
                </Card>
              )}
            </TabsContent>

            {/* Sessions tab */}
            <TabsContent value="sessions">
              {user.sessions && user.sessions.length > 0 ? (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Устройство</TableHead>
                          <TableHead>IP адрес</TableHead>
                          <TableHead>Создана</TableHead>
                          <TableHead>Истекает</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.sessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {session.deviceInfo || 'Неизвестно'}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-mp-text-secondary">
                              {session.ipAddress}
                            </TableCell>
                            <TableCell className="text-mp-text-secondary">
                              {formatDateTime(session.createdAt)}
                            </TableCell>
                            <TableCell className="text-mp-text-secondary">
                              {formatDateTime(session.expiresAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              ) : (
                <Card className="py-8 text-center">
                  <p className="text-mp-text-secondary">Нет активных сессий</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статус</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-mp-text-secondary">Аккаунт</span>
                <div className="mt-1">
                  {user.isActive !== false ? (
                    <Badge className="bg-green-500/20 text-green-400 border-transparent">
                      Активен
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-transparent">
                      Заблокирован
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <span className="text-sm text-mp-text-secondary">Возрастная категория</span>
                <div className="mt-1 font-medium">{user.ageCategory || '-'}</div>
              </div>

              {user.referralCode && (
                <div>
                  <span className="text-sm text-mp-text-secondary">Реферальный код</span>
                  <div className="mt-1 font-mono text-sm">{user.referralCode}</div>
                </div>
              )}

              {user.lastLoginAt && (
                <div>
                  <span className="text-sm text-mp-text-secondary">Последний вход</span>
                  <div className="mt-1 text-sm">{formatDateTime(user.lastLoginAt)}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Change role */}
              <div className="space-y-2">
                <span className="text-sm text-mp-text-secondary">Изменить роль</span>
                <Select
                  value={user.role}
                  onValueChange={handleRoleChange}
                  disabled={updateUser.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUEST">Гость</SelectItem>
                    <SelectItem value="BUYER">Покупатель</SelectItem>
                    <SelectItem value="PARTNER">Партнёр</SelectItem>
                    <SelectItem value="MINOR">Несовершеннолетний</SelectItem>
                    <SelectItem value="MODERATOR">Модератор</SelectItem>
                    <SelectItem value="ADMIN">Админ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Block / Unblock */}
              <Button
                variant={user.isActive !== false ? 'destructive' : 'default'}
                className="w-full"
                onClick={handleToggleActive}
                disabled={updateUser.isPending}
              >
                {user.isActive !== false ? (
                  <>
                    <Prohibit className="mr-2 h-4 w-4" />
                    Заблокировать
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Разблокировать
                  </>
                )}
              </Button>

              {/* View as user */}
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/profile`} target="_blank">
                  <ArrowSquareOut className="mr-2 h-4 w-4" />
                  Профиль пользователя
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
