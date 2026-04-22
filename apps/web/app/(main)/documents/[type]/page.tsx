'use client';

import { ArrowLeft, FileText, WarningCircle, Calendar, Check, SpinnerGap } from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDocument,
  usePendingDocuments,
  useAcceptDocument,
  getDocumentTypeLabel,
} from '@/hooks/use-documents';
import { formatDate } from '@/lib/utils';

/**
 * Full document view page
 */
export default function DocumentDetailPage() {
  const params = useParams();
  const type = params.type as string;

  const { data: document, isLoading, error } = useDocument(type);
  const { data: pendingDocuments } = usePendingDocuments();
  const acceptDocument = useAcceptDocument();

  const isPending = React.useMemo(() => {
    if (!pendingDocuments || !type) return false;
    return pendingDocuments.some((doc) => doc.type === type);
  }, [pendingDocuments, type]);

  const handleAccept = () => {
    if (type) {
      acceptDocument.mutate(type);
    }
  };

  if (isLoading) {
    return (
      <Container size="md" className="py-8">
        <DocumentDetailSkeleton />
      </Container>
    );
  }

  if (error || !document) {
    return (
      <Container size="md" className="py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-mp-error-bg mx-auto mb-4 flex items-center justify-center">
            <WarningCircle className="w-8 h-8 text-mp-error-text" />
          </div>
          <h1 className="text-xl font-bold text-mp-text-primary mb-2">
            Документ не найден
          </h1>
          <p className="text-mp-text-secondary mb-6">
            Запрашиваемый документ не существует или был удалён.
          </p>
          <Button variant="outline" asChild>
            <Link href="/documents">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к документам
            </Link>
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container size="md" className="py-8">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/documents">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Все документы
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-mp-accent-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <FileText className="w-5 h-5 text-mp-accent-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-mp-text-primary">
            {document.title}
          </h1>
          <p className="text-sm text-mp-text-secondary mt-1">
            {getDocumentTypeLabel(document.type)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="secondary" className="text-xs">
              v{document.version}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-mp-text-secondary">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(document.publishedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Document content */}
      <Card className="border-mp-border bg-mp-surface/50">
        <CardContent className="p-6 sm:p-8">
          <div
            className="prose prose-invert max-w-none
              prose-headings:text-mp-text-primary prose-headings:font-semibold
              prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
              prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
              prose-p:text-mp-text-secondary prose-p:leading-relaxed prose-p:mb-3
              prose-a:text-mp-accent-primary prose-a:no-underline hover:prose-a:underline
              prose-ul:text-mp-text-secondary prose-li:mb-1
              prose-ol:text-mp-text-secondary
              prose-strong:text-mp-text-primary"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />
        </CardContent>
      </Card>

      {/* Accept button for pending documents */}
      {isPending && (
        <div className="mt-6 p-4 rounded-xl border border-mp-accent-primary/20 bg-mp-accent-primary/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-mp-text-primary">
                Требуется подтверждение
              </p>
              <p className="text-sm text-mp-text-secondary mt-0.5">
                Для продолжения работы необходимо принять данный документ.
              </p>
            </div>
            <Button
              onClick={handleAccept}
              disabled={acceptDocument.isPending}
              className="shrink-0"
            >
              {acceptDocument.isPending ? (
                <>
                  <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                  Принятие...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Принять
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}

/**
 * Loading skeleton for document detail
 */
function DocumentDetailSkeleton() {
  return (
    <>
      {/* Back link skeleton */}
      <Skeleton className="h-8 w-36 mb-6" />

      {/* Header skeleton */}
      <div className="flex items-start gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-12 rounded-md" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <Card className="border-mp-border bg-mp-surface/50">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-5 w-1/4 mt-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-5 w-1/3 mt-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </>
  );
}
