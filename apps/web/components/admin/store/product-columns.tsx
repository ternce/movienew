'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eye, PencilSimple, Trash, Copy } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import type { AdminProduct } from '@/hooks/use-admin-store';

// ============ Helpers ============

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' \u20BD';
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ============ Badge Configs ============

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Черновик', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
  ACTIVE: { label: 'Активен', className: 'bg-green-500/20 text-green-400 border-transparent' },
  OUT_OF_STOCK: { label: 'Нет в наличии', className: 'bg-orange-500/20 text-orange-400 border-transparent' },
  DISCONTINUED: { label: 'Снят', className: 'bg-red-500/20 text-red-400 border-transparent' },
};

// ============ Columns ============

export const productColumns: ColumnDef<AdminProduct>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Товар" />
    ),
    cell: ({ row }) => {
      const name = row.getValue('name') as string;
      const images = row.original.images as string[];
      return (
        <div className="flex items-center gap-3 max-w-[300px]">
          {images?.length > 0 ? (
            <img
              src={images[0]}
              alt={name}
              className="h-10 w-10 rounded-md object-cover bg-mp-surface"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-mp-surface flex items-center justify-center text-mp-text-disabled text-xs">
              N/A
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-mp-text-primary truncate">{name}</span>
            <span className="text-xs text-mp-text-disabled font-mono truncate">
              {row.original.slug}
            </span>
          </div>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Категория" />
    ),
    cell: ({ row }) => {
      const category = row.original.category;
      return category ? (
        <Badge className="bg-blue-500/20 text-blue-400 border-transparent">
          {category.name}
        </Badge>
      ) : (
        <span className="text-mp-text-disabled text-sm">—</span>
      );
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Цена" className="justify-end" />
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium text-mp-text-primary">
        {formatCurrency(row.getValue('price') as number)}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'bonusPrice',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Бонусы" className="justify-end" />
    ),
    cell: ({ row }) => {
      const bonusPrice = row.original.bonusPrice;
      return (
        <div className="text-right text-mp-text-secondary">
          {bonusPrice ? formatCurrency(bonusPrice) : '—'}
        </div>
      );
    },
  },
  {
    accessorKey: 'stockQuantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Остаток" className="justify-end" />
    ),
    cell: ({ row }) => {
      const stock = row.getValue('stockQuantity') as number;
      return (
        <div className={`text-right font-medium ${stock === 0 ? 'text-mp-error-text' : stock < 10 ? 'text-orange-400' : 'text-mp-text-secondary'}`}>
          {stock}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Статус" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const config = statusConfig[status] || { label: status, className: '' };
      return <Badge className={config.className}>{config.label}</Badge>;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Создан" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-mp-text-secondary">
        {formatDate(row.getValue('createdAt') as string)}
      </span>
    ),
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <ProductRowActions row={row} />,
  },
];

function ProductRowActions({ row }: { row: { original: AdminProduct } }) {
  const router = useRouter();

  return (
    <DataTableRowActions
      row={row as never}
      actions={[
        {
          label: 'Просмотреть',
          icon: Eye,
          onClick: () => router.push(`/admin/store/products/${row.original.id}`),
        },
        {
          label: 'Редактировать',
          icon: PencilSimple,
          onClick: () => router.push(`/admin/store/products/${row.original.id}`),
        },
        {
          label: 'Удалить',
          icon: Trash,
          onClick: () => {
            const event = new CustomEvent('admin:delete-product', {
              detail: { id: row.original.id, name: row.original.name },
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
