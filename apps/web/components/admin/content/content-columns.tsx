'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eye, PencilSimple, Archive } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { Badge, AgeBadge } from '@/components/ui/badge';
import type { Content } from '@movie-platform/shared';

/**
 * Content type badge color mapping
 */
function getContentTypeBadge(type: string) {
  const config: Record<string, { label: string; className: string }> = {
    SERIES: { label: 'Сериал', className: 'bg-blue-500/20 text-blue-400 border-transparent' },
    CLIP: { label: 'Клип', className: 'bg-green-500/20 text-green-400 border-transparent' },
    SHORT: { label: 'Шорт', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
    TUTORIAL: { label: 'Туториал', className: 'bg-purple-500/20 text-purple-400 border-transparent' },
  };

  const { label, className } = config[type] || { label: type, className: '' };
  return <Badge className={className}>{label}</Badge>;
}

/**
 * Content status badge color mapping
 */
function getContentStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Черновик', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
    PUBLISHED: { label: 'Опубликован', className: 'bg-green-500/20 text-green-400 border-transparent' },
    PENDING: { label: 'На модерации', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
    REJECTED: { label: 'Отклонён', className: 'bg-red-500/20 text-red-400 border-transparent' },
    ARCHIVED: { label: 'Архив', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
  };

  const { label, className } = config[status] || { label: status, className: '' };
  return <Badge className={className}>{label}</Badge>;
}

/**
 * Format number with locale
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

/**
 * Format date
 */
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Content table column definitions
 */
export const contentColumns: ColumnDef<Content>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Название" />
    ),
    cell: ({ row }) => {
      const title = row.getValue('title') as string;
      const slug = row.original.slug;
      return (
        <div className="flex flex-col max-w-[300px]">
          <span className="font-medium text-mp-text-primary truncate">{title}</span>
          <span className="text-xs text-mp-text-disabled font-mono truncate">{slug}</span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'contentType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Тип" />
    ),
    cell: ({ row }) => getContentTypeBadge(row.getValue('contentType') as string),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Статус" />
    ),
    cell: ({ row }) => getContentStatusBadge(row.getValue('status') as string),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'ageCategory',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Возраст" />
    ),
    cell: ({ row }) => {
      const age = row.getValue('ageCategory') as string;
      return <AgeBadge age={age} />;
    },
  },
  {
    accessorKey: 'viewCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Просмотры" />
    ),
    cell: ({ row }) => {
      const count = row.getValue('viewCount') as number;
      return (
        <span className="text-mp-text-secondary">
          {formatNumber(count)}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Создан" />
    ),
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as string;
      return (
        <span className="text-mp-text-secondary text-sm">
          {formatDate(date)}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <ContentRowActions row={row} />,
  },
];

/**
 * Content row actions component with router access
 */
function ContentRowActions({ row }: { row: { original: Content } }) {
  const router = useRouter();

  return (
    <DataTableRowActions
      row={row as never}
      actions={[
        {
          label: 'Просмотреть',
          icon: Eye,
          onClick: () => router.push(`/admin/content/${row.original.id}`),
        },
        {
          label: 'Редактировать',
          icon: PencilSimple,
          onClick: () => router.push(`/admin/content/${row.original.id}`),
        },
        {
          label: 'Архивировать',
          icon: Archive,
          onClick: () => {
            // Trigger archive - handled by parent component
            const event = new CustomEvent('admin:archive-content', {
              detail: { id: row.original.id, title: row.original.title },
            });
            window.dispatchEvent(event);
          },
          variant: 'destructive',
          separator: true,
        },
      ]}
    />
  );
}
