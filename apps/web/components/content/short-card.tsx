'use client';

import { Play, Heart, ChatCircle, ShareNetwork } from '@phosphor-icons/react';
import Hls from 'hls.js';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn, copyTextToClipboard, formatNumber, formatRelativeTime } from '@/lib/utils';
import { normalizeMediaUrl } from '@/lib/media-url';
import { useStreamUrl } from '@/hooks/use-streaming';
import { useContentComments, useCreateContentComment } from '@/hooks/use-comments';
import { useIsAuthenticated, useUser } from '@/stores/auth.store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';

export interface ShortContent {
  id: string;
  title: string;
  thumbnailUrl: string;
  creator: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

interface ShortCardProps {
  content: ShortContent;
  isActive?: boolean;
  className?: string;
}

/**
 * Full-screen vertical short card for the Shorts feed
 * Uses native <video> for performance. Only active card plays.
 */
export const ShortCard = forwardRef<HTMLDivElement, ShortCardProps>(
  ({ content, isActive = false, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const { data, isLoading, error } = useStreamUrl(isActive ? content.id : undefined);
    const streamData = (data as any)?.data ?? data;

    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(content.likeCount);
    const [isMuted, setIsMuted] = useState(true);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState('');
    const likeStorageKey = `mp-short-like:${content.id}`;

    const user = useUser();
    const isAuthenticated = useIsAuthenticated();
    const commentsQuery = useContentComments(content.id, commentsOpen);
    const createComment = useCreateContentComment(content.id);

    useEffect(() => {
      // Reset local state when card changes
      let savedLiked = false;
      if (typeof window !== 'undefined') {
        savedLiked = window.localStorage.getItem(likeStorageKey) === '1';
      }
      setLiked(savedLiked);
      setLikeCount(content.likeCount + (savedLiked ? 1 : 0));
      setIsMuted(true);
      setCommentsOpen(false);
      setCommentText('');
    }, [content.id, content.likeCount, likeStorageKey]);

    useEffect(() => {
      // When card becomes inactive, ensure it's muted (prevents bleed when scrolling)
      if (!isActive) {
        setIsMuted(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
        }
      }
    }, [isActive]);

    const videoSrc = useMemo(() => {
      if (!isActive) return undefined;
      return streamData?.streamUrl as string | undefined;
    }, [isActive, streamData?.streamUrl]);

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;

      // Always clean up previous HLS instance before switching cards/URLs
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (!isActive || !videoSrc) {
        try {
          el.pause();
          el.removeAttribute('src');
          el.load();
          el.currentTime = 0;
        } catch {
          // ignore
        }
        return;
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
          const playPromise = el.play();
          if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
            (playPromise as Promise<void>).catch(() => {
              // Autoplay can be blocked; user can tap the video.
            });
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
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      }

      // Safari (native HLS) or non-HLS URL
      try {
        el.src = videoSrc;
        const playPromise = el.play();
        if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
          (playPromise as Promise<void>).catch(() => {
            // ignore
          });
        }
      } catch {
        // ignore
      }
    }, [isActive, videoSrc]);

    const handleToggleLike = () => {
      setLiked((prev) => {
        const next = !prev;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(likeStorageKey, next ? '1' : '0');
        }
        setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
        return next;
      });
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
      const url = typeof window !== 'undefined' ? `${window.location.origin}/watch/${content.id}` : '';
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
            // ignore
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
            'relative w-full h-full snap-start snap-always flex items-center justify-center bg-black',
            className
          )}
          onClick={(e) => {
            if (!isActive) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest('button')) return;
            handleToggleMute();
          }}
        >
        {/* Video element */}
        <video
          ref={videoRef}
          poster={normalizeMediaUrl(content.thumbnailUrl)}
          loop
          muted={isMuted}
          playsInline
          autoPlay={isActive}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Bottom info */}
        <div className="absolute bottom-10 md:bottom-6 left-4 right-[4.5rem] z-10">
          <h3 className="text-white font-semibold text-lg leading-tight mb-1 line-clamp-2">
            {content.title}
          </h3>
          <p className="text-white/70 text-sm">
            @{content.creator}
          </p>
        </div>

        {/* Side action bar */}
        <div className="absolute right-3 bottom-24 md:bottom-20 z-10 flex flex-col items-center gap-5">
          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
            aria-label="Нравится"
            onClick={handleToggleLike}
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Heart className={cn('w-5 h-5 text-white', liked && 'fill-current')} />
            </div>
            <span className="text-xs text-white/80">{formatNumber(likeCount)}</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
            aria-label="Комментарии"
            onClick={handleComments}
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ChatCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white/80">{formatNumber(content.commentCount)}</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
            aria-label="Поделиться"
            onClick={handleShare}
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ShareNetwork className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white/80">{formatNumber(content.shareCount)}</span>
          </button>
        </div>

        {/* Stream state indicator for active card */}
        {isActive && (isLoading || error || !videoSrc) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white/90 text-sm">
              Видео готовится…
            </div>
          </div>
        )}

        {/* Center play indicator (shown when paused) */}
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" weight="fill" />
            </div>
          </div>
        )}
        </div>

        <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
          <SheetContent
            side="bottom"
            className="h-[75vh] bg-mp-surface border-mp-border text-mp-text-primary flex flex-col"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetHeader>
              <SheetTitle className="text-mp-text-primary">Комментарии</SheetTitle>
            </SheetHeader>

            <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              {commentsQuery.isLoading ? (
                <div className="text-sm text-mp-text-secondary">Загрузка…</div>
              ) : commentsQuery.isError ? (
                <div className="text-sm text-mp-text-secondary">Не удалось загрузить комментарии</div>
              ) : (commentsQuery.data?.items?.length ?? 0) === 0 ? (
                <div className="text-sm text-mp-text-secondary">Пока нет комментариев</div>
              ) : (
                commentsQuery.data!.items.map((c) => {
                  const name = `${c.author.firstName} ${c.author.lastName}`.trim();
                  const avatarSrc = c.author.avatarUrl
                    ? normalizeMediaUrl(c.author.avatarUrl)
                    : undefined;

                  return (
                    <div key={c.id} className="flex gap-3">
                      <UserAvatar size="sm" name={name || 'Пользователь'} src={avatarSrc} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <div className="text-sm font-medium text-mp-text-primary truncate">
                            {name || 'Пользователь'}
                          </div>
                          <div className="text-xs text-mp-text-secondary">
                            {formatRelativeTime(c.createdAt)}
                          </div>
                        </div>
                        <div className="text-sm text-mp-text-secondary whitespace-pre-wrap break-words">
                          {c.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 border-t border-mp-border pt-4">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <div className="text-xs text-mp-text-secondary">
                    Комментирует: {user ? `${user.firstName} ${user.lastName}` : 'вы'}
                  </div>
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Написать комментарий…"
                    className="bg-mp-surface-elevated border-mp-border text-mp-text-primary placeholder:text-mp-text-disabled"
                    maxLength={2000}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || createComment.isPending}
                    >
                      Отправить
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-mp-text-secondary">
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
