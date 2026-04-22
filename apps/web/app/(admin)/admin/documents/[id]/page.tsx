'use client';

import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Globe,
  ClockCounterClockwise,
  SpinnerGap,
  ShieldCheck,
  Users,
  XCircle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminDocument,
  useUpdateDocument,
  usePublishDocument,
  useDeactivateDocument,
  useDocumentAcceptances,
  useDocumentVersions,
} from '@/hooks/use-admin-documents';
import type { LegalDocumentType } from '@/hooks/use-admin-documents';

/**
 * Document type labels in Russian
 */
const documentTypeLabels: Record<LegalDocumentType, string> = {
  USER_AGREEMENT: 'Пользовательское соглашение',
  OFFER: 'Оферта',
  PRIVACY_POLICY: 'Политика конфиденциальности',
  PARTNER_AGREEMENT: 'Партнёрское соглашение',
  SUPPLEMENTARY: 'Дополнительные условия',
};

/**
 * Format date for display
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
 * Admin document detail page
 */
export default function AdminDocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: document, isLoading } = useAdminDocument(id);
  const updateDocument = useUpdateDocument();
  const publishDocument = usePublishDocument();
  const deactivateDocument = useDeactivateDocument();

  // Acceptances state
  const [acceptancesPage, setAcceptancesPage] = React.useState(1);
  const { data: acceptances, isLoading: isLoadingAcceptances } = useDocumentAcceptances(
    id,
    { page: acceptancesPage, limit: 20 }
  );

  // Versions
  const { data: versions, isLoading: isLoadingVersions } = useDocumentVersions(
    document?.type
  );

  // Edit form state
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [version, setVersion] = React.useState('');
  const [content, setContent] = React.useState('');
  const [requiresAcceptance, setRequiresAcceptance] = React.useState(false);

  // Sync form state when data loads
  React.useEffect(() => {
    if (document) {
      setTitle(document.title);
      setVersion(document.version);
      setContent(document.content);
      setRequiresAcceptance(document.requiresAcceptance);
    }
  }, [document]);

  const canEdit = document && !document.isActive;

  const handleSave = () => {
    updateDocument.mutate(
      { id, title, version, content, requiresAcceptance },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handlePublish = () => {
    if (confirm(`Опубликовать документ "${document?.title}"? Он станет активным и видимым для пользователей.`)) {
      publishDocument.mutate(id);
    }
  };

  const handleDeactivate = () => {
    if (confirm(`Деактивировать документ "${document?.title}"?`)) {
      deactivateDocument.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Container size="lg" className="py-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </Container>
    );
  }

  if (!document) {
    return (
      <Container size="lg" className="py-8">
        <div className="text-center">
          <p className="text-mp-text-secondary">Документ не найден</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/documents">Назад к списку</Link>
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-8">
      <AdminPageHeader
        title={document.title}
        description={`${documentTypeLabels[document.type]} v${document.version}`}
        breadcrumbItems={[
          { label: 'Правовые документы', href: '/admin/documents' },
          { label: document.title },
        ]}
      >
        <Button variant="outline" asChild>
          <Link href="/admin/documents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
      </AdminPageHeader>

      <div className="space-y-6">
        {/* Document Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Информация о документе</CardTitle>
            <Badge
              className={
                document.isActive
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }
            >
              {document.isActive ? 'Активен' : 'Неактивен'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-mp-surface p-2">
                  <FileText className="h-5 w-5 text-mp-accent-primary" />
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">Тип</p>
                  <p className="font-medium text-mp-text-primary">
                    {documentTypeLabels[document.type]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-mp-surface p-2">
                  <ClockCounterClockwise className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">Версия</p>
                  <p className="font-medium font-mono text-mp-text-primary">
                    {document.version}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-mp-surface p-2">
                  <ShieldCheck className="h-5 w-5 text-mp-accent-secondary" />
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">Требует принятия</p>
                  <p className="font-medium text-mp-text-primary">
                    {document.requiresAcceptance ? 'Да' : 'Нет'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-mp-surface p-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">Опубликован</p>
                  <p className="font-medium text-mp-text-primary">
                    {document.publishedAt
                      ? formatDate(document.publishedAt)
                      : 'Черновик'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form (inactive documents only) */}
        {canEdit && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Редактирование</CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Редактировать
                </Button>
              )}
            </CardHeader>
            {isEditing && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Заголовок</Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-version">Версия</Label>
                  <Input
                    id="edit-version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-content">Содержание</Label>
                  <Textarea
                    id="edit-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="edit-requiresAcceptance"
                    checked={requiresAcceptance}
                    onCheckedChange={(checked) =>
                      setRequiresAcceptance(checked === true)
                    }
                  />
                  <Label htmlFor="edit-requiresAcceptance" className="cursor-pointer">
                    Требует принятия пользователем
                  </Label>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={updateDocument.isPending}
                  >
                    {updateDocument.isPending && (
                      <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Сохранить
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setTitle(document.title);
                      setVersion(document.version);
                      setContent(document.content);
                      setRequiresAcceptance(document.requiresAcceptance);
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Tabs: Content, Acceptances, Versions */}
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList>
            <TabsTrigger value="content">
              <FileText className="mr-2 h-4 w-4" />
              Содержание
            </TabsTrigger>
            <TabsTrigger value="acceptances">
              <Users className="mr-2 h-4 w-4" />
              Принятия
            </TabsTrigger>
            <TabsTrigger value="versions">
              <ClockCounterClockwise className="mr-2 h-4 w-4" />
              Версии
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Содержание документа</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-lg border border-mp-border bg-mp-surface p-6 prose prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: document.content }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acceptances Tab */}
          <TabsContent value="acceptances">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Принятия пользователями</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAcceptances ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : acceptances?.items.length ? (
                  <div className="space-y-1">
                    {/* Header */}
                    <div className="grid grid-cols-4 gap-4 border-b border-mp-border pb-2 text-sm font-medium text-mp-text-secondary">
                      <span>Email</span>
                      <span>Имя</span>
                      <span>Дата принятия</span>
                      <span>IP-адрес</span>
                    </div>
                    {/* Rows */}
                    {acceptances.items.map((acceptance) => (
                      <div
                        key={acceptance.id}
                        className="grid grid-cols-4 gap-4 border-b border-mp-border/50 py-3 text-sm"
                      >
                        <span className="text-mp-text-primary truncate">
                          {acceptance.userEmail}
                        </span>
                        <span className="text-mp-text-secondary truncate">
                          {acceptance.userName || '\u2014'}
                        </span>
                        <span className="text-mp-text-secondary">
                          {formatDate(acceptance.acceptedAt)}
                        </span>
                        <span className="text-mp-text-disabled font-mono text-xs">
                          {acceptance.ipAddress || '\u2014'}
                        </span>
                      </div>
                    ))}

                    {/* Pagination */}
                    {acceptances.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-sm text-mp-text-secondary">
                          Показано {acceptances.items.length} из {acceptances.total}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={acceptancesPage === 1}
                            onClick={() => setAcceptancesPage((p) => p - 1)}
                          >
                            Назад
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={acceptancesPage >= acceptances.totalPages}
                            onClick={() => setAcceptancesPage((p) => p + 1)}
                          >
                            Далее
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-mp-text-secondary">
                    Нет принятий для данного документа
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  История версий ({documentTypeLabels[document.type]})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingVersions ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : versions?.length ? (
                  <div className="space-y-3">
                    {versions.map((ver) => (
                      <div
                        key={ver.id}
                        className={`flex items-center justify-between rounded-lg border p-4 ${
                          ver.id === document.id
                            ? 'border-mp-accent-primary/50 bg-mp-accent-primary/5'
                            : 'border-mp-border bg-mp-surface/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="rounded-lg bg-mp-surface p-2">
                            <FileText className="h-4 w-4 text-mp-text-secondary" />
                          </div>
                          <div>
                            <p className="font-medium text-mp-text-primary">
                              {ver.title}
                              {ver.id === document.id && (
                                <span className="ml-2 text-xs text-mp-accent-primary">
                                  (текущая)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-mp-text-secondary">
                              Версия {ver.version} &middot; Создана{' '}
                              {formatDate(ver.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={
                              ver.isActive
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }
                          >
                            {ver.isActive ? 'Активна' : 'Неактивна'}
                          </Badge>
                          {ver.publishedAt && (
                            <span className="text-xs text-mp-text-disabled">
                              Опубликована {formatDate(ver.publishedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-mp-text-secondary">
                    Нет других версий этого документа
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Действия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {!document.isActive && (
                <Button
                  onClick={handlePublish}
                  disabled={publishDocument.isPending}
                >
                  {publishDocument.isPending ? (
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" />
                  )}
                  Опубликовать
                </Button>
              )}

              {document.isActive && (
                <Button
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={deactivateDocument.isPending}
                >
                  {deactivateDocument.isPending ? (
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Деактивировать
                </Button>
              )}

              {!document.isActive && document.isActive === false && (
                <p className="flex items-center text-sm text-mp-text-secondary">
                  <CheckCircle className="mr-2 h-4 w-4 text-mp-text-disabled" />
                  Документ не активен. Опубликуйте его, чтобы он стал видимым для пользователей.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
