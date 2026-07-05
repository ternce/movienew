"use client";

import { DeviceMobile, Eye, Play } from "@phosphor-icons/react";
import Link from "next/link";

import { AuthorInlineLink } from "@/components/content/author-inline-link";
import { AgeBadge, type AgeCategory } from "@/components/content/age-badge";
import { ContentImage } from "@/components/content/content-image";
import { RatingBadge } from "@/components/ui/rating-badge";
import type { CreatorInput } from "@/lib/author-identity";
import { getPublicContentPath } from "@/lib/public-content-url";
import { cn, formatDuration, formatViewCount } from "@/lib/utils";

export interface ShortPreviewContent {
  id: string;
  slug?: string;
  title: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  viewCount?: number | null;
  ageCategory?: AgeCategory;
  category?: string;
  rating?: number;
  creator?: CreatorInput;
}

interface ShortPreviewCardProps {
  content: ShortPreviewContent;
  className?: string;
}

export function ShortPreviewCard({ content, className }: ShortPreviewCardProps) {
  const href = getPublicContentPath({
    id: content.id,
    slug: content.slug,
    contentType: "SHORT",
  });

  return (
    <article
      className={cn(
        "sesh-content-card group block w-full shrink-0 content-card",
        className,
      )}
    >
      <div className="relative mb-3 aspect-[9/16] overflow-hidden rounded-xl bg-mp-surface-2">
        <ContentImage
          src={content.thumbnailUrl || "/images/movie-placeholder.jpg"}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-110"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 24vw, 180px"
          fallbackIcon={<DeviceMobile className="h-12 w-12 text-mp-text-disabled" />}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/18 to-transparent" />

        <div className="absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-2">
          {content.ageCategory ? <AgeBadge age={content.ageCategory} size="sm" /> : <span />}
          <span className="rounded-full bg-black/65 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            Shorts
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between gap-2">
          {content.rating !== undefined && content.rating > 0 ? (
            <RatingBadge rating={content.rating} size="sm" />
          ) : (
            <span />
          )}
          {content.duration ? (
            <span className="rounded bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {formatDuration(content.duration)}
            </span>
          ) : null}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mp-accent-primary/90 shadow-lg backdrop-blur-sm">
            <Play className="ml-0.5 h-5 w-5 text-white" weight="fill" />
          </div>
        </div>

        <Link href={href} className="absolute inset-0 z-20" aria-label={content.title} />
      </div>

      <div className="flex min-h-[78px] flex-col">
        <Link href={href} className="block">
          <h3 className="line-clamp-2 font-medium leading-tight text-mp-text-primary transition-colors duration-200 group-hover:text-mp-accent-primary">
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
            <Eye className="h-3.5 w-3.5" />
            <span className="truncate">{formatViewCount(content.viewCount ?? 0)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
