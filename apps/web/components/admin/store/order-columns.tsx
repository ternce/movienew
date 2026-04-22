'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eye, Copy } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import type { AdminOrder } from '@/hooks/use-admin-store';

// ============ Helpers ============

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' \u20BD';
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) + '...' : id;
}

// ============ Badge Configs ============

const orderStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Ожидание', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
  PAID: { label: 'Оплачен', className: 'bg-blue-500/20 text-blue-400 border-transparent' },
  PROCESSING: { label: 'Обработка', className: 'bg-indigo-500/20 text-indigo-400 border-transparent' },
  SHIPPED: { label: 'Отправлен', className: 'bg-cyan-500/20 text-cyan-400 border-transparent' },
  DELIVERED: { label: 'Доставлен', className: 'bg-green-500/20 text-green-400 border-transparent' },
  CANCELLED: { label: 'Отменён', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
  REFUNDED: { label: 'Возврат', className: 'bg-orange-500/20 text-orange-400 border-transparent' },
};

// ============ Columns ============

export const orderColumns: ColumnDef<AdminOrder>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => {
      const id = row.getValue('id') as string;
      return (
        <button
          className="flex items-center gap-1.5 font-mono text-xs text-mp-text-secondary hover:text-mp-text-primary transition-colors"
          onClick={() => {
            navigator.clipboard.writeText(id);
            toast.success('ID скопирован');
          }}
          title={id}
        >
          {truncateId(id)}
          <Copy className="h-3 w-3" />
        </button>
      );
    },
  },
  {
    accessorKey: 'user',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Покупатель" />
    ),
    cell: ({ row }) => {
      const user = row.original.user;
      return (
        <div className="flex flex-col">
          <span className="text-sm text-mp-text-primary">{user.email}</span>
          {(user.firstName || user.lastName) && (
            <span className="text-xs text-mp-text-disabled">
              {[user.firstName, user.lastName].filter(Boolean).join(' ')}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'items',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Товары" className="justify-center" />
    ),
    cell: ({ row }) => (
      <div className="text-center text-mp-text-secondary">
        {row.original.items.length}
      </div>
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Сумма" className="justify-end" />
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium text-mp-text-primary">
        {formatCurrency(row.original.totalAmount)}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'bonusAmountUsed',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Бонусы" className="justify-end" />
    ),
    cell: ({ row }) => {
      const bonus = row.original.bonusAmountUsed;
      return (
        <div className="text-right text-mp-text-secondary">
          {bonus > 0 ? formatCurrency(bonus) : '—'}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Статус" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const config = orderStatusConfig[status] || { label: status, className: '' };
      return <Badge className={config.className}>{config.label}</Badge>;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Дата" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-mp-text-secondary">
        {formatDate(row.original.createdAt)}
      </span>
    ),
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <OrderRowActions row={row} />,
  },
];

function OrderRowActions({ row }: { row: { original: AdminOrder } }) {
  const router = useRouter();

  return (
    <DataTableRowActions
      row={row as never}
      actions={[
        {
          label: 'Просмотреть',
          icon: Eye,
          onClick: () => router.push(`/admin/store/orders/${row.original.id}`),
        },
      ]}
    />
  );
}
