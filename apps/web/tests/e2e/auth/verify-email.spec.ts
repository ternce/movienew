import { test, expect } from '../fixtures/auth.fixture';
import { mockVerifyEmailApi } from '../helpers/mock-api';

test.describe('Verify Email Page', () => {
  test.describe('Loading State', () => {
    test('should show loading spinner initially when navigating to /verify-email/valid-token', async ({ verifyEmailPage, page }) => {
      await mockVerifyEmailApi(page, 'success');
      await verifyEmailPage.goto('valid-token');
      // Spinner should be visible initially (pending state)
      await expect(verifyEmailPage.spinner.first()).toBeVisible();
    });

    test('should auto-call verify API on mount', async ({ page }) => {
      let apiCalled = false;
      await page.route('**/api/v1/auth/verify-email/**', async (route) => {
        apiCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto('/verify-email/test-token-123');
      // Wait a bit for the API call
      await page.waitForTimeout(500);
      expect(apiCalled).toBe(true);
    });
  });

  test.describe('Success State', () => {
    test('should show success state after successful verification', async ({ verifyEmailPage, page }) => {
      await mockVerifyEmailApi(page, 'success');
      await verifyEmailPage.goto('valid-token');

      // Wait for success state
      await expect(verifyEmailPage.successIcon).toBeVisible({ timeout: 10000 });
    });

    test('should display "Email подтверждён" heading on success', async ({ verifyEmailPage, page }) => {
      await mockVerifyEmailApi(page, 'success');
      await verifyEmailPage.goto('valid-token');

      await expect(page.getByText('Email подтверждён')).toBeVisible({ timeout: 10000 });
    });

    test('should show login button on success that navigates to /login', async ({ verifyEmailPage, page }) => {
      await mockVerifyEmailApi(page, 'success');
      await verifyEmailPage.goto('valid-token');

      const loginLink = page.getByRole('link', { name: /войти|аккаунт/i });
      await expect(loginLink).toBeVisible({ timeout: 10000 });
      await expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  test.describe('Error State', () => {
    test('should show error state when verification fails', async ({ verifyEmailPage, page }) => {
      await mockVerifyEmailApi(page, 'invalid');
      await verifyEmailPage.goto('invalid-token');

      await expect(verifyEmailPage.errorIcon).toBeVisible({ timeout: 10000 });
    });

    test('should display "Ссылка устарела" heading on error', async ({ verifyEmailPage, page }) => {
      await mockVerifyEmailApi(page, 'invalid');
      await verifyEmailPage.goto('bad-token');

      await expect(page.getByText('Ссылка устарела')).toBeVisible({ timeout: 10000 });
    });

    test('should show login button on error state', async ({ verifyEmailPage, page }) => {
      await mockVerifyEmailApi(page, 'invalid');
      await verifyEmailPage.goto('bad-token');

      const loginLink = page.getByRole('link', { name: /войти|вход|аккаунт/i });
      await expect(loginLink).toBeVisible({ timeout: 10000 });
    });

    test('should handle expired token', async ({ verifyEmailPage, page }) => {
      await mockVerifyEmailApi(page, 'expired');
      await verifyEmailPage.goto('expired-token');

      await expect(page.getByText('Ссылка устарела')).toBeVisible({ timeout: 10000 });
    });

    test('should handle network error gracefully', async ({ verifyEmailPage, page }) => {
      await mockVerifyEmailApi(page, 'network_error');
      await verifyEmailPage.goto('any-token');

      // Should show error state
      await expect(verifyEmailPage.errorIcon).toBeVisible({ timeout: 10000 });
    });
  });
});
