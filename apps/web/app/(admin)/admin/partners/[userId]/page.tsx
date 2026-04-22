'use client';

import {
  ArrowLeft,
  User,
  Envelope,
  Calendar,
  Hash,
  Users,
  Coins,
  Wallet,
  TrendUp,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { PartnerLevelBadge, CommissionTable, WithdrawalTable } from '@/components/partner';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminPartnerDetail } from '@/hooks/use-admin-partner';

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
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Admin partner detail page
 */
export default function AdminPartnerDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const { data: partner, isLoading } = useAdminPartnerDetail(userId);

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

  if (!partner) {
    return (
      <Container size="xl" className="py-8">
        <Card className="py-12 text-center">
          <p className="text-mp-text-secondary">Партнёр не найден</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/partners">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться к списку
            </Link>
          </Button>
        </Card>
      </Container>
    );
  }

  const levelProgress = partner.levelProgress;

  return (
    <Container size="xl" className="py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/partners">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title={`${partner.firstName} ${partner.lastName}`}
        description={partner.email}
      >
        <PartnerLevelBadge level={partner.level} />
      </AdminPageHeader>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-mp-text-secondary">
                <Users className="h-4 w-4" />
                <span className="text-sm">Рефералы</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{partner.totalReferrals}</span>
                <span className="ml-2 text-sm text-mp-text-secondary">
                  ({partner.activeReferrals} акт.)
                </span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-mp-text-secondary">
                <TrendUp className="h-4 w-4" />
                <span className="text-sm">Заработок</span>
              </div>
              <div className="mt-2 text-2xl font-bold">
                {formatCurrency(partner.totalEarnings)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-mp-text-secondary">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">Баланс</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-400">
                {formatCurrency(partner.availableBalance)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-mp-text-secondary">
                <Coins className="h-4 w-4" />
                <span className="text-sm">Ожидает</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-400">
                {formatCurrency(partner.pendingBalance)}
              </div>
            </Card>
          </div>

          {/* Level progress */}
          {levelProgress && levelProgress.nextLevel && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Прогресс уровня</CardTitle>
                <CardDescription>
                  До следующего уровня: {levelProgress.nextLevel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-mp-text-secondary">Активных рефералов</span>
                    <span>
                      {levelProgress.currentReferrals} / {levelProgress.requiredReferrals}
                    </span>
                  </div>
                  <ProgressBar
                    value={(levelProgress.currentReferrals / levelProgress.requiredReferrals) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-mp-text-secondary">Заработок</span>
                    <span>
                      {formatCurrency(levelProgress.currentEarnings)} / {formatCurrency(levelProgress.requiredEarnings)}
                    </span>
                  </div>
                  <ProgressBar
                    value={(levelProgress.currentEarnings / levelProgress.requiredEarnings) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs with history */}
          <Tabs defaultValue="commissions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="commissions">Комиссии</TabsTrigger>
              <TabsTrigger value="withdrawals">Выводы</TabsTrigger>
              <TabsTrigger value="referrals">Рефералы</TabsTrigger>
            </TabsList>

            <TabsContent value="commissions">
              {partner.recentCommissions && partner.recentCommissions.length > 0 ? (
                <CommissionTable
                  data={{
                    items: partner.recentCommissions,
                    total: partner.recentCommissions.length,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                    totalAmount: partner.recentCommissions.reduce((sum, c) => sum + c.amount, 0),
                  }}
                  emptyMessage="Нет комиссий"
                />
              ) : (
                <Card className="py-8 text-center">
                  <p className="text-mp-text-secondary">Нет комиссий</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="withdrawals">
              {partner.recentWithdrawals && partner.recentWithdrawals.length > 0 ? (
                <WithdrawalTable
                  data={{
                    items: partner.recentWithdrawals,
                    total: partner.recentWithdrawals.length,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                    totalAmount: partner.recentWithdrawals.reduce((sum, w) => sum + w.amount, 0),
                    totalNetAmount: partner.recentWithdrawals.reduce((sum, w) => sum + w.netAmount, 0),
                  }}
                  emptyMessage="Нет выводов"
                />
              ) : (
                <Card className="py-8 text-center">
                  <p className="text-mp-text-secondary">Нет выводов</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="referrals">
              {partner.directReferrals && partner.directReferrals.length > 0 ? (
                <Card>
                  <div className="divide-y">
                    {partner.directReferrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div>
                          <div className="font-medium">
                            {referral.firstName} {referral.lastName}
                          </div>
                          <div className="text-sm text-mp-text-secondary">
                            {referral.email}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={referral.isActive ? 'text-emerald-400' : 'text-mp-text-secondary'}>
                            {referral.isActive ? 'Активен' : 'Неактивен'}
                          </div>
                          <div className="text-xs text-mp-text-secondary">
                            {formatDate(referral.registeredAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="py-8 text-center">
                  <p className="text-mp-text-secondary">Нет прямых рефералов</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Partner info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-1 text-mp-text-secondary" />
                <div>
                  <div className="text-sm text-mp-text-secondary">ID</div>
                  <div className="font-mono text-sm">{partner.id.slice(0, 12)}...</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 mt-1 text-mp-text-secondary" />
                <div>
                  <div className="text-sm text-mp-text-secondary">Реферальный код</div>
                  <div className="font-mono">{partner.referralCode}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Envelope className="h-4 w-4 mt-1 text-mp-text-secondary" />
                <div>
                  <div className="text-sm text-mp-text-secondary">Email</div>
                  <div>{partner.email}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-mp-text-secondary" />
                <div>
                  <div className="text-sm text-mp-text-secondary">Регистрация</div>
                  <div>{formatDate(partner.registeredAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referred by */}
          {partner.referredBy && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Приглашён</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="font-medium">
                    {partner.referredBy.firstName} {partner.referredBy.lastName}
                  </div>
                  <div className="text-sm text-mp-text-secondary">
                    {partner.referredBy.email}
                  </div>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <Link href={`/admin/partners/${partner.referredBy.id}`}>
                      Перейти к профилю
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/partners/commissions?userId=${partner.id}`}>
                  <Coins className="mr-2 h-4 w-4" />
                  Все комиссии
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/partners/withdrawals?userId=${partner.id}`}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Все выводы
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
