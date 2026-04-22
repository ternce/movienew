'use client';

import { Users, CaretDown, CaretUp, ArrowsOut, ArrowsIn } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePartnerStore, partnerSelectors } from '@/stores/partner.store';
import type { ReferralTree as ReferralTreeType, ReferralNode } from '@/types';

import { ReferralNodeComponent } from './referral-node';

interface ReferralTreeProps {
  data?: ReferralTreeType | null;
  isLoading?: boolean;
  onDepthChange?: (depth: number) => void;
  className?: string;
}

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

export function ReferralTreeView({
  data,
  isLoading,
  onDepthChange,
  className,
}: ReferralTreeProps) {
  const {
    treeDepth,
    expandedNodes,
    setTreeDepth,
    toggleNode,
    expandAll,
    collapseAll,
  } = usePartnerStore();

  const handleDepthChange = (value: string) => {
    const newDepth = parseInt(value, 10);
    setTreeDepth(newDepth);
    onDepthChange?.(newDepth);
  };

  const isNodeExpanded = (nodeId: string) => {
    return partnerSelectors.isNodeExpanded({ expandedNodes } as never, nodeId);
  };

  if (isLoading) {
    return <ReferralTreeSkeleton className={className} />;
  }

  if (!data || data.nodes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-mp-accent-primary" />
            Дерево рефералов
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-mp-text-disabled mb-4" />
          <p className="text-mp-text-secondary">
            У вас пока нет рефералов. Пригласите друзей и начните зарабатывать!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-mp-accent-primary" />
              Дерево рефералов
            </CardTitle>
            <CardDescription>
              Всего {data.totalCount} рефералов на {data.depth} уровнях
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              <ArrowsOut className="h-4 w-4 mr-1" />
              Развернуть
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              <ArrowsIn className="h-4 w-4 mr-1" />
              Свернуть
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Depth selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="tree-depth" className="text-sm text-mp-text-secondary">
              Глубина:
            </Label>
            <Select value={treeDepth.toString()} onValueChange={handleDepthChange}>
              <SelectTrigger id="tree-depth" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((depth) => (
                  <SelectItem key={depth} value={depth.toString()}>
                    {depth} ур.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox
            label="Всего"
            value={data.stats.totalReferrals.toString()}
          />
          <StatBox
            label="Активных"
            value={data.stats.activeReferrals.toString()}
            highlight
          />
          {Object.entries(data.stats.byLevel).slice(0, 2).map(([level, count]) => (
            <StatBox
              key={level}
              label={`Уровень ${level}`}
              value={count.toString()}
            />
          ))}
        </div>

        {/* Tree visualization */}
        <div className="space-y-2">
          {data.nodes.map((node) => (
            <ReferralNodeComponent
              key={node.id}
              node={node}
              isExpanded={isNodeExpanded(node.id)}
              onToggle={toggleNode}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Stat box component
 */
interface StatBoxProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatBox({ label, value, highlight }: StatBoxProps) {
  return (
    <div className="bg-mp-surface rounded-lg p-3 text-center">
      <div className="text-xs text-mp-text-secondary mb-1">{label}</div>
      <div
        className={cn(
          'text-lg font-bold',
          highlight ? 'text-emerald-400' : 'text-mp-text-primary'
        )}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Skeleton loader
 */
function ReferralTreeSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
