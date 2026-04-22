'use client';

import { Check, X } from '@phosphor-icons/react';
import * as React from 'react';

import { CommissionStatusBadge } from '@/components/partner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AdminCommission, AdminCommissionList } from '@/types';

interface AdminCommissionsTableProps {
  data?: AdminCommissionList;
  isLoading?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onBatchApprove?: (ids: string[]) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  emptyMessage?: string;
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

/**
 * Format date
 */
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminCommissionsTable({
  data,
  isLoading,
  selectedIds = [],
  onSelectionChange,
  onApprove,
  onReject,
  onBatchApprove,
  isApproving,
  isRejecting,
  emptyMessage = 'Нет комиссий',
  className,
}: AdminCommissionsTableProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const pendingCommissions = React.useMemo(
    () => data?.items.filter((c) => c.status === 'PENDING') || [],
    [data]
  );

  const allSelected =
    pendingCommissions.length > 0 &&
    pendingCommissions.every((c) => selectedIds.includes(c.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(pendingCommissions.map((c) => c.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, id]);
    } else {
      onSelectionChange?.(selectedIds.filter((i) => i !== id));
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (rejectingId && rejectReason.trim()) {
      onReject?.(rejectingId, rejectReason);
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectReason('');
    }
  };

  if (isLoading) {
    return <CommissionsTableSkeleton className={className} />;
  }

  if (!data || data.items.length === 0) {
    return (
      <Card className={cn('py-12 text-center', className)}>
        <p className="text-mp-text-secondary">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        {/* Batch actions */}
        {selectedIds.length > 0 && (
          <CardContent className="py-3 border-b bg-mp-surface/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-mp-text-secondary">
                Выбрано: {selectedIds.length}
              </span>
              <Button
                size="sm"
                onClick={() => onBatchApprove?.(selectedIds)}
                disabled={isApproving}
              >
                <Check className="mr-2 h-4 w-4" />
                Одобрить выбранные
              </Button>
            </div>
          </CardContent>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={pendingCommissions.length === 0}
                  />
                </TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Партнёр</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead className="text-center">Уровень</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-center">Статус</TableHead>
                <TableHead className="w-[100px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((commission) => (
                <CommissionRow
                  key={commission.id}
                  commission={commission}
                  isSelected={selectedIds.includes(commission.id)}
                  onSelect={(checked) => handleSelectOne(commission.id, checked)}
                  onApprove={() => onApprove?.(commission.id)}
                  onReject={() => handleRejectClick(commission.id)}
                  isApproving={isApproving}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <CardContent className="border-t pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-mp-text-secondary">
              Всего: {data.total} комиссий
            </span>
            <span className="font-medium text-mp-text-primary">
              Сумма: {formatCurrency(data.totalAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить комиссию</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения. Она будет видна партнёру.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Причина</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Укажите причину отклонения..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || isRejecting}
            >
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Commission row component
 */
interface CommissionRowProps {
  commission: AdminCommission;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving?: boolean;
}

function CommissionRow({
  commission,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  isApproving,
}: CommissionRowProps) {
  const isPending = commission.status === 'PENDING';

  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          disabled={!isPending}
        />
      </TableCell>
      <TableCell className="text-mp-text-secondary">
        {formatDate(commission.createdAt)}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{commission.partnerName}</span>
          <span className="text-xs text-mp-text-secondary">
            {commission.partnerEmail}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {commission.sourceUser.firstName} {commission.sourceUser.lastName}
          </span>
          <span className="text-xs text-mp-text-secondary">
            {commission.sourceUser.email}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-mp-surface text-sm font-medium">
          {commission.level}
        </span>
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(commission.amount)}
        <span className="ml-1 text-xs text-mp-text-secondary">
          ({(commission.rate * 100).toFixed(0)}%)
        </span>
      </TableCell>
      <TableCell className="text-center">
        <CommissionStatusBadge status={commission.status} size="sm" />
      </TableCell>
      <TableCell>
        {isPending && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
              onClick={onApprove}
              disabled={isApproving}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-mp-error-text hover:text-red-400 hover:bg-red-500/10"
              onClick={onReject}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton loader
 */
function CommissionsTableSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Skeleton className="h-4 w-4" /></TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Партнёр</TableHead>
              <TableHead>Источник</TableHead>
              <TableHead className="text-center">Уровень</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="text-center">Статус</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-6 rounded-full mx-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-8 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
