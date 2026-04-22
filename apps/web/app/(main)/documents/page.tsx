'use client';

import { FileText, ArrowRight, Calendar } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDocuments,
  getDocumentTypeLabel,
  getDocumentSlug,
  type DocumentSummary,
} from '@/hooks/use-documents';
import { formatDate } from '@/lib/utils';

/**
 * Legal documents listing page
 */
export default function DocumentsPage() {
  const { data: documents, isLoading, error } = useDocuments();

  return (
    <Container size="lg" className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-mp-accent-primary/20">
            <FileText className="h-6 w-6 text-mp-accent-primary" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Правовые документы
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Ознакомьтесь с документами платформы
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <DocumentsSkeleton />
      ) : error ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-mp-error-bg mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-mp-error-text" />
          </div>
          <p className="text-mp-text-secondary">
            Не удалось загрузить документы. Попробуйте позже.
          </p>
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-mp-surface mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-mp-text-secondary" />
          </div>
          <p className="text-mp-text-secondary">
            Документы пока не опубликованы.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </Container>
  );
}

/**
 * Individual document card
 */
function DocumentCard({ document }: { document: DocumentSummary }) {
  return (
    <Link href={`/documents/${getDocumentSlug(document.type)}`}>
      <Card className="group h-full transition-colors hover:border-mp-accent-primary/30 hover:bg-mp-surface/80 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mp-accent-primary/10">
                <FileText className="h-5 w-5 text-mp-accent-primary" />
              </div>
              <div>
                <CardTitle className="text-base text-mp-text-primary group-hover:text-mp-accent-primary transition-colors">
                  {document.title}
                </CardTitle>
                <p className="text-sm text-mp-text-secondary mt-0.5">
                  {getDocumentTypeLabel(document.type)}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-mp-text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              v{document.version}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-mp-text-secondary">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(document.publishedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Loading skeleton for documents grid
 */
function DocumentsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-12 rounded-md" />
              <Skeleton className="h-3 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
