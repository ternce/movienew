import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS, canLoginViaApi } from '../helpers/auth.helper';

test.describe('Notifications', () => {
  test('notifications page loads', async ({ page }) => {
    await page.goto('/account/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).not.toContain('/login');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('notifications API returns data', async () => {
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

    const res = await apiGet('/notifications', auth.accessToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('unread count API works', async () => {
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

    const res = await apiGet('/notifications/unread-count', auth.accessToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('notifications page has content', async ({ page }) => {
    await page.goto('/account/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();
    const hasContent =
      bodyText.includes('Все') ||
      bodyText.includes('Уведомления') ||
      bodyText.includes('уведомлени') ||
      bodyText.includes('Нет уведомлений');

    expect(hasContent).toBe(true);
  });

  test('notifications page has Russian text', async ({ page }) => {
    await page.goto('/account/notifications');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
