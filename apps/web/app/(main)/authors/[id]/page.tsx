import { Calendar, Eye, Film, UserCircle } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ClipCard } from "@/components/content/clip-card";
import { ContentImage } from "@/components/content/content-image";
import { ShortPreviewCard } from "@/components/content/short-preview-card";
import type { AgeCategory } from "@/components/content/age-badge";
import { Container } from "@/components/ui/container";
import { API_BASE_URL } from "@/lib/api";
import { normalizeMediaUrl } from "@/lib/media-url";
import { formatNumber, formatViewCount } from "@/lib/utils";

import { CopyAuthorLinkButton } from "./copy-author-link-button";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface PublicAuthor {
  id: string;
  displayName: string;
  fullName: string;
  username?: string;
  slug: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  createdAt: string;
  totalPublishedVideos: number;
  totalVideos: number;
  totalViews: number;
  subscriberCount: number;
  authorUrl: string;
  verificationStatus: "VERIFIED";
}

interface PublicAuthorVideo {
  id: string;
  slug: string;
  title: string;
  contentType?: string | null;
  thumbnailUrl?: string | null;
  duration: number;
  viewCount: number;
  ageCategory: AgeCategory;
  category?: { id: string; name: string; slug: string } | null;
  rating?: number;
  averageRating?: number;
}

interface AuthorVideosResponse {
  items: PublicAuthorVideo[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface AuthorPageProps {
  params: Promise<{ id?: string; username?: string }>;
}

async function fetchPublicApi<T>(endpoint: string): Promise<T | null> {
  const response = await fetch(`${getServerApiBaseUrl()}${endpoint}`, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

async function getAuthorPageData(id: string) {
  const author = await fetchPublicApi<PublicAuthor>(`/authors/${id}`);
  if (!author) return null;

  const [latestVideos, popularVideos] = await Promise.all([
    fetchPublicApi<AuthorVideosResponse>(
      `/authors/${id}/videos?sort=latest&limit=12`,
    ),
    fetchPublicApi<AuthorVideosResponse>(
      `/authors/${id}/videos?sort=popular&limit=12`,
    ),
  ]);

  return {
    author,
    latestVideos: latestVideos ?? emptyVideosResponse(),
    popularVideos: popularVideos ?? emptyVideosResponse(),
  };
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id ?? resolvedParams.username;
  if (!id) return {};
  const author = await fetchPublicApi<PublicAuthor>(`/authors/${id}`);

  if (!author) {
    return {
      title: "Автор не найден — SESH-TV",
    };
  }

  const description =
    author.bio ||
    `${author.totalVideos ?? author.totalPublishedVideos} видео, ${formatViewCount(author.totalViews)} на SESH-TV`;

  return {
    title: `${author.displayName} — SESH-TV`,
    description,
    openGraph: {
      title: `${author.displayName} — SESH-TV`,
      description,
      images: author.avatarUrl ? [{ url: normalizeMediaUrl(author.avatarUrl) }] : undefined,
    },
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id ?? resolvedParams.username;
  if (!id) notFound();
  const data = await getAuthorPageData(id);

  if (!data) notFound();

  const { author, latestVideos, popularVideos } = data;
  const joinedAt = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(new Date(author.createdAt));
  const publicUrl = authorAbsoluteUrl(author.authorUrl);
  const avatarUrl = author.avatarUrl ? normalizeMediaUrl(author.avatarUrl) : null;
  const bannerUrl = author.bannerUrl ? normalizeMediaUrl(author.bannerUrl) : null;

  return (
    <div className="sesh-author-page min-h-screen">
      <div className="relative border-b border-white/[0.08]">
        <div className="relative h-44 overflow-hidden bg-mp-surface md:h-56">
          {bannerUrl ? (
            <ContentImage
              src={bannerUrl}
              alt={author.displayName}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(35,8,48,.92),rgba(8,6,20,.88))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-mp-bg-secondary via-mp-bg-secondary/45 to-transparent" />
        </div>

      <Container size="xl" className="-mt-12 pb-8">
        <div className="author-hero p-8">
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-mp-bg-secondary bg-mp-surface shadow-xl">
                {avatarUrl ? (
                  <ContentImage
                    src={avatarUrl}
                    alt={author.displayName}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserCircle className="h-16 w-16 text-mp-text-secondary" />
                  </div>
                )}
              </div>
            </div>

              <div className="min-w-0 pb-1">
                <h1 className="text-3xl font-bold text-mp-text-primary md:text-4xl">
                  {author.displayName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-mp-text-secondary">
                  <span>@{author.username || author.id}</span>
                  <span className="hidden sm:inline">&middot;</span>
                  <span>{publicUrl}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-mp-text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    На SESH-TV с {joinedAt}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Film className="h-4 w-4" />
                    {formatNumber(author.totalVideos ?? author.totalPublishedVideos)} видео
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    {formatViewCount(author.totalViews)}
                  </span>
                  <span>{formatNumber(author.subscriberCount ?? 0)} подписчиков</span>
                </div>
              </div>
            </div>

            <CopyAuthorLinkButton url={publicUrl} />
          </div>
        </Container>
      </div>

      <Container size="xl" className="space-y-10 py-8">
        <VideoSection
          title="Последние"
          emptyText="У автора пока нет опубликованных видео."
          author={author}
          videos={latestVideos.items}
        />
        <VideoSection
          title="Популярные"
          emptyText="Популярные видео появятся после первых просмотров."
          author={author}
          videos={popularVideos.items}
        />

        <section className="sesh-account-card">
          <h2 className="mb-3 text-xl font-semibold text-mp-text-primary">
            О канале
          </h2>
          <p className="text-mp-text-secondary">
            {author.bio || "Автор пока не добавил описание канала."}
          </p>
        </section>
      </Container>
    </div>
  );
}

function VideoSection({
  title,
  emptyText,
  author,
  videos,
}: {
  title: string;
  emptyText: string;
  author: PublicAuthor;
  videos: PublicAuthorVideo[];
}) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-mp-text-primary">
        {title}
      </h2>
      {videos.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => {
            const creator = {
              id: author.id,
              username: author.username,
              displayName: author.displayName,
              avatarUrl: author.avatarUrl,
              authorUrl: author.authorUrl,
              totalVideos: author.totalVideos ?? author.totalPublishedVideos,
              totalViews: author.totalViews,
              subscriberCount: author.subscriberCount,
            };
            const category =
              typeof video.category === "object"
                ? video.category?.name
                : undefined;
            const isShort = String(video.contentType || "").toUpperCase() === "SHORT";

            if (isShort) {
              return (
                <ShortPreviewCard
                  key={video.id}
                  content={{
                    id: video.id,
                    slug: video.slug,
                    title: video.title,
                    thumbnailUrl: video.thumbnailUrl,
                    duration: video.duration,
                    viewCount: video.viewCount,
                    ageCategory: video.ageCategory,
                    category,
                    rating: video.averageRating ?? video.rating,
                    creator,
                  }}
                />
              );
            }

            return (
              <ClipCard
                key={video.id}
                content={{
                  id: video.id,
                  slug: video.slug,
                  contentType: video.contentType || "CLIP",
                  title: video.title,
                  thumbnailUrl: video.thumbnailUrl || "/images/movie-placeholder.jpg",
                  duration: video.duration,
                  viewCount: video.viewCount,
                  ageCategory: video.ageCategory,
                  category,
                  rating: video.averageRating ?? video.rating,
                  creator,
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-mp-border bg-mp-surface/40 px-6 py-10 text-center text-mp-text-secondary">
          {emptyText}
        </div>
      )}
    </section>
  );
}

function emptyVideosResponse(): AuthorVideosResponse {
  return {
    items: [],
    meta: {
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

function authorAbsoluteUrl(authorUrl: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_WEB_URL ||
    "http://localhost:3000";

  return `${appUrl.replace(/\/$/, "")}${authorUrl}`;
}

function getServerApiBaseUrl() {
  return (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    API_BASE_URL
  ).replace(/\/$/, "");
}
