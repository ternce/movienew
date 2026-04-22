'use client';

import {
  FilmStrip,
  CheckCircle,
  NotePencil,
  Archive,
  Plus,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { DataTable } from '@/components/admin/data-table/data-table';
import { contentColumns } from '@/components/admin/content/content-columns';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import {
  useAdminContent,
  useDeleteContent,
} from '@/hooks/use-admin-content';

/**
 * Admin content management page
 */
export default function AdminContentPage() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');

  const { data, isLoading } = useAdminContent({
    page,
    limit,
    search: search || undefined,
  });

  const deleteContent = useDeleteContent();

  // Listen for archive events from row actions
  React.useEffect(() => {
    const handleArchive = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        if (window.confirm(`Архивировать "${detail.title}"?`)) {
          deleteContent.mutate(detail.id);
        }
      }
    };

    window.addEventListener('admin:archive-content', handleArchive);
    return () => window.removeEventListener('admin:archive-content', handleArchive);
  }, [deleteContent]);

  // Calculate stats from data
  const items = data?.items || [];
  const totalContent = data?.total || 0;
  const publishedCount = items.filter((i) => i.status === 'PUBLISHED').length;
  const draftCount = items.filter((i) => i.status === 'DRAFT').length;
  const archivedCount = items.filter((i) => i.status === 'ARCHIVED').length;

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Контент"
        description="Управление контентом платформы"
      >
        <Button asChild>
          <Link href="/admin/content/new">
            <Plus className="mr-2 h-4 w-4" />
            Добавить контент
          </Link>
        </Button>
      </AdminPageHeader>

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Всего контента"
          value={totalContent}
          icon={FilmStrip}
        />
        <StatsCard
          title="Опубликовано"
          value={publishedCount}
          icon={CheckCircle}
        />
        <StatsCard
          title="Черновики"
          value={draftCount}
          icon={NotePencil}
        />
        <StatsCard
          title="Архив"
          value={archivedCount}
          icon={Archive}
        />
      </div>

      {/* Content table */}
      <DataTable
        columns={contentColumns}
        data={items}
        isLoading={isLoading}
        searchKey="title"
        searchPlaceholder="Поиск по названию..."
        manualPagination
        manualFiltering
        onSearch={handleSearch}
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
        onPaginationChange={handlePaginationChange}
        filterOptions={[
          {
            id: 'status',
            title: 'Статус',
            options: [
              { label: 'Черновик', value: 'DRAFT' },
              { label: 'Опубликован', value: 'PUBLISHED' },
              { label: 'На модерации', value: 'PENDING' },
              { label: 'Отклонён', value: 'REJECTED' },
              { label: 'Архив', value: 'ARCHIVED' },
            ],
          },
          {
            id: 'contentType',
            title: 'Тип',
            options: [
              { label: 'Сериал', value: 'SERIES' },
              { label: 'Клип', value: 'CLIP' },
              { label: 'Шорт', value: 'SHORT' },
              { label: 'Туториал', value: 'TUTORIAL' },
            ],
          },
        ]}
      />
    </Container>
  );
}
