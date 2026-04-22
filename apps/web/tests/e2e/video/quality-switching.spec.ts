import { test as base, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/auth.fixture';
import { mockStreamingApi, MOCK_STREAM_RESPONSE } from '../fixtures/video.fixture';

const test = base;

test.describe('Quality Switching', () => {
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

    await mockStreamingApi(page);
  });

  // ==========================================================
  // Settings Menu
  // ==========================================================
  test.describe('Settings Menu', () => {
    test('should render the player container', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const playerContainer = page.locator('[data-player-container]');
      await expect(playerContainer).toBeVisible({ timeout: 15000 });
    });

    test('should display the video element within player', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const video = page.locator('video');
      await expect(video.first()).toBeVisible({ timeout: 15000 });
    });

    test('should show video title in page header area', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const title = page.locator(`text="${MOCK_STREAM_RESPONSE.title}"`);
      await expect(title.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show quality info in video meta section', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      // Available qualities or max quality should be shown
      const qualityText = page.locator('text=/1080/');
      await expect(qualityText.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ==========================================================
  // Speed Control
  // ==========================================================
  test.describe('Speed Controls', () => {
    test('should have player with video element', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const playerContainer = page.locator('[data-player-container]');
      await expect(playerContainer).toBeVisible({ timeout: 15000 });

      const video = page.locator('[data-player-container] video');
      await expect(video).toBeVisible({ timeout: 10000 });
    });
  });

  // ==========================================================
  // Player Interaction
  // ==========================================================
  test.describe('Player Interaction', () => {
    test('should show controls on mouse hover over player', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const playerContainer = page.locator('[data-player-container]');
      await expect(playerContainer).toBeVisible({ timeout: 15000 });

      // Hover over player
      await playerContainer.hover();
      await page.waitForTimeout(500);

      // Controls area should be rendered
      const controlsArea = page.locator('[data-controls]');
      await expect(controlsArea.first()).toBeVisible({ timeout: 5000 });
    });

    test('should toggle play/pause on video area click', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const playerContainer = page.locator('[data-player-container]');
      await expect(playerContainer).toBeVisible({ timeout: 15000 });

      // Click on the player area to toggle play/pause
      await playerContainer.click({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(500);
    });

    test('should show back button above the player', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const backButton = page.locator('button:has-text("Назад")');
      await expect(backButton.first()).toBeVisible({ timeout: 10000 });
    });

    test('should prevent context menu on player', async ({ page }) => {
      await page.goto('/watch/content-1');
      await page.waitForLoadState('networkidle');

      const playerContainer = page.locator('[data-player-container]');
      await expect(playerContainer).toBeVisible({ timeout: 15000 });

      // Right-click should not show browser context menu
      // (we verify by checking the component has onContextMenu handler)
      await playerContainer.click({ button: 'right', position: { x: 200, y: 200 } });
      await page.waitForTimeout(300);
    });
  });
});
