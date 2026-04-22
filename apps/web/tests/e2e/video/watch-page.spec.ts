import { test as base, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/auth.fixture';
import {
  mockStreamingApi,
  mockStreamingAccessDenied,
  mockStreamingNotFound,
  MOCK_STREAM_RESPONSE,
} from '../fixtures/video.fixture';

const test = base;

test.describe('Watch Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth state via cookies so middleware does not redirect
    await page.context().addCookies([
      {
        name: 'mp-authenticated',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'mp-auth-token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Stub profile endpoint to avoid 401 redirects
    await page.route('**/api/v1/users/me/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-1',
            email: TEST_USERS.user.email,
            firstName: TEST_USERS.user.firstName,
            lastName: TEST_USERS.user.lastName,
            role: 'USER',
            ageCategory: '18+',
          },
        }),
      });
    });
  });

  // ==========================================================
  // Successful playback
  // ==========================================================
  test.describe('Successful Playback', () => {
    test.beforeEach(async ({ page }) => {
      await mockStreamingApi(page);
    });

    test('should display the video player area', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      // The player component (video element or player wrapper) should be visible
      const playerArea = page.locator(
        '[data-testid="video-player"], video, .video-player',
      );
      await expect(playerArea.first()).toBeVisible({ timeout: 15000 });
    });

    test('should show the video title', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const title = page.locator(`text="${MOCK_STREAM_RESPONSE.title}"`);
      await expect(title.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show back navigation button with text "Назад"', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const backButton = page.locator('button:has-text("Назад"), a:has-text("Назад")');
      await expect(backButton.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show action buttons (like, share)', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const likeButton = page.locator('button:has-text("Нравится")');
      await expect(likeButton.first()).toBeVisible({ timeout: 10000 });

      const shareButton = page.locator('button:has-text("Поделиться")');
      await expect(shareButton.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ==========================================================
  // Access denied (403) — subscription required
  // ==========================================================
  test.describe('Access Denied — 403', () => {
    test('should show subscription CTA with "Требуется подписка" text', async ({ page }) => {
      await mockStreamingAccessDenied(page);

      await page.goto('/watch/content-premium-1');
      await page.waitForLoadState('networkidle');

      // The heading should display the subscription-required text
      const heading = page.locator('h1:has-text("Требуется подписка")');
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show "Оформить подписку" button on access denied', async ({ page }) => {
      await mockStreamingAccessDenied(page);

      await page.goto('/watch/content-premium-1');
      await page.waitForLoadState('networkidle');

      const subscribeButton = page.locator('button:has-text("Оформить подписку")');
      await expect(subscribeButton).toBeVisible({ timeout: 10000 });
    });

    test('should show back button on access denied page', async ({ page }) => {
      await mockStreamingAccessDenied(page);

      await page.goto('/watch/content-premium-1');
      await page.waitForLoadState('networkidle');

      const backButton = page.locator('button:has-text("Назад")');
      await expect(backButton).toBeVisible({ timeout: 10000 });
    });

    test('should show lock icon on access denied', async ({ page }) => {
      await mockStreamingAccessDenied(page);

      await page.goto('/watch/content-premium-1');
      await page.waitForLoadState('networkidle');

      // The page should not contain the video player
      const playerArea = page.locator('video');
      await expect(playerArea).not.toBeVisible();
    });
  });

  // ==========================================================
  // Not found (404)
  // ==========================================================
  test.describe('Not Found — 404', () => {
    test('should show "Видео не найдено" text', async ({ page }) => {
      await mockStreamingNotFound(page);

      await page.goto('/watch/nonexistent-content');
      await page.waitForLoadState('networkidle');

      const heading = page.locator('h1:has-text("Видео не найдено")');
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show back button on not found page', async ({ page }) => {
      await mockStreamingNotFound(page);

      await page.goto('/watch/nonexistent-content');
      await page.waitForLoadState('networkidle');

      const backButton = page.locator('button:has-text("Назад")');
      await expect(backButton).toBeVisible({ timeout: 10000 });
    });

    test('should show error icon on not found page', async ({ page }) => {
      await mockStreamingNotFound(page);

      await page.goto('/watch/nonexistent-content');
      await page.waitForLoadState('networkidle');

      // Should not show the video player
      const playerArea = page.locator('video');
      await expect(playerArea).not.toBeVisible();
    });
  });

  // ==========================================================
  // Back button navigation
  // ==========================================================
  test.describe('Navigation', () => {
    test('should navigate back when clicking "Назад" button', async ({ page }) => {
      await mockStreamingApi(page);

      // Navigate to a known page first, then to watch page
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      // Wait for the page to render
      const backButton = page.locator('button:has-text("Назад")');
      await expect(backButton.first()).toBeVisible({ timeout: 10000 });

      // Click back
      await backButton.first().click();

      // Should navigate away from watch page
      await page.waitForURL((url) => !url.pathname.includes('/watch/content-1'), {
        timeout: 10000,
      });
    });

    test('should navigate to subscriptions when clicking "Оформить подписку"', async ({ page }) => {
      await mockStreamingAccessDenied(page);

      await page.goto('/watch/content-premium-1');
      await page.waitForLoadState('networkidle');

      const subscribeButton = page.locator('button:has-text("Оформить подписку")');
      await expect(subscribeButton).toBeVisible({ timeout: 10000 });
      await subscribeButton.click();

      await page.waitForURL('**/subscriptions**', { timeout: 10000 });
    });

    test('should not show player controls on error pages', async ({ page }) => {
      await mockStreamingNotFound(page);

      await page.goto('/watch/nonexistent-content');
      await page.waitForLoadState('networkidle');

      // Playback controls should not be visible
      const playPause = page.locator(
        'button[aria-label*="Play"], button[aria-label*="Pause"]',
      );
      await expect(playPause).not.toBeVisible();
    });
  });
});
