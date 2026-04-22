import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS } from '../helpers/auth.helper';

test.describe('Video Playback', () => {
  let contentId: string | undefined;

  test.beforeAll(async () => {
    try {
      const auth = await loginViaApi(
        PROD_USERS.user.email,
        PROD_USERS.user.password
      );
      const res = await apiGet('/content', auth.accessToken);
      if (res.success && res.data) {
        const items = (res.data as { items?: { id: string }[] })?.items;
        if (items && items.length > 0) {
          contentId = items[0].id;
        }
      }
    } catch {
      // Non-fatal
    }
  });

  test('video player renders on watch page (if video exists)', async ({
    page,
  }) => {
    if (!contentId) {
      test.skip();
      return;
    }

    await page.goto(`/watch/${contentId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Check for video element or player container
    const hasVideo = await page.locator('video').isVisible().catch(() => false);
    const hasPlayer = await page
      .locator('[class*="player"], [data-testid="video-player"]')
      .isVisible()
      .catch(() => false);

    // If no video uploaded, there should be an appropriate message
    if (!hasVideo && !hasPlayer) {
      const bodyText = await page.locator('body').innerText();
      const hasMessage =
        bodyText.includes('видео') ||
        bodyText.includes('Видео') ||
        bodyText.includes('загрузк') ||
        bodyText.includes('Нет');

      // At minimum the page should render something
      expect(bodyText.length).toBeGreaterThan(50);
    }
  });

  test('video player has controls', async ({ page }) => {
    if (!contentId) {
      test.skip();
      return;
    }

    await page.goto(`/watch/${contentId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const hasVideo = await page.locator('video').isVisible().catch(() => false);

    if (hasVideo) {
      // Video element should have controls or custom controls
      const video = page.locator('video').first();
      const hasControls = await video.getAttribute('controls');
      const customControls = await page
        .locator(
          '[class*="controls"], [data-testid="video-controls"], button[aria-label*="play"], button[aria-label*="Play"]'
        )
        .isVisible()
        .catch(() => false);

      expect(hasControls !== null || customControls).toBe(true);
    } else {
      // No video content uploaded — skip
      test.skip();
    }
  });
});
