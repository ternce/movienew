'use client';

import {
  Envelope,
  PaperPlaneTilt,
  Clock,
  FileText,
  Plus,
  Funnel,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { getCampaignColumns } from '@/components/admin/newsletters/campaign-columns';
import { DataTable } from '@/components/admin/data-table/data-table';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAdminNewsletters,
  useSendNewsletter,
  useCancelNewsletter,
} from '@/hooks/use-admin-notifications';
import type { NewsletterCampaign } from '@/hooks/use-admin-notifications';

/**
 * Admin newsletters list page
 */
export default function AdminNewslettersPage() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(20);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  const { data, isLoading } = useAdminNewsletters({
    status: statusFilter || undefined,
    page,
    limit,
  });

  const sendNewsletter = useSendNewsletter();
  const cancelNewsletter = useCancelNewsletter();

  const newsletters = data?.items ?? [];
  const totalItems = data?.total ?? 0;

  // Compute stats from loaded data
  const totalCount = totalItems;
  const sentCount = newsletters.filter((n) => n.status === 'SENT').length;
  const scheduledCount = newsletters.filter((n) => n.status === 'SCHEDULED').length;
  const draftCount = newsletters.filter((n) => n.status === 'DRAFT').length;

  const handleView = React.useCallback(
    (campaign: NewsletterCampaign) => {
      router.push(`/admin/newsletters/${campaign.id}`);
    },
    [router]
  );

  const handleSend = React.useCallback(
    (campaign: NewsletterCampaign) => {
      if (confirm('Отправить рассылку? Это действие нельзя отменить.')) {
        sendNewsletter.mutate(campaign.id);
      }
    },
    [sendNewsletter]
  );

  const handleCancel = React.useCallback(
    (campaign: NewsletterCampaign) => {
      if (confirm('Отменить рассылку?')) {
        cancelNewsletter.mutate(campaign.id);
      }
    },
    [cancelNewsletter]
  );

  const columns = React.useMemo(
    () =>
      getCampaignColumns({
        onView: handleView,
        onSend: handleSend,
        onCancel: handleCancel,
      }),
    [handleView, handleSend, handleCancel]
  );

  const hasFilters = !!statusFilter;

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Рассылки"
        description="Управление email-рассылками и кампаниями"
      >
        <Button asChild>
          <Link href="/admin/newsletters/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать рассылку
          </Link>
        </Button>
      </AdminPageHeader>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Всего рассылок"
          value={isLoading ? '...' : totalCount.toLocaleString('ru-RU')}
          icon={Envelope}
        />
        <StatsCard
          title="Отправлено"
          value={isLoading ? '...' : sentCount.toLocaleString('ru-RU')}
          icon={PaperPlaneTilt}
        />
        <StatsCard
          title="Запланировано"
          value={isLoading ? '...' : scheduledCount.toLocaleString('ru-RU')}
          icon={Clock}
        />
        <StatsCard
          title="Черновики"
          value={isLoading ? '...' : draftCount.toLocaleString('ru-RU')}
          icon={FileText}
        />
      </div>

      {/* Filters */}
      <Card className="mb-6">
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
                  setStatusFilter(v === 'all' ? null : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="DRAFT">Черновик</SelectItem>
                  <SelectItem value="SCHEDULED">Запланирована</SelectItem>
                  <SelectItem value="SENDING">Отправляется</SelectItem>
                  <SelectItem value="SENT">Отправлена</SelectItem>
                  <SelectItem value="CANCELLED">Отменена</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter(null);
                  setPage(1);
                }}
              >
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={newsletters}
        isLoading={isLoading}
        manualPagination
        pagination={
          data
            ? {
                page: data.page,
                limit: data.limit,
                total: data.total,
                totalPages: data.totalPages,
              }
            : undefined
        }
        onPaginationChange={(newPage) => setPage(newPage)}
      />
    </Container>
  );
}
