'use client';

import { Users } from '@phosphor-icons/react';
import * as React from 'react';

import {
  PartnerStatsGrid,
  PartnerLevelCard,
  PartnerQuickActions,
  RecentCommissions,
  PartnerInviteCard,
} from '@/components/partner';
import { Container } from '@/components/ui/container';
import { usePartnerDashboard, usePartnerBalance } from '@/hooks/use-partner';

/**
 * Partner dashboard page
 */
export default function PartnerDashboardPage() {
  const { data: dashboard, isLoading: isDashboardLoading } = usePartnerDashboard();
  const { data: balance, isLoading: isBalanceLoading } = usePartnerBalance();

  const isLoading = isDashboardLoading || isBalanceLoading;
  const canWithdraw = balance?.canWithdraw ?? false;

  return (
    <Container size="xl" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-mp-accent-primary/20">
            <Users className="h-6 w-6 text-mp-accent-primary" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Партнёрская программа
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Приглашайте друзей и получайте комиссию с их покупок
        </p>
      </div>

      {/* Quick actions */}
      <PartnerQuickActions canWithdraw={canWithdraw} className="mb-8" />

      {/* Stats grid */}
      <PartnerStatsGrid
        dashboard={dashboard}
        isLoading={isLoading}
        className="mb-8"
      />

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Level card */}
        <PartnerLevelCard
          dashboard={dashboard}
          isLoading={isLoading}
        />

        {/* Recent commissions */}
        <RecentCommissions
          commissions={dashboard?.recentCommissions}
          isLoading={isLoading}
        />
      </div>

      {/* Invite card */}
      <PartnerInviteCard
        referralCode={dashboard?.referralCode}
        referralUrl={dashboard?.referralUrl}
        isLoading={isLoading}
      />
    </Container>
  );
}
