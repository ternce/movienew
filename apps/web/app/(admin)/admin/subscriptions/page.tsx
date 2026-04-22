'use client';

import { CreditCard, Info } from '@phosphor-icons/react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';

export default function AdminSubscriptionsPage() {
  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Подписки"
        description="Управление подписками пользователей"
      />

      <Card className="mt-6">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-mp-accent-primary/10 flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-mp-accent-primary" />
          </div>
          <h3 className="text-lg font-semibold text-mp-text-primary mb-2">
            Раздел в разработке
          </h3>
          <p className="text-sm text-mp-text-secondary max-w-md">
            Управление подписками будет доступно в следующем обновлении.
            Текущие подписки можно просматривать в разделе платежей.
          </p>
          <div className="flex items-center gap-1.5 mt-4 text-xs text-mp-text-disabled">
            <Info className="w-3.5 h-3.5" />
            <span>API в разработке</span>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
