/**
 * Shared admin E2E test utilities for production testing.
 * Provides API-level helpers for test setup, teardown, and assertions.
 */

import { type Page } from '@playwright/test';
import path from 'path';
import { apiGet, apiPost, apiPatch, apiDelete, apiUploadFile } from '../../helpers/api.helper';
import { loginViaApi, refreshAccessToken, PROD_USERS } from '../../helpers/auth.helper';

// ============ Constants ============

/** Prefix for all test content titles — used for cleanup */
export const TEST_CONTENT_PREFIX = 'E2E-TEST-';

/** Age category mapping (frontend display → backend enum) */
export const AGE_CATEGORY_TO_BACKEND: Record<string, string> = {
  '0+': 'ZERO_PLUS',
  '6+': 'SIX_PLUS',
  '12+': 'TWELVE_PLUS',
  '16+': 'SIXTEEN_PLUS',
  '18+': 'EIGHTEEN_PLUS',
};

/** Age category mapping (backend enum → frontend display) */
export const AGE_CATEGORY_FROM_BACKEND: Record<string, string> = {
  ZERO_PLUS: '0+',
  SIX_PLUS: '6+',
  TWELVE_PLUS: '12+',
  SIXTEEN_PLUS: '16+',
  EIGHTEEN_PLUS: '18+',
};

// ============ Auth Helpers ============

/** Cached refresh token for mid-run token renewal without hitting rate limiter */
let _cachedRefreshToken: string | undefined;

/**
 * Login as admin via API and return access token.
 * Uses refresh token if available (avoids rate-limited /auth/login endpoint).
 * Falls back to full login if refresh fails.
 */
export async function getAdminToken(): Promise<string> {
  // Try refresh token first (doesn't hit rate limiter)
  if (_cachedRefreshToken) {
    try {
      const refreshed = await refreshAccessToken(_cachedRefreshToken);
      _cachedRefreshToken = refreshed.refreshToken;
      return refreshed.accessToken;
    } catch {
      // Refresh failed — fall through to full login
      _cachedRefreshToken = undefined;
    }
  }

  // Full login (may hit rate limiter)
  const auth = await loginViaApi(
    PROD_USERS.admin.email,
    PROD_USERS.admin.password
  );
  _cachedRefreshToken = auth.refreshToken;
  return auth.accessToken;
}

// ============ Category Helpers ============

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
}

/**
 * Fetch all content categories from production API.
 */
export async function getCategories(token: string): Promise<CategoryInfo[]> {
  const res = await apiGet('/categories', token);
  if (!res.success || !res.data) {
    throw new Error(`Failed to fetch categories: ${JSON.stringify(res)}`);
  }
  const data = res.data as { categories?: CategoryInfo[] };
  return data.categories ?? [];
}

/**
 * Get the UUID of the first seeded category.
 */
export async function getFirstCategoryId(token: string): Promise<string> {
  const categories = await getCategories(token);
  if (categories.length === 0) {
    throw new Error('No categories found on production');
  }
  return categories[0].id;
}

// ============ Content CRUD Helpers ============

export interface TestContentInput {
  title?: string;
  description?: string;
  contentType?: string;
  categoryId?: string;
  ageCategory?: string;
  isFree?: boolean;
  individualPrice?: number;
}

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  contentType: string;
  ageCategory: string;
  status: string;
  isFree: boolean;
  individualPrice?: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  category?: CategoryInfo;
  categoryId?: string;
}

export interface EncodingStatus {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  progress?: number;
  availableQualities?: string[];
  thumbnailUrl?: string;
}

/**
 * Create test content via API for test setup.
 * Automatically prefixes title with TEST_CONTENT_PREFIX.
 */
export async function createTestContent(
  token: string,
  overrides?: TestContentInput
): Promise<ContentItem> {
  const categoryId = overrides?.categoryId ?? (await getFirstCategoryId(token));
  const timestamp = Date.now().toString(36);

  const payload = {
    title: overrides?.title ?? `${TEST_CONTENT_PREFIX}Content-${timestamp}`,
    description: overrides?.description ?? `Test content created at ${new Date().toISOString()}`,
    contentType: overrides?.contentType ?? 'SERIES',
    categoryId,
    ageCategory: overrides?.ageCategory ?? 'ZERO_PLUS',
    isFree: overrides?.isFree ?? true,
    individualPrice: overrides?.individualPrice,
  };

  const res = await apiPost('/admin/content', payload, token);
  if (!res.success || !res.data) {
    throw new Error(`Failed to create test content: ${JSON.stringify(res)}`);
  }

  return res.data as ContentItem;
}

/**
 * Delete (archive) test content via API.
 */
export async function deleteTestContent(
  token: string,
  contentId: string
): Promise<void> {
  try {
    await apiDelete(`/admin/content/${contentId}`, token);
  } catch {
    // Non-critical — content may already be deleted
  }
}

/**
 * Find content by title search via API.
 */
export async function findContentByTitle(
  token: string,
  title: string
): Promise<ContentItem | undefined> {
  const res = await apiGet(
    `/admin/content?search=${encodeURIComponent(title)}&limit=10`,
    token
  );
  if (!res.success || !res.data) return undefined;

  const data = res.data as { items?: ContentItem[] };
  return data.items?.find((item) => item.title.includes(title));
}

/**
 * Cleanup all test content created during E2E tests.
 * Searches for content with TEST_CONTENT_PREFIX and deletes them.
 */
export async function cleanupAllTestContent(token: string): Promise<number> {
  let cleaned = 0;
  try {
    const res = await apiGet(
      `/admin/content?search=${encodeURIComponent(TEST_CONTENT_PREFIX)}&limit=100`,
      token
    );
    if (!res.success || !res.data) return 0;

    const data = res.data as { items?: ContentItem[] };
    const items = data.items ?? [];

    for (const item of items) {
      if (item.title.startsWith(TEST_CONTENT_PREFIX)) {
        await deleteTestContent(token, item.id);
        cleaned++;
      }
    }
  } catch {
    // Non-critical
  }
  return cleaned;
}

// ============ Page Helpers ============

/**
 * Navigate to an admin page and wait for it to load.
 * Returns false if redirected to login (auth expired).
 */
export async function waitForAdminPage(
  page: Page,
  path: string
): Promise<boolean> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    return false;
  }

  return true;
}

/**
 * Skip test if admin page fails to load (auth expired).
 */
export function skipIfNotLoaded(loaded: boolean, test: { skip: (condition: boolean, message: string) => void }) {
  test.skip(!loaded, 'Auth state expired — redirected to login');
}

// ============ Content Update Helpers ============

/**
 * Update content status via API.
 */
export async function updateContentStatus(
  token: string,
  contentId: string,
  status: string
): Promise<ContentItem> {
  const res = await apiPatch(`/admin/content/${contentId}`, { status }, token);
  if (!res.success || !res.data) {
    throw new Error(`Failed to update content status: ${JSON.stringify(res)}`);
  }
  return res.data as ContentItem;
}

/**
 * Get content detail by ID via admin API.
 */
export async function getContentById(
  token: string,
  contentId: string
): Promise<ContentItem | undefined> {
  const res = await apiGet(`/admin/content/${contentId}`, token);
  if (!res.success || !res.data) return undefined;
  return res.data as ContentItem;
}

// ============ Video Upload Helpers ============

/**
 * Upload video to content for HLS transcoding via API.
 */
export async function apiUploadVideo(
  token: string,
  contentId: string,
  filePath: string
): Promise<{ jobId?: string; success: boolean }> {
  const res = await apiUploadFile(
    `/admin/content/${contentId}/video/upload`,
    filePath,
    'file',
    token
  );
  return {
    success: res.success,
    jobId: (res.data as { jobId?: string })?.jobId,
  };
}

/**
 * Get video encoding status for content.
 */
export async function apiGetEncodingStatus(
  token: string,
  contentId: string
): Promise<EncodingStatus | null> {
  const res = await apiGet(`/admin/content/${contentId}/video/status`, token);
  if (!res.success || !res.data) return null;
  return res.data as EncodingStatus;
}

/**
 * Delete video from content.
 */
export async function apiDeleteVideo(
  token: string,
  contentId: string
): Promise<boolean> {
  const res = await apiDelete(`/admin/content/${contentId}/video`, token);
  return res.success;
}

/**
 * Poll encoding status until it reaches the target status or times out.
 * @param timeoutMs Default 60 seconds
 * @param pollIntervalMs Default 5 seconds
 */
export async function waitForEncoding(
  token: string,
  contentId: string,
  targetStatus: string,
  timeoutMs = 60_000,
  pollIntervalMs = 5_000
): Promise<EncodingStatus | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await apiGetEncodingStatus(token, contentId);
    if (status?.status === targetStatus) return status;
    if (status?.status === 'FAILED' && targetStatus !== 'FAILED') return status;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return null;
}

// ============ Test Assets ============

/**
 * Generate a minimal valid JPEG file in a temp directory.
 * Returns the absolute path to the file.
 */
export async function generateTestImage(): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  // Minimal valid JPEG (1x1 white pixel)
  const MINIMAL_JPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
    'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh' +
    'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR' +
    'CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAA' +
    'AAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMR' +
    'AD8AKwA//9k=',
    'base64'
  );

  const tmpDir = path.join(os.tmpdir(), 'e2e-test-assets');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const filePath = path.join(tmpDir, 'test-image.jpg');
  fs.writeFileSync(filePath, MINIMAL_JPEG);
  return filePath;
}

/**
 * Generate a minimal invalid file (plain text) for rejection testing.
 * Returns the absolute path to the file.
 */
export async function generateTestInvalidFile(): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  const tmpDir = path.join(os.tmpdir(), 'e2e-test-assets');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const filePath = path.join(tmpDir, 'test-invalid.txt');
  fs.writeFileSync(filePath, 'This is not a valid image or video file.');
  return filePath;
}

/**
 * Generate a minimal valid MP4 file for video upload testing.
 * This is an extremely small but valid ftyp+moov MP4 file.
 * Returns the absolute path to the file.
 */
export async function generateTestVideo(): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  // Minimal valid MP4 with ftyp + moov atoms (no actual video data, but valid container)
  const MINIMAL_MP4 = Buffer.from(
    'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0AAAA' +
    'sW1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAMGV0cmFrAAAAHHRraGQAAAAD' +
    'AAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAA' +
    'AAAAIAAAACAAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAAAAAAAEAAAAAAAABAAAAABR' +
    'zdGJsAAAAFHN0c2QAAAAAAAAAAAAAABRzdHN6AAAAAAAAAAAAAAATc3RjbwAAAAAAAAAA',
    'base64'
  );

  const tmpDir = path.join(os.tmpdir(), 'e2e-test-assets');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const filePath = path.join(tmpDir, 'test-video.mp4');
  fs.writeFileSync(filePath, MINIMAL_MP4);
  return filePath;
}

// ============ All Admin Pages ============

/**
 * Returns all admin page paths for smoke testing.
 */
export function getAllAdminPages(): string[] {
  return [
    '/admin/dashboard',
    '/admin/reports',
    '/admin/users',
    '/admin/verifications',
    '/admin/content',
    '/admin/content/new',
    '/admin/subscriptions',
    '/admin/payments',
    '/admin/partners',
    '/admin/partners/commissions',
    '/admin/partners/withdrawals',
    '/admin/store/products',
    '/admin/store/products/new',
    '/admin/store/orders',
    '/admin/newsletters',
    '/admin/newsletters/new',
    '/admin/documents',
    '/admin/documents/new',
    '/admin/bonuses',
    '/admin/bonuses/rates',
    '/admin/bonuses/campaigns',
    '/admin/audit',
    '/admin/settings',
  ];
}

// ============ Stock Asset Helpers ============

const TEST_ASSETS_DIR = path.join(__dirname, '..', '..', 'test-assets');

/**
 * Download a file if it doesn't exist locally.
 */
async function getOrDownloadAsset(
  url: string,
  localPath: string
): Promise<string> {
  const fs = await import('fs');
  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
    return localPath;
  }

  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(localPath, buffer);
    return localPath;
  } catch {
    // Return empty string on failure — callers should fallback
    return '';
  }
}

/**
 * Get path to a real playable stock MP4 video (~1MB).
 * Falls back to generateTestVideo() if stock file unavailable.
 */
export async function getStockVideoPath(): Promise<string> {
  const stockPath = path.join(TEST_ASSETS_DIR, 'sample-720p.mp4');
  const fs = await import('fs');

  if (fs.existsSync(stockPath) && fs.statSync(stockPath).size > 10000) {
    return stockPath;
  }

  // Try downloading
  const downloaded = await getOrDownloadAsset(
    'https://www.w3schools.com/html/mov_bbb.mp4',
    stockPath
  );
  if (downloaded && fs.existsSync(downloaded) && fs.statSync(downloaded).size > 10000) {
    return downloaded;
  }

  // Fallback to synthetic
  return generateTestVideo();
}

/**
 * Get path to a real JPEG thumbnail image.
 * Falls back to generateTestImage() if stock file unavailable.
 */
export async function getStockImagePath(): Promise<string> {
  const stockPath = path.join(TEST_ASSETS_DIR, 'sample-thumbnail.jpg');
  const fs = await import('fs');

  if (fs.existsSync(stockPath) && fs.statSync(stockPath).size > 100) {
    return stockPath;
  }

  const downloaded = await getOrDownloadAsset(
    'https://placehold.co/400x225/1a1a2e/c94bff.jpg?text=E2E+Test',
    stockPath
  );
  if (downloaded && fs.existsSync(downloaded) && fs.statSync(downloaded).size > 100) {
    return downloaded;
  }

  return generateTestImage();
}

// ============ Streaming URL Helpers ============

export interface StreamUrlResponse {
  streamUrl?: string;
  url?: string;
  expiresAt?: string;
  maxQuality?: string;
  availableQualities?: string[];
  duration?: number;
  title?: string;
}

/**
 * Get streaming URL for a content item.
 */
export async function apiGetStreamUrl(
  token: string,
  contentId: string
): Promise<StreamUrlResponse | null> {
  const res = await apiGet(`/content/${contentId}/stream`, token);
  if (!res.success || !res.data) return null;
  return res.data as StreamUrlResponse;
}

/**
 * Poll until content status becomes the target, or timeout.
 */
export async function waitForContentStatus(
  token: string,
  contentId: string,
  targetStatus: string,
  timeoutMs = 15_000,
  pollIntervalMs = 2_000
): Promise<ContentItem | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const item = await getContentById(token, contentId);
    if (item?.status === targetStatus) return item;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return null;
}

// ============ Cleanup Helpers for Other Sections ============

/**
 * Cleanup test newsletters (E2E-TEST- prefix).
 */
export async function cleanupTestNewsletters(token: string): Promise<number> {
  let cleaned = 0;
  try {
    const res = await apiGet(`/admin/newsletters?limit=100`, token);
    if (!res.success || !res.data) return 0;
    const data = res.data as { items?: { id: string; subject?: string }[] };
    for (const item of data.items ?? []) {
      if (item.subject?.startsWith(TEST_CONTENT_PREFIX)) {
        await apiDelete(`/admin/newsletters/${item.id}`, token);
        cleaned++;
      }
    }
  } catch {
    // Non-critical
  }
  return cleaned;
}

/**
 * Cleanup test documents (E2E-TEST- prefix).
 */
export async function cleanupTestDocuments(token: string): Promise<number> {
  let cleaned = 0;
  try {
    const res = await apiGet(`/admin/documents?limit=100`, token);
    if (!res.success || !res.data) return 0;
    const data = res.data as { items?: { id: string; title?: string }[] };
    for (const item of data.items ?? []) {
      if (item.title?.startsWith(TEST_CONTENT_PREFIX)) {
        await apiDelete(`/admin/documents/${item.id}`, token);
        cleaned++;
      }
    }
  } catch {
    // Non-critical
  }
  return cleaned;
}
