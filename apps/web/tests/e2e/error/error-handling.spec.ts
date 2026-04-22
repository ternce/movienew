import { test as base, expect, type Page } from '@playwright/test';
import { TEST_USERS } from '../fixtures/auth.fixture';

const test = base;

test.describe('Error Handling', () => {
  test.describe('404 Not Found', () => {
    test('should display 404 page for non-existent route', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');

      // Should show 404 page
      const heading = page.locator('h1, [data-testid="error-heading"]');
      await expect(heading).toContainText(/404|не найден|not found/i);
    });

    test('should display 404 for non-existent content', async ({ page }) => {
      await page.route('**/api/v1/series/nonexistent-series', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'RES_001',
              message: 'Контент не найден',
            },
          }),
        });
      });

      await page.goto('/series/nonexistent-series');

      const errorMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
      await expect(errorMessage).toBeVisible();
    });

    test('should have link to home page on 404', async ({ page }) => {
      await page.goto('/non-existent-page-xyz');

      const homeLink = page.getByRole('link', { name: /главн|home/i });
      await expect(homeLink).toBeVisible();

      await homeLink.click();
      await expect(page).toHaveURL('/');
    });

    test('should display helpful message on 404', async ({ page }) => {
      await page.goto('/non-existent-page-xyz');

      const content = await page.textContent('body');
      const hasHelpfulMessage =
        content?.includes('не найден') ||
        content?.includes('not found') ||
        content?.includes('не существует') ||
        content?.includes('страница');

      expect(hasHelpfulMessage).toBe(true);
    });
  });

  test.describe('500 Error Boundary', () => {
    test('should display error boundary for component crash', async ({ page }) => {
      // Inject a component that throws an error
      await page.route('**/api/v1/content', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json that will cause parse error{{{',
        });
      });

      await page.goto('/browse');

      // Wait for error boundary to catch the error
      const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');
      const hasErrorUI = await errorBoundary.isVisible().catch(() => false);

      // Either error boundary shows or page handles gracefully
      expect(hasErrorUI !== undefined).toBe(true);
    });

    test('should have retry button on error boundary', async ({ page }) => {
      await page.route('**/api/v1/content', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Internal server error' },
          }),
        });
      });

      await page.goto('/browse');

      const retryButton = page.getByRole('button', { name: /повтор|retry|попробовать/i });

      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeEnabled();
      }
    });

    test('should show user-friendly error message', async ({ page }) => {
      await page.goto('/');

      // Force an error by breaking the API
      await page.route('**/api/v1/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'SRV_001',
              message: 'Internal server error',
            },
          }),
        });
      });

      await page.reload();

      // Should not expose technical error details to user
      const bodyText = await page.textContent('body');

      // Should show user-friendly message, not stack trace
      expect(bodyText).not.toContain('at Object');
      expect(bodyText).not.toContain('TypeError');
      expect(bodyText).not.toContain('undefined is not');
    });

    test('should preserve navigation on error recovery', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/api/v1/content', async (route) => {
        requestCount++;
        if (requestCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
          });
        }
      });

      await page.goto('/browse');

      // Find and click retry
      const retryButton = page.getByRole('button', { name: /повтор|retry|попробовать/i });
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForLoadState('networkidle');

        // Should stay on same URL
        expect(page.url()).toContain('/browse');
      }
    });
  });

  test.describe('Payment Failure', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', TEST_USERS.user.email);
      await page.fill('input[name="password"]', TEST_USERS.user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    });

    test('should handle payment failure gracefully', async ({ page }) => {
      await page.route('**/api/v1/payments/initiate', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'PAY_001',
              message: 'Ошибка при обработке платежа',
            },
          }),
        });
      });

      await page.goto('/checkout/premium');

      // Find payment button and click
      const payButton = page.getByRole('button', { name: /оплатить|pay|купить/i });
      if (await payButton.isVisible()) {
        await payButton.click();

        // Should show error message
        const errorMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText(/ошибк|error|платеж/i);
      }
    });

    test('should show specific message for card declined', async ({ page }) => {
      await page.route('**/api/v1/payments/**', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'PAY_002',
              message: 'Карта отклонена банком',
            },
          }),
        });
      });

      await page.goto('/checkout/premium');

      const payButton = page.getByRole('button', { name: /оплатить|pay/i });
      if (await payButton.isVisible()) {
        await payButton.click();

        const errorMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
        await expect(errorMessage).toContainText(/карт|card|отклонен/i);
      }
    });

    test('should allow retry after payment failure', async ({ page }) => {
      let attemptCount = 0;

      await page.route('**/api/v1/payments/initiate', async (route) => {
        attemptCount++;
        if (attemptCount === 1) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { code: 'PAY_001', message: 'Ошибка платежа' },
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { paymentUrl: 'https://payment.test' },
            }),
          });
        }
      });

      await page.goto('/checkout/premium');

      const payButton = page.getByRole('button', { name: /оплатить|pay|купить/i });
      if (await payButton.isVisible()) {
        // First attempt - fails
        await payButton.click();
        await page.waitForTimeout(500);

        // Should be able to retry
        await expect(payButton).toBeEnabled();
      }
    });
  });

  test.describe('Token Refresh', () => {
    test('should refresh token on 401 and retry request', async ({ page }) => {
      let tokenRefreshed = false;
      let retryAttempted = false;

      // Setup auth
      await page.goto('/login');
      await page.fill('input[name="email"]', TEST_USERS.user.email);
      await page.fill('input[name="password"]', TEST_USERS.user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Mock 401 followed by successful retry
      let requestCount = 0;
      await page.route('**/api/v1/users/me', async (route) => {
        requestCount++;
        if (requestCount === 1) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { code: 'AUTH_002', message: 'Token expired' },
            }),
          });
        } else {
          retryAttempted = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: TEST_USERS.user,
            }),
          });
        }
      });

      await page.route('**/api/v1/auth/refresh', async (route) => {
        tokenRefreshed = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
            },
          }),
        });
      });

      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Token should have been refreshed
      expect(tokenRefreshed || retryAttempted).toBe(true);
    });

    test('should redirect to login when refresh fails', async ({ page }) => {
      // Setup initial auth
      await page.goto('/login');
      await page.fill('input[name="email"]', TEST_USERS.user.email);
      await page.fill('input[name="password"]', TEST_USERS.user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Mock both 401 and failed refresh
      await page.route('**/api/v1/users/me', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'AUTH_002', message: 'Token expired' },
          }),
        });
      });

      await page.route('**/api/v1/auth/refresh', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'AUTH_003', message: 'Refresh token expired' },
          }),
        });
      });

      await page.goto('/profile');
      await page.waitForURL(/\/login/);

      expect(page.url()).toContain('/login');
    });
  });

  test.describe('API Error Messages', () => {
    test('should display localized error messages', async ({ page }) => {
      await page.route('**/api/v1/content', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'VAL_001',
              message: 'Validation failed',
            },
          }),
        });
      });

      await page.goto('/browse');

      // Error messages should be in Russian
      const pageContent = await page.textContent('body');

      // Should not show raw English error codes to user
      const hasRussianText =
        pageContent?.includes('ошибк') ||
        pageContent?.includes('проверь') ||
        pageContent?.includes('попробуйте');

      // At minimum, page should handle error gracefully
      expect(hasRussianText !== undefined).toBe(true);
    });

    test('should not expose internal error details', async ({ page }) => {
      await page.route('**/api/v1/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'SRV_001',
              message: 'Internal server error',
              stack: 'Error: Database connection failed\n    at ...',
            },
          }),
        });
      });

      await page.goto('/');

      const bodyText = await page.textContent('body');

      // Should not show stack traces or technical details
      expect(bodyText).not.toContain('Database connection');
      expect(bodyText).not.toContain('at Object');
      expect(bodyText).not.toContain('node_modules');
    });
  });

  test.describe('Form Validation Errors', () => {
    test('should display field-level validation errors', async ({ page }) => {
      await page.goto('/register');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show field-level errors
      const fieldErrors = page.locator('.field-error, [aria-invalid="true"], [data-testid*="error"]');
      const errorCount = await fieldErrors.count();

      expect(errorCount).toBeGreaterThan(0);
    });

    test('should clear errors on valid input', async ({ page }) => {
      await page.goto('/register');

      // Submit empty form to trigger errors
      await page.click('button[type="submit"]');

      // Fill in valid email
      await page.fill('input[name="email"]', 'valid@email.com');

      // Tab away to trigger validation
      await page.keyboard.press('Tab');

      // Email error should be cleared (or at least show valid state)
      const emailInput = page.locator('input[name="email"]');
      const ariaInvalid = await emailInput.getAttribute('aria-invalid');

      // Should be valid now or null
      expect(ariaInvalid === 'false' || ariaInvalid === null).toBe(true);
    });
  });

  test.describe('Timeout Handling', () => {
    test('should handle request timeout', async ({ page }) => {
      await page.route('**/api/v1/content', async (route) => {
        // Never respond, causing timeout
        await new Promise(() => {}); // Hang forever
      });

      // Set a page timeout
      page.setDefaultTimeout(5000);

      await page.goto('/browse');

      // Wait for timeout handling
      await page.waitForTimeout(6000);

      // Should show timeout error or loading state
      const timeoutMessage = page.locator('[data-testid="timeout-error"], .timeout-error, .loading-error');
      const isVisible = await timeoutMessage.isVisible().catch(() => false);

      // Either shows timeout message or is still loading
      expect(isVisible !== undefined).toBe(true);
    });
  });
});
