'use client';

import { Crown, Plus, ClockCounterClockwise } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  SubscriptionDetails,
  SubscriptionBadge,
  CancelSubscriptionDialog,
} from '@/components/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useMySubscriptions,
  useActiveSubscription,
  useCancelSubscription,
  useToggleAutoRenew,
} from '@/hooks';
import type { UserSubscription } from '@/types';

/**
 * My subscriptions page
 */
export default function MySubscriptionsPage() {
  const router = useRouter();
  const { data: subscriptionsData, isLoading } = useMySubscriptions();
  useActiveSubscription(); // Used for cache invalidation

  // Mutations
  const cancelMutation = useCancelSubscription();
  const toggleAutoRenewMutation = useToggleAutoRenew();

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] =
    React.useState<UserSubscription | null>(null);

  // Separate subscriptions by status
  const activeSubscriptions = React.useMemo(
    () => subscriptionsData?.items.filter((s) => s.status === 'ACTIVE') || [],
    [subscriptionsData]
  );

  const pastSubscriptions = React.useMemo(
    () =>
      subscriptionsData?.items.filter(
        (s) => s.status === 'EXPIRED' || s.status === 'CANCELLED'
      ) || [],
    [subscriptionsData]
  );

  const handleCancelClick = (subscription: UserSubscription) => {
    setSubscriptionToCancel(subscription);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = (immediate: boolean, reason?: string) => {
    if (!subscriptionToCancel) return;

    cancelMutation.mutate(
      {
        subscriptionId: subscriptionToCancel.id,
        immediate,
        reason,
      },
      {
        onSuccess: () => {
          setCancelDialogOpen(false);
          setSubscriptionToCancel(null);
        },
      }
    );
  };

  const handleToggleAutoRenew = (subscription: UserSubscription, autoRenew: boolean) => {
    toggleAutoRenewMutation.mutate({
      subscriptionId: subscription.id,
      autoRenew,
    });
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  return (
    <div className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Мои подписки
          </h1>
          <p className="mt-1 text-mp-text-secondary">
            Управляйте вашими активными подписками
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/account/payments">
              <ClockCounterClockwise className="mr-2 h-4 w-4" />
              История платежей
            </Link>
          </Button>
          <Button variant="gradient" asChild>
            <Link href="/pricing">
              <Plus className="mr-2 h-4 w-4" />
              Новая подписка
            </Link>
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {/* No subscriptions */}
      {!isLoading && (!subscriptionsData || subscriptionsData.items.length === 0) && (
        <Card className="py-12 text-center">
          <CardContent>
            <Crown className="mx-auto mb-4 h-12 w-12 text-mp-text-disabled" />
            <h2 className="mb-2 text-xl font-semibold text-mp-text-primary">
              У вас пока нет подписок
            </h2>
            <p className="mb-6 text-mp-text-secondary">
              Оформите подписку, чтобы получить доступ к эксклюзивному контенту
            </p>
            <Button variant="gradient" asChild>
              <Link href="/pricing">Выбрать тариф</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions tabs */}
      {!isLoading && subscriptionsData && subscriptionsData.items.length > 0 && (
        <Tabs defaultValue="active">
          <TabsList className="mb-6">
            <TabsTrigger value="active" className="gap-2">
              <Crown className="h-4 w-4" />
              Активные ({activeSubscriptions.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <ClockCounterClockwise className="h-4 w-4" />
              История ({pastSubscriptions.length})
            </TabsTrigger>
          </TabsList>

          {/* Active subscriptions */}
          <TabsContent value="active">
            {activeSubscriptions.length === 0 ? (
              <Card className="py-8 text-center">
                <CardContent>
                  <p className="text-mp-text-secondary">
                    Нет активных подписок
                  </p>
                  <Button variant="gradient" className="mt-4" asChild>
                    <Link href="/pricing">Оформить подписку</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {activeSubscriptions.map((subscription) => (
                  <SubscriptionDetails
                    key={subscription.id}
                    subscription={subscription}
                    onToggleAutoRenew={(autoRenew) =>
                      handleToggleAutoRenew(subscription, autoRenew)
                    }
                    onCancel={() => handleCancelClick(subscription)}
                    onUpgrade={handleUpgrade}
                    isTogglingAutoRenew={
                      toggleAutoRenewMutation.isPending &&
                      toggleAutoRenewMutation.variables?.subscriptionId ===
                        subscription.id
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Subscription history */}
          <TabsContent value="history">
            {pastSubscriptions.length === 0 ? (
              <Card className="py-8 text-center">
                <CardContent>
                  <p className="text-mp-text-secondary">
                    История подписок пуста
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastSubscriptions.map((subscription) => (
                  <Card key={subscription.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mp-surface">
                            <Crown className="h-6 w-6 text-mp-text-disabled" />
                          </div>
                          <div>
                            <h3 className="font-medium text-mp-text-primary">
                              {subscription.plan.name}
                            </h3>
                            <p className="text-sm text-mp-text-secondary">
                              {new Date(subscription.startedAt).toLocaleDateString(
                                'ru-RU'
                              )}{' '}
                              —{' '}
                              {new Date(subscription.expiresAt).toLocaleDateString(
                                'ru-RU'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <SubscriptionBadge
                            subscription={subscription}
                            showPlanName={false}
                          />
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/pricing">Возобновить</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Cancel subscription dialog */}
      {subscriptionToCancel && (
        <CancelSubscriptionDialog
          subscription={subscriptionToCancel}
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onConfirm={handleCancelConfirm}
          isLoading={cancelMutation.isPending}
        />
      )}
    </div>
  );
}
