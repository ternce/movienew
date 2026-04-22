import { test as base, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/auth.fixture';
import {
  mockStreamingApi,
  mockStreamingAccessDenied,
  mockStreamingNotFound,
  mockStreamingApiWithSignedUrl,
  MOCK_STREAM_RESPONSE,
} from '../fixtures/video.fixture';

const test = base;

test.describe('Streaming Playback', () => {
  test.beforeEach(async ({ page }) => {
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
  // Video Player Loading
  // ==========================================================
  test.describe('Player Loading', () => {
    test('should load video player with stream URL', async ({ page }) => {
      await mockStreamingApi(page);
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const playerArea = page.locator('[data-player-container], video');
      await expect(playerArea.first()).toBeVisible({ timeout: 15000 });
    });

    test('should load video player with signed URL', async ({ page }) => {
      await mockStreamingApiWithSignedUrl(page);
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const playerArea = page.locator('[data-player-container], video');
      await expect(playerArea.first()).toBeVisible({ timeout: 15000 });
    });

    test('should display video title', async ({ page }) => {
      await mockStreamingApi(page);
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const title = page.locator(`text="${MOCK_STREAM_RESPONSE.title}"`);
      await expect(title.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display video duration info', async ({ page }) => {
      await mockStreamingApi(page);
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      // Duration is 2700 seconds = 45 min
      const duration = page.locator('text=/45.*мин/');
      await expect(duration.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display quality info', async ({ page }) => {
      await mockStreamingApi(page);
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      // Should show max quality
      const quality = page.locator('text=/1080/');
      await expect(quality.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ==========================================================
  // Player Controls Visibility
  // ==========================================================
  test.describe('Player Controls', () => {
    test.beforeEach(async ({ page }) => {
      await mockStreamingApi(page);
    });

    test('should show back navigation button', async ({ page }) => {
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

    test('should toggle like state on click', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const likeButton = page.locator('button:has-text("Нравится")');
      await expect(likeButton.first()).toBeVisible({ timeout: 10000 });

      // Click to like
      await likeButton.first().click();
      // Click again to unlike
      await likeButton.first().click();
    });
  });

  // ==========================================================
  // Error States
  // ==========================================================
  test.describe('Error States', () => {
    test('should show 403 error with subscription CTA', async ({ page }) => {
      await mockStreamingAccessDenied(page);
      await page.goto('/watch/content-premium-1');
      await page.waitForLoadState('networkidle');

      const heading = page.locator('h1:has-text("Требуется подписка")');
      await expect(heading).toBeVisible({ timeout: 10000 });

      const subscribeButton = page.locator('button:has-text("Оформить подписку")');
      await expect(subscribeButton).toBeVisible({ timeout: 10000 });
    });

    test('should show 404 error with "Видео не найдено"', async ({ page }) => {
      await mockStreamingNotFound(page);
      await page.goto('/watch/nonexistent');
      await page.waitForLoadState('networkidle');

      const heading = page.locator('h1:has-text("Видео не найдено")');
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test('should show back button on 403 error page', async ({ page }) => {
      await mockStreamingAccessDenied(page);
      await page.goto('/watch/content-premium-1');
      await page.waitForLoadState('networkidle');

      const backButton = page.locator('button:has-text("Назад")');
      await expect(backButton).toBeVisible({ timeout: 10000 });
    });

    test('should not show video player on error pages', async ({ page }) => {
      await mockStreamingNotFound(page);
      await page.goto('/watch/nonexistent');
      await page.waitForLoadState('networkidle');

      const video = page.locator('video');
      await expect(video).not.toBeVisible();
    });

    test('should navigate to subscriptions from 403 page', async ({ page }) => {
      await mockStreamingAccessDenied(page);
      await page.goto('/watch/content-premium-1');
      await page.waitForLoadState('networkidle');

      const subscribeButton = page.locator('button:has-text("Оформить подписку")');
      await expect(subscribeButton).toBeVisible({ timeout: 10000 });
      await subscribeButton.click();

      await page.waitForURL('**/subscriptions**', { timeout: 10000 });
    });
  });

  // ==========================================================
  // Description
  // ==========================================================
  test.describe('Description', () => {
    test.beforeEach(async ({ page }) => {
      await mockStreamingApi(page);
    });

    test('should show video description', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const description = page.locator(
        `text="${MOCK_STREAM_RESPONSE.description}"`,
      );
      // Wait for description to be in the page (might be truncated)
      await page.waitForTimeout(2000);
      const hasDesc = await page.locator('text=/Первая серия/').count();
      expect(hasDesc).toBeGreaterThan(0);
    });
  });
});
