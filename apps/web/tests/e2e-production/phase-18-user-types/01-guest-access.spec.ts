/**
 * Phase 18.1: GUEST (Unauthenticated) Access Tests
 *
 * Verifies:
 * - Public content/pages are accessible without auth
 * - Protected routes redirect to /login
 * - Protected API endpoints return 401
 * - Content is filtered to 0+ for unauthenticated users
 */

import { test, expect } from '@playwright/test';
import { rawApiFetch } from './helpers/user-type-test.helper';

// Guest tests use no storage state (unauthenticated)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('GUEST — Public Access', () => {
  test('public pages load without authentication', async ({ page }) => {
    const publicPages = ['/', '/series', '/clips', '/shorts', '/tutorials', '/pricing'];

    for (const path of publicPages) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      const body = await page.locator('body').innerText();
      expect(body.length, `Page ${path} should have content`).toBeGreaterThan(0);
    }
  });

  test('content listing returns data without auth', async () => {
    const res = await rawApiFetch('GET', '/content?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('search works without auth', async () => {
    const res = await rawApiFetch('GET', '/search?q=test&limit=5');
    // Search may return 200 with results or empty
    expect([200, 201]).toContain(res.status);
  });

  test('categories, genres, tags are public', async () => {
    const endpoints = ['/categories', '/genres', '/tags'];
    for (const ep of endpoints) {
      const res = await rawApiFetch('GET', ep);
      expect(res.status, `${ep} should return 200`).toBe(200);
    }
  });

  test('subscription plans are publicly visible', async () => {
    const res = await rawApiFetch('GET', '/subscriptions/plans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('store products require authentication', async () => {
    const res = await rawApiFetch('GET', '/store/products');
    expect(res.status).toBe(401);
  });

  test('legal documents are accessible', async () => {
    const res = await rawApiFetch('GET', '/documents');
    expect(res.status).toBe(200);
  });

  test('content detail accessible by slug', async () => {
    // First get a content item to find a valid slug
    const listing = await rawApiFetch('GET', '/content?limit=1');
    if (!listing.body.success || !listing.body.data) {
      test.skip(true, 'No content available to test slug access');
      return;
    }
    const items = (listing.body.data as { items?: { slug: string }[] }).items;
    if (!items?.length) {
      test.skip(true, 'No content items found');
      return;
    }

    const res = await rawApiFetch('GET', `/content/${items[0].slug}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

test.describe('GUEST — Protected Routes Blocked', () => {
  test('protected pages redirect to /login', async ({ page }) => {
    const protectedPages = ['/account', '/partner', '/bonuses', '/studio', '/store/checkout'];

    for (const path of protectedPages) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      expect(
        currentUrl.includes('/login') || currentUrl.includes('/register'),
        `${path} should redirect to login/register, got: ${currentUrl}`
      ).toBe(true);
    }
  });

  test('protected API endpoints return 401 without auth', async () => {
    const endpoints = [
      '/users/me',
      '/bonuses/balance',
      '/notifications',
      '/partners/dashboard',
      '/store/cart',
      '/users/me/watchlist',
      '/users/me/sessions',
      '/subscriptions/my',
      '/store/orders',
    ];

    for (const ep of endpoints) {
      const res = await rawApiFetch('GET', ep);
      expect(
        res.status,
        `${ep} should return 401 without auth, got ${res.status}`
      ).toBe(401);
    }
  });

  test('admin API endpoints return 401 without auth', async () => {
    const adminEndpoints = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/content',
      '/admin/store/products',
      '/admin/payments/transactions',
    ];

    for (const ep of adminEndpoints) {
      const res = await rawApiFetch('GET', ep);
      expect(
        res.status,
        `${ep} should return 401 without auth, got ${res.status}`
      ).toBe(401);
    }
  });

  test('cannot create content without auth', async () => {
    const res = await rawApiFetch('POST', '/admin/content', {
      title: 'Unauthorized Content',
      description: 'Should fail',
      contentType: 'SERIES',
    });
    expect(res.status).toBe(401);
  });

  test('cannot access cart without auth', async () => {
    const res = await rawApiFetch('GET', '/store/cart');
    expect(res.status).toBe(401);
  });
});

test.describe('GUEST — Age Filtering', () => {
  test('content is filtered for unauthenticated users (no adult content)', async () => {
    const res = await rawApiFetch('GET', '/content?limit=100');
    if (!res.body.success || !res.body.data) {
      test.skip(true, 'Content endpoint not returning data');
      return;
    }

    const items = (res.body.data as { items?: { ageCategory: string }[] }).items ?? [];
    if (items.length === 0) {
      test.skip(true, 'No content items to verify age filtering');
      return;
    }

    const adultContent = items.filter(
      (item) => item.ageCategory === '18+' || item.ageCategory === 'EIGHTEEN_PLUS'
        || item.ageCategory === '16+' || item.ageCategory === 'SIXTEEN_PLUS'
    );

    expect(
      adultContent.length,
      `Guest should not see 16+/18+ content, found ${adultContent.length} items`
    ).toBe(0);
  });
});
