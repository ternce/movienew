'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CaretLeft,
  ThumbsUp,
  ThumbsDown,
  ShareNetwork,
  Flag,
  CaretDown,
  CaretUp,
  Lock,
  WarningCircle,
} from '@phosphor-icons/react';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { VideoPlayerSkeleton } from '@/components/player';
import { ContentImage } from '@/components/content/content-image';
import { cn, copyTextToClipboard } from '@/lib/utils';
import { normalizeMediaUrl } from '@/lib/media-url';
import { useStreamUrl } from '@/hooks/use-streaming';
import { useContentDetail } from '@/hooks/use-content';
import { api, endpoints, ApiError } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { toast } from 'sonner';

const VideoPlayer = dynamic(
  () => import('@/components/player/video-player').then((m) => m.VideoPlayer),
  { ssr: false, loading: () => <VideoPlayerSkeleton /> },
);

/**
 * Format view count
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}ч ${m}мин`;
  return `${m} мин`;
}

/**
 * Watch page - video player with episode info
 */
export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const queryClient = useQueryClient();
  const [showFullDescription, setShowFullDescription] = React.useState(false);
  const [liked, setLiked] = React.useState<boolean | null>(null);

  // Fetch content metadata (works with both UUID and slug)
  const { data: contentData, isLoading: isContentLoading, error: contentError } = useContentDetail(contentId);
  const contentDetail = (contentData as any)?.data || contentData;

  // Fetch stream URL for playback
  const { data, isLoading: isStreamLoading, error: streamError } = useStreamUrl(contentId);
  const streamData = (data as any)?.data || data;

  const isLoading = isContentLoading && isStreamLoading;
  const error = streamError;

  // Record view once when the video becomes playable
  const hasRecordedViewRef = React.useRef(false);
  React.useEffect(() => {
    if (!contentId) return;
    if (hasRecordedViewRef.current) return;

    const status = (streamError as ApiError | undefined)?.status;
    if (status === 403) return;

    if (streamData?.streamUrl) {
      hasRecordedViewRef.current = true;
      api.get<void>(endpoints.content.recordView(contentId)).catch(() => {
        // Non-critical
      });
    }
  }, [contentId, streamData?.streamUrl, streamError]);

  // Save watch progress
  const handleProgress = React.useCallback(
    (time: number) => {
      if (!contentId) return;
      api
        .put(endpoints.watchHistory.updateProgress(contentId), {
          progressSeconds: Math.round(time),
        })
        .catch(() => {
          // Silently fail — progress saving is non-critical
        });
    },
    [contentId],
  );

  const handleEnded = React.useCallback(() => {
    // Could navigate to next episode or show recommendations
  }, []);

  const handleError = React.useCallback((err: string) => {
    console.error('Video error:', err);
  }, []);

  // When CDN returns 403 for expired signed URL, refetch stream URL
  const handleUrlExpired = React.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.streaming.url(contentId),
    });
  }, [queryClient, contentId]);

  const handleShare = React.useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;

    const shareTitle = streamData?.title || contentDetail?.title || 'Видео';

    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as any).share({ title: shareTitle, url });
        return;
      }
    } catch {
      // fall back to clipboard
    }

    const ok = await copyTextToClipboard(url);
    if (ok) toast.success('Ссылка скопирована');
    else toast.error('Не удалось скопировать ссылку');
  }, [contentDetail?.title, streamData?.title]);

  const handleReport = React.useCallback(() => {
    toast.message('Жалобы будут доступны позже');
  }, []);

  // Access denied (403) — show subscription CTA
  if (error) {
    const apiError = error as ApiError;
    const status = apiError?.status;

    if (status === 403) {
      return (
        <div className="min-h-screen bg-mp-bg-primary flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 rounded-full bg-mp-accent-primary/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-mp-accent-primary" />
            </div>
            <h1 className="text-2xl font-bold text-mp-text-primary mb-3">
              Требуется подписка
            </h1>
            <p className="text-mp-text-secondary mb-6">
              Для просмотра этого контента необходима активная подписка или индивидуальная покупка.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push('/subscriptions')}>
                Оформить подписку
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Назад
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // True 404: content doesn't exist (both content detail and stream failed)
    const contentNotFound = contentError && (contentError as ApiError)?.status === 404;
    if (status === 404 && contentNotFound) {
      return (
        <div className="min-h-screen bg-mp-bg-primary flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 rounded-full bg-mp-error-bg flex items-center justify-center mx-auto mb-6">
              <WarningCircle className="w-8 h-8 text-mp-error-text" />
            </div>
            <h1 className="text-2xl font-bold text-mp-text-primary mb-3">
              Контент не найден
            </h1>
            <p className="text-mp-text-secondary mb-6">
              Запрашиваемый контент не существует или был удалён.
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              Назад
            </Button>
          </div>
        </div>
      );
    }

    // Non-404 stream errors (and content detail not yet loaded)
    if (status && status !== 404) {
      return (
        <div className="min-h-screen bg-mp-bg-primary flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 rounded-full bg-mp-error-bg flex items-center justify-center mx-auto mb-6">
              <WarningCircle className="w-8 h-8 text-mp-error-text" />
            </div>
            <h1 className="text-2xl font-bold text-mp-text-primary mb-3">
              Ошибка загрузки
            </h1>
            <p className="text-mp-text-secondary mb-6">
              Произошла ошибка при загрузке видео.
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              Назад
            </Button>
          </div>
        </div>
      );
    }
  }

  // Content exists but video not ready (stream 404, content detail succeeded)
  const streamApiError = streamError as ApiError | undefined;
  const videoNotReady = streamApiError?.status === 404 && contentDetail;
  const streamMessage = videoNotReady ? streamApiError?.message : undefined;
  const streamMessageLower = (streamMessage || '').toLowerCase();
  const videoNotUploaded =
    videoNotReady &&
    (streamMessageLower.includes('нет загруженного видео') || streamMessageLower.includes('нет видео'));
  const videoEncodingFailed = videoNotReady && streamMessageLower.includes('не удалось');

  // Loading state — show skeleton while both queries are in flight
  if (isLoading && !videoNotReady) {
    return (
      <div className="min-h-screen bg-mp-bg-primary">
        <div className="border-b border-mp-border bg-mp-bg-secondary/50 h-14" />
        <div className="w-full bg-black">
          <Container size="full" className="px-0 md:px-6 lg:px-8">
            <div className="max-w-[1600px] mx-auto">
              <VideoPlayerSkeleton />
            </div>
          </Container>
        </div>
        <Container size="xl" className="py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-mp-surface rounded w-2/3" />
            <div className="h-4 bg-mp-surface rounded w-1/3" />
            <div className="h-10 bg-mp-surface rounded w-full mt-6" />
          </div>
        </Container>
      </div>
    );
  }

  // Derive display data from the best available source
  const title = streamData?.title || contentDetail?.title || 'Видео';
  const description = streamData?.description || contentDetail?.description || '';
  const duration = streamData?.duration || contentDetail?.duration || 0;
  const thumbnailUrl = streamData?.thumbnailUrls?.[0] || contentDetail?.thumbnailUrl;
  const normalizedThumbnailUrl = thumbnailUrl ? normalizeMediaUrl(thumbnailUrl) : undefined;

  return (
    <div className="min-h-screen bg-mp-bg-primary">
      {/* Back navigation */}
      <div className="border-b border-mp-border bg-mp-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10 -mx-4 md:-mx-6 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] px-4 md:px-6">
        <div className="flex items-center h-14">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-mp-text-secondary hover:text-mp-text-primary transition-colors"
          >
            <CaretLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Назад</span>
          </button>
        </div>
      </div>

      {/* Video player */}
      <div className="bg-black -mx-4 md:-mx-6 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)]">
        <div className="max-w-[1920px] mx-auto">
          {videoNotReady ? (
            <div className="relative aspect-video bg-mp-surface flex items-center justify-center overflow-hidden">
              {normalizedThumbnailUrl && (
                <ContentImage
                  src={normalizedThumbnailUrl}
                  alt={title}
                  fill
                  className="object-cover opacity-30"
                  sizes="100vw"
                />
              )}
              <div className="relative z-10 text-center p-6">
                {videoNotUploaded ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-mp-surface-elevated flex items-center justify-center mx-auto mb-4">
                      <WarningCircle className="w-8 h-8 text-mp-text-secondary" />
                    </div>
                    <p className="text-mp-text-primary font-medium text-lg">
                      Видео ещё не загружено
                    </p>
                    <p className="text-mp-text-secondary text-sm mt-2">
                      Автор пока не добавил видео к этому контенту
                    </p>
                  </>
                ) : videoEncodingFailed ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-mp-error-bg flex items-center justify-center mx-auto mb-4">
                      <WarningCircle className="w-8 h-8 text-mp-error-text" />
                    </div>
                    <p className="text-mp-text-primary font-medium text-lg">
                      Не удалось подготовить видео
                    </p>
                    <p className="text-mp-text-secondary text-sm mt-2">
                      {streamMessage || 'Попробуйте позже'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 border-4 border-mp-accent-primary/30 border-t-mp-accent-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-mp-text-primary font-medium text-lg">
                      Видео готовится к воспроизведению
                    </p>
                    <p className="text-mp-text-secondary text-sm mt-2">
                      {streamMessage || 'Попробуйте обновить страницу через несколько минут'}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : streamData?.streamUrl ? (
            <VideoPlayer
              src={streamData.streamUrl}
              poster={normalizedThumbnailUrl}
              initialTime={0}
              onProgress={handleProgress}
              onEnded={handleEnded}
              onError={handleError}
              onUrlExpired={handleUrlExpired}
              showSkipButtons
              showPiP
            />
          ) : (
            <VideoPlayerSkeleton />
          )}
        </div>
      </div>

      {/* Episode info */}
      <Container size="xl" className="py-6">
        <div className="max-w-4xl">
          {/* Title and meta */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-mp-text-primary mb-2">
              {title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-mp-text-secondary">
              {duration > 0 && <span>{formatDuration(duration)}</span>}
              {streamData?.availableQualities?.length > 0 && (
                <>
                  <span>·</span>
                  <span>
                    До {streamData?.availableQualities[streamData.availableQualities.length - 1] || streamData?.maxQuality}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-6 border-b border-mp-border">
            <Button
              variant={liked === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLiked(liked === true ? null : true)}
              className="gap-2"
            >
              <ThumbsUp
                className={cn('w-4 h-4', liked === true && 'fill-current')}
              />
              Нравится
            </Button>
            <Button
              variant={liked === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLiked(liked === false ? null : false)}
            >
              <ThumbsDown
                className={cn('w-4 h-4', liked === false && 'fill-current')}
              />
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
              <ShareNetwork className="w-4 h-4" />
              Поделиться
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReport}>
              <Flag className="w-4 h-4" />
            </Button>
          </div>

          {/* Description */}
          {description && (
            <div className="py-6">
              <p
                className={cn(
                  'text-mp-text-secondary',
                  !showFullDescription && 'line-clamp-3',
                )}
              >
                {description}
              </p>
              {description.length > 150 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="flex items-center gap-1 text-sm text-mp-accent-primary hover:underline mt-2"
                >
                  {showFullDescription ? (
                    <>
                      <CaretUp className="w-4 h-4" />
                      Скрыть
                    </>
                  ) : (
                    <>
                      <CaretDown className="w-4 h-4" />
                      Показать полностью
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
