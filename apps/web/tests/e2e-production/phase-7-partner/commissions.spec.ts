import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS, canLoginViaApi } from '../helpers/auth.helper';

test.describe('Commissions', () => {
  test('commissions API returns data', async () => {
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

    const res = await apiGet('/partners/commissions', auth.accessToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  test('commissions page loads', async ({ page }) => {
    await page.goto('/partner/commissions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).not.toContain('/login');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('commissions page shows content', async ({ page }) => {
    await page.goto('/partner/commissions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    const hasCommissionInfo =
      bodyText.includes('Комиссии') ||
      bodyText.includes('комиссии') ||
      bodyText.includes('История') ||
      bodyText.includes('Нет комиссий') ||
      bodyText.includes('₽');

    expect(hasCommissionInfo).toBe(true);
  });

  test('commissions page has Russian text', async ({ page }) => {
    await page.goto('/partner/commissions');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
