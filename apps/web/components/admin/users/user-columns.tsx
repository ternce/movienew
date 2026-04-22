'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eye, PencilSimple } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import type { AdminUser } from '@/hooks/use-admin-users';

/**
 * User role badge color mapping
 */
function getRoleBadge(role: string) {
  const config: Record<string, { label: string; className: string }> = {
    ADMIN: { label: 'Админ', className: 'bg-purple-500/20 text-purple-400 border-transparent' },
    MODERATOR: { label: 'Модератор', className: 'bg-blue-500/20 text-blue-400 border-transparent' },
    PARTNER: { label: 'Партнёр', className: 'bg-green-500/20 text-green-400 border-transparent' },
    BUYER: { label: 'Покупатель', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
    GUEST: { label: 'Гость', className: 'bg-gray-500/20 text-gray-300 border-transparent' },
    MINOR: { label: 'Несовершеннолетний', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
  };

  const { label, className } = config[role] || { label: role, className: '' };
  return <Badge className={className}>{label}</Badge>;
}

/**
 * Verification status badge
 */
function getVerificationBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    VERIFIED: { label: 'Верифицирован', className: 'bg-green-500/20 text-green-400 border-transparent' },
    PENDING: { label: 'На проверке', className: 'bg-yellow-500/20 text-yellow-400 border-transparent' },
    UNVERIFIED: { label: 'Не верифицирован', className: 'bg-gray-500/20 text-gray-400 border-transparent' },
    REJECTED: { label: 'Отклонён', className: 'bg-red-500/20 text-red-400 border-transparent' },
  };

  const { label, className } = config[status] || { label: status, className: '' };
  return <Badge className={className}>{label}</Badge>;
}

/**
 * Active status badge
 */
function getActiveBadge(isActive: boolean) {
  if (isActive) {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-transparent">
        Активен
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/20 text-red-400 border-transparent">
      Заблокирован
    </Badge>
  );
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
 * User table column definitions
 */
export const userColumns: ColumnDef<AdminUser>[] = [
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      const email = row.getValue('email') as string;
      return (
        <span className="font-medium text-mp-text-primary text-sm">
          {email}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    id: 'name',
    accessorFn: (row) => `${row.firstName} ${row.lastName || ''}`.trim(),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Имя" />
    ),
    cell: ({ row }) => {
      const firstName = row.original.firstName;
      const lastName = row.original.lastName;
      const fullName = `${firstName} ${lastName || ''}`.trim();
      return (
        <span className="text-mp-text-primary">
          {fullName || '-'}
        </span>
      );
    },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Роль" />
    ),
    cell: ({ row }) => getRoleBadge(row.getValue('role') as string),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'verificationStatus',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Верификация" />
    ),
    cell: ({ row }) => getVerificationBadge(row.getValue('verificationStatus') as string),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Статус" />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue('isActive') as boolean;
      return getActiveBadge(isActive !== false);
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Регистрация" />
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
    cell: ({ row }) => <UserRowActions row={row} />,
  },
];

/**
 * User row actions component with router access
 */
function UserRowActions({ row }: { row: { original: AdminUser } }) {
  const router = useRouter();

  return (
    <DataTableRowActions
      row={row as never}
      actions={[
        {
          label: 'Просмотреть',
          icon: Eye,
          onClick: () => router.push(`/admin/users/${row.original.id}`),
        },
        {
          label: 'Редактировать',
          icon: PencilSimple,
          onClick: () => router.push(`/admin/users/${row.original.id}`),
        },
      ]}
    />
  );
}
