'use client';

import {
  ArrowBendUpLeft,
  ChatCircle,
  ChatCircleDots,
  Heart,
  PaperPlaneTilt,
  Play,
  ShareNetwork,
  ShieldCheck,
  SpeakerHigh,
  SpeakerSlash,
  SpinnerGap,
  X,
} from '@phosphor-icons/react';
import Hls from 'hls.js';
import Link from 'next/link';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn, copyTextToClipboard, formatNumber, formatRelativeTime } from '@/lib/utils';
import { normalizeMediaUrl } from '@/lib/media-url';
import { normalizeCreatorIdentity } from '@/lib/author-identity';
import { getPublicContentUrl } from '@/lib/public-content-url';
import type { CreatorInput } from '@/lib/author-identity';
import { useStreamUrl } from '@/hooks/use-streaming';
import { useContentComments, useCreateContentComment } from '@/hooks/use-comments';
import {
  useContentLikeStatus,
  useLikeContent,
  useUnlikeContent,
} from '@/hooks/use-likes';
import { useIsAuthenticated, useUser } from '@/stores/auth.store';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';

let activeShortVideo: HTMLVideoElement | null = null;

export interface ShortContent {
  id: string;
  slug?: string;
  title: string;
  contentType?: string;
  thumbnailUrl?: string;
  creator: CreatorInput;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
}

interface ShortCardProps {
  content: ShortContent;
  isActive?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  className?: string;
}

/**
 * Full-screen vertical short card for the Shorts feed
 * Uses native <video> for performance. Only active card plays.
 */
export const ShortCard = forwardRef<HTMLDivElement, ShortCardProps>(
  ({ content, isActive = false, preload = 'none', className }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const shouldLoadStream = isActive || preload !== 'none';
    const { data, isLoading, error } = useStreamUrl(content.id, {
      enabled: shouldLoadStream,
      reason: isActive ? 'active' : 'preload',
    });
    const streamData = (data as any)?.data ?? data;

    const [isMuted, setIsMuted] = useState(false);
    const [isPaused, setIsPaused] = useState(!isActive);
    const [showLoadingState, setShowLoadingState] = useState(false);
    const mutedRef = useRef(isMuted);
    const activeStartedAtRef = useRef<number | null>(null);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState('');
    const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    const user = useUser();
    const isAuthenticated = useIsAuthenticated();
    const commentsQuery = useContentComments(content.id, commentsOpen);
    const createComment = useCreateContentComment(content.id);
    const likeStatus = useContentLikeStatus(content.id, isAuthenticated);
    const likeContent = useLikeContent(content.id);
    const unlikeContent = useUnlikeContent(content.id);
    const liked = likeStatus.data?.liked ?? false;
    const likeCount = likeStatus.data?.likeCount ?? content.likeCount ?? 0;
    const commentCount = commentsQuery.data?.total ?? content.commentCount ?? 0;
    const commentSummary =
      commentCount > 0
        ? `${formatNumber(commentCount)} ${getCommentWord(commentCount)}`
        : 'Нет комментариев';
    const currentUserName = user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || 'вы'
      : 'вы';
    const creatorIdentity = normalizeCreatorIdentity(content.creator);
    const creatorAvatarSrc = creatorIdentity?.avatarUrl
      ? normalizeMediaUrl(creatorIdentity.avatarUrl)
      : undefined;
    const creatorHref = creatorIdentity?.href;

    useEffect(() => {
      mutedRef.current = isMuted;
    }, [isMuted]);

    const pauseCurrentVideo = useCallback((reset = false) => {
      const el = videoRef.current;
      if (!el) return;
      if (activeShortVideo === el) {
        activeShortVideo = null;
      }
      el.pause();
      if (reset) {
        el.currentTime = 0;
      }
    }, []);

    const playActiveVideo = useCallback(() => {
      const el = videoRef.current;
      if (!el) return;

      if (activeShortVideo && activeShortVideo !== el) {
        activeShortVideo.pause();
        activeShortVideo.currentTime = 0;
      }
      activeShortVideo = el;
      el.muted = mutedRef.current;

      const playPromise = el.play();
      if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
        (playPromise as Promise<void>).catch(() => {
          if (!el.muted) {
            el.muted = true;
            setIsMuted(true);
            const mutedPlayPromise = el.play();
            if (mutedPlayPromise && typeof (mutedPlayPromise as Promise<void>).catch === 'function') {
              (mutedPlayPromise as Promise<void>).catch(() => {
                setIsPaused(true);
              });
            }
            return;
          }
          setIsPaused(true);
        });
      }
    }, []);

    useEffect(() => {
      // Reset local state when card changes
      setIsMuted(false);
      setIsPaused(!isActive);
      setCommentsOpen(false);
      setCommentText('');
    }, [content.id, isActive]);

    useEffect(() => {
      const el = commentTextareaRef.current;
      if (!el) return;
      el.style.height = '0px';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [commentText]);

    useEffect(() => {
      // When card becomes inactive, ensure it's muted (prevents bleed when scrolling)
      if (!isActive) {
        setIsMuted(false);
        setIsPaused(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
        }
        pauseCurrentVideo(true);
      }
    }, [isActive, pauseCurrentVideo]);

    const videoSrc = useMemo(() => {
      if (!shouldLoadStream) return undefined;
      return streamData?.streamUrl
        ? normalizeMediaUrl(streamData.streamUrl as string)
        : undefined;
    }, [shouldLoadStream, streamData?.streamUrl]);

    useEffect(() => {
      if (!isActive || (!isLoading && videoSrc)) {
        setShowLoadingState(false);
        return undefined;
      }

      const timer = window.setTimeout(() => setShowLoadingState(true), 300);
      return () => window.clearTimeout(timer);
    }, [isActive, isLoading, videoSrc]);

    useEffect(() => {
      if (isActive) {
        activeStartedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      }
    }, [content.id, isActive, videoSrc]);

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return undefined;

      // Always clean up previous HLS instance before switching cards/URLs
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (!shouldLoadStream || !videoSrc) {
        try {
          pauseCurrentVideo(true);
          el.removeAttribute('src');
          el.load();
        } catch {
          // ignore
        }
        return undefined;
      }

      const isHls = /\.m3u8(\?|$)/i.test(videoSrc);

      // Chrome/Firefox: native <video> does not play HLS, so we must use hls.js
      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 20,
          startLevel: -1,
          capLevelToPlayerSize: true,
        });

        hlsRef.current = hls;
        hls.loadSource(videoSrc);
        hls.attachMedia(el);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (videoRef.current === el && isActive) {
            playActiveVideo();
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            try {
              hls.destroy();
              hlsRef.current = null;
            } catch {
              // ignore
            }
          }
        });

        return () => {
          if (activeShortVideo === el) {
            activeShortVideo = null;
          }
          el.pause();
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      }

      // Safari (native HLS) or non-HLS URL
      try {
        el.src = videoSrc;
        if (isActive) {
          playActiveVideo();
        } else {
          el.load();
        }
      } catch {
        // ignore
      }
      return () => {
        if (activeShortVideo === el) {
          activeShortVideo = null;
        }
        el.pause();
      };
    }, [isActive, pauseCurrentVideo, playActiveVideo, shouldLoadStream, videoSrc]);

    useEffect(() => {
      return () => {
        pauseCurrentVideo(true);
      };
    }, [pauseCurrentVideo]);

    const handleToggleLike = async () => {
      if (!isAuthenticated) {
        toast.message('Войдите, чтобы поставить лайк');
        return;
      }

      if (liked) {
        await unlikeContent.mutateAsync();
      } else {
        await likeContent.mutateAsync();
      }
    };

    const handleComments = () => {
      setCommentsOpen(true);
    };

    const handleSubmitComment = async () => {
      const text = commentText.trim();
      if (!text) return;

      if (!isAuthenticated) {
        toast.message('Войдите, чтобы оставлять комментарии');
        return;
      }

      try {
        await createComment.mutateAsync({ text });
        setCommentText('');
      } catch {
        // handled by global mutation error toast
      }
    };

    const handleShare = async () => {
      const url = getPublicContentUrl({
        id: content.id,
        slug: content.slug,
        contentType: content.contentType || 'SHORT',
      });
      try {
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
          await (navigator as any).share({ title: content.title, url });
          return;
        }
      } catch {
        // fall back to clipboard
      }

      const ok = await copyTextToClipboard(url);
      if (ok) toast.success('Ссылка скопирована');
      else toast.error('Не удалось скопировать ссылку');
    };

    const handleTogglePlayback = () => {
      const el = videoRef.current;
      if (!el || !isActive) return;

      if (el.paused) {
        el.muted = isMuted;
        const playPromise = el.play();
        if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
          (playPromise as Promise<void>).catch(() => {
            if (!el.muted) {
              el.muted = true;
              setIsMuted(true);
              const mutedPlayPromise = el.play();
              if (mutedPlayPromise && typeof (mutedPlayPromise as Promise<void>).catch === 'function') {
                (mutedPlayPromise as Promise<void>).catch(() => {
                  setIsPaused(true);
                });
              }
              return;
            }
            setIsPaused(true);
          });
        }
        return;
      }

      el.pause();
      setIsPaused(true);
    };

    const handleToggleMute = () => {
      const el = videoRef.current;
      if (!el) return;
      const nextMuted = !el.muted;
      el.muted = nextMuted;
      if (!nextMuted && el.volume === 0) {
        el.volume = 1;
      }
      setIsMuted(nextMuted);

      // If autoplay was muted and audio is now enabled, keep playback running
      if (!nextMuted) {
        const playPromise = el.play();
        if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
          (playPromise as Promise<void>).catch(() => {
            el.muted = true;
            setIsMuted(true);
          });
        }
      }
    };

    return (
      <>
        <div
          ref={ref}
          data-short-id={content.id}
          className={cn(
            'relative flex h-full w-full snap-start snap-always items-center justify-center bg-transparent px-4 py-0 sm:px-6 md:px-0 max-md:w-screen max-md:max-w-none max-md:px-0',
            className
          )}
          onClick={(e) => {
            if (!isActive) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest('button,a')) return;
            handleTogglePlayback();
          }}
        >
          <div className="relative flex h-full w-full max-w-[760px] items-center justify-center gap-3 sm:gap-4 md:gap-5 lg:max-w-[720px] max-md:w-screen max-md:max-w-none max-md:gap-0">
            <div className="relative h-full w-full overflow-hidden bg-[#05060a] shadow-[0_24px_70px_rgba(0,0,0,0.34)] sm:mt-3 sm:h-[calc(100%-24px)] sm:aspect-[9/16] sm:max-h-[860px] sm:w-auto sm:self-start sm:rounded-[10px] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:bg-transparent max-md:shadow-none">
        {/* Video element */}
        <video
          ref={videoRef}
          poster={content.thumbnailUrl ? normalizeMediaUrl(content.thumbnailUrl) : undefined}
          loop
          muted={isMuted}
          playsInline
          preload={isActive ? 'auto' : preload}
          className="sesh-shorts-video absolute inset-0 h-full w-full object-cover max-md:w-screen max-md:max-w-none max-md:rounded-none"
          onPlay={() => setIsPaused(false)}
          onPause={() => setIsPaused(true)}
          onLoadedData={(event) => {
            if (process.env.NODE_ENV !== 'development' || !isActive) return;
            const el = event.currentTarget;
            const startedAt = activeStartedAtRef.current;
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            // eslint-disable-next-line no-console
            console.debug('[shorts:first-frame]', {
              contentId: content.id,
              durationMs: startedAt ? Math.round(now - startedAt) : null,
              currentSrc: el.currentSrc,
              readyState: el.readyState,
              networkState: el.networkState,
              preload: el.preload,
            });
          }}
        />

        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/82 via-black/34 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/22 to-transparent" />

        {/* Dedicated sound control */}
        <button
          type="button"
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
          className="sesh-shorts-sound-button absolute right-4 top-[calc(16px+env(safe-area-inset-top,0px))] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-[#07020f]/52 text-white shadow-[0_0_20px_rgba(213,32,58,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition-all duration-200 hover:border-[#55b7ff]/42 hover:bg-[#0b1727]/70 active:scale-95 sm:right-5 sm:top-5"
          onClick={(event) => {
            event.stopPropagation();
            handleToggleMute();
          }}
        >
          {isMuted ? (
            <SpeakerSlash className="h-5 w-5" weight="fill" />
          ) : (
            <SpeakerHigh className="h-5 w-5" weight="fill" />
          )}
        </button>

        {/* Center play indicator */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200",
            isActive && isPaused ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/16 bg-[#07020f]/40 shadow-[0_0_18px_rgba(213,32,58,0.16)] backdrop-blur-md">
            <Play className="ml-1 h-8 w-8 text-white" weight="fill" />
          </div>
        </div>

        {/* Bottom info */}
        <div className="shorts-info absolute bottom-7 left-5 right-5 z-10 sm:bottom-8 sm:left-6 sm:right-6">
          <h3 className="mb-1.5 line-clamp-2 text-[22px] font-bold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] sm:text-2xl">
            {content.title}
          </h3>
          {creatorIdentity && (
            <div className="truncate text-sm font-medium text-white/86 drop-shadow-[0_1px_8px_rgba(0,0,0,0.72)]">
              {creatorIdentity.displayName}
              {creatorIdentity.username ? (
                <span className="ml-2 text-white/60">@{creatorIdentity.username}</span>
              ) : null}
            </div>
          )}
        </div>
            </div>

        {/* Side action bar */}
        <div className="shorts-actions absolute bottom-28 right-3 z-10 flex flex-col items-center gap-4 sm:bottom-20 md:static md:translate-y-[38px] md:gap-5">
          {creatorIdentity ? (
            creatorHref ? (
              <Link
                href={creatorHref}
                aria-label="Открыть профиль автора"
                className="rounded-full bg-[linear-gradient(135deg,#b91428,#43259d,#0e6fb7)] p-[2px] shadow-[0_0_14px_rgba(213,32,58,0.22)] transition-[transform,box-shadow] duration-150 hover:shadow-[0_0_18px_rgba(213,32,58,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55b7ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05030d] active:scale-95"
              >
                <UserAvatar
                  size="default"
                  name={creatorIdentity.displayName}
                  src={creatorAvatarSrc}
                  className="h-11 w-11 border-2 border-[#080013] bg-[#10131c]"
                />
              </Link>
            ) : (
              <div className="rounded-full bg-[linear-gradient(135deg,#b91428,#43259d,#0e6fb7)] p-[2px] shadow-[0_0_14px_rgba(213,32,58,0.22)]">
                <UserAvatar
                  size="default"
                  name={creatorIdentity.displayName}
                  src={creatorAvatarSrc}
                  className="h-11 w-11 border-2 border-[#080013] bg-[#10131c]"
                />
              </div>
            )
          ) : null}
          <button
            type="button"
            className="group flex flex-col items-center gap-1"
            aria-label="Нравится"
            onClick={handleToggleLike}
            disabled={likeContent.isPending || unlikeContent.isPending}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d5203a]/22 bg-[#07020f]/54 text-white shadow-[0_0_16px_rgba(213,32,58,0.16)] backdrop-blur-md transition-all group-hover:border-[#ff6a78]/50 group-hover:bg-[#1b0712]/74">
              <Heart className={cn('h-5 w-5', liked && 'fill-current text-[#ff4059]')} />
            </div>
            <span className="text-xs font-semibold text-white">{formatNumber(likeCount)}</span>
          </button>

          <button
            type="button"
            className="group flex flex-col items-center gap-1"
            aria-label="Комментарии"
            onClick={handleComments}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d5203a]/22 bg-[#07020f]/54 text-white shadow-[0_0_16px_rgba(213,32,58,0.16)] backdrop-blur-md transition-all group-hover:border-[#55b7ff]/50 group-hover:bg-[#0b1727]/74">
              <ChatCircle className="h-5 w-5" weight="fill" />
            </div>
            <span className="text-xs font-semibold text-white">{formatNumber(commentCount)}</span>
          </button>

          <button
            type="button"
            className="group flex flex-col items-center gap-1"
            aria-label="Поделиться"
            onClick={handleShare}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d5203a]/22 bg-[#07020f]/54 text-white shadow-[0_0_16px_rgba(213,32,58,0.16)] backdrop-blur-md transition-all group-hover:border-[#55b7ff]/50 group-hover:bg-[#0b1727]/74">
              <ShareNetwork className="h-5 w-5" weight="fill" />
            </div>
          </button>
        </div>

        {/* Stream state indicator for active card */}
        {isActive && (showLoadingState || error) && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[radial-gradient(circle_at_50%_46%,rgba(213,32,58,0.16),transparent_32%)]">
            <div className="relative overflow-hidden rounded-full border border-white/12 bg-[#07020f]/68 px-4 py-2 text-sm font-semibold text-white/90 shadow-[0_0_24px_rgba(213,32,58,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/12 to-transparent" />
              <span className="relative">Видео готовится…</span>
            </div>
          </div>
        )}

        </div>
        </div>

        <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
          <SheetContent
            side="bottom"
            className="sesh-comments-sheet mx-auto flex h-[82vh] max-h-[820px] w-full max-w-[920px] flex-col overflow-hidden rounded-t-[26px] border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(213,32,58,0.18),transparent_30%),radial-gradient(circle_at_84%_4%,rgba(85,183,255,0.12),transparent_28%),linear-gradient(180deg,rgba(16,7,29,0.96),rgba(5,6,15,0.98))] px-0 pb-0 pt-0 text-mp-text-primary shadow-[0_-28px_90px_rgba(0,0,0,0.62),0_0_42px_rgba(213,32,58,0.12),inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-2xl data-[state=open]:duration-500 data-[state=closed]:duration-300 [&>button:first-child]:hidden sm:h-[78vh] sm:rounded-t-[24px]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetHeader className="border-b border-white/[0.07] bg-white/[0.025] px-5 pb-4 pt-5 text-left shadow-[0_12px_34px_rgba(0,0,0,0.16)] sm:px-7 sm:pb-5 sm:pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SheetTitle className="text-[22px] font-extrabold leading-tight text-white sm:text-2xl">
                    Комментарии
                  </SheetTitle>
                  <p className="mt-1 text-sm font-medium text-white/52">
                    {commentSummary}
                  </p>
                </div>
                <SheetClose className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all duration-200 hover:border-[#ff4163]/35 hover:bg-[#d5203a]/14 hover:text-white hover:shadow-[0_0_24px_rgba(213,32,58,0.18)] focus:outline-none focus:ring-2 focus:ring-[#ff4163]/35">
                  <X className="h-5 w-5 transition-transform duration-200 group-hover:scale-90" weight="bold" />
                  <span className="sr-only">Закрыть комментарии</span>
                </SheetClose>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 pr-3 sm:space-y-4 sm:px-7 sm:py-5">
              {commentsQuery.isLoading ? (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.035] p-5 text-sm font-medium text-white/54">
                  Загрузка…
                </div>
              ) : commentsQuery.isError ? (
                <div className="rounded-[18px] border border-[#d5203a]/20 bg-[#d5203a]/8 p-5 text-sm font-medium text-white/64">
                  Не удалось загрузить комментарии
                </div>
              ) : (commentsQuery.data?.items?.length ?? 0) === 0 ? (
                <div className="flex min-h-[calc(100%-1rem)] flex-col items-center justify-center rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-6 py-12 text-center">
                  <div className="relative mb-5">
                    <div className="absolute inset-[-18px] rounded-full bg-[#d5203a]/20 blur-2xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/12 bg-[#0b0815]/76 text-[#ff6680] shadow-[0_0_28px_rgba(213,32,58,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                      <ChatCircleDots className="h-8 w-8" weight="duotone" />
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-white">
                    Комментариев пока нет
                  </h3>
                  <p className="mt-2 max-w-[280px] text-sm leading-6 text-white/48">
                    Будьте первым, кто начнет обсуждение.
                  </p>
                </div>
              ) : (
                commentsQuery.data!.items.map((c) => {
                  const author = c.author;
                  const name =
                    `${author?.firstName ?? ""} ${author?.lastName ?? ""}`.trim() ||
                    author?.username ||
                    'Пользователь';
                  const avatarSrc = author?.avatarUrl
                    ? normalizeMediaUrl(author.avatarUrl)
                    : undefined;
                  const authorMeta = author as
                    | (typeof author & {
                        role?: string | null;
                        verified?: boolean | null;
                        isVerified?: boolean | null;
                      })
                    | null
                    | undefined;
                  const role = authorMeta?.role;
                  const isVerified = Boolean(authorMeta?.verified || authorMeta?.isVerified);

                  return (
                    <article
                      key={c.id}
                      className="group flex gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d5203a]/22 hover:bg-white/[0.06] hover:shadow-[0_18px_42px_rgba(0,0,0,0.24),0_0_24px_rgba(213,32,58,0.08)] sm:gap-4 sm:p-5"
                    >
                      <UserAvatar
                        size="default"
                        name={name}
                        src={avatarSrc}
                        className="h-10 w-10 border border-white/14 bg-[#120917] shadow-[0_0_20px_rgba(213,32,58,0.18)] ring-2 ring-[#d5203a]/10 sm:h-11 sm:w-11"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <div className="truncate text-[15px] font-extrabold leading-tight text-white">
                            {name}
                          </div>
                          {isVerified && (
                            <ShieldCheck className="h-4 w-4 flex-none text-[#55b7ff]" weight="fill" />
                          )}
                          {role && (
                            <span className="rounded-full border border-[#d5203a]/24 bg-[#d5203a]/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#ff8a9b]">
                              {role}
                            </span>
                          )}
                          <div className="basis-full text-xs font-medium text-white/42 sm:basis-auto">
                            {formatRelativeTime(c.createdAt)}
                          </div>
                        </div>
                        <div className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-white/72">
                          {c.text}
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/46">
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            <Heart className="h-3.5 w-3.5" />
                            Нравится
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            <ArrowBendUpLeft className="h-3.5 w-3.5" />
                            Ответить
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,5,18,0.72),rgba(5,4,14,0.96))] px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-18px_48px_rgba(0,0,0,0.28)] sm:px-7 sm:pb-5 sm:pt-5">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      size="sm"
                      src={(user as { avatarUrl?: string | null } | null)?.avatarUrl ? normalizeMediaUrl((user as { avatarUrl?: string }).avatarUrl as string) : null}
                      name={currentUserName}
                      className="h-9 w-9 border border-white/14 bg-[#120917] shadow-[0_0_20px_rgba(213,32,58,0.18)]"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/42">
                        Комментирует как
                      </p>
                      <p className="truncate text-sm font-bold text-white">
                        {currentUserName}
                      </p>
                    </div>
                  </div>
                  <Textarea
                    ref={commentTextareaRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Поделитесь своим мнением..."
                    rows={2}
                    className="max-h-[160px] min-h-[88px] resize-none rounded-[18px] border-white/10 bg-[#060713]/72 px-4 py-4 text-[15px] leading-relaxed text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(213,32,58,0.04)] outline-none transition-all duration-200 placeholder:text-white/34 hover:border-white/16 focus-visible:border-[#ff4163]/45 focus-visible:ring-2 focus-visible:ring-[#d5203a]/20"
                    maxLength={2000}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-white/36">
                      {commentText.length}/2000
                    </span>
                    <Button
                      type="button"
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || createComment.isPending}
                      className="h-11 rounded-full border-0 bg-[linear-gradient(135deg,#d5203a_0%,#ff2d7a_52%,#7a5cff_100%)] px-5 font-bold text-white shadow-[0_0_22px_rgba(213,32,58,0.28),0_12px_28px_rgba(0,0,0,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(255,45,122,0.36),0_16px_36px_rgba(0,0,0,0.34)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none"
                    >
                      {createComment.isPending ? (
                        <>
                          <SpinnerGap className="h-4 w-4 animate-spin" />
                          Отправляем
                        </>
                      ) : (
                        <>
                          <PaperPlaneTilt className="h-4 w-4" weight="fill" />
                          Отправить
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.04] p-4 text-sm font-medium text-white/58">
                  Войдите, чтобы оставить комментарий.
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }
);
ShortCard.displayName = 'ShortCard';

function getCommentWord(count: number) {
  const abs = Math.abs(count);
  const lastTwo = abs % 100;
  const last = abs % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return 'комментариев';
  if (last === 1) return 'комментарий';
  if (last >= 2 && last <= 4) return 'комментария';
  return 'комментариев';
}
