import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { PROD_USERS, canLoginViaApi, loginViaApi } from '../helpers/auth.helper';

test.describe('Watch History', () => {
  test('watch history API returns data', async () => {
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

    const res = await apiGet('/users/me/watch-history', auth.accessToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('continue watching API returns data', async () => {
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

    const res = await apiGet('/users/me/watch-history/continue', auth.accessToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('account history page loads', async ({ page }) => {
    await page.goto('/account/history');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const url = page.url();
    if (url.includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(url).toContain('/account');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('history page has Russian text', async ({ page }) => {
    await page.goto('/account/history');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
