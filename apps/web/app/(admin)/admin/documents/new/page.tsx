'use client';

import { ArrowLeft, SpinnerGap } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDocument } from '@/hooks/use-admin-documents';
import type { LegalDocumentType } from '@/hooks/use-admin-documents';

/**
 * Admin create document page
 */
export default function AdminCreateDocumentPage() {
  const router = useRouter();
  const createDocument = useCreateDocument();

  const [type, setType] = React.useState<LegalDocumentType | ''>('');
  const [title, setTitle] = React.useState('');
  const [version, setVersion] = React.useState('');
  const [content, setContent] = React.useState('');
  const [requiresAcceptance, setRequiresAcceptance] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!type) return;

    createDocument.mutate(
      {
        type: type as LegalDocumentType,
        title,
        version,
        content,
        requiresAcceptance,
      },
      {
        onSuccess: () => {
          router.push('/admin/documents');
        },
      }
    );
  };

  const isValid = type && title.trim() && version.trim() && content.trim();

  return (
    <Container size="lg" className="py-8">
      <AdminPageHeader
        title="Создать документ"
        description="Новый правовой документ"
        breadcrumbItems={[
          { label: 'Правовые документы', href: '/admin/documents' },
          { label: 'Создать' },
        ]}
      >
        <Button variant="outline" asChild>
          <Link href="/admin/documents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
      </AdminPageHeader>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Параметры документа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Тип документа <span className="text-mp-error-text">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as LegalDocumentType)}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Выберите тип документа" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER_AGREEMENT">Пользовательское соглашение</SelectItem>
                  <SelectItem value="OFFER">Оферта</SelectItem>
                  <SelectItem value="PRIVACY_POLICY">Политика конфиденциальности</SelectItem>
                  <SelectItem value="PARTNER_AGREEMENT">Партнёрское соглашение</SelectItem>
                  <SelectItem value="SUPPLEMENTARY">Дополнительные условия</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Заголовок <span className="text-mp-error-text">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название документа"
                required
              />
            </div>

            {/* Version */}
            <div className="space-y-2">
              <Label htmlFor="version">
                Версия <span className="text-mp-error-text">*</span>
              </Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Например: 1.0, 2.1"
                required
              />
              <p className="text-xs text-mp-text-disabled">
                Укажите версию документа для отслеживания изменений
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">
                Содержание <span className="text-mp-error-text">*</span>
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Полный текст документа (поддерживается HTML)..."
                rows={16}
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-mp-text-disabled">
                Поддерживается HTML-разметка для форматирования
              </p>
            </div>

            {/* Requires Acceptance */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="requiresAcceptance"
                checked={requiresAcceptance}
                onCheckedChange={(checked) =>
                  setRequiresAcceptance(checked === true)
                }
              />
              <div>
                <Label htmlFor="requiresAcceptance" className="cursor-pointer">
                  Требует принятия пользователем
                </Label>
                <p className="text-xs text-mp-text-disabled">
                  Пользователям потребуется явно принять этот документ
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 border-t border-mp-border pt-6">
              <Button
                type="submit"
                disabled={!isValid || createDocument.isPending}
              >
                {createDocument.isPending && (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                )}
                Создать документ
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/admin/documents">Отмена</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Container>
  );
}
