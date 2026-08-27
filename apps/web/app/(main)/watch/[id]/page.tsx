"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CaretLeft,
  ThumbsUp,
  ThumbsDown,
  ShareNetwork,
  Flag,
  Play,
  X,
  Users,
  CaretDown,
  CaretUp,
  Lock,
  WarningCircle,
} from "@phosphor-icons/react";

import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { VideoPlayerSkeleton } from "@/components/player";
import { ContentComments, ContentImage } from "@/components/content";
import { cn, copyTextToClipboard } from "@/lib/utils";
import { normalizeMediaUrl } from "@/lib/media-url";
import { getPublicContentPath, getPublicContentUrl } from "@/lib/public-content-url";
import { useStreamUrl } from "@/hooks/use-streaming";
import { useContentDetail } from "@/hooks/use-content";
import {
  useContentLikeStatus,
  useLikeContent,
  useUnlikeContent,
} from "@/hooks/use-likes";
import { api, endpoints, ApiError } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { toast } from "sonner";
import { useIsAuthenticated } from "@/stores/auth.store";

type NextVideo = {
  id: string;
  slug?: string;
  title: string;
  contentType?: string;
  thumbnailUrl?: string | null;
  duration?: number;
  seasonNumber?: number;
  episodeNumber?: number;
};

type WatchPartyCreateResponse = {
  id: string;
  inviteToken: string;
  invitationUrl?: string;
};

const VideoPlayer = dynamic(
  () => import("@/components/player/video-player").then((m) => m.VideoPlayer),
  { ssr: false, loading: () => <VideoPlayerSkeleton /> },
);

const NEXT_VIDEO_COUNTDOWN_SECONDS = 5;

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
  const searchParams = useSearchParams();
  const contentId = params.id as string;
  const isPreview = searchParams.get("preview") === "1";

  const queryClient = useQueryClient();
  const [showFullDescription, setShowFullDescription] = React.useState(false);
  const [disliked, setDisliked] = React.useState(false);
  const [nextEpisode, setNextEpisode] = React.useState<NextVideo | null>(null);
  const [nextCountdown, setNextCountdown] = React.useState(0);
  const [nextCancelled, setNextCancelled] = React.useState(false);
  const [isCreatingWatchParty, setIsCreatingWatchParty] = React.useState(false);
  const isCreatingWatchPartyRef = React.useRef(false);
  const isAuthenticated = useIsAuthenticated();

  // Fetch content metadata (works with both UUID and slug)
  const {
    data: contentData,
    isLoading: isContentLoading,
    error: contentError,
  } = useContentDetail(contentId);
  const contentDetail = (contentData as any)?.data || contentData;

  // Fetch stream URL for playback
  const {
    data,
    isLoading: isStreamLoading,
    error: streamError,
  } = useStreamUrl(contentId);
  const streamData = (data as any)?.data || data;

  const isLoading = isContentLoading && isStreamLoading;
  const error = streamError;
  const likeStatus = useContentLikeStatus(contentId, isAuthenticated);
  const likeContent = useLikeContent(contentId);
  const unlikeContent = useUnlikeContent(contentId);
  const liked = likeStatus.data?.liked ?? false;
  const likeCount = likeStatus.data?.likeCount ?? contentDetail?.likeCount ?? 0;
  const resolvedContentType = String(
    contentDetail?.contentType || streamData?.contentType || "",
  ).toUpperCase();
  const shouldRedirectShort = resolvedContentType === "SHORT" && !isPreview;

  React.useEffect(() => {
    if (!shouldRedirectShort) return;
    router.replace(
      getPublicContentPath({
        id: contentDetail?.id || contentId,
        slug: contentDetail?.slug,
        contentType: "SHORT",
      }),
    );
  }, [
    contentDetail?.id,
    contentDetail?.slug,
    contentId,
    router,
    shouldRedirectShort,
  ]);

  React.useEffect(() => {
    setNextEpisode(null);
    setNextCountdown(0);
    setNextCancelled(false);
  }, [contentId]);

  // Record view once when the video becomes playable
  const hasRecordedViewRef = React.useRef(false);
  React.useEffect(() => {
    hasRecordedViewRef.current = false;
  }, [contentId]);

  React.useEffect(() => {
    if (!contentId) return;
    if (shouldRedirectShort) return;
    if (hasRecordedViewRef.current) return;

    const status = (streamError as ApiError | undefined)?.status;
    if (status === 403) return;

    if (streamData?.streamUrl) {
      hasRecordedViewRef.current = true;
      api.get<void>(endpoints.content.recordView(contentId)).catch(() => {
        // Non-critical
      });
    }
  }, [contentId, shouldRedirectShort, streamData?.streamUrl, streamError]);

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

  const goToNextEpisode = React.useCallback(
    (episode = nextEpisode) => {
      if (!episode?.id) return;
      setNextCountdown(0);
      router.push(`/watch/${episode.id}`);
    },
    [nextEpisode, router],
  );

  const handleEnded = React.useCallback(async () => {
    if (!contentId || nextCancelled || nextEpisode) return;
    try {
      const response = await api.get<NextVideo | null>(
        endpoints.content.nextEpisode(contentId),
      );
      const episode = (response as any)?.data?.data ?? response.data;
      if (!episode?.id) return;
      setNextEpisode(episode);
      setNextCountdown(NEXT_VIDEO_COUNTDOWN_SECONDS);
    } catch {
      // No next episode or endpoint unavailable.
    }
  }, [contentId, nextCancelled, nextEpisode]);

  React.useEffect(() => {
    if (!nextEpisode || nextCountdown <= 0) return;

    const timer = window.setTimeout(() => {
      setNextCountdown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [nextEpisode, nextCountdown]);

  React.useEffect(() => {
    if (nextEpisode && nextCountdown === 0) {
      goToNextEpisode(nextEpisode);
    }
  }, [goToNextEpisode, nextEpisode, nextCountdown]);

  const handleError = React.useCallback((err: string) => {
    console.error("Video error:", err);
  }, []);

  // When CDN returns 403 for expired signed URL, refetch stream URL
  const handleUrlExpired = React.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.streaming.url(contentId),
    });
  }, [queryClient, contentId]);

  const handleShare = React.useCallback(async () => {
    const url = getPublicContentUrl({
      id: contentDetail?.id || contentId,
      slug: contentDetail?.slug,
      contentType: contentDetail?.contentType || streamData?.contentType,
    });

    const shareTitle = streamData?.title || contentDetail?.title || "Видео";

    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as any).share({ title: shareTitle, url });
        return;
      }
    } catch {
      // fall back to clipboard
    }

    const ok = await copyTextToClipboard(url);
    if (ok) toast.success("Ссылка скопирована");
    else toast.error("Не удалось скопировать ссылку");
  }, [
    contentDetail?.contentType,
    contentDetail?.id,
    contentDetail?.slug,
    contentDetail?.title,
    contentId,
    streamData?.contentType,
    streamData?.title,
  ]);

  const currentEpisodeId = React.useMemo(() => {
    const candidates = [
      streamData?.currentEpisodeId,
      streamData?.episodeId,
      contentDetail?.currentEpisodeId,
      contentDetail?.episodeId,
    ];

    return candidates.find(
      (candidate) => typeof candidate === "string" && candidate.trim(),
    ) as string | undefined;
  }, [
    contentDetail?.currentEpisodeId,
    contentDetail?.episodeId,
    streamData?.currentEpisodeId,
    streamData?.episodeId,
  ]);

  const handleCreateWatchParty = React.useCallback(async () => {
    if (isCreatingWatchPartyRef.current) return;

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/watch/${contentId}`)}`);
      return;
    }

    isCreatingWatchPartyRef.current = true;
    setIsCreatingWatchParty(true);

    try {
      const response = await api.post<WatchPartyCreateResponse>(
        endpoints.watchParties.create,
        {
          contentId,
          episodeId: currentEpisodeId || undefined,
        },
      );
      const room = ((response as any)?.data ?? response) as WatchPartyCreateResponse;

      if (!room?.inviteToken) {
        throw new Error("Не удалось получить ссылку-приглашение для совместного просмотра");
      }

      router.push(`/watch-party/join/${room.inviteToken}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось создать совместный просмотр";
      toast.error(message);
    } finally {
      isCreatingWatchPartyRef.current = false;
      setIsCreatingWatchParty(false);
    }
  }, [
    contentId,
    currentEpisodeId,
    isAuthenticated,
    router,
  ]);

  const handleReport = React.useCallback(() => {
    toast.message("Жалобы будут доступны позже");
  }, []);

  const handleToggleLike = React.useCallback(async () => {
    if (!isAuthenticated) {
      toast.message("Войдите, чтобы поставить лайк");
      return;
    }

    if (liked) {
      await unlikeContent.mutateAsync();
    } else {
      await likeContent.mutateAsync();
      setDisliked(false);
    }
  }, [isAuthenticated, likeContent, liked, unlikeContent]);

  if (shouldRedirectShort) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="border-b border-mp-border bg-mp-bg-secondary/50 h-14" />
        <div className="w-full bg-black">
          <Container size="full" className="px-0 md:px-6 lg:px-8">
            <div className="max-w-[1600px] mx-auto">
              <VideoPlayerSkeleton />
            </div>
          </Container>
        </div>
      </div>
    );
  }

  // Access denied (403) — show subscription CTA
  if (error) {
    const apiError = error as ApiError;
    const status = apiError?.status;

    if (status === 403) {
      return (
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 rounded-full bg-mp-accent-primary/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-mp-accent-primary" />
            </div>
            <h1 className="text-2xl font-bold text-mp-text-primary mb-3">
              Требуется подписка
            </h1>
            <p className="text-mp-text-secondary mb-6">
              Для просмотра этого контента необходима активная подписка или
              индивидуальная покупка.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/subscriptions")}>
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
    const contentNotFound =
      contentError && (contentError as ApiError)?.status === 404;
    if (status === 404 && contentNotFound) {
      return (
        <div className="min-h-screen bg-transparent flex items-center justify-center">
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
        <div className="min-h-screen bg-transparent flex items-center justify-center">
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
  const streamMessageLower = (streamMessage || "").toLowerCase();
  const videoNotUploaded =
    videoNotReady &&
    (streamMessageLower.includes("нет загруженного видео") ||
      streamMessageLower.includes("нет видео"));
  const videoEncodingFailed =
    videoNotReady && streamMessageLower.includes("не удалось");

  // Loading state — show skeleton while both queries are in flight
  if (isLoading && !videoNotReady) {
    return (
      <div className="min-h-screen bg-transparent">
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
  const title = streamData?.title || contentDetail?.title || "Видео";
  const description =
    streamData?.description || contentDetail?.description || "";
  const duration = streamData?.duration || contentDetail?.duration || 0;
  const thumbnailUrl =
    streamData?.thumbnailUrls?.[0] || contentDetail?.thumbnailUrl;
  const normalizedThumbnailUrl = thumbnailUrl
    ? normalizeMediaUrl(thumbnailUrl)
    : undefined;
  const nextContentType =
    nextEpisode?.contentType || contentDetail?.contentType || "";
  const nextVideoTitlePrefix =
    nextContentType === "TUTORIAL" ? "Следующий урок" : "Следующая серия";
  const nextVideoCountdownText =
    nextContentType === "TUTORIAL"
      ? `Следующий урок начнётся через ${nextCountdown} секунд`
      : `Следующая серия начнётся через ${nextCountdown} секунд`;
  const nextProgressPercent =
    (Math.max(nextCountdown, 0) / NEXT_VIDEO_COUNTDOWN_SECONDS) * 100;
  const normalizedNextThumbnailUrl = nextEpisode?.thumbnailUrl
    ? normalizeMediaUrl(nextEpisode.thumbnailUrl)
    : undefined;

  return (
    <div className="min-h-screen bg-transparent">
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
        <div className="relative max-w-[1920px] mx-auto">
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
                      {streamMessage || "Попробуйте позже"}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 border-4 border-mp-accent-primary/30 border-t-mp-accent-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-mp-text-primary font-medium text-lg">
                      Видео готовится к воспроизведению
                    </p>
                    <p className="text-mp-text-secondary text-sm mt-2">
                      {streamMessage ||
                        "Попробуйте обновить страницу через несколько минут"}
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

          {nextEpisode && nextCountdown > 0 && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="w-[min(720px,100%)] overflow-hidden rounded-2xl border border-white/10 bg-[#10131c]/95 text-mp-text-primary shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
                  <div className="relative aspect-video sm:aspect-auto sm:min-h-[220px] bg-mp-bg-secondary">
                    {normalizedNextThumbnailUrl ? (
                      <ContentImage
                        src={normalizedNextThumbnailUrl}
                        alt={nextEpisode.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 220px"
                      />
                    ) : normalizedThumbnailUrl ? (
                      <ContentImage
                        src={normalizedThumbnailUrl}
                        alt={nextEpisode.title}
                        fill
                        className="object-cover opacity-80"
                        sizes="(max-width: 640px) 100vw, 220px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Play className="h-12 w-12 text-mp-text-secondary" weight="fill" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  </div>

                  <div className="flex flex-col justify-center p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mp-accent-primary">
                      {nextVideoTitlePrefix}
                    </p>
                    <h2 className="mt-2 line-clamp-2 text-2xl font-bold text-mp-text-primary">
                      {nextEpisode.title}
                    </h2>
                    <p className="mt-3 text-sm text-mp-text-secondary">
                      {nextVideoCountdownText}
                    </p>

                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-mp-accent-primary transition-[width] duration-1000 ease-linear"
                        style={{ width: `${nextProgressPercent}%` }}
                      />
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        onClick={() => goToNextEpisode()}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" weight="fill" />
                        Смотреть сейчас
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          setNextCancelled(true);
                          setNextEpisode(null);
                          setNextCountdown(0);
                        }}
                      >
                        <X className="h-4 w-4" />
                        Отмена
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                    До{" "}
                    {streamData?.availableQualities[
                      streamData.availableQualities.length - 1
                    ] || streamData?.maxQuality}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-6 border-b border-mp-border">
            <Button
              variant={liked ? "default" : "outline"}
              size="sm"
              onClick={handleToggleLike}
              disabled={likeContent.isPending || unlikeContent.isPending}
              className="gap-2"
            >
              <ThumbsUp
                className={cn("w-4 h-4", liked && "fill-current")}
              />
              Нравится{likeCount > 0 ? ` ${likeCount}` : ""}
            </Button>
            <Button
              variant={disliked ? "default" : "outline"}
              size="sm"
              onClick={() => setDisliked((value) => !value)}
            >
              <ThumbsDown
                className={cn("w-4 h-4", disliked && "fill-current")}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleShare}
            >
              <ShareNetwork className="w-4 h-4" />
              Поделиться
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCreateWatchParty}
              disabled={isCreatingWatchParty}
            >
              <Users className="w-4 h-4" />
              {isCreatingWatchParty ? "Создание..." : "Совместный просмотр"}
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
                  "text-mp-text-secondary",
                  !showFullDescription && "line-clamp-3",
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

          <ContentComments
            contentId={contentId}
            className="border-t border-mp-border pt-6"
          />
        </div>
      </Container>
    </div>
  );
}
