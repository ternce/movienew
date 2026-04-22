import { test as base, expect, type Page } from '@playwright/test';

/**
 * Mock data for streaming and video upload
 */
export const MOCK_STREAM_RESPONSE = {
  streamUrl: 'https://test.cdn.movieplatform.ru/videos/content-1/master.m3u8',
  signedUrl: 'https://test.cdn.movieplatform.ru/videos/content-1/master.m3u8?token=abc123&expires=9999999999',
  title: 'Ночной патруль — Серия 1',
  description: 'Первая серия захватывающего сериала о ночном городе.',
  duration: 2700,
  thumbnailUrls: ['/test/thumbnail-1.jpg'],
  availableQualities: ['480p', '720p', '1080p'],
  maxQuality: '1080p',
};

export const MOCK_CONTENT_DETAIL = {
  id: 'content-1',
  slug: 'night-patrol',
  title: 'Ночной патруль',
  description: 'Захватывающий сериал о ночном городе',
  contentType: 'SERIES',
  ageCategory: '16+',
  status: 'PUBLISHED',
  isFree: false,
  duration: 2700,
  thumbnailUrl: '/test/thumbnail.jpg',
};

export const MOCK_ENCODING_STATUS = {
  pending: {
    contentId: 'content-1',
    status: 'PENDING',
    availableQualities: [],
    progress: undefined,
  },
  processing: {
    contentId: 'content-1',
    status: 'PROCESSING',
    availableQualities: [],
    progress: 45,
  },
  completed: {
    contentId: 'content-1',
    status: 'COMPLETED',
    availableQualities: ['480p', '720p', '1080p'],
    thumbnailUrl: '/test/thumbnail.jpg',
    duration: 2700,
  },
  failed: {
    contentId: 'content-1',
    status: 'FAILED',
    availableQualities: [],
    errorMessage: 'Invalid video format',
  },
};

export const MOCK_UPLOAD_RESPONSE = {
  success: true,
  data: {
    jobId: 'job-123',
    message: 'Video uploaded, transcoding started',
  },
};

/**
 * Mock streaming API endpoints for the watch page
 */
export async function mockStreamingApi(page: Page) {
  // Stream URL endpoint
  await page.route('**/api/v1/streaming/*', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_STREAM_RESPONSE,
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Content detail endpoint
  await page.route('**/api/v1/content/*', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_CONTENT_DETAIL,
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Watch history progress save
  await page.route('**/api/v1/watch-history/*/progress', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Mock HLS manifest
  await page.route('**/*.m3u8', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.apple.mpegurl',
      body: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
segment0.ts
#EXTINF:10.0,
segment1.ts
#EXT-X-ENDLIST`,
    });
  });

  // Mock video segments
  await page.route('**/*.ts', async (route) => {
    if (route.request().url().includes('segment')) {
      await route.fulfill({
        status: 200,
        contentType: 'video/mp2t',
        body: Buffer.from([]),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mock admin video management API endpoints
 */
export async function mockAdminVideoApi(page: Page, statusOverride?: keyof typeof MOCK_ENCODING_STATUS) {
  const statusData = MOCK_ENCODING_STATUS[statusOverride || 'completed'];

  // Encoding status endpoint
  await page.route('**/api/v1/admin/content/*/video/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: statusData,
      }),
    });
  });

  // Video upload endpoint
  await page.route('**/api/v1/admin/content/*/video/upload', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_UPLOAD_RESPONSE),
      });
    } else {
      await route.fallback();
    }
  });

  // Video delete endpoint
  await page.route('**/api/v1/admin/content/*/video', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Video deleted successfully',
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Admin content detail endpoint
  await page.route('**/api/v1/admin/content/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Skip if already handled by more specific routes
    if (url.includes('/video/')) {
      await route.fallback();
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...MOCK_CONTENT_DETAIL,
            videoFiles: statusOverride === 'completed'
              ? [
                  { quality: '480p', encodingStatus: 'COMPLETED' },
                  { quality: '720p', encodingStatus: 'COMPLETED' },
                  { quality: '1080p', encodingStatus: 'COMPLETED' },
                ]
              : [],
          },
        }),
      });
    } else if (method === 'PATCH') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_CONTENT_DETAIL, ...body },
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mock streaming API to return 403 (subscription required)
 */
export async function mockStreamingAccessDenied(page: Page) {
  await page.route('**/api/v1/streaming/*', async (route) => {
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: {
          code: 'SUB_001',
          message: 'Требуется подписка',
        },
      }),
    });
  });
}

/**
 * Mock streaming API to return 404 (content not found)
 */
export async function mockStreamingNotFound(page: Page) {
  await page.route('**/api/v1/streaming/*', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: {
          code: 'CONTENT_001',
          message: 'Content not found',
        },
      }),
    });
  });
}

/**
 * Mock EdgeCenter upload URL endpoint
 */
export const MOCK_EDGECENTER_UPLOAD_URL = {
  uploadUrl: 'https://upload.gcore.com/tus/v1/upload',
  headers: {
    Authorization: 'Bearer test-tus-token',
    'Tus-Resumable': '1.0.0',
    VideoId: '12345',
  },
  videoId: '12345',
  libraryId: 'edgecenter',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

export async function mockEdgeCenterUploadUrl(page: Page) {
  await page.route('**/api/v1/admin/content/*/video/upload-url', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_EDGECENTER_UPLOAD_URL,
        }),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mock streaming API with signed URL that has an expiry timestamp
 */
export async function mockStreamingApiWithSignedUrl(page: Page) {
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4h from now

  await page.route('**/api/v1/streaming/*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...MOCK_STREAM_RESPONSE,
            streamUrl: `${MOCK_STREAM_RESPONSE.streamUrl}?md5=abc123&expires=9999999999`,
            expiresAt,
          },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Also mock HLS manifest and segments
  await page.route('**/*.m3u8', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.apple.mpegurl',
      body: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
segment0.ts
#EXTINF:10.0,
segment1.ts
#EXT-X-ENDLIST`,
    });
  });

  await page.route('**/*.ts', async (route) => {
    if (route.request().url().includes('segment')) {
      await route.fulfill({
        status: 200,
        contentType: 'video/mp2t',
        body: Buffer.from([]),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mock encoding status flow: PENDING → PROCESSING → COMPLETED
 */
export async function mockEncodingStatusFlow(page: Page) {
  let callCount = 0;
  const statusSequence = [
    MOCK_ENCODING_STATUS.pending,
    MOCK_ENCODING_STATUS.processing,
    MOCK_ENCODING_STATUS.completed,
  ];

  await page.route('**/api/v1/admin/content/*/video/status', async (route) => {
    const status = statusSequence[Math.min(callCount, statusSequence.length - 1)];
    callCount++;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: status,
      }),
    });
  });
}

/**
 * Video fixture types
 */
interface VideoFixtures {
  mockStreamApi: void;
}

/**
 * Extended test with streaming mocks (auto-applied)
 */
export const test = base.extend<VideoFixtures>({
  mockStreamApi: [
    async ({ page }, use) => {
      await mockStreamingApi(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
