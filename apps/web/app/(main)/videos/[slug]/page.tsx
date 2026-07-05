"use client";

import { Clock, Eye, FilmStrip, Play } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { AgeBadge, type AgeCategory } from "@/components/content/age-badge";
import { ClipCard } from "@/components/content/clip-card";
import { ContentComments } from "@/components/content/content-comments";
import { ContentImage } from "@/components/content/content-image";
import { ContentRating } from "@/components/content/content-rating";
import { CreatorChannelBlock } from "@/components/content/creator-channel-block";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ContentGrid } from "@/components/ui/grid";
import { Spinner } from "@/components/ui/spinner";
import { useContentDetail, useContentList } from "@/hooks/use-content";
import { getPublicContentPath } from "@/lib/public-content-url";
import { formatDuration, formatViewCount } from "@/lib/utils";

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: video, isLoading } = useContentDetail(slug);
  const { data: relatedData } = useContentList({ type: "CLIP", limit: 8 });
  const relatedVideos =
    relatedData?.data?.items?.filter((item) => item.slug !== slug) ?? [];

  const isShort = String(video?.contentType || "").toUpperCase() === "SHORT";

  React.useEffect(() => {
    if (!video || !isShort) return;
    router.replace(
      getPublicContentPath({
        id: video.id,
        slug: video.slug || slug,
        contentType: "SHORT",
      }),
    );
  }, [isShort, router, slug, video]);

  if (isLoading) {
    return (
      <Container size="lg" className="flex justify-center py-12">
        <Spinner size="xl" />
      </Container>
    );
  }

  if (!video) {
    return (
      <Container size="lg" className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-mp-text-primary">
          Видео не найдено
        </h2>
        <p className="mb-6 text-mp-text-secondary">
          Запрашиваемое видео не существует или было удалено
        </p>
        <Button variant="outline" asChild>
          <Link href="/videos">Все видео</Link>
        </Button>
      </Container>
    );
  }

  if (isShort) {
    return (
      <Container size="lg" className="flex justify-center py-12">
        <Spinner size="xl" />
      </Container>
    );
  }

  const categoryName = video.category
    ? typeof video.category === "object"
      ? (video.category as { name?: string }).name
      : video.category
    : null;
  return (
    <Container size="lg" className="py-6">
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-mp-surface-2">
        <div className="relative aspect-video">
          {video.thumbnailUrl ? (
            <ContentImage
              src={video.thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1152px"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-mp-surface-elevated">
              <FilmStrip className="h-20 w-20 text-mp-text-disabled" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="mb-3 flex items-center gap-3">
            <AgeBadge
              age={(video.ageCategory || "0+") as AgeCategory}
              size="md"
            />
            {categoryName && (
              <span className="rounded bg-white/10 px-2 py-1 text-sm text-white/70 backdrop-blur-sm">
                {categoryName}
              </span>
            )}
            {video.duration > 0 && (
              <span className="rounded bg-white/10 px-2 py-1 text-sm text-white/70 backdrop-blur-sm">
                {formatDuration(video.duration)}
              </span>
            )}
          </div>

          <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
            {video.title}
          </h1>
        </div>
      </div>

      {video.description && (
        <p className="mb-6 max-w-3xl leading-relaxed text-mp-text-secondary">
          {video.description}
        </p>
      )}

      <CreatorChannelBlock creator={video.creator} />

      <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-mp-text-secondary">
        <span className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" />
          {formatViewCount(video.viewCount)}
        </span>
        {video.duration > 0 && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatDuration(video.duration)}
          </span>
        )}
      </div>

      <div className="mb-12">
        <Button variant="gradient" size="lg" asChild>
          <Link href={`/watch/${video.id}`}>
            <Play className="h-5 w-5" />
            Смотреть
          </Link>
        </Button>
      </div>

      <div className="mb-12 space-y-8">
        <ContentRating contentId={video.id} />
        <ContentComments contentId={video.id} />
      </div>

      {relatedVideos.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold text-mp-text-primary">
            Другие видео
          </h2>
          <ContentGrid>
            {relatedVideos.slice(0, 8).map((item) => (
              <ClipCard
                key={item.id}
                content={{
                  id: item.id,
                  slug: item.slug,
                  title: item.title,
                  thumbnailUrl: item.thumbnailUrl || "/images/movie-placeholder.jpg",
                  duration: item.duration ?? 0,
                  viewCount: item.viewCount ?? 0,
                  ageCategory: item.ageCategory as AgeCategory,
                  category:
                    typeof item.category === "object"
                      ? item.category?.name
                      : item.category,
                  creator: item.creator,
                }}
              />
            ))}
          </ContentGrid>
        </section>
      )}
    </Container>
  );
}
