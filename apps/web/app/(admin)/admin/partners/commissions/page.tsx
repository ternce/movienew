'use client';

import { Funnel } from '@phosphor-icons/react';
import * as React from 'react';

import {
  AdminCommissionsTable,
} from '@/components/admin/partners';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAdminCommissions,
  useApproveCommission,
  useRejectCommission,
  useApproveCommissionsBatch,
} from '@/hooks/use-admin-partner';
import type { CommissionStatus } from '@/types';

/**
 * Admin commissions management page
 */
export default function AdminCommissionsPage() {
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<CommissionStatus | null>(null);
  const [levelFilter, setLevelFilter] = React.useState<number | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const { data: commissions, isLoading } = useAdminCommissions({
    status: statusFilter || undefined,
    level: levelFilter || undefined,
    page,
    limit: 20,
  });

  const approveCommission = useApproveCommission();
  const rejectCommission = useRejectCommission();
  const approveCommissionsBatch = useApproveCommissionsBatch();

  const hasFilters = statusFilter || levelFilter;

  const handleApprove = (id: string) => {
    approveCommission.mutate(id, {
      onSuccess: () => setSelectedIds((prev) => prev.filter((i) => i !== id)),
    });
  };

  const handleReject = (id: string, reason: string) => {
    rejectCommission.mutate(
      { id, reason },
      {
        onSuccess: () => setSelectedIds((prev) => prev.filter((i) => i !== id)),
      }
    );
  };

  const handleBatchApprove = (ids: string[]) => {
    approveCommissionsBatch.mutate(ids, {
      onSuccess: () => setSelectedIds([]),
    });
  };

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Комиссии"
        description="Управление комиссиями партнёров"
      />

      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Funnel className="h-4 w-4 text-mp-text-secondary" />
                <span className="text-sm font-medium">Фильтры:</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-mp-text-secondary">Статус</Label>
                <Select
                  value={statusFilter || 'all'}
                  onValueChange={(v) => {
                    setStatusFilter(v === 'all' ? null : (v as CommissionStatus));
                    setPage(1);
                    setSelectedIds([]);
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="PENDING">Ожидает</SelectItem>
                    <SelectItem value="APPROVED">Одобрена</SelectItem>
                    <SelectItem value="PAID">Выплачена</SelectItem>
                    <SelectItem value="CANCELLED">Отменена</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-mp-text-secondary">Уровень</Label>
                <Select
                  value={levelFilter?.toString() || 'all'}
                  onValueChange={(v) => {
                    setLevelFilter(v === 'all' ? null : parseInt(v, 10));
                    setPage(1);
                    setSelectedIds([]);
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="1">1 уровень</SelectItem>
                    <SelectItem value="2">2 уровень</SelectItem>
                    <SelectItem value="3">3 уровень</SelectItem>
                    <SelectItem value="4">4 уровень</SelectItem>
                    <SelectItem value="5">5 уровень</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter(null);
                    setLevelFilter(null);
                    setPage(1);
                    setSelectedIds([]);
                  }}
                >
                  Сбросить
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Commissions table */}
        <AdminCommissionsTable
          data={commissions}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onApprove={handleApprove}
          onReject={handleReject}
          onBatchApprove={handleBatchApprove}
          isApproving={approveCommission.isPending || approveCommissionsBatch.isPending}
          isRejecting={rejectCommission.isPending}
          emptyMessage={
            hasFilters
              ? 'Нет комиссий по выбранным фильтрам'
              : 'Нет комиссий'
          }
        />

        {/* Pagination */}
        {commissions && commissions.totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={commissions.totalPages}
              onPageChange={(p) => {
                setPage(p);
                setSelectedIds([]);
              }}
            />
          </div>
        )}
      </div>
    </Container>
  );
}
