'use client';

import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  WarningCircle,
} from '@phosphor-icons/react';
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';

import { AdminPageHeader } from '@/components/admin/layout';
import { DataTable, DataTableColumnHeader, DataTableRowActions } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { cn } from '@/lib/utils';

/**
 * Verification item type
 */
interface Verification {
  id: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  method: string;
  documentUrl?: string | null;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    VERIFIED: 'bg-mp-success-bg text-mp-success-text border-mp-success-text/20',
    REJECTED: 'bg-mp-error-bg text-mp-error-text border-mp-error-text/20',
  };

  return (
    <Badge className={cn('capitalize', styles[status] || 'bg-mp-surface')}>
      {status.toLowerCase()}
    </Badge>
  );
}

/**
 * Table columns definition
 */
const columns: ColumnDef<Verification>[] = [
  {
    accessorKey: 'userEmail',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Пользователь" />
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-mp-text-primary">
          {row.original.userFirstName} {row.original.userLastName}
        </p>
        <p className="text-sm text-mp-text-secondary">
          {row.original.userEmail}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'method',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Метод" />
    ),
    cell: ({ row }) => (
      <span className="capitalize text-mp-text-primary">
        {row.original.method.toLowerCase().replace('_', ' ')}
      </span>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Статус" />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Отправлено" />
    ),
    cell: ({ row }) => (
      <span className="text-mp-text-secondary">
        {new Date(row.original.createdAt).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DataTableRowActions
        row={row}
        actions={[
          {
            label: 'Подробнее',
            icon: Eye,
            onClick: (row) => {
              console.log('View', row.original.id);
            },
          },
          {
            label: 'Одобрить',
            icon: CheckCircle,
            onClick: (row) => {
              console.log('Approve', row.original.id);
            },
          },
          {
            label: 'Отклонить',
            icon: XCircle,
            onClick: (row) => {
              console.log('Reject', row.original.id);
            },
            separator: true,
            variant: 'destructive',
          },
        ]}
      />
    ),
  },
];

/**
 * Mock data for demonstration
 */
const mockVerifications: Verification[] = [
  {
    id: '1',
    userId: 'user-1',
    userEmail: 'john.doe@example.com',
    userFirstName: 'John',
    userLastName: 'Doe',
    method: 'DOCUMENT',
    documentUrl: 'https://example.com/doc.jpg',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    userId: 'user-2',
    userEmail: 'jane.smith@example.com',
    userFirstName: 'Jane',
    userLastName: 'Smith',
    method: 'PAYMENT',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    userId: 'user-3',
    userEmail: 'bob.wilson@example.com',
    userFirstName: 'Bob',
    userLastName: 'Wilson',
    method: 'DOCUMENT',
    documentUrl: 'https://example.com/doc2.jpg',
    status: 'VERIFIED',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reviewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    userId: 'user-4',
    userEmail: 'alice.johnson@example.com',
    userFirstName: 'Alice',
    userLastName: 'Johnson',
    method: 'PAYMENT',
    status: 'REJECTED',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    reviewedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    rejectionReason: 'Payment verification failed',
  },
];

/**
 * Verification Queue page
 */
export default function VerificationQueuePage() {
  const [data] = React.useState<Verification[]>(mockVerifications);

  // Calculate stats
  const stats = {
    pending: data.filter((v) => v.status === 'PENDING').length,
    approved: data.filter((v) => v.status === 'VERIFIED').length,
    rejected: data.filter((v) => v.status === 'REJECTED').length,
    total: data.length,
  };

  return (
    <div>
      <AdminPageHeader
        title="Очередь верификации"
        description="Проверка и обработка запросов на верификацию"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard
          title="Ожидающие"
          value={stats.pending}
          icon={Clock}
          className="border-yellow-500/20"
        />
        <StatsCard
          title="Одобренные"
          value={stats.approved}
          icon={CheckCircle}
          className="border-mp-success-text/20"
        />
        <StatsCard
          title="Отклонённые"
          value={stats.rejected}
          icon={XCircle}
          className="border-mp-error-text/20"
        />
        <StatsCard
          title="Всего"
          value={stats.total}
          icon={WarningCircle}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        searchKey="userEmail"
        searchPlaceholder="Поиск по email..."
        filterOptions={[
          {
            id: 'status',
            title: 'Статус',
            options: [
              { label: 'Ожидание', value: 'PENDING' },
              { label: 'Подтверждено', value: 'VERIFIED' },
              { label: 'Отклонено', value: 'REJECTED' },
            ],
          },
          {
            id: 'method',
            title: 'Метод',
            options: [
              { label: 'Документ', value: 'DOCUMENT' },
              { label: 'Оплата', value: 'PAYMENT' },
            ],
          },
        ]}
      />
    </div>
  );
}
