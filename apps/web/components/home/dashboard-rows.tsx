"use client";

import { CaretRight, Play, Star } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useRef } from "react";

import {
  AuthorInlineLink,
  HoverVideoPreview,
  isValidNumber,
  safeProgressPercent,
  VideoCardProgress,
  type VideoProgressContent,
} from "@/components/content";
import { ContentImage } from "@/components/content/content-image";
import type { useDashboardHome } from "@/hooks/use-home";
import {
  normalizeCreatorIdentity,
  type CreatorInput,
} from "@/lib/author-identity";
import { cn, formatNumber, formatViewCount } from "@/lib/utils";

type DashboardData = ReturnType<typeof useDashboardHome>;

interface DashboardRowsProps {
  data: DashboardData;
}

interface DashboardCardContent {
  id: string;
  slug: string;
  title: string;
  type?: string;
  thumbnailUrl: string;
  posterUrl?: string;
  viewCount?: number;
  duration?: number | null;
  category?: string | { id?: string; name?: string; slug?: string };
  genres?: string[];
  rating?: number;
  averageRating?: number;
  creator?: CreatorInput;
}

interface DashboardApiItem {
  id: string;
  slug?: string;
  title: string;
  contentType?: string;
  type?: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  bannerUrl?: string;
  heroImageUrl?: string;
  viewCount?: number | null;
  duration?: number | null;
  category?: string | { id?: string; name?: string; slug?: string };
  genre?: string[];
  genres?: string[];
  rating?: number | null;
  averageRating?: number | null;
  creator?: CreatorInput;
  author?: CreatorInput;
}

interface ContinueWatchingApiItem {
  id?: string;
  contentId?: string;
  progressSeconds?: number | null;
  progress?: number | null;
  remainingSeconds?: number | null;
  duration?: number | null;
  content?: {
    id?: string;
    slug?: string | null;
    contentType?: string | null;
    title?: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
    publishedAt?: string | null;
  } | null;
  title?: string;
  thumbnailUrl?: string | null;
  year?: number | null;
}

export function DashboardRows({ data }: DashboardRowsProps) {
  const trendingScrollRef = useRef<HTMLDivElement>(null);
  const {
    continueWatching,
    trending,
    newReleases,
    series,
    videos,
    shorts,
    tutorials,
  } = data;

  const continueItems = mapContinueWatchingItems(
    continueWatching.data?.items as ContinueWatchingApiItem[] | undefined,
  );
  const trendingItems = (trending.data?.data?.items || []).map(
    mapToDashboardCard,
  );
  const newReleaseItems = (newReleases.data?.data?.items || []).map(
    mapToDashboardCard,
  );
  const mobileNewReleaseItems = newReleaseItems.filter(isMobileNewReleaseItem);
  const gridItems = uniqueCards([
    ...trendingItems.slice(5),
    ...newReleaseItems,
    ...(videos.data?.data?.items || []).map(mapToDashboardCard),
    ...(tutorials.data?.data?.items || []).map(mapToDashboardCard),
    ...(series.data?.data?.items || []).map(mapToDashboardCard),
    ...(shorts.data?.data?.items || []).map(mapToDashboardCard),
  ]).filter((item) => (item.type || "").toUpperCase() !== "SHORT");

  const scrollTrending = useCallback((direction: "left" | "right") => {
    const carousel = trendingScrollRef.current;
    if (!carousel) return;

    carousel.scrollBy({
      left:
        (direction === "left" ? -1 : 1) *
        Math.max(225, carousel.clientWidth * 0.75),
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="sesh-dashboard-rows space-y-[34px] md:space-y-[32px]">
      {continueItems.length > 0 ? (
        <section className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-black/25 p-4 shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl md:w-fit md:max-w-full md:overflow-visible md:rounded-[14px] md:border-white/[0.06] md:bg-black/20 md:p-3 md:shadow-none">
          <div className="mb-4 flex items-center justify-between gap-3 md:mb-3.5 md:items-end">
            <h2 className="text-[24px] font-extrabold leading-none tracking-[-0.055em] text-white md:text-[22px] md:font-semibold md:leading-normal md:tracking-normal">
              Продолжить просмотр
            </h2>

            <Link
              href="/account/history"
              className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-white/64 transition-colors hover:text-white md:text-sm md:font-medium md:text-white/55"
            >
              Смотреть все
              <CaretRight
                className="h-3.5 w-3.5 text-[#ff1d6c] md:hidden"
                weight="bold"
              />
            </Link>
          </div>

          <div className="flex max-w-full items-start gap-3 overflow-x-auto pb-1 no-scrollbar md:w-fit md:gap-4">
            {continueItems.map((item) => (
              <VideoCardProgress
                key={item.id}
                content={item}
                className="sesh-dashboard-progress-card"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="relative">
        <div className="mb-5 flex items-end justify-between gap-4 md:hidden">
          <div>
            <h2 className="sesh-trending-title text-[52px] font-extrabold leading-[0.86] tracking-[-0.075em] text-white">
              <span className="sesh-trending-glow" aria-hidden="true">
                Trending Now
              </span>

              <span className="sesh-trending-main">
                Trending Now
              </span>
            </h2>

            <p className="mt-4 text-[19px] font-extrabold text-white/88 md:mt-5 md:text-[18px] md:font-semibold">
              Сейчас в тренде <span>🔥</span>
            </p>
          </div>
        </div>

        <div className="md:flex md:items-start md:gap-[36px] md:overflow-hidden">
          <div className="hidden w-[220px] shrink-0 pt-[26px] md:block">
            <h2 className="sesh-trending-title text-[42px] font-extrabold leading-[0.98] tracking-[-0.025em] text-white md:text-[48px]">
              <span className="sesh-trending-glow" aria-hidden="true">
                Trending
                <br />
                Now
              </span>

              <span className="sesh-trending-main">
                Trending
                <br />
                Now
              </span>
            </h2>

            <p className="mt-5 text-[18px] font-semibold text-white/82">
              Сейчас в тренде<span className="ml-1">🔥</span>
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 hidden justify-end gap-2 md:flex">
              {/* стрелки тут */}
            </div>

            <div
              id="trending-now-carousel"
              ref={trendingScrollRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-5 no-scrollbar md:snap-none md:gap-[26px] md:pb-3"
            >
              {trending.isLoading ? (
                <TopRailSkeleton />
              ) : (
                trendingItems
                  .slice(0, 8)
                  .map((item, index) => (
                    <CompactTrendingCard
                      key={item.id}
                      content={item}
                      rank={index + 1}
                    />
                  ))
              )}
            </div>
          </div>
        </div>
      </section>

      {newReleases.isLoading || mobileNewReleaseItems.length > 0 ? (
        <section className="relative md:hidden">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-[25px] font-extrabold leading-none tracking-[-0.055em] text-white">
              Новинки
            </h2>

            <Link
              href="/videos"
              className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-white/64 transition-colors active:text-white"
            >
              Смотреть все
              <CaretRight
                className="h-3.5 w-3.5 text-[#ff1d6c]"
                weight="bold"
              />
            </Link>
          </div>

          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 no-scrollbar">
            {newReleases.isLoading && !mobileNewReleaseItems.length ? (
              <NewReleaseSkeleton />
            ) : (
              mobileNewReleaseItems
                .slice(0, 10)
                .map((item) => (
                  <MobileNewReleasePoster key={item.id} content={item} />
                ))
            )}
          </div>
        </section>
      ) : null}

      <section className="relative">
        <div className="grid grid-cols-1 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] md:gap-x-[18px] md:gap-y-[27px]">
          {(trending.isLoading || newReleases.isLoading || videos.isLoading) &&
          !gridItems.length
            ? Array.from({ length: 8 }).map((_, index) => (
                <GridSkeleton key={index} />
              ))
            : gridItems
                .slice(0, 16)
                .map((item, index) => (
                  <PremiumVideoCard
                    key={`${item.type}-${item.id}`}
                    content={item}
                    featured={index === 0}
                  />
                ))}
        </div>
      </section>
    </div>
  );
}

function MobileNewReleasePoster({
  content,
}: {
  content: DashboardCardContent;
}) {
  const href = getContentHref(content);
  const typeLabel = getMobileNewReleaseTypeLabel(content.type);
  const rating = getRating(content);
  const isSeries = (content.type || "").toUpperCase() === "SERIES";

  if (!isSeries) {
    return (
      <article className="group w-[232px] shrink-0 snap-start transition-transform duration-200 active:scale-[0.97]">
        <Link
          href={href}
          className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff1d6c]"
          aria-label={content.title}
        >
          <div className="relative aspect-video overflow-hidden rounded-[20px] bg-white/[0.04] shadow-[0_18px_42px_rgba(0,0,0,0.45),0_0_22px_rgba(255,29,108,0.09),0_0_26px_rgba(50,110,255,0.1)]">
            <ContentImage
              src={content.thumbnailUrl}
              alt={content.title}
              fill
              className="object-cover transition-transform duration-500 group-active:scale-[1.035]"
              sizes="240px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/22 to-transparent" />

            <div className="absolute inset-x-3 bottom-3 flex min-h-[86px] flex-col justify-end">
              <div className="mb-2 grid h-8 w-8 place-items-center rounded-full border border-white/60 bg-black/25 backdrop-blur-md">
                <Play className="h-3.5 w-3.5 text-white" weight="fill" />
              </div>

              <h3 className="line-clamp-2 text-[15px] font-extrabold leading-[1.1] tracking-[-0.035em] text-white">
                {content.title}
              </h3>
              <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[11px] font-semibold text-white/72">
                <span className="truncate">{typeLabel}</span>
                {rating ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-white/86">
                    <Star
                      className="h-3.5 w-3.5 text-[#ffb31a]"
                      weight="fill"
                    />
                    {rating.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="group w-[142px] shrink-0 snap-start transition-transform duration-200 active:scale-[0.97]">
      <Link
        href={href}
        className="block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff1d6c]"
        aria-label={content.title}
      >
        <div className="relative aspect-[0.68/1] overflow-hidden rounded-[21px] bg-white/[0.04] shadow-[0_18px_42px_rgba(0,0,0,0.45),0_0_22px_rgba(255,29,108,0.11),0_0_26px_rgba(50,110,255,0.1)]">
          <ContentImage
            src={content.posterUrl || content.thumbnailUrl}
            alt={content.title}
            fill
            className="object-cover transition-transform duration-500 group-active:scale-[1.035]"
            sizes="150px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/10 to-white/[0.04]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#03010a]/90 via-[#03010a]/36 to-transparent" />

          <div className="absolute inset-x-2 bottom-2 flex min-h-[92px] flex-col justify-end rounded-[15px] border border-white/[0.1] bg-black/50 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_26px_rgba(0,0,0,0.36)] backdrop-blur-md">
            <h3 className="line-clamp-2 text-[14px] font-extrabold leading-[1.08] tracking-[-0.035em] text-white">
              {content.title}
            </h3>
            <p className="mt-1.5 truncate text-[11px] font-semibold text-white/62">
              {typeLabel}
            </p>
            {rating ? (
              <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-white/86">
                <Star className="h-3.5 w-3.5 text-[#ffb31a]" weight="fill" />
                <span>{rating.toFixed(1)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

function CompactTrendingCard({
  content,
  rank,
}: {
  content: DashboardCardContent;
  rank?: number;
}) {
  const href = getContentHref(content);

  return (
    <article className="group w-[174px] shrink-0 snap-start transition-transform duration-200 active:scale-[0.97] md:w-[215px] md:transition-none md:active:scale-100">
      <div className="relative aspect-[0.72/1] overflow-hidden rounded-[22px] border border-white/[0.1] bg-white/[0.04] shadow-[0_20px_50px_rgba(0,0,0,0.42)] transition-shadow duration-300 group-active:shadow-[0_12px_30px_rgba(0,0,0,0.46)] md:aspect-[1.83/1] md:rounded-[10px] md:border-0 md:shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="200px"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/28 to-transparent md:from-black/62 md:via-transparent" />

        {rank ? (
          <div className="absolute left-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-[10px] bg-[#ff1d6c] text-[16px] font-extrabold text-white shadow-[0_0_22px_rgba(255,29,108,0.45)] md:hidden">
            #{rank}
          </div>
        ) : null}

        <div className="absolute inset-x-3 bottom-3 z-10 flex min-h-[112px] flex-col justify-end md:hidden">
          <div className="mb-3 grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-black/25 backdrop-blur-md">
            <Play className="h-4 w-4 text-white" weight="fill" />
          </div>

          <ViewPill count={content.viewCount} />

          <h2 className="mt-2 line-clamp-2 text-[15px] font-extrabold leading-[1.14] tracking-[-0.03em] text-white">
            {content.title}
          </h2>
        </div>

        <ViewPill
          count={content.viewCount}
          className="absolute bottom-2 left-3 hidden transition-opacity duration-200 group-hover:opacity-0 md:flex"
        />

        <HoverVideoPreview
          contentId={content.id}
          title={content.title}
          href={href}
          contentType={content.type}
          duration={content.duration}
        />

        <Link
          href={href}
          className="absolute inset-0 z-10"
          aria-label={content.title}
        />
      </div>

      <Link
        href={href}
        className="hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55b7ff] md:block"
      >
        <h2 className="mt-2 line-clamp-2 text-[15px] font-bold leading-[1.16] tracking-normal text-white transition-colors group-hover:text-white/86">
          {content.title}
        </h2>
      </Link>
    </article>
  );
}

function PremiumVideoCard({
  content,
}: {
  content: DashboardCardContent;
  featured?: boolean;
}) {
  const href = getContentHref(content);
  const typeLabel = getContentTypeLabel(content.type);
  const creatorIdentity = normalizeCreatorIdentity(content.creator);

  return (
    <article className="group min-w-0">
      <div
        className="relative aspect-[1.82/1] overflow-hidden rounded-[20px] border border-white/[0.09] bg-white/[0.04] shadow-[0_22px_56px_rgba(0,0,0,0.46),0_0_28px_rgba(255,29,108,0.07)] transition-[transform,box-shadow] duration-200 active:scale-[0.982] active:shadow-[0_28px_64px_rgba(0,0,0,0.52),0_0_34px_rgba(255,29,108,0.11)] md:aspect-[1.82/1] md:rounded-[10px] md:border-0 md:shadow-[0_12px_34px_rgba(0,0,0,0.2)] md:transition-none md:active:scale-100 md:active:shadow-[0_12px_34px_rgba(0,0,0,0.2)]"
      >
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.045]"
          sizes="(max-width: 768px) 92vw, (max-width: 1536px) 20vw, 260px"
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.08)_38%,rgba(0,0,0,0.58)_68%,rgba(0,0,0,0.94)_100%)] md:bg-gradient-to-t md:from-black/46 md:via-transparent md:to-transparent md:opacity-75" />
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#020107]/95 via-[#020107]/58 to-transparent md:hidden" />

        <div className="pointer-events-none absolute left-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/70 bg-white/[0.13] text-white shadow-[0_0_18px_rgba(255,255,255,0.14),0_0_20px_rgba(255,29,108,0.12),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md md:hidden">
          <Play className="ml-0.5 h-4 w-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.42)]" weight="fill" />
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 h-[124px] rounded-[16px] border border-white/[0.08] bg-black/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_30px_rgba(0,0,0,0.28)] backdrop-blur-[2px] md:hidden">
          <div className="flex h-full min-w-0 flex-col">
            <h3 className="line-clamp-3 min-h-[55px] text-[16px] font-extrabold leading-[1.15] tracking-normal text-white [text-wrap:balance] drop-shadow-[0_2px_12px_rgba(0,0,0,0.78)]">
              {content.title}
            </h3>

            <div className="mt-1.5 grid min-w-0 gap-1 text-[11px] font-bold leading-none text-white/74 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
              <span className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-white/84">
                {typeLabel || "Видео"}
              </span>
              <span className="truncate">
                {creatorIdentity?.displayName || "SESH"}
              </span>
            </div>

            <p className="mt-auto truncate text-[11px] font-semibold leading-none text-white/64 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
              {formatViews(content.viewCount)}
            </p>
          </div>
        </div>

        <HoverVideoPreview
          contentId={content.id}
          title={content.title}
          href={href}
          contentType={content.type}
          duration={content.duration}
        />

        <Link
          href={href}
          className="absolute inset-0 z-10"
          aria-label={content.title}
        />
      </div>

      <div className="hidden md:block">
        <Link
          href={href}
          className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55b7ff]"
        >
          <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-[1.16] tracking-normal text-white md:text-[16px]">
            {content.title}
          </h3>
        </Link>

        <div className="mt-1 flex items-center gap-1 text-[12px] font-medium text-white/72">
          <Play className="h-3 w-3 text-white" weight="fill" />
          <span>{formatViews(content.viewCount)}</span>
        </div>
      </div>

      <AuthorInlineLink
        creator={content.creator}
        avatarSize="xs"
        className="mt-2 hidden max-w-full text-[12px] font-medium text-white/78 hover:text-white md:block"
      />
    </article>
  );
}

function ViewPill({
  count,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-[12px] font-medium text-white/82",
        className,
      )}
    >
      <Play className="h-3 w-3 text-white" weight="fill" />
      <span>{formatViews(count)}</span>
    </div>
  );
}

function TopRailSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="w-[174px] shrink-0 animate-pulse md:w-[200px]"
        >
          <div className="aspect-[0.72/1] rounded-[22px] bg-white/10 md:aspect-[1.83/1] md:rounded-[10px]" />
          <div className="mt-2 hidden h-3.5 w-5/6 rounded bg-white/10 md:block" />
        </div>
      ))}
    </>
  );
}

function NewReleaseSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "shrink-0 animate-pulse",
            index % 3 === 1 ? "w-[232px]" : "w-[142px]",
          )}
        >
          <div
            className={cn(
              "relative bg-white/10",
              index % 3 === 1
                ? "aspect-video rounded-[20px]"
                : "aspect-[0.68/1] rounded-[21px]",
            )}
          >
            <div
              className={cn(
                "absolute bg-black/35 p-2.5",
                index % 3 === 1
                  ? "left-3 right-3 bottom-3 rounded-[13px]"
                  : "inset-x-2 bottom-2 rounded-[15px]",
              )}
            >
              <div className="h-3.5 w-5/6 rounded bg-white/10" />
              <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
              <div className="mt-2 h-3 w-1/3 rounded bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[1.82/1] rounded-[10px] bg-white/10" />
      <div className="mt-2 h-3.5 w-5/6 rounded bg-white/10" />
      <div className="mt-1 h-3 w-1/2 rounded bg-white/10" />
    </div>
  );
}

function getRating(content: DashboardCardContent) {
  const rating = content.averageRating || content.rating;
  return typeof rating === "number" && Number.isFinite(rating) && rating > 0
    ? rating
    : undefined;
}

function isMobileNewReleaseItem(content: DashboardCardContent) {
  const type = (content.type || "").toUpperCase();
  return type === "VIDEO" || type === "SERIES" || type === "CLIP";
}

function getMobileNewReleaseTypeLabel(type?: string) {
  return (type || "").toUpperCase() === "SERIES" ? "Сериал" : "Видео";
}

function getContentTypeLabel(type?: string) {
  switch ((type || "").toUpperCase()) {
    case "VIDEO":
    case "CLIP":
      return "Видео";
    case "SERIES":
      return "Сериал";
    case "DOCUMENTARY":
      return "Документальный";
    case "TUTORIAL":
      return "Обучение";
    case "SHORT":
      return "Шортс";
    default:
      return undefined;
  }
}

function getContentHref(content: DashboardCardContent) {
  const slug = content.slug || content.id;
  const type = (content.type || "").toUpperCase();

  switch (type) {
    case "SERIES":
      return `/series/${slug}`;
    case "TUTORIAL":
      return `/tutorials/${slug}`;
    case "CLIP":
      return `/videos/${slug}`;
    case "SHORT":
      return `/shorts/${slug}`;
    default:
      return `/watch/${slug}`;
  }
}

function formatViews(count: number = 0) {
  return formatViewCount(count);
  if (count === undefined || count === null) return "0 Просмотров";
  return `${formatNumber(count)} Просмотров`;
}

function uniqueCards(items: DashboardCardContent[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type || "content"}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapToDashboardCard(item: DashboardApiItem): DashboardCardContent {
  return {
    id: item.id,
    slug: item.slug || item.id,
    title: item.title,
    type: item.contentType || item.type,
    posterUrl:
      item.coverUrl ||
      item.thumbnailUrl ||
      item.bannerUrl ||
      item.heroImageUrl ||
      "/images/movie-placeholder.jpg",
    thumbnailUrl:
      item.thumbnailUrl ||
      item.coverUrl ||
      item.bannerUrl ||
      item.heroImageUrl ||
      "/images/movie-placeholder.jpg",
    viewCount: item.viewCount ?? undefined,
    duration: item.duration,
    category: item.category,
    genres: item.genres || item.genre,
    rating: item.rating ?? undefined,
    averageRating: item.averageRating ?? undefined,
    creator: item.creator ?? item.author,
  };
}

export function mapContinueWatchingItems(
  items: ContinueWatchingApiItem[] | undefined,
): VideoProgressContent[] {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    const content = item.content;
    const id = content?.id || item.contentId || item.id;
    const title = content?.title || item.title;
    if (!id || !title) return [];

    const durationCandidate = content?.duration ?? item.duration;
    const duration =
      isValidNumber(durationCandidate) && durationCandidate > 0
        ? durationCandidate
        : undefined;

    let currentTime = isValidNumber(item.progressSeconds)
      ? Math.max(0, item.progressSeconds)
      : 0;

    if (!isValidNumber(item.progressSeconds) && duration) {
      if (isValidNumber(item.remainingSeconds)) {
        currentTime = Math.max(0, duration - item.remainingSeconds);
      } else if (isValidNumber(item.progress)) {
        currentTime = Math.max(0, duration * (item.progress / 100));
      }
    }

    const publishedYear = content?.publishedAt
      ? new Date(content.publishedAt).getFullYear()
      : undefined;
    const year =
      isValidNumber(item.year) && item.year > 0
        ? item.year
        : isValidNumber(publishedYear)
          ? publishedYear
          : undefined;

    return [
      {
        id,
        slug: content?.slug || id,
        contentType: content?.contentType || undefined,
        title,
        thumbnailUrl:
          content?.thumbnailUrl ||
          item.thumbnailUrl ||
          "/images/movie-placeholder.jpg",
        progress: safeProgressPercent(currentTime, duration),
        currentTime,
        duration,
        year,
      },
    ];
  });
}
