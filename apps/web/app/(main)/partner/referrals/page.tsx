'use client';

import { GitBranch, ArrowLeft } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { ReferralTreeView, ReferralLinkCompact } from '@/components/partner';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { useReferralTree, usePartnerDashboard } from '@/hooks/use-partner';
import { usePartnerStore } from '@/stores/partner.store';

/**
 * Referral tree page
 */
export default function PartnerReferralsPage() {
  const { treeDepth } = usePartnerStore();
  const { data: tree, isLoading: isTreeLoading, refetch } = useReferralTree(treeDepth);
  const { data: dashboard } = usePartnerDashboard();

  const handleDepthChange = React.useCallback(
    (depth: number) => {
      refetch();
    },
    [refetch]
  );

  return (
    <Container size="xl" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/partner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к дашборду
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-mp-accent-secondary/20">
                <GitBranch className="h-6 w-6 text-mp-accent-secondary" />
              </div>
              <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
                Мои рефералы
              </h1>
            </div>
            <p className="text-mp-text-secondary">
              Дерево рефералов до 5 уровней вглубь
            </p>
          </div>

          {dashboard?.referralUrl && (
            <ReferralLinkCompact referralUrl={dashboard.referralUrl} />
          )}
        </div>
      </div>

      {/* Referral tree */}
      <ReferralTreeView
        data={tree}
        isLoading={isTreeLoading}
        onDepthChange={handleDepthChange}
      />
    </Container>
  );
}
