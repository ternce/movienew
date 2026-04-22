'use client';

import { GitBranch, Coins, Wallet, ShareNetwork } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PartnerQuickActionsProps {
  canWithdraw?: boolean;
  className?: string;
}

export function PartnerQuickActions({
  canWithdraw = false,
  className,
}: PartnerQuickActionsProps) {
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      <Button variant="outline" asChild>
        <Link href="/partner/referrals">
          <GitBranch className="mr-2 h-4 w-4" />
          Рефералы
        </Link>
      </Button>

      <Button variant="outline" asChild>
        <Link href="/partner/commissions">
          <Coins className="mr-2 h-4 w-4" />
          Комиссии
        </Link>
      </Button>

      <Button
        variant={canWithdraw ? 'default' : 'outline'}
        asChild
        className={canWithdraw ? 'bg-gradient-to-r from-mp-accent-primary to-mp-accent-secondary' : ''}
      >
        <Link href="/partner/withdrawals/new">
          <Wallet className="mr-2 h-4 w-4" />
          Вывести
        </Link>
      </Button>

      <Button variant="outline" asChild>
        <Link href="/partner/invite">
          <ShareNetwork className="mr-2 h-4 w-4" />
          Пригласить
        </Link>
      </Button>
    </div>
  );
}
