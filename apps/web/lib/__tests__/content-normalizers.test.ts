import {
  normalizeContentDetail,
  normalizeContentListItem,
  normalizeContentListResponse,
  normalizeSeriesDetail,
  normalizeTutorialDetail,
} from '../api/normalizers';

describe('content normalizers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('normalizes incomplete public content list items', () => {
    const item = normalizeContentListItem({
      id: 'tutorial-1',
      slug: null,
      title: null,
      thumbnailUrl: null,
      duration: null,
      viewCount: null,
      category: null,
      author: null,
      videoFiles: null,
      tags: null,
      genre: null,
      counters: null,
      episodeCount: 4,
    } as any);

    expect(item).toMatchObject({
      id: 'tutorial-1',
      slug: 'tutorial-1',
      title: 'Без названия',
      thumbnailUrl: '/images/movie-placeholder.jpg',
      duration: 0,
      viewCount: 0,
      lessonCount: 4,
      videoFiles: [],
      tags: [],
      genre: [],
    });
  });

  it('normalizes paginated meta from API responses', () => {
    const response = normalizeContentListResponse({
      items: [{ id: 'video-1', title: 'Video' }],
      meta: { total: 1, page: 2, limit: 12 },
    });

    expect(response.total).toBe(1);
    expect(response.page).toBe(2);
    expect(response.limit).toBe(12);
    expect(response.items[0]?.slug).toBe('video-1');
  });

  it('normalizes legacy HTTP production media URLs on content items', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://sesh-tv.com';
    process.env.NEXT_PUBLIC_MINIO_URL = 'https://sesh-tv.com/minio';

    const item = normalizeContentListItem({
      id: 'video-1',
      thumbnailUrl: 'http://sesh-tv.com/minio/thumbnails/video-1.jpg',
      bannerUrl: 'http://sesh-tv.com/minio/thumbnails/video-1-banner.jpg',
    } as any);

    expect(item.thumbnailUrl).toBe(
      'https://sesh-tv.com/minio/thumbnails/video-1.jpg',
    );
    expect(item.bannerUrl).toBe(
      'https://sesh-tv.com/minio/thumbnails/video-1-banner.jpg',
    );
  });

  it('normalizes incomplete public detail responses', () => {
    const detail = normalizeContentDetail({
      id: 'short-1',
      slug: null,
      title: null,
      description: null,
      thumbnailUrl: null,
      ageCategory: null,
      duration: null,
      viewCount: null,
      creator: null,
    } as any);

    expect(detail).toMatchObject({
      id: 'short-1',
      slug: 'short-1',
      title: 'Без названия',
      description: '',
      thumbnailUrl: '/images/movie-placeholder.jpg',
      ageCategory: '0+',
      duration: 0,
      viewCount: 0,
    });
  });

  it('normalizes tutorial seasons without crashing on missing episodes', () => {
    const tutorial = normalizeTutorialDetail({
      id: 'tutorial-1',
      slug: 'tutorial-one',
      title: 'Tutorial',
      thumbnailUrl: null,
      seasons: [
        { seasonNumber: 1, title: null, episodes: null },
        {
          seasonNumber: 2,
          episodes: [{ id: 'lesson-1', title: null, duration: null }],
        },
      ],
    } as any);

    expect(tutorial.seasons).toHaveLength(2);
    expect(tutorial.seasons[0]?.episodes).toEqual([]);
    expect(tutorial.lessons).toEqual([
      {
        id: 'lesson-1',
        number: 1,
        title: 'Без названия',
        duration: 0,
        isCompleted: false,
      },
    ]);
  });

  it('normalizes series seasons and episodes for detail pages', () => {
    const series = normalizeSeriesDetail({
      id: 'series-1',
      slug: 'series-one',
      title: 'Series',
      thumbnailUrl: null,
      seasonCount: null,
      episodeCount: null,
      genres: null,
      cast: null,
      seasons: [
        {
          number: 1,
          title: null,
          episodes: [{ contentId: 'episode-1', title: null, duration: null }],
        },
      ],
    } as any);

    expect(series).toMatchObject({
      id: 'series-1',
      bannerUrl: '/images/movie-placeholder.jpg',
      seasonCount: 1,
      episodeCount: 1,
      genres: [],
      cast: [],
    });
    expect(series.seasons[0]?.episodes[0]).toMatchObject({
      id: 'episode-1',
      contentId: 'episode-1',
      title: 'Без названия',
      episodeNumber: 1,
      duration: 0,
    });
  });
});
