'use client';

import {
  FileText,
  CheckCircle,
  ShieldCheck,
  Plus,
  Funnel,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { getDocumentColumns } from '@/components/admin/documents/document-columns';
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
  useAdminDocuments,
  usePublishDocument,
  useDeactivateDocument,
} from '@/hooks/use-admin-documents';
import type { LegalDocument, LegalDocumentType } from '@/hooks/use-admin-documents';

/**
 * Admin legal documents list page
 */
export default function AdminDocumentsPage() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(20);
  const [typeFilter, setTypeFilter] = React.useState<LegalDocumentType | null>(null);

  const { data, isLoading } = useAdminDocuments({
    type: typeFilter || undefined,
    page,
    limit,
  });

  const publishDocument = usePublishDocument();
  const deactivateDocument = useDeactivateDocument();

  const documents = data?.items ?? [];
  const totalItems = data?.total ?? 0;

  // Compute stats
  const totalCount = totalItems;
  const activeCount = documents.filter((d) => d.isActive).length;
  const requiresAcceptanceCount = documents.filter((d) => d.requiresAcceptance).length;

  const handleView = React.useCallback(
    (doc: LegalDocument) => {
      router.push(`/admin/documents/${doc.id}`);
    },
    [router]
  );

  const handlePublish = React.useCallback(
    (doc: LegalDocument) => {
      if (confirm(`Опубликовать документ "${doc.title}"? Он станет активным и видимым для пользователей.`)) {
        publishDocument.mutate(doc.id);
      }
    },
    [publishDocument]
  );

  const handleDeactivate = React.useCallback(
    (doc: LegalDocument) => {
      if (confirm(`Деактивировать документ "${doc.title}"?`)) {
        deactivateDocument.mutate(doc.id);
      }
    },
    [deactivateDocument]
  );

  const columns = React.useMemo(
    () =>
      getDocumentColumns({
        onView: handleView,
        onPublish: handlePublish,
        onDeactivate: handleDeactivate,
      }),
    [handleView, handlePublish, handleDeactivate]
  );

  const hasFilters = !!typeFilter;

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Правовые документы"
        description="Управление пользовательскими соглашениями и правовыми документами"
      >
        <Button asChild>
          <Link href="/admin/documents/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать документ
          </Link>
        </Button>
      </AdminPageHeader>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Всего документов"
          value={isLoading ? '...' : totalCount.toLocaleString('ru-RU')}
          icon={FileText}
        />
        <StatsCard
          title="Активных"
          value={isLoading ? '...' : activeCount.toLocaleString('ru-RU')}
          icon={CheckCircle}
        />
        <StatsCard
          title="Требуют принятия"
          value={isLoading ? '...' : requiresAcceptanceCount.toLocaleString('ru-RU')}
          icon={ShieldCheck}
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
              <Label className="text-xs text-mp-text-secondary">Тип документа</Label>
              <Select
                value={typeFilter || 'all'}
                onValueChange={(v) => {
                  setTypeFilter(v === 'all' ? null : (v as LegalDocumentType));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="USER_AGREEMENT">Соглашение</SelectItem>
                  <SelectItem value="OFFER">Оферта</SelectItem>
                  <SelectItem value="PRIVACY_POLICY">Политика конфиденциальности</SelectItem>
                  <SelectItem value="PARTNER_AGREEMENT">Партнёрское соглашение</SelectItem>
                  <SelectItem value="SUPPLEMENTARY">Дополнительные условия</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter(null);
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
        data={documents}
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
