'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eye, PaperPlaneTilt, XCircle } from '@phosphor-icons/react';

import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import type { NewsletterCampaign } from '@/hooks/use-admin-notifications';

/**
 * Newsletter status configuration
 */
const statusConfig: Record<
  NewsletterCampaign['status'],
  { label: string; className: string }
> = {
  DRAFT: { label: 'Черновик', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  SCHEDULED: { label: 'Запланирована', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  SENDING: { label: 'Отправляется', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  SENT: { label: 'Отправлена', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  CANCELLED: { label: 'Отменена', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Create campaign columns with action handlers
 */
export function getCampaignColumns(actions: {
  onView: (campaign: NewsletterCampaign) => void;
  onSend: (campaign: NewsletterCampaign) => void;
  onCancel: (campaign: NewsletterCampaign) => void;
}): ColumnDef<NewsletterCampaign>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Название" />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="truncate font-medium text-mp-text-primary">
            {row.getValue('name')}
          </p>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'subject',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Тема" />
      ),
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <p className="truncate text-sm text-mp-text-secondary">
            {row.getValue('subject')}
          </p>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Статус" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as NewsletterCampaign['status'];
        const config = statusConfig[status];
        return (
          <Badge className={config.className}>
            {config.label}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'sentCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Отправлено" />
      ),
      cell: ({ row }) => {
        const sentCount = row.original.sentCount;
        const total = row.original.totalRecipients;
        return (
          <span className="text-sm text-mp-text-secondary">
            {sentCount.toLocaleString('ru-RU')}
            {total > 0 && (
              <span className="text-mp-text-disabled"> / {total.toLocaleString('ru-RU')}</span>
            )}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'scheduledAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Запланировано" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-mp-text-secondary">
          {formatDate(row.original.scheduledAt)}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'sentAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Отправлено" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-mp-text-secondary">
          {formatDate(row.original.sentAt)}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const campaign = row.original;
        const rowActions = [
          {
            label: 'Просмотр',
            icon: Eye,
            onClick: () => actions.onView(campaign),
          },
        ];

        if (campaign.status === 'DRAFT') {
          rowActions.push({
            label: 'Отправить',
            icon: PaperPlaneTilt,
            onClick: () => actions.onSend(campaign),
          });
        }

        if (campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') {
          rowActions.push({
            label: 'Отменить',
            icon: XCircle,
            onClick: () => actions.onCancel(campaign),
            variant: 'destructive' as const,
            separator: true,
          } as typeof rowActions[number]);
        }

        return <DataTableRowActions row={row} actions={rowActions} />;
      },
    },
  ];
}
