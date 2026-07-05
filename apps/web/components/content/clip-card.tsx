"use client";

import { Play, FilmStrip, Eye } from "@phosphor-icons/react";
import Link from "next/link";

import { AuthorInlineLink } from "@/components/content/author-inline-link";
import { AgeBadge, type AgeCategory } from "@/components/content/age-badge";
import { ContentImage } from "@/components/content/content-image";
import { HoverVideoPreview } from "@/components/content/hover-video-preview";
import { RatingBadge } from "@/components/ui/rating-badge";
import type { CreatorInput } from "@/lib/author-identity";
import { getPublicContentPath } from "@/lib/public-content-url";
import { cn, formatDuration, formatViewCount } from "@/lib/utils";

export interface ClipContent {
  id: string;
  slug: string;
  title: string;
  contentType?: string;
  thumbnailUrl: string;
  duration: number; // seconds
  viewCount: number;
  ageCategory: AgeCategory;
  category?: string;
  rating?: number;
  creator?: CreatorInput;
}

interface ClipCardProps {
  content: ClipContent;
  className?: string;
  href?: string;
}

/**
 * Clip card with duration badge, view count, and hover play button
 */
export function ClipCard({ content, className, href }: ClipCardProps) {
  const isShort = String(content.contentType || "").toUpperCase() === "SHORT";
  const contentHref =
    href ||
    (isShort
      ? getPublicContentPath({
          id: content.id,
          slug: content.slug,
          contentType: "SHORT",
        })
      : `/videos/${content.slug}`);

  return (
    <article className={cn("sesh-content-card sesh-clip-card group block shrink-0 content-card w-full", className)}>
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-mp-surface-2 mb-3">
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          fallbackIcon={
            <FilmStrip className="w-12 h-12 text-mp-text-disabled" />
          }
        />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <AgeBadge age={content.ageCategory} size="sm" />
          {content.category && (
            <span className="text-xs bg-mp-surface/80 backdrop-blur-sm text-mp-text-secondary px-2 py-1 rounded">
              {content.category}
            </span>
          )}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between gap-2">
          {content.rating !== undefined && content.rating > 0 ? (
            <RatingBadge rating={content.rating} size="sm" />
          ) : (
            <span />
          )}
          <span className="text-xs bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded font-medium transition-opacity group-hover:opacity-0">
            {formatDuration(content.duration)}
          </span>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent touch:opacity-60 opacity-0 hover-hover:group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center touch:opacity-80 opacity-0 hover-hover:group-hover:opacity-100 transition-all duration-300 touch:scale-100 scale-90 hover-hover:group-hover:scale-100">
          <div className="w-14 h-14 touch:w-11 touch:h-11 rounded-full bg-mp-accent-tertiary/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Play
              className="w-6 h-6 touch:w-5 touch:h-5 text-white ml-0.5"
              weight="fill"
            />
          </div>
        </div>
        <HoverVideoPreview
          contentId={content.id}
          title={content.title}
          href={contentHref}
          contentType={content.contentType}
          duration={content.duration}
        />
        <Link href={contentHref} className="absolute inset-0 z-10" aria-label={content.title} />
      </div>

      {/* Content info */}
      <div className="flex min-h-[78px] flex-col">
        <Link href={contentHref} className="block">
          <h3 className="line-clamp-2 font-medium leading-tight text-mp-text-primary transition-colors duration-200 group-hover:text-mp-accent-tertiary">
            {content.title}
          </h3>
        </Link>
        <AuthorInlineLink
          creator={content.creator}
          className="mt-1 max-w-full"
          showUsername
        />
        <div className="mt-auto flex min-w-0 items-center gap-2 pt-1 text-sm text-mp-text-secondary">
          <span className="flex min-w-0 items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span className="truncate">{formatViewCount(content.viewCount)}</span>
          </span>
          <span className="shrink-0">&middot;</span>
          <span className="shrink-0">{formatDuration(content.duration)}</span>
        </div>
      </div>
    </article>
  );
}
