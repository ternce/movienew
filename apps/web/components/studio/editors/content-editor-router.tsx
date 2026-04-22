'use client';

import Link from 'next/link';

import { useAdminContentDetail, AGE_CATEGORY_FROM_BACKEND } from '@/hooks/use-admin-content';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { SeriesEditor } from './series-editor';
import { ClipEditor } from './clip-editor';
import { ShortEditor } from './short-editor';
import { TutorialEditor } from './tutorial-editor';

// ============ Types ============

interface ContentEditorRouterProps {
  contentId: string;
}

// ============ Helpers ============

/** Extract tag IDs from the API response (handles various shapes) */
function extractTagIds(content: Record<string, unknown>): string[] {
  const tags = content.tags;
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t: Record<string, unknown>) => (t.id as string) || (t.tag as { id: string } | undefined)?.id || '')
    .filter(Boolean);
}

/** Extract genre IDs from the API response (handles various shapes) */
function extractGenreIds(content: Record<string, unknown>): string[] {
  const genres = content.genres;
  if (!Array.isArray(genres)) return [];
  return genres
    .map((g: Record<string, unknown>) => (g.id as string) || (g.genre as { id: string } | undefined)?.id || '')
    .filter(Boolean);
}

// ============ Loading Skeleton ============

function EditorSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-[#272b38] bg-[#10131c]/50">
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i} className="border-[#272b38] bg-[#10131c]/50">
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Not Found ============

function ContentNotFound() {
  return (
    <Card className="border-[#272b38] bg-[#10131c]/50">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-semibold text-[#f5f7ff] mb-1">
          Контент не найден
        </h3>
        <p className="text-sm text-[#9ca2bc] mb-4">
          Контент был удалён или не существует
        </p>
        <Button variant="outline" asChild>
          <Link href="/studio">Вернуться к списку</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ============ Component ============

export function ContentEditorRouter({ contentId }: ContentEditorRouterProps) {
  const { data: content, isLoading } = useAdminContentDetail(contentId);

  if (isLoading) {
    return <EditorSkeleton />;
  }

  if (!content) {
    return <ContentNotFound />;
  }

  // Map backend age category to frontend format and extract relation IDs
  const mappedContent: Record<string, unknown> = {
    ...content,
    ageCategory: AGE_CATEGORY_FROM_BACKEND[content.ageCategory] || content.ageCategory,
    tagIds: extractTagIds(content as unknown as Record<string, unknown>),
    genreIds: extractGenreIds(content as unknown as Record<string, unknown>),
  };

  switch (content.contentType) {
    case 'SERIES':
      return <SeriesEditor content={mappedContent} contentId={contentId} />;
    case 'CLIP':
      return <ClipEditor content={mappedContent} contentId={contentId} />;
    case 'SHORT':
      return <ShortEditor content={mappedContent} contentId={contentId} />;
    case 'TUTORIAL':
      return <TutorialEditor content={mappedContent} contentId={contentId} />;
    default:
      return <ClipEditor content={mappedContent} contentId={contentId} />;
  }
}

export default ContentEditorRouter;
