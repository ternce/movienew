'use client';

import {
  Users,
  ShieldCheck,
  Crown,
  Handshake,
} from '@phosphor-icons/react';
import * as React from 'react';

import { DataTable } from '@/components/admin/data-table/data-table';
import { userColumns } from '@/components/admin/users/user-columns';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { StatsCard } from '@/components/admin/dashboard/stats-card';
import { Container } from '@/components/ui/container';
import { useAdminUsers } from '@/hooks/use-admin-users';

/**
 * Admin users management page
 */
export default function AdminUsersPage() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');

  const { data, isLoading } = useAdminUsers({
    page,
    limit,
    search: search || undefined,
  });

  // Calculate stats from data
  const items = data?.items || [];
  const totalUsers = data?.total || 0;
  const verifiedCount = items.filter(
    (u) => u.verificationStatus === 'VERIFIED'
  ).length;
  const adminCount = items.filter(
    (u) => u.role === 'ADMIN' || u.role === 'MODERATOR'
  ).length;
  const partnerCount = items.filter((u) => u.role === 'PARTNER').length;

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
        title="Пользователи"
        description="Управление пользователями платформы"
      />

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Всего пользователей"
          value={totalUsers}
          icon={Users}
        />
        <StatsCard
          title="Верифицировано"
          value={verifiedCount}
          icon={ShieldCheck}
        />
        <StatsCard
          title="Администраторы"
          value={adminCount}
          icon={Crown}
        />
        <StatsCard
          title="Партнёры"
          value={partnerCount}
          icon={Handshake}
        />
      </div>

      {/* Users table */}
      <DataTable
        columns={userColumns}
        data={items}
        isLoading={isLoading}
        searchKey="email"
        searchPlaceholder="Поиск по email или имени..."
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
            id: 'role',
            title: 'Роль',
            options: [
              { label: 'Админ', value: 'ADMIN' },
              { label: 'Модератор', value: 'MODERATOR' },
              { label: 'Партнёр', value: 'PARTNER' },
              { label: 'Покупатель', value: 'BUYER' },
              { label: 'Гость', value: 'GUEST' },
              { label: 'Несовершеннолетний', value: 'MINOR' },
            ],
          },
          {
            id: 'verificationStatus',
            title: 'Верификация',
            options: [
              { label: 'Верифицирован', value: 'VERIFIED' },
              { label: 'На проверке', value: 'PENDING' },
              { label: 'Не верифицирован', value: 'UNVERIFIED' },
              { label: 'Отклонён', value: 'REJECTED' },
            ],
          },
        ]}
      />
    </Container>
  );
}
