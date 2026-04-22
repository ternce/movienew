'use client';

import { ArrowLeft, SpinnerGap } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateNewsletter } from '@/hooks/use-admin-notifications';

/**
 * Admin create newsletter page
 */
export default function AdminCreateNewsletterPage() {
  const router = useRouter();
  const createNewsletter = useCreateNewsletter();

  const [name, setName] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [filters, setFilters] = React.useState('');
  const [scheduledAt, setScheduledAt] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let parsedFilters: Record<string, unknown> | undefined;
    if (filters.trim()) {
      try {
        parsedFilters = JSON.parse(filters);
      } catch {
        return;
      }
    }

    createNewsletter.mutate(
      {
        name,
        subject,
        body,
        filters: parsedFilters,
        scheduledAt: scheduledAt || undefined,
      },
      {
        onSuccess: () => {
          router.push('/admin/newsletters');
        },
      }
    );
  };

  const isValid = name.trim() && subject.trim() && body.trim();

  return (
    <Container size="lg" className="py-8">
      <AdminPageHeader
        title="Создать рассылку"
        description="Новая email-рассылка"
        breadcrumbItems={[
          { label: 'Рассылки', href: '/admin/newsletters' },
          { label: 'Создать' },
        ]}
      >
        <Button variant="outline" asChild>
          <Link href="/admin/newsletters">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
      </AdminPageHeader>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Параметры рассылки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Название <span className="text-mp-error-text">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Внутреннее название рассылки"
                required
              />
              <p className="text-xs text-mp-text-disabled">
                Видно только администраторам
              </p>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                Тема письма <span className="text-mp-error-text">*</span>
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Тема email-сообщения"
                required
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">
                Содержание <span className="text-mp-error-text">*</span>
              </Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="HTML или текстовое содержание письма..."
                rows={12}
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-mp-text-disabled">
                Поддерживается HTML-разметка
              </p>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <Label htmlFor="filters">Фильтры получателей (JSON)</Label>
              <Textarea
                id="filters"
                value={filters}
                onChange={(e) => setFilters(e.target.value)}
                placeholder='{"role": "USER", "hasSubscription": true}'
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-mp-text-disabled">
                Оставьте пустым для отправки всем пользователям
              </p>
            </div>

            {/* Scheduled At */}
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Запланировать отправку</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-xs text-mp-text-disabled">
                Оставьте пустым для сохранения как черновик
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 border-t border-mp-border pt-6">
              <Button
                type="submit"
                disabled={!isValid || createNewsletter.isPending}
              >
                {createNewsletter.isPending && (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                )}
                Создать рассылку
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/admin/newsletters">Отмена</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Container>
  );
}
