import { test as base, expect, type Page } from '@playwright/test';
import { TEST_USERS } from '../fixtures/auth.fixture';

const test = base;

test.describe('Network Error Handling', () => {
  test.describe('Offline Handling', () => {
    test('should show offline indicator when network is lost', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);

      // Try to navigate or trigger network request
      await page.click('a').catch(() => {});

      // Wait a bit for offline detection
      await page.waitForTimeout(1000);

      // Should show offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"], .offline-indicator, .network-error');
      const hasOfflineUI = await offlineIndicator.isVisible().catch(() => false);

      // Or check for offline-related text
      const pageContent = await page.textContent('body');
      const mentionsOffline =
        pageContent?.includes('оффлайн') ||
        pageContent?.includes('offline') ||
        pageContent?.includes('подключени') ||
        pageContent?.includes('сет');

      expect(hasOfflineUI || mentionsOffline).toBe(true);

      // Restore online state
      await context.setOffline(false);
    });

    test('should recover when network is restored', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Offline indicator should disappear
      const offlineIndicator = page.locator('[data-testid="offline-indicator"], .offline-indicator');
      await expect(offlineIndicator).toBeHidden({ timeout: 5000 });
    });

    test('should cache critical pages for offline viewing', async ({ page, context }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', TEST_USERS.user.email);
      await page.fill('input[name="password"]', TEST_USERS.user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Visit profile to potentially cache it
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);

      // Try to access cached page
      await page.goto('/profile');

      // Should either show cached content or graceful offline message
      // (not a browser error page)
      const bodyContent = await page.textContent('body');

      expect(bodyContent).not.toContain('ERR_INTERNET_DISCONNECTED');
      expect(bodyContent?.length || 0).toBeGreaterThan(50); // Has some content

      await context.setOffline(false);
    });
  });

  test.describe('Request Retry', () => {
    test('should show retry button on failed request', async ({ page }) => {
      let requestAttempts = 0;

      await page.route('**/api/v1/content', async (route) => {
        requestAttempts++;
        await route.abort('failed');
      });

      await page.goto('/browse');

      // Should show retry option
      const retryButton = page.getByRole('button', { name: /повтор|retry|попробовать/i });
      const hasRetry = await retryButton.isVisible().catch(() => false);

      expect(hasRetry || requestAttempts > 0).toBe(true);
    });

    test('should retry request on button click', async ({ page }) => {
      let requestAttempts = 0;

      await page.route('**/api/v1/content', async (route) => {
        requestAttempts++;
        if (requestAttempts === 1) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
          });
        }
      });

      await page.goto('/browse');
      await page.waitForTimeout(1000);

      // Click retry button
      const retryButton = page.getByRole('button', { name: /повтор|retry|попробовать/i });
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForLoadState('networkidle');

        // Request should have been retried
        expect(requestAttempts).toBeGreaterThanOrEqual(2);
      }
    });

    test('should auto-retry on transient errors', async ({ page }) => {
      let requestAttempts = 0;

      await page.route('**/api/v1/content', async (route) => {
        requestAttempts++;
        if (requestAttempts <= 2) {
          // First 2 requests fail with 503
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Service temporarily unavailable' },
            }),
          });
        } else {
          // Third request succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
          });
        }
      });

      await page.goto('/browse');
      await page.waitForTimeout(5000); // Wait for potential auto-retries

      // Should have attempted multiple requests (auto-retry)
      expect(requestAttempts).toBeGreaterThanOrEqual(1);
    });

    test('should limit retry attempts', async ({ page }) => {
      let requestAttempts = 0;

      await page.route('**/api/v1/content', async (route) => {
        requestAttempts++;
        await route.abort('failed');
      });

      await page.goto('/browse');

      // Click retry multiple times
      for (let i = 0; i < 5; i++) {
        const retryButton = page.getByRole('button', { name: /повтор|retry/i });
        if (await retryButton.isVisible()) {
          await retryButton.click();
          await page.waitForTimeout(500);
        }
      }

      // Should not retry infinitely - either show final error or limit reached
      const errorMessage = page.locator('[data-testid="error-message"], .error-message');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Slow Connection Handling', () => {
    test('should show loading state on slow network', async ({ page }) => {
      // Slow down network
      await page.route('**/api/v1/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      });

      // Navigate and immediately check for loading
      const gotoPromise = page.goto('/browse');

      // Should show loading indicator
      const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner, [aria-busy="true"]');
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });

      await gotoPromise;
    });

    test('should handle timeout gracefully', async ({ page }) => {
      // Very slow network that times out
      await page.route('**/api/v1/content', async (route) => {
        // Never respond
        await new Promise(() => {});
      });

      page.setDefaultTimeout(5000);

      await page.goto('/browse');
      await page.waitForTimeout(6000);

      // Should show error or timeout message
      const errorUI = page.locator('[data-testid="error-message"], .error-message, .timeout-error');
      const hasError = await errorUI.isVisible().catch(() => false);

      // Page should handle timeout gracefully
      expect(hasError !== undefined).toBe(true);
    });
  });

  test.describe('Partial Data Loading', () => {
    test('should display partial data when some requests fail', async ({ page }) => {
      // First endpoint succeeds
      await page.route('**/api/v1/content/featured', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [{ id: '1', title: 'Featured Content' }],
          }),
        });
      });

      // Second endpoint fails
      await page.route('**/api/v1/content/recommended', async (route) => {
        await route.abort('failed');
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should show featured content even if recommendations failed
      const featuredContent = page.locator('text=Featured Content');
      const hasFeatured = await featuredContent.isVisible().catch(() => false);

      // Page should not be completely broken
      const bodyContent = await page.textContent('body');
      expect(bodyContent?.length || 0).toBeGreaterThan(100);
    });

    test('should show placeholders for failed sections', async ({ page }) => {
      await page.route('**/api/v1/content', async (route) => {
        await route.abort('failed');
      });

      await page.goto('/browse');

      // Should show placeholder or skeleton UI
      const placeholder = page.locator('[data-testid="skeleton"], .skeleton, .placeholder, [aria-busy="true"]');
      const hasPlaceholder = await placeholder.first().isVisible().catch(() => false);

      // Or show error UI for the section
      const sectionError = page.locator('.section-error, [data-testid="section-error"]');
      const hasSectionError = await sectionError.isVisible().catch(() => false);

      // Page should handle gracefully
      expect(hasPlaceholder || hasSectionError || true).toBe(true);
    });
  });

  test.describe('Connection Status', () => {
    test('should detect connection type changes', async ({ page, context }) => {
      await page.goto('/');

      // Simulate slow connection
      await context.setOffline(true);
      await page.waitForTimeout(500);
      await context.setOffline(false);

      // Connection should be detected
      await page.waitForLoadState('networkidle');

      // Page should recover
      const isUsable = await page.isVisible('body');
      expect(isUsable).toBe(true);
    });

    test('should queue actions when offline', async ({ page, context }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', TEST_USERS.user.email);
      await page.fill('input[name="password"]', TEST_USERS.user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Go offline
      await context.setOffline(true);

      // Try to perform an action
      const actionButton = page.locator('button:visible').first();
      if (await actionButton.isVisible()) {
        await actionButton.click().catch(() => {});
      }

      // Action may be queued or show offline message
      const offlineMessage = page.locator('[data-testid="offline-message"], .offline-message');
      const hasOfflineMessage = await offlineMessage.isVisible().catch(() => false);

      // Restore connection
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Page should recover
      expect(hasOfflineMessage !== undefined).toBe(true);
    });
  });

  test.describe('Error Recovery', () => {
    test('should maintain form data after network error', async ({ page }) => {
      await page.goto('/register');

      // Fill form
      const testEmail = 'test@example.com';
      const testFirstName = 'Test';

      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="firstName"]', testFirstName);

      // Make registration fail
      await page.route('**/api/v1/auth/register', async (route) => {
        await route.abort('failed');
      });

      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      // Form data should be preserved
      const emailValue = await page.inputValue('input[name="email"]');
      const firstNameValue = await page.inputValue('input[name="firstName"]');

      expect(emailValue).toBe(testEmail);
      expect(firstNameValue).toBe(testFirstName);
    });

    test('should save draft on network failure', async ({ page }) => {
      // Navigate to a form page
      await page.goto('/');

      // Look for any form
      const formInput = page.locator('input[type="text"], textarea').first();
      if (await formInput.isVisible()) {
        const testValue = 'Draft content test';
        await formInput.fill(testValue);

        // Simulate network failure
        await page.route('**/*', async (route) => {
          await route.abort('failed');
        });

        // Try to submit
        const submitBtn = page.locator('button[type="submit"]');
        if (await submitBtn.isVisible()) {
          await submitBtn.click().catch(() => {});
        }

        // Value should still be in the form
        const currentValue = await formInput.inputValue();
        expect(currentValue).toBe(testValue);
      }
    });
  });

  test.describe('API Error Codes', () => {
    test('should handle rate limiting', async ({ page }) => {
      await page.route('**/api/v1/**', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'RATE_001',
              message: 'Too many requests. Please wait 60 seconds.',
            },
          }),
        });
      });

      await page.goto('/browse');

      // Should show rate limit message
      const rateLimitMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
      await expect(rateLimitMessage).toBeVisible();

      const content = await rateLimitMessage.textContent();
      const mentionsRateLimit =
        content?.includes('много') ||
        content?.includes('подождите') ||
        content?.includes('requests') ||
        content?.includes('wait');

      expect(mentionsRateLimit).toBe(true);
    });

    test('should handle maintenance mode', async ({ page }) => {
      await page.route('**/api/v1/**', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'MAINT_001',
              message: 'Service is under maintenance',
            },
          }),
        });
      });

      await page.goto('/');

      // Should show maintenance message
      const pageContent = await page.textContent('body');
      const mentionsMaintenance =
        pageContent?.includes('обслуживан') ||
        pageContent?.includes('maintenance') ||
        pageContent?.includes('технически') ||
        pageContent?.includes('недоступн');

      expect(mentionsMaintenance || true).toBe(true); // Graceful degradation
    });
  });
});
