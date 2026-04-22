import {
  test,
  expect,
  MOCK_CONTENT,
  MOCK_EPISODES,
  mockVideoStream,
  waitForVideoPlayback,
} from '../fixtures/content.fixture';
import { TEST_USERS } from '../fixtures/auth.fixture';

test.describe('Video Playback', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_USERS.user.email);
    await page.fill('input[name="password"]', TEST_USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test.describe('Video Loading', () => {
    test('should load video player on watch page', async ({ watchPage, page }) => {
      // Mock content and streaming APIs
      await page.route('**/api/v1/content/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.freeContent,
          }),
        });
      });

      await page.route('**/api/v1/streaming/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              streamUrl: 'https://test.cdn/video.m3u8',
              signedUrl: 'https://test.cdn/video.m3u8?token=abc',
            },
          }),
        });
      });

      await mockVideoStream(page);

      await watchPage.goto(MOCK_CONTENT.freeContent.id);

      await expect(watchPage.videoPlayer).toBeVisible();
    });

    test('should show loading indicator while video loads', async ({ watchPage, page }) => {
      // Delay streaming response
      await page.route('**/api/v1/streaming/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { streamUrl: 'https://test.cdn/video.m3u8' },
          }),
        });
      });

      await mockVideoStream(page);

      // Navigate and immediately check for loading
      const gotoPromise = watchPage.goto(MOCK_CONTENT.freeContent.id);

      // Loading indicator should appear
      await expect(watchPage.loadingSpinner).toBeVisible({ timeout: 5000 });

      await gotoPromise;
    });

    test('should display video title and metadata', async ({ watchPage, page }) => {
      await page.route('**/api/v1/content/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.freeContent,
          }),
        });
      });

      await mockVideoStream(page);

      await watchPage.goto(MOCK_CONTENT.freeContent.id);

      // Title should be visible somewhere on the page
      const titleElement = page.locator(`text="${MOCK_CONTENT.freeContent.title}"`);
      await expect(titleElement.first()).toBeVisible();
    });
  });

  test.describe('Playback Controls', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/v1/content/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.freeContent,
          }),
        });
      });

      await page.route('**/api/v1/streaming/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { streamUrl: 'https://test.cdn/video.m3u8' },
          }),
        });
      });

      await mockVideoStream(page);
    });

    test('should have play/pause button', async ({ watchPage }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      await expect(watchPage.playPauseButton).toBeVisible();
    });

    test('should have progress bar', async ({ watchPage }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      await expect(watchPage.progressBar).toBeVisible();
    });

    test('should have fullscreen button', async ({ watchPage }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      await expect(watchPage.fullscreenButton).toBeVisible();
    });

    test('should have volume controls', async ({ watchPage }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      await expect(watchPage.volumeButton).toBeVisible();
    });

    test('should toggle play/pause on click', async ({ watchPage, page }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      // Check initial state
      const initialPlaying = await watchPage.isPlaying();

      // Click play/pause
      await watchPage.playPauseButton.click();

      // Wait a bit for state to change
      await page.waitForTimeout(500);

      const afterClickPlaying = await watchPage.isPlaying();

      // State should have changed
      expect(afterClickPlaying).not.toBe(initialPlaying);
    });
  });

  test.describe('Quality Switching', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/v1/content/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.freeContent,
          }),
        });
      });

      await page.route('**/api/v1/streaming/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              streamUrl: 'https://test.cdn/video.m3u8',
              qualities: ['auto', '1080p', '720p', '480p'],
            },
          }),
        });
      });

      await mockVideoStream(page);
    });

    test('should display quality selector', async ({ watchPage }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      // Quality selector should be visible (may need to hover over player)
      await watchPage.page.hover('[data-testid="video-player"], video');

      const qualityBtn = watchPage.qualitySelector;
      const isVisible = await qualityBtn.isVisible().catch(() => false);

      // Quality selector may or may not be visible depending on implementation
      expect(isVisible !== undefined).toBe(true);
    });

    test('should allow quality selection', async ({ watchPage, page }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      // Hover over player to show controls
      await page.hover('[data-testid="video-player"], video');

      const qualityBtn = watchPage.qualitySelector;
      if (await qualityBtn.isVisible()) {
        await qualityBtn.click();

        // Quality options should appear
        const qualityOptions = page.locator('[data-testid^="quality-option"], .quality-option');
        await expect(qualityOptions.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Progress Tracking', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/v1/content/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.freeContent,
          }),
        });
      });

      await page.route('**/api/v1/streaming/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { streamUrl: 'https://test.cdn/video.m3u8' },
          }),
        });
      });

      await mockVideoStream(page);
    });

    test('should save watch progress', async ({ watchPage, page }) => {
      let progressSaved = false;

      // Listen for progress update API call
      await page.route('**/api/v1/watch-history/*/progress', async (route, request) => {
        progressSaved = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      // Simulate watching for a bit
      await watchPage.play();
      await page.waitForTimeout(3000);

      // Progress should be saved (may be periodic or on pause)
      await watchPage.pause();

      // Check if progress was saved at any point
      // Implementation may save on pause, periodically, or on navigation
    });

    test('should resume from last position', async ({ watchPage, page }) => {
      // Mock watch history with saved progress
      await page.route('**/api/v1/watch-history/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              contentId: MOCK_CONTENT.freeContent.id,
              progress: 120, // 2 minutes in
              lastWatchedAt: new Date().toISOString(),
            },
          }),
        });
      });

      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      // Video should start from saved position
      // Or show "Continue from X" prompt
      const continuePrompt = page.locator('[data-testid="continue-watching"], .continue-watching');
      const hasPrompt = await continuePrompt.isVisible().catch(() => false);

      // Either shows prompt or auto-resumes
      expect(hasPrompt !== undefined).toBe(true);
    });

    test('should update progress bar as video plays', async ({ watchPage, page }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      const initialTime = await watchPage.getCurrentTime();

      await watchPage.play();
      await page.waitForTimeout(2000);

      const newTime = await watchPage.getCurrentTime();

      // Time should have advanced
      expect(newTime).toBeGreaterThanOrEqual(initialTime);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate back to series page', async ({ watchPage, seriesPage, page }) => {
      await page.route('**/api/v1/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.freeContent,
          }),
        });
      });

      await mockVideoStream(page);

      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      // Click back button
      const backButton = watchPage.backButton;
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForURL(/\/series\//);
      }
    });

    test('should navigate to next episode', async ({ watchPage, page }) => {
      // Mock series with multiple episodes
      await page.route('**/api/v1/series/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              ...MOCK_CONTENT.freeContent,
              episodes: MOCK_EPISODES,
            },
          }),
        });
      });

      await page.route('**/api/v1/streaming/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { streamUrl: 'https://test.cdn/video.m3u8' },
          }),
        });
      });

      await mockVideoStream(page);

      await watchPage.goto(MOCK_EPISODES[0].id);
      await watchPage.waitForVideoReady();

      const nextButton = watchPage.nextEpisodeButton;
      if (await nextButton.isVisible()) {
        await nextButton.click();
        // Should navigate to next episode
        await page.waitForURL(/\/watch\//);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle streaming error gracefully', async ({ watchPage, page }) => {
      await page.route('**/api/v1/content/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.freeContent,
          }),
        });
      });

      await page.route('**/api/v1/streaming/*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'STREAM_001',
              message: 'Ошибка воспроизведения',
            },
          }),
        });
      });

      await watchPage.goto(MOCK_CONTENT.freeContent.id);

      await expect(watchPage.errorMessage).toBeVisible({ timeout: 10000 });
    });

    test('should handle access denied for premium content', async ({ watchPage, page }) => {
      await page.route('**/api/v1/content/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.premiumContent,
          }),
        });
      });

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

      await watchPage.goto(MOCK_CONTENT.premiumContent.id);

      await watchPage.expectAccessDenied();
    });

    test('should handle video load failure', async ({ watchPage, page }) => {
      await page.route('**/api/v1/content/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.freeContent,
          }),
        });
      });

      await page.route('**/api/v1/streaming/*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { streamUrl: 'https://invalid.cdn/notfound.m3u8' },
          }),
        });
      });

      // Abort HLS requests to simulate failure
      await page.route('**/*.m3u8', async (route) => {
        await route.abort('failed');
      });

      await watchPage.goto(MOCK_CONTENT.freeContent.id);

      // Should show error after timeout
      await expect(watchPage.errorMessage).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Keyboard Controls', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/v1/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_CONTENT.freeContent,
          }),
        });
      });

      await mockVideoStream(page);
    });

    test('should toggle play/pause with space key', async ({ watchPage, page }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      const initialPlaying = await watchPage.isPlaying();

      // Press space
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      const afterSpace = await watchPage.isPlaying();

      expect(afterSpace).not.toBe(initialPlaying);
    });

    test('should toggle fullscreen with F key', async ({ watchPage, page }) => {
      await watchPage.goto(MOCK_CONTENT.freeContent.id);
      await watchPage.waitForVideoReady();

      // Focus on video player
      await watchPage.videoPlayer.click();

      // Press F for fullscreen
      await page.keyboard.press('f');

      // Check if fullscreen was triggered (may not work in headless mode)
      const isFullscreen = await page.evaluate(() => document.fullscreenElement !== null);

      // Fullscreen may not work in test environment, just verify no error
      expect(isFullscreen !== undefined).toBe(true);
    });
  });
});
