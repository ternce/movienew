'use client';

import { Funnel } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import {
  PartnersStatsOverview,
  PartnersTable,
} from '@/components/admin/partners';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAdminPartners,
  useAdminPartnerStats,
  useAdminWithdrawalStats,
} from '@/hooks/use-admin-partner';
import type { PartnerLevel } from '@/types';

/**
 * Admin partners list page
 */
export default function AdminPartnersPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [levelFilter, setLevelFilter] = React.useState<PartnerLevel | null>(null);

  const { data: partnerStats, isLoading: isLoadingStats } = useAdminPartnerStats();
  const { data: withdrawalStats, isLoading: isLoadingWithdrawalStats } = useAdminWithdrawalStats();
  const { data: partners, isLoading: isLoadingPartners } = useAdminPartners({
    search: search || undefined,
    level: levelFilter || undefined,
    page,
    limit: 20,
  });

  const hasFilters = search || levelFilter;

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Партнёры"
        description="Управление партнёрской программой"
      >
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/partners/commissions">
              Комиссии
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/partners/withdrawals">
              Выводы
            </Link>
          </Button>
        </div>
      </AdminPageHeader>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="partners">Партнёры</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview">
          <PartnersStatsOverview
            partnerStats={partnerStats}
            withdrawalStats={withdrawalStats}
            isLoading={isLoadingStats || isLoadingWithdrawalStats}
          />
        </TabsContent>

        {/* Partners tab */}
        <TabsContent value="partners" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                  <Funnel className="h-4 w-4 text-mp-text-secondary" />
                  <span className="text-sm font-medium">Фильтры:</span>
                </div>

                <div className="flex-1 min-w-[200px] max-w-[300px] space-y-1">
                  <Label className="text-xs text-mp-text-secondary">Поиск</Label>
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Email, имя, код..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-mp-text-secondary">Уровень</Label>
                  <Select
                    value={levelFilter || 'all'}
                    onValueChange={(v) => {
                      setLevelFilter(v === 'all' ? null : (v as PartnerLevel));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Все" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все уровни</SelectItem>
                      <SelectItem value="STARTER">Стартер</SelectItem>
                      <SelectItem value="BRONZE">Бронза</SelectItem>
                      <SelectItem value="SILVER">Серебро</SelectItem>
                      <SelectItem value="GOLD">Золото</SelectItem>
                      <SelectItem value="PLATINUM">Платина</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setLevelFilter(null);
                      setPage(1);
                    }}
                  >
                    Сбросить
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Partners table */}
          <PartnersTable
            data={partners}
            isLoading={isLoadingPartners}
            emptyMessage={
              hasFilters
                ? 'Нет партнёров по выбранным фильтрам'
                : 'Нет партнёров'
            }
          />

          {/* Pagination */}
          {partners && partners.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={partners.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Container>
  );
}
