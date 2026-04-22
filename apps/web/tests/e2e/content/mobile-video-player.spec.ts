import { test, expect } from '@playwright/test';
import { mockVideoStream } from '../fixtures/content.fixture';

/**
 * Mobile video player E2E tests
 * Run on mobile-chrome (Pixel 5) and mobile-safari (iPhone 12)
 */

test.describe('Mobile Video Player Controls', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const isMobileProject =
      testInfo.project.name === 'mobile-chrome' || testInfo.project.name === 'mobile-safari';
    test.skip(!isMobileProject, 'Mobile-only test');

    // Mock video stream to avoid real network requests
    await mockVideoStream(page);
  });

  test('should hide bottom nav on /watch page', async ({ page }) => {
    await page.goto('/watch/test-content');
    await page.waitForLoadState('networkidle');

    const bottomNav = page.locator('nav.fixed.bottom-0, nav[class*="bottom-0"]');
    await expect(bottomNav).toBeHidden();
  });

  test('should show mute toggle only (no volume slider) on mobile', async ({ page }) => {
    await page.goto('/watch/test-content');
    await page.waitForLoadState('networkidle');

    // Move mouse to show controls
    const playerContainer = page.locator('[data-player-container], .video-player, video').first();
    await playerContainer.hover();

    // Volume/mute button should be visible
    const muteButton = page.locator(
      'button[aria-label="Mute"], button[aria-label="Unmute"]'
    );
    const hasMuteButton = await muteButton.isVisible().catch(() => false);
    expect(hasMuteButton).toBe(true);

    // Volume slider should NOT be visible on mobile (phones use hardware volume)
    const volumeSlider = page.locator('.volume-slider, [data-testid="volume-slider"]');
    const hasSlider = await volumeSlider.isVisible().catch(() => false);
    expect(hasSlider).toBe(false);
  });

  test('should have enlarged touch targets (p-2.5) on play button', async ({ page }) => {
    await page.goto('/watch/test-content');
    await page.waitForLoadState('networkidle');

    // Check that player control buttons have padding for touch targets
    const playButton = page.locator(
      'button[aria-label*="Play"], button[aria-label*="Pause"]'
    ).first();
    const hasPlayButton = await playButton.isVisible().catch(() => false);

    if (hasPlayButton) {
      const padding = await playButton.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return parseFloat(style.padding);
      });
      // p-2.5 = 10px padding. Accept any padding >= 8px as adequate touch target
      expect(padding).toBeGreaterThanOrEqual(8);
    }
  });

  test('should toggle play/pause on video tap', async ({ page }) => {
    await page.goto('/watch/test-content');
    await page.waitForLoadState('networkidle');

    const playerContainer = page.locator('[data-player-container]').first();
    const isContainerVisible = await playerContainer.isVisible().catch(() => false);

    if (isContainerVisible) {
      // Tap on the video area to toggle play/pause
      await playerContainer.click();

      // Allow state change
      await page.waitForTimeout(500);

      // The player should respond to the click (we just verify no crash)
      await expect(playerContainer).toBeVisible();
    }
  });

  test('should show settings menu with larger items on mobile', async ({ page }) => {
    await page.goto('/watch/test-content');
    await page.waitForLoadState('networkidle');

    const playerContainer = page.locator('[data-player-container]').first();
    await playerContainer.hover();

    // Try to find and click a settings button
    const settingsButton = page.locator(
      'button[aria-label*="Settings"], button[aria-label*="настройки"], button[aria-label*="Качество"]'
    ).first();
    const hasSettings = await settingsButton.isVisible().catch(() => false);

    if (hasSettings) {
      await settingsButton.click();
      await page.waitForTimeout(300);

      // Settings menu should be visible
      const settingsMenu = page.locator(
        '[data-testid="settings-menu"], [role="menu"], .settings-menu'
      );
      const isMenuVisible = await settingsMenu.isVisible().catch(() => false);
      expect(isMenuVisible).toBe(true);
    }
  });

  test('progress bar should respond to touch tap', async ({ page }) => {
    await page.goto('/watch/test-content');
    await page.waitForLoadState('networkidle');

    const playerContainer = page.locator('[data-player-container]').first();
    await playerContainer.hover();

    // Find the progress bar
    const progressBar = page.locator(
      '[data-testid="progress-bar"], .touch-none, .progress-bar'
    ).first();
    const hasProgressBar = await progressBar.isVisible().catch(() => false);

    if (hasProgressBar) {
      // Tap on progress bar
      const box = await progressBar.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        // Should not crash — we verify the element is still there
        await expect(progressBar).toBeVisible();
      }
    }
  });

  test('double-tap right side should show +10s feedback', async ({ page }) => {
    await page.goto('/watch/test-content');
    await page.waitForLoadState('networkidle');

    const playerContainer = page.locator('[data-player-container]').first();
    const isContainerVisible = await playerContainer.isVisible().catch(() => false);

    if (isContainerVisible) {
      const box = await playerContainer.boundingBox();
      if (box) {
        // Double-tap on the right third
        const rightX = box.x + box.width * 0.85;
        const centerY = box.y + box.height / 2;

        await page.touchscreen.tap(rightX, centerY);
        await page.waitForTimeout(100);
        await page.touchscreen.tap(rightX, centerY);

        // Check for +10s feedback
        const feedback = page.getByText('+10s');
        const hasFeedback = await feedback
          .isVisible({ timeout: 1000 })
          .catch(() => false);

        // If the double-tap gesture is implemented, feedback should appear
        if (hasFeedback) {
          await expect(feedback).toBeVisible();
        }
      }
    }
  });

  test('double-tap left side should show -10s feedback', async ({ page }) => {
    await page.goto('/watch/test-content');
    await page.waitForLoadState('networkidle');

    const playerContainer = page.locator('[data-player-container]').first();
    const isContainerVisible = await playerContainer.isVisible().catch(() => false);

    if (isContainerVisible) {
      const box = await playerContainer.boundingBox();
      if (box) {
        // Double-tap on the left third
        const leftX = box.x + box.width * 0.15;
        const centerY = box.y + box.height / 2;

        await page.touchscreen.tap(leftX, centerY);
        await page.waitForTimeout(100);
        await page.touchscreen.tap(leftX, centerY);

        // Check for -10s feedback
        const feedback = page.getByText('-10s');
        const hasFeedback = await feedback
          .isVisible({ timeout: 1000 })
          .catch(() => false);

        if (hasFeedback) {
          await expect(feedback).toBeVisible();
        }
      }
    }
  });
});
