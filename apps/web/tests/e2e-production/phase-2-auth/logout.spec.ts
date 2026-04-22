import { test, expect } from '@playwright/test';
import {
  PROD_USERS,
  isAuthenticated,
  canLoginViaApi,
  loginViaApi,
} from '../helpers/auth.helper';

test.describe('Logout', () => {
  test('clearing auth state logs user out', async ({ page }) => {
    let auth;
    try {
      auth = await loginViaApi(
        PROD_USERS.user.email,
        PROD_USERS.user.password
      );
    } catch {
      test.skip(true, 'Login failed — possible 502');
      return;
    }

    // Navigate to a page and inject auth into localStorage + cookies
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(
      ({ accessToken, refreshToken, user }) => {
        const authStorage = JSON.stringify({
          state: {
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
          },
          version: 0,
        });
        localStorage.setItem('mp-auth-storage', authStorage);
      },
      { accessToken: auth.accessToken, refreshToken: auth.refreshToken, user: auth.user }
    );

    // Now add cookies
    const domain = new URL(page.url()).hostname;
    await page.context().addCookies([
      { name: 'mp-auth-token', value: auth.accessToken, domain, path: '/' },
      { name: 'mp-authenticated', value: 'true', domain, path: '/' },
    ]);

    // Navigate to dashboard to verify auth works
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(await isAuthenticated(page)).toBe(true);

    // Now clear auth (simulating logout)
    await page.evaluate(() => {
      localStorage.removeItem('mp-auth-storage');
    });

    // Clear cookies
    await page.context().clearCookies();

    // Verify auth is cleared
    expect(await isAuthenticated(page)).toBe(false);
  });

  test('protected routes redirect to /login without auth', async ({
    page,
  }) => {
    // Navigate to login first to be on the domain
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Clear all auth state
    await page.evaluate(() => {
      localStorage.removeItem('mp-auth-storage');
    });
    await page.context().clearCookies();

    // Try accessing protected route
    await page.goto('/account');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/login');
  });

  test('logout button visible in sidebar', async ({ page }) => {
    let auth;
    try {
      auth = await loginViaApi(
        PROD_USERS.user.email,
        PROD_USERS.user.password
      );
    } catch {
      test.skip(true, 'Login failed — possible 502');
      return;
    }

    // Navigate and inject auth
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(
      ({ accessToken, refreshToken, user }) => {
        const authStorage = JSON.stringify({
          state: { user, accessToken, refreshToken, isAuthenticated: true },
          version: 0,
        });
        localStorage.setItem('mp-auth-storage', authStorage);
      },
      { accessToken: auth.accessToken, refreshToken: auth.refreshToken, user: auth.user }
    );

    const domain = new URL(page.url()).hostname;
    await page.context().addCookies([
      { name: 'mp-auth-token', value: auth.accessToken, domain, path: '/' },
      { name: 'mp-authenticated', value: 'true', domain, path: '/' },
    ]);

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Look for logout button in sidebar
    const logoutButton = page.locator(
      'button:has-text("Выйти"), a:has-text("Выйти")'
    );
    const count = await logoutButton.count();

    // Should have at least one logout element
    expect(count).toBeGreaterThan(0);
  });
});
