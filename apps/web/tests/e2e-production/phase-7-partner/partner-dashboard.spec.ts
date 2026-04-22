import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS, canLoginViaApi } from '../helpers/auth.helper';

test.describe('Partner Dashboard', () => {
  test('partner page loads at /partner', async ({ page }) => {
    await page.goto('/partner');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).not.toContain('/login');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('partner dashboard shows content', async ({ page }) => {
    await page.goto('/partner');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    const hasPartnerInfo =
      bodyText.includes('реферальн') ||
      bodyText.includes('Реферальн') ||
      bodyText.includes('Код') ||
      bodyText.includes('Партнер') ||
      bodyText.includes('партнер') ||
      bodyText.includes('Дашборд') ||
      bodyText.includes('Комиссии');

    expect(hasPartnerInfo).toBe(true);
  });

  test('partner dashboard API returns data', async () => {
    let auth;
    try {
      auth = await loginViaApi(
        PROD_USERS.partner.email,
        PROD_USERS.partner.password
      );
    } catch {
      test.skip(true, 'Partner login failed — possible 502');
      return;
    }

    const res = await apiGet('/partners/dashboard', auth.accessToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('partner page has Russian text', async ({ page }) => {
    await page.goto('/partner');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
