import { test, expect, type Page } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS } from '../helpers/auth.helper';

/**
 * Phase 13 — Payment Callback
 *
 * The /payment/callback page handles redirects from payment providers.
 * Without a valid transactionId it shows a "transaction not found" state.
 * Also tests subscription plans and payment transactions API endpoints.
 *
 * Since this phase runs late in the test suite, the storageState JWT
 * may have expired. Tests that navigate to auth-protected pages refresh
 * tokens via loginViaApi before navigating.
 */

const BASE_URL = process.env.PROD_BASE_URL || 'http://89.108.66.37';

/**
 * Re-authenticate by calling the login API and injecting fresh
 * cookies + localStorage into the current page context.
 */
async function refreshAuth(page: Page): Promise<boolean> {
  try {
    const auth = await loginViaApi(PROD_USERS.user.email, PROD_USERS.user.password);
    const domain = new URL(BASE_URL).hostname;

    await page.context().addCookies([
      { name: 'mp-auth-token', value: auth.accessToken, domain, path: '/' },
      { name: 'mp-authenticated', value: 'true', domain, path: '/' },
    ]);

    // Navigate to a simple page first so we can set localStorage
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(
      (authData) => {
        localStorage.setItem(
          'mp-auth-storage',
          JSON.stringify({
            state: {
              user: authData.user,
              accessToken: authData.accessToken,
              refreshToken: authData.refreshToken,
              isAuthenticated: true,
            },
            version: 0,
          }),
        );
      },
      auth as { accessToken: string; refreshToken: string; user: unknown },
    );

    return true;
  } catch {
    return false;
  }
}

test.describe('Payment Callback', () => {
  test('payment callback page at /payment/callback handles gracefully (no crash)', async ({
    page,
  }) => {
    const authed = await refreshAuth(page);
    if (!authed) {
      test.skip(true, 'Could not refresh auth — user login failed');
    }

    await page.goto('/payment/callback');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Page should not crash — it should render some content.
    // It may stay on /payment/callback or redirect (e.g., to /login, /pricing).
    const url = page.url();
    const isCallbackPage = url.includes('/payment/callback');
    const isRedirected = url.includes('/login') || url.includes('/pricing') || url.includes('/dashboard');

    expect(isCallbackPage || isRedirected).toBe(true);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('payment callback with no params shows a message or redirects', async ({ page }) => {
    const authed = await refreshAuth(page);
    if (!authed) {
      test.skip(true, 'Could not refresh auth — user login failed');
    }

    await page.goto('/payment/callback');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const url = page.url();
    const bodyText = await page.locator('body').innerText();

    if (url.includes('/payment/callback')) {
      // Stayed on callback page — should show "transaction not found" or similar
      const hasMessage =
        bodyText.includes('Транзакция не найдена') ||
        bodyText.includes('не найден') ||
        bodyText.includes('Не найден') ||
        bodyText.includes('платеж') ||
        bodyText.includes('Платёж') ||
        bodyText.includes('История платежей') ||
        bodyText.includes('Оформить подписку') ||
        bodyText.includes('Попробовать') ||
        bodyText.includes('ошибк') ||
        bodyText.includes('Ошибк');

      expect(hasMessage).toBe(true);
    } else {
      // Redirected — page should have Russian text and render properly
      expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
    }
  });

  test('payment callback page has visible content', async ({ page }) => {
    const authed = await refreshAuth(page);
    if (!authed) {
      test.skip(true, 'Could not refresh auth — user login failed');
    }

    await page.goto('/payment/callback');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should have links or buttons (e.g., "История платежей", "Оформить подписку")
    const links = page.locator('a');
    const buttons = page.locator('button');

    const linkCount = await links.count();
    const buttonCount = await buttons.count();

    // The page should have at least one actionable element
    expect(linkCount + buttonCount).toBeGreaterThan(0);

    // Should have Russian text
    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('subscription plans API endpoint responds', async () => {
    const res = await apiGet('/subscriptions/plans');

    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    // If successful, data should be an array of plans
    if (res.success && res.data) {
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  test('payment transactions API endpoint responds (needs auth)', async () => {
    let token: string;
    try {
      const auth = await loginViaApi(PROD_USERS.user.email, PROD_USERS.user.password);
      token = auth.accessToken;
    } catch {
      test.skip(true, 'User login failed — cannot test API');
      return;
    }

    const res = await apiGet('/payments/transactions', token);

    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    // Even if user has no transactions, the API should respond with a defined structure
    // (success: true with empty array, or success: false with an error)
  });
});
