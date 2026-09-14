/**
 * Centralized API response normalizers.
 *
 * The backend and frontend often use different field names or shapes for the
 * same data. These pure functions transform raw API responses into the types
 * the frontend expects, keeping hook code clean and testable.
 */

import type {
  PartnerDashboard,
  PartnerLevelConfig,
  AvailableBalance,
  SubscriptionPlan,
} from '@/types';

import type {
  ApiPartnerLevelResponse,
  ApiPartnerDashboardResponse,
  ApiPartnerBalanceResponse,
} from '@/hooks/partner/use-partner-dashboard';
import { buildAbsoluteAppUrl } from '@/lib/utils';
import { normalizeAgeCategory } from '@/lib/age-category';
import { normalizeMediaUrl } from '@/lib/media-url';

const CONTENT_PLACEHOLDER_IMAGE = '/images/movie-placeholder.jpg';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asMediaUrl(value: unknown, fallback = ''): string {
  const url = asString(value);
  return url ? normalizeMediaUrl(url) : fallback;
}

function asNullableMediaUrl(value: unknown): string | null {
  const url = asNullableString(value);
  return url ? normalizeMediaUrl(url) : null;
}

function normalizeCategory(value: unknown) {
  if (!isRecord(value)) {
    return typeof value === 'string' ? value : undefined;
  }

  return {
    id: asString(value.id),
    name: asString(value.name),
    slug: asString(value.slug),
  };
}

function normalizeCreator(value: unknown) {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return undefined;

  return {
    id: asString(value.id),
    firstName: asString(value.firstName),
    lastName: asString(value.lastName),
    username: asString(value.username),
    avatarUrl: asString(value.avatarUrl),
    authorUrl: asString(value.authorUrl),
    displayName: asString(value.displayName),
    role: asString(value.role),
    totalVideos: asNumber(value.totalVideos ?? value.totalPublishedVideos),
    totalPublishedVideos: asNumber(value.totalPublishedVideos),
    totalViews: asNumber(value.totalViews),
    subscriberCount: asNumber(value.subscriberCount),
  };
}

function normalizeTags(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((tag) => {
          if (typeof tag === 'string') return tag;
          if (isRecord(tag)) return asString(tag.name || tag.slug || tag.id);
          return '';
        })
        .filter(Boolean)
    : [];
}

function normalizeGenres(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((genre) => {
          if (typeof genre === 'string') return genre;
          if (isRecord(genre)) return asString(genre.name || genre.slug || genre.id);
          return '';
        })
        .filter(Boolean)
    : [];
}

function normalizeVideoFiles(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function normalizeContentListItem<T extends UnknownRecord>(item: T) {
  const seasonCount = asNumber(item.seasonCount);
  const episodeCount = asNumber(item.episodeCount);

  return {
    ...item,
    id: asString(item.id),
    slug: asString(item.slug, asString(item.id)),
    title: asString(item.title, 'Без названия'),
    description: asString(item.description),
    thumbnailUrl: asNullableMediaUrl(item.thumbnailUrl) ?? CONTENT_PLACEHOLDER_IMAGE,
    coverUrl: asMediaUrl(item.coverUrl),
    bannerUrl: asMediaUrl(item.bannerUrl),
    heroImageUrl: asMediaUrl(item.heroImageUrl),
    contentType: asString(item.contentType),
    ageCategory: normalizeAgeCategory(asString(item.ageCategory, '0+')),
    duration: asNumber(item.duration),
    viewCount: asNumber(item.viewCount),
    likeCount: asNumber(item.likeCount),
    commentCount: asNumber(item.commentCount),
    shareCount: asNumber(item.shareCount),
    rating: asNumber(item.rating),
    averageRating: asNumber(item.averageRating),
    ratingCount: asNumber(item.ratingCount),
    reviewsCount: asNumber(item.reviewsCount),
    year: item.year === null || item.year === undefined ? undefined : asNumber(item.year),
    seasonCount,
    episodeCount,
    lessonCount: asNumber(item.lessonCount, episodeCount),
    completedLessons: asNumber(item.completedLessons),
    category: normalizeCategory(item.category),
    tags: normalizeTags(item.tags),
    genre: normalizeGenres(item.genre ?? item.genres),
    genres: normalizeGenres(item.genres ?? item.genre),
    videoFiles: normalizeVideoFiles(item.videoFiles),
    creator: normalizeCreator(item.creator ?? item.author),
    author: normalizeCreator(item.author ?? item.creator),
    username: asString(item.username),
    instructor: asString(item.instructor),
    videoUrl: asString(item.videoUrl),
  };
}

export function normalizeContentListResponse(data: unknown) {
  const record = isRecord(data) ? data : {};
  const meta = isRecord(record.meta) ? record.meta : undefined;

  return {
    ...record,
    items: Array.isArray(record.items)
      ? record.items.filter(isRecord).map(normalizeContentListItem)
      : [],
    total: asNumber(record.total ?? meta?.total),
    page: asNumber(record.page ?? meta?.page, 1),
    limit: asNumber(record.limit ?? meta?.limit, 20),
  };
}

export function normalizeContentDetail(rawData: unknown) {
  const raw = isRecord(rawData) ? rawData : {};

  return {
    ...normalizeContentListItem(raw),
    description: asString(raw.description),
    thumbnailUrl: asNullableMediaUrl(raw.thumbnailUrl) ?? CONTENT_PLACEHOLDER_IMAGE,
    isFree: Boolean(raw.isFree),
    publishedAt: asString(raw.publishedAt),
  };
}

function normalizeEpisode(episode: UnknownRecord, index: number, seasonNumber: number) {
  const id = asString(episode.id, asString(episode.contentId));

  return {
    ...episode,
    id,
    contentId: asString(episode.contentId, id),
    title: asString(episode.title, 'Без названия'),
    description: asString(episode.description),
    episodeNumber: asNumber(episode.episodeNumber ?? episode.number, index + 1),
    seasonNumber: asNumber(episode.seasonNumber, seasonNumber),
    duration: asNumber(episode.duration),
    thumbnailUrl: asNullableMediaUrl(episode.thumbnailUrl) ?? CONTENT_PLACEHOLDER_IMAGE,
    progress: asNumber(episode.progress),
    isWatched: Boolean(episode.isWatched),
    isNext: Boolean(episode.isNext),
  };
}

function normalizeSeasons(value: unknown) {
  return Array.isArray(value)
    ? value.filter(isRecord).map((season, seasonIndex) => {
        const seasonNumber = asNumber(
          season.number ?? season.seasonNumber,
          seasonIndex + 1,
        );

        return {
          ...season,
          number: seasonNumber,
          seasonNumber,
          title: asString(season.title, `Глава ${seasonNumber}`),
          year:
            season.year === null || season.year === undefined
              ? undefined
              : asNumber(season.year),
          episodes: Array.isArray(season.episodes)
            ? season.episodes
                .filter(isRecord)
                .map((episode, episodeIndex) =>
                  normalizeEpisode(episode, episodeIndex, seasonNumber),
                )
            : [],
        };
      })
    : [];
}

export function normalizeTutorialDetail(rawData: unknown) {
  const raw = isRecord(rawData) ? rawData : {};
  const seasons = normalizeSeasons(raw.seasons);

  const lessons = Array.isArray(raw.lessons)
    ? raw.lessons.filter(isRecord).map((lesson, index) => ({
        id: asString(lesson.id),
        number: asNumber(lesson.number ?? lesson.episodeNumber, index + 1),
        title: asString(lesson.title, 'Без названия'),
        duration: asNumber(lesson.duration),
        isCompleted: Boolean(lesson.isCompleted),
      }))
    : [];

  const lessonsFromSeasons = seasons.flatMap((season) =>
    season.episodes
      .slice()
      .sort((a, b) => a.episodeNumber - b.episodeNumber)
      .map((episode, index) => ({
        id: episode.id,
        number: index + 1,
        title: episode.title,
        duration: episode.duration,
        isCompleted: false,
      })),
  );

  return {
    ...normalizeContentDetail(raw),
    description: asString(raw.description),
    thumbnailUrl: asNullableMediaUrl(raw.thumbnailUrl) ?? CONTENT_PLACEHOLDER_IMAGE,
    seasons,
    lessons: lessons.length ? lessons : lessonsFromSeasons,
  };
}

export function normalizeSeriesDetail(rawData: unknown) {
  const raw = isRecord(rawData) ? rawData : {};
  const seasons = normalizeSeasons(raw.seasons);
  const episodeCount = seasons.reduce(
    (total, season) => total + season.episodes.length,
    0,
  );

  return {
    ...normalizeContentDetail(raw),
    originalTitle: asString(raw.originalTitle),
    bannerUrl:
      asNullableMediaUrl(raw.bannerUrl) ??
      asNullableMediaUrl(raw.thumbnailUrl) ??
      CONTENT_PLACEHOLDER_IMAGE,
    seasonCount: asNumber(raw.seasonCount, seasons.length),
    episodeCount: asNumber(raw.episodeCount, episodeCount),
    genres: normalizeGenres(raw.genres ?? raw.genre),
    country: asString(raw.country),
    director: asString(raw.director),
    cast: normalizeStringArray(raw.cast),
    seasons,
  };
}

// ============ Partner Normalizers ============

/** Map level numbers (1-5) to PartnerLevel string names */
export const LEVEL_NUMBER_TO_NAME: Record<number, string> = {
  1: 'STARTER',
  2: 'BRONZE',
  3: 'SILVER',
  4: 'GOLD',
  5: 'PLATINUM',
};

/**
 * Normalize a single raw API partner-level response into PartnerLevelConfig.
 */
export function normalizePartnerLevel(l: ApiPartnerLevelResponse): PartnerLevelConfig {
  return {
    level: l.level ?? LEVEL_NUMBER_TO_NAME[l.levelNumber ?? 0] ?? 'STARTER',
    name: l.name ?? '',
    minReferrals: l.minReferrals ?? 0,
    minEarnings: l.minEarnings ?? l.minTeamVolume ?? 0,
    commissionRate: l.commissionRate ?? 0,
    benefits: Array.isArray(l.benefits) ? l.benefits : [],
  } as PartnerLevelConfig;
}

/**
 * Normalize an array of raw API partner-level responses.
 */
export function normalizePartnerLevels(data: ApiPartnerLevelResponse[]): PartnerLevelConfig[] {
  return data.map(normalizePartnerLevel);
}

/**
 * Normalize a raw API partner dashboard response into PartnerDashboard.
 */
export function normalizePartnerDashboard(d: ApiPartnerDashboardResponse): PartnerDashboard {
  const np = d.nextLevelProgress;
  // Convert numeric level to PartnerLevel string if needed
  const rawLevel = d.currentLevel ?? d.level ?? 1;
  const level =
    typeof rawLevel === 'number'
      ? (LEVEL_NUMBER_TO_NAME[rawLevel] ?? 'STARTER')
      : rawLevel;
  const referralCode = d.referralCode ?? '';
  const referralUrl = d.referralUrl || (referralCode ? `/register?ref=${referralCode}` : '');

  return {
    level,
    levelName: d.levelName ?? 'Стартер',
    referralCode,
    referralUrl: referralUrl ? buildAbsoluteAppUrl(referralUrl) : '',
    totalReferrals: d.totalReferrals ?? 0,
    activeReferrals: d.activeReferrals ?? 0,
    totalEarnings: d.totalEarnings ?? 0,
    pendingEarnings: d.pendingEarnings ?? 0,
    availableBalance: d.availableBalance ?? 0,
    withdrawnAmount: d.withdrawnAmount ?? 0,
    currentMonthEarnings: d.currentMonthEarnings ?? d.thisMonthEarnings ?? 0,
    previousMonthEarnings: d.previousMonthEarnings ?? d.lastMonthEarnings ?? 0,
    levelProgress: d.levelProgress ??
      (np
        ? {
            currentLevel: level,
            nextLevel: np.nextLevel
              ? typeof np.nextLevel === 'number'
                ? (LEVEL_NUMBER_TO_NAME[np.nextLevel] ?? null)
                : np.nextLevel
              : null,
            referralsProgress: {
              current: np.currentReferrals ?? 0,
              required: np.referralsNeeded ?? 0,
              percentage: np.referralsNeeded
                ? Math.round(((np.currentReferrals ?? 0) / np.referralsNeeded) * 100)
                : 0,
            },
            earningsProgress: {
              current: np.currentTeamVolume ?? 0,
              required: np.teamVolumeNeeded ?? 0,
              percentage: np.teamVolumeNeeded
                ? Math.round(((np.currentTeamVolume ?? 0) / np.teamVolumeNeeded) * 100)
                : 0,
            },
          }
        : {
            currentLevel: 1,
            nextLevel: null,
            referralsProgress: { current: 0, required: 0, percentage: 0 },
            earningsProgress: { current: 0, required: 0, percentage: 0 },
          }),
    recentCommissions: d.recentCommissions ?? [],
  } as PartnerDashboard;
}

/**
 * Normalize a raw API partner balance response into AvailableBalance.
 */
export function normalizePartnerBalance(d: ApiPartnerBalanceResponse): AvailableBalance {
  const available = d.available ?? d.availableBalance ?? 0;
  const pending = d.pending ?? d.pendingWithdrawals ?? 0;
  const processing = d.processing ?? 0;
  const minimumWithdrawal = d.minimumWithdrawal ?? 1000;

  return {
    available,
    pending,
    processing,
    minimumWithdrawal,
    canWithdraw: d.canWithdraw ?? available >= minimumWithdrawal,
  } as AvailableBalance;
}

// ============ Subscription Normalizers ============

/**
 * Normalize a subscription plan's `features` field.
 * The API may return features as a JSON string instead of an array.
 */
export function normalizeSubscriptionPlanFeatures(
  plan: SubscriptionPlan,
): SubscriptionPlan {
  return {
    ...plan,
    features: Array.isArray(plan.features)
      ? plan.features
      : typeof plan.features === 'string'
        ? JSON.parse(plan.features)
        : [],
  };
}

/**
 * Normalize an array of subscription plans.
 */
export function normalizeSubscriptionPlans(
  plans: SubscriptionPlan[],
): SubscriptionPlan[] {
  return plans.map(normalizeSubscriptionPlanFeatures);
}
