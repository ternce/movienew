'use client';

import {
  ArrowLeft,
  Calendar,
  Clock,
  SpinnerGap,
  Envelope,
  PaperPlaneTilt,
  Users,
  XCircle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminNewsletter,
  useUpdateNewsletter,
  useSendNewsletter,
  useScheduleNewsletter,
  useCancelNewsletter,
} from '@/hooks/use-admin-notifications';
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
 * Format datetime-local value from ISO string
 */
function toDatetimeLocal(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

/**
 * Admin newsletter detail/edit page
 */
export default function AdminNewsletterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: newsletter, isLoading } = useAdminNewsletter(id);
  const updateNewsletter = useUpdateNewsletter();
  const sendNewsletter = useSendNewsletter();
  const scheduleNewsletter = useScheduleNewsletter();
  const cancelNewsletter = useCancelNewsletter();

  // Edit form state
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [scheduleDate, setScheduleDate] = React.useState('');

  // Sync form state when data loads
  React.useEffect(() => {
    if (newsletter) {
      setName(newsletter.name);
      setSubject(newsletter.subject);
      setBody(newsletter.body);
      setScheduleDate(toDatetimeLocal(newsletter.scheduledAt));
    }
  }, [newsletter]);

  const isDraft = newsletter?.status === 'DRAFT';
  const isScheduled = newsletter?.status === 'SCHEDULED';
  const isSent = newsletter?.status === 'SENT';
  const canEdit = isDraft;

  const handleSave = () => {
    updateNewsletter.mutate(
      { id, name, subject, body },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleSend = () => {
    if (confirm('Отправить рассылку? Это действие нельзя отменить.')) {
      sendNewsletter.mutate(id);
    }
  };

  const handleSchedule = () => {
    if (!scheduleDate) return;
    scheduleNewsletter.mutate({
      id,
      scheduledAt: new Date(scheduleDate).toISOString(),
    });
  };

  const handleCancel = () => {
    if (confirm('Отменить рассылку?')) {
      cancelNewsletter.mutate(id, {
        onSuccess: () => router.push('/admin/newsletters'),
      });
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

  if (!newsletter) {
    return (
      <Container size="lg" className="py-8">
        <div className="text-center">
          <p className="text-mp-text-secondary">Рассылка не найдена</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/newsletters">Назад к списку</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const statusInfo = statusConfig[newsletter.status];

  return (
    <Container size="lg" className="py-8">
      <AdminPageHeader
        title={newsletter.name}
        description={`ID: ${newsletter.id}`}
        breadcrumbItems={[
          { label: 'Рассылки', href: '/admin/newsletters' },
          { label: newsletter.name },
        ]}
      >
        <Button variant="outline" asChild>
          <Link href="/admin/newsletters">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
      </AdminPageHeader>

      <div className="space-y-6">
        {/* Status & Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Информация о рассылке</CardTitle>
            <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-mp-surface p-2">
                  <Envelope className="h-5 w-5 text-mp-accent-primary" />
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">Тема</p>
                  <p className="font-medium text-mp-text-primary">{newsletter.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-mp-surface p-2">
                  <Users className="h-5 w-5 text-mp-accent-secondary" />
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">Отправлено</p>
                  <p className="font-medium text-mp-text-primary">
                    {newsletter.sentCount.toLocaleString('ru-RU')}
                    {newsletter.totalRecipients > 0 && (
                      <span className="text-mp-text-disabled">
                        {' '}
                        / {newsletter.totalRecipients.toLocaleString('ru-RU')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-mp-surface p-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">Запланировано</p>
                  <p className="font-medium text-mp-text-primary">
                    {formatDate(newsletter.scheduledAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-mp-surface p-2">
                  <PaperPlaneTilt className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-mp-text-secondary">Отправлено</p>
                  <p className="font-medium text-mp-text-primary">
                    {formatDate(newsletter.sentAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form (draft only) */}
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
                  <Label htmlFor="edit-name">Название</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subject">Тема</Label>
                  <Input
                    id="edit-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-body">Содержание</Label>
                  <Textarea
                    id="edit-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={updateNewsletter.isPending}
                  >
                    {updateNewsletter.isPending && (
                      <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Сохранить
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setName(newsletter.name);
                      setSubject(newsletter.subject);
                      setBody(newsletter.body);
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Content Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Содержание письма</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg border border-mp-border bg-mp-surface p-6 prose prose-invert max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: newsletter.body }}
            />
          </CardContent>
        </Card>

        {/* Sent Stats (for sent campaigns) */}
        {isSent && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Статистика отправки</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-lg border border-mp-border bg-mp-surface/50 p-4 text-center">
                  <p className="text-3xl font-bold text-mp-text-primary">
                    {newsletter.sentCount.toLocaleString('ru-RU')}
                  </p>
                  <p className="mt-1 text-sm text-mp-text-secondary">Отправлено писем</p>
                </div>
                <div className="rounded-lg border border-mp-border bg-mp-surface/50 p-4 text-center">
                  <p className="text-3xl font-bold text-mp-text-primary">
                    {newsletter.totalRecipients.toLocaleString('ru-RU')}
                  </p>
                  <p className="mt-1 text-sm text-mp-text-secondary">Всего получателей</p>
                </div>
                <div className="rounded-lg border border-mp-border bg-mp-surface/50 p-4 text-center">
                  <p className="text-3xl font-bold text-mp-text-primary">
                    {newsletter.totalRecipients > 0
                      ? `${Math.round((newsletter.sentCount / newsletter.totalRecipients) * 100)}%`
                      : '\u2014'}
                  </p>
                  <p className="mt-1 text-sm text-mp-text-secondary">Процент доставки</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Действия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {isDraft && (
                <>
                  <Button
                    onClick={handleSend}
                    disabled={sendNewsletter.isPending}
                  >
                    {sendNewsletter.isPending ? (
                      <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PaperPlaneTilt className="mr-2 h-4 w-4" />
                    )}
                    Отправить сейчас
                  </Button>

                  <div className="flex items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-60"
                    />
                    <Button
                      variant="outline"
                      onClick={handleSchedule}
                      disabled={!scheduleDate || scheduleNewsletter.isPending}
                    >
                      {scheduleNewsletter.isPending ? (
                        <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Calendar className="mr-2 h-4 w-4" />
                      )}
                      Запланировать
                    </Button>
                  </div>
                </>
              )}

              {(isDraft || isScheduled) && (
                <>
                  <Separator orientation="vertical" className="h-9" />
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={cancelNewsletter.isPending}
                  >
                    {cancelNewsletter.isPending ? (
                      <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Отменить рассылку
                  </Button>
                </>
              )}

              {!isDraft && !isScheduled && (
                <p className="text-sm text-mp-text-secondary">
                  Нет доступных действий для текущего статуса рассылки.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
