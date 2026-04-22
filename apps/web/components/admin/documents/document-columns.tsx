'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eye, Globe, XCircle } from '@phosphor-icons/react';

import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import type { LegalDocument, LegalDocumentType } from '@/hooks/use-admin-documents';

/**
 * Document type labels in Russian
 */
const documentTypeLabels: Record<LegalDocumentType, string> = {
  USER_AGREEMENT: 'Соглашение',
  OFFER: 'Оферта',
  PRIVACY_POLICY: 'Политика',
  PARTNER_AGREEMENT: 'Партнёрское',
  SUPPLEMENTARY: 'Доп.условия',
};

/**
 * Document type badge colors
 */
const documentTypeColors: Record<LegalDocumentType, string> = {
  USER_AGREEMENT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  OFFER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  PRIVACY_POLICY: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  PARTNER_AGREEMENT: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  SUPPLEMENTARY: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

/**
 * Format date string for display
 */
function formatDate(dateString?: string): string {
  if (!dateString) return '\u2014';
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Create document columns with action handlers
 */
export function getDocumentColumns(actions: {
  onView: (doc: LegalDocument) => void;
  onPublish: (doc: LegalDocument) => void;
  onDeactivate: (doc: LegalDocument) => void;
}): ColumnDef<LegalDocument>[] {
  return [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Название" />
      ),
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <p className="truncate font-medium text-mp-text-primary">
            {row.getValue('title')}
          </p>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Тип" />
      ),
      cell: ({ row }) => {
        const type = row.getValue('type') as LegalDocumentType;
        return (
          <Badge className={documentTypeColors[type]}>
            {documentTypeLabels[type]}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'version',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Версия" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-mono text-mp-text-secondary">
          {row.getValue('version')}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Активен" />
      ),
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean;
        return (
          <Badge
            className={
              isActive
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }
          >
            {isActive ? 'Активен' : 'Неактивен'}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'requiresAcceptance',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Требует принятия" />
      ),
      cell: ({ row }) => {
        const requires = row.getValue('requiresAcceptance') as boolean;
        return (
          <span className={`text-sm ${requires ? 'text-mp-text-primary' : 'text-mp-text-disabled'}`}>
            {requires ? 'Да' : 'Нет'}
          </span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'publishedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Опубликован" />
      ),
      cell: ({ row }) => {
        const publishedAt = row.original.publishedAt;
        return (
          <span className="text-sm text-mp-text-secondary">
            {publishedAt ? formatDate(publishedAt) : (
              <span className="italic text-mp-text-disabled">Черновик</span>
            )}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const doc = row.original;
        const rowActions = [
          {
            label: 'Просмотр',
            icon: Eye,
            onClick: () => actions.onView(doc),
          },
        ];

        if (!doc.isActive) {
          rowActions.push({
            label: 'Опубликовать',
            icon: Globe,
            onClick: () => actions.onPublish(doc),
          });
        }

        if (doc.isActive) {
          rowActions.push({
            label: 'Деактивировать',
            icon: XCircle,
            onClick: () => actions.onDeactivate(doc),
            variant: 'destructive' as const,
            separator: true,
          } as typeof rowActions[number]);
        }

        return <DataTableRowActions row={row} actions={rowActions} />;
      },
    },
  ];
}
