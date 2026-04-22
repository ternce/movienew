'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  MagnifyingGlass,
  Eye,
  Copy,
  Shield,
  X,
} from '@phosphor-icons/react';
import * as React from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/admin/data-table/data-table';
import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/admin/data-table/data-table-row-actions';
import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminAuditLogs,
  useAdminAuditLog,
  type AuditLogEntry,
} from '@/hooks/use-admin-audit';

// ============ Helpers ============

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

// ============ Entity Type Config ============

const entityTypeConfig: Record<string, { label: string; className: string }> = {
  User: { label: 'Пользователь', className: 'bg-blue-500/20 text-blue-400' },
  Content: { label: 'Контент', className: 'bg-green-500/20 text-green-400' },
  Transaction: { label: 'Транзакция', className: 'bg-purple-500/20 text-purple-400' },
  Subscription: { label: 'Подписка', className: 'bg-cyan-500/20 text-cyan-400' },
  Document: { label: 'Документ', className: 'bg-amber-500/20 text-amber-400' },
  Partner: { label: 'Партнёр', className: 'bg-orange-500/20 text-orange-400' },
  Commission: { label: 'Комиссия', className: 'bg-pink-500/20 text-pink-400' },
  Withdrawal: { label: 'Вывод', className: 'bg-red-500/20 text-red-400' },
  Bonus: { label: 'Бонус', className: 'bg-yellow-500/20 text-yellow-400' },
  Campaign: { label: 'Кампания', className: 'bg-indigo-500/20 text-indigo-400' },
  Notification: { label: 'Уведомление', className: 'bg-teal-500/20 text-teal-400' },
  Session: { label: 'Сессия', className: 'bg-gray-500/20 text-gray-400' },
};

const entityTypeOptions = [
  'User',
  'Content',
  'Transaction',
  'Subscription',
  'Document',
  'Partner',
  'Commission',
  'Withdrawal',
  'Bonus',
  'Campaign',
  'Notification',
  'Session',
];

// ============ Page Component ============

export default function AdminAuditPage() {
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(20);
  const [actionFilter, setActionFilter] = React.useState('');
  const [entityTypeFilter, setEntityTypeFilter] = React.useState<string | null>(null);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [selectedLogId, setSelectedLogId] = React.useState<string | null>(null);

  const { data: auditLogs, isLoading } = useAdminAuditLogs({
    page,
    limit,
    action: actionFilter || undefined,
    entityType: entityTypeFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: selectedLog, isLoading: isLoadingDetail } = useAdminAuditLog(
    selectedLogId || undefined
  );

  const hasFilters = actionFilter || entityTypeFilter || dateFrom || dateTo;

  // ============ Columns ============

  const columns: ColumnDef<AuditLogEntry>[] = React.useMemo(
    () => [
      {
        accessorKey: 'action',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Действие" />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-mp-text-primary">
            {row.getValue('action')}
          </span>
        ),
      },
      {
        accessorKey: 'entityType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Тип сущности" />
        ),
        cell: ({ row }) => {
          const entityType = row.getValue('entityType') as string;
          const config = entityTypeConfig[entityType] || {
            label: entityType,
            className: 'bg-gray-500/20 text-gray-400',
          };
          return (
            <Badge className={config.className}>
              {config.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'entityId',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID сущности" />
        ),
        cell: ({ row }) => {
          const entityId = row.getValue('entityId') as string;
          return (
            <button
              className="font-mono text-xs text-mp-text-secondary hover:text-mp-text-primary transition-colors flex items-center gap-1"
              onClick={() => {
                navigator.clipboard.writeText(entityId);
                toast.success('ID скопирован');
              }}
              title={entityId}
            >
              {truncateId(entityId)}
              <Copy className="h-3 w-3" />
            </button>
          );
        },
      },
      {
        accessorKey: 'userId',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Пользователь" />
        ),
        cell: ({ row }) => {
          const userId = row.getValue('userId') as string;
          return (
            <span className="font-mono text-xs text-mp-text-secondary" title={userId}>
              {truncateId(userId)}
            </span>
          );
        },
      },
      {
        accessorKey: 'ipAddress',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="IP адрес" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-mp-text-secondary">
            {row.getValue('ipAddress')}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Дата" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-mp-text-secondary">
            {formatDate(row.getValue('createdAt') as string)}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const log = row.original;
          return (
            <DataTableRowActions
              row={row}
              actions={[
                {
                  label: 'Подробности',
                  icon: Eye,
                  onClick: () => setSelectedLogId(log.id),
                },
              ]}
            />
          );
        },
      },
    ],
    []
  );

  return (
    <Container size="xl" className="py-8">
      <AdminPageHeader
        title="Журнал аудита"
        description="Все действия в системе"
      >
        <div className="flex items-center gap-2 text-mp-text-secondary">
          <Shield className="h-5 w-5" />
          <span className="text-sm">
            {auditLogs ? `${auditLogs.total.toLocaleString('ru-RU')} записей` : '...'}
          </span>
        </div>
      </AdminPageHeader>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <MagnifyingGlass className="h-4 w-4 text-mp-text-secondary" />
              <span className="text-sm font-medium text-mp-text-primary">Фильтры:</span>
            </div>

            <div className="flex-1 min-w-[180px] max-w-[250px] space-y-1">
              <Label className="text-xs text-mp-text-secondary">Действие</Label>
              <Input
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Например: CREATE, UPDATE..."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">Тип сущности</Label>
              <Select
                value={entityTypeFilter || 'all'}
                onValueChange={(v) => {
                  setEntityTypeFilter(v === 'all' ? null : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {entityTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {entityTypeConfig[type]?.label || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">Дата от</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-mp-text-secondary">Дата до</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              />
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActionFilter('');
                  setEntityTypeFilter(null);
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
              >
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={auditLogs?.items ?? []}
        isLoading={isLoading}
        manualPagination
        pagination={
          auditLogs
            ? {
                page: auditLogs.page,
                limit: auditLogs.limit,
                total: auditLogs.total,
                totalPages: auditLogs.totalPages,
              }
            : undefined
        }
        onPaginationChange={(newPage) => {
          setPage(newPage);
        }}
      />

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedLogId}
        onOpenChange={(open) => {
          if (!open) setSelectedLogId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали записи аудита</DialogTitle>
            <DialogDescription>
              Полная информация о действии в системе
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedLog ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <AuditDetailField label="Действие" value={selectedLog.action} />
                <AuditDetailField
                  label="Тип сущности"
                  value={
                    <Badge
                      className={
                        (entityTypeConfig[selectedLog.entityType]?.className) ||
                        'bg-gray-500/20 text-gray-400'
                      }
                    >
                      {entityTypeConfig[selectedLog.entityType]?.label || selectedLog.entityType}
                    </Badge>
                  }
                />
                <AuditDetailField label="ID сущности" value={selectedLog.entityId} mono />
                <AuditDetailField label="ID пользователя" value={selectedLog.userId} mono />
                <AuditDetailField label="Эл. почта" value={selectedLog.userEmail || 'Не указан'} />
                <AuditDetailField label="IP адрес" value={selectedLog.ipAddress} mono />
                <AuditDetailField label="Дата" value={formatDate(selectedLog.createdAt)} />
              </div>

              {selectedLog.userAgent && (
                <div>
                  <p className="text-sm font-medium text-mp-text-secondary mb-1">User Agent</p>
                  <p className="text-xs text-mp-text-secondary bg-mp-surface rounded-lg p-3 font-mono break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {selectedLog.oldValues && Object.keys(selectedLog.oldValues).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-mp-text-secondary mb-1">Старые значения</p>
                  <pre className="overflow-auto rounded-lg bg-mp-surface p-3 text-xs text-red-400 font-mono max-h-40">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && Object.keys(selectedLog.newValues).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-mp-text-secondary mb-1">Новые значения</p>
                  <pre className="overflow-auto rounded-lg bg-mp-surface p-3 text-xs text-green-400 font-mono max-h-40">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-mp-text-secondary mb-1">Метаданные</p>
                  <pre className="overflow-auto rounded-lg bg-mp-surface p-3 text-xs text-mp-text-secondary font-mono max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-mp-text-secondary text-center py-4">Запись не найдена</p>
          )}

          <div className="flex justify-end">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                <X className="mr-2 h-4 w-4" />
                Закрыть
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

// ============ Audit Detail Field ============

interface AuditDetailFieldProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function AuditDetailField({ label, value, mono }: AuditDetailFieldProps) {
  return (
    <div>
      <p className="text-xs font-medium text-mp-text-secondary mb-1">{label}</p>
      {typeof value === 'string' ? (
        <p className={`text-sm text-mp-text-primary ${mono ? 'font-mono text-xs break-all' : ''}`}>
          {value}
        </p>
      ) : (
        value
      )}
    </div>
  );
}
