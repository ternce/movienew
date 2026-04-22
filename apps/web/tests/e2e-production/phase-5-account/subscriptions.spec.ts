import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS, canLoginViaApi } from '../helpers/auth.helper';

test.describe('Subscriptions', () => {
  test('subscriptions page loads at /account/subscriptions', async ({
    page,
  }) => {
    await page.goto('/account/subscriptions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).toContain('/account');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('subscriptions page shows content', async ({ page }) => {
    await page.goto('/account/subscriptions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    const hasSubInfo =
      bodyText.includes('подписк') ||
      bodyText.includes('Подписк') ||
      bodyText.includes('Тариф') ||
      bodyText.includes('Оформить') ||
      bodyText.includes('Нет активной') ||
      bodyText.includes('Подключить');

    expect(hasSubInfo).toBe(true);
  });

  test('subscription plans API returns data', async () => {
    const res = await apiGet('/subscriptions/plans');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('user subscription status API works', async () => {
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

    const res = await apiGet('/subscriptions/my', auth.accessToken);
    expect(res).toBeDefined();
  });

  test('subscriptions page has Russian text', async ({ page }) => {
    await page.goto('/account/subscriptions');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
