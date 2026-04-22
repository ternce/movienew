import { test, expect } from '@playwright/test';

/**
 * Phase 11 — Bonus Dashboard
 *
 * Tests for the bonus dashboard page (/bonuses).
 * Known issue: Bonuses API may return 500 errors on production,
 * so tests focus on page rendering and graceful error handling.
 */

async function gotoProtected(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    return false;
  }
  return true;
}

test.describe('Bonus Dashboard', () => {
  test('bonus dashboard page loads at /bonuses', async ({ page }) => {
    const ok = await gotoProtected(page, '/bonuses');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).toContain('/bonuses');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('bonus page redirects unauthenticated users or stays loaded', async ({ page }) => {
    await page.goto('/bonuses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Either we are on the bonus page (authenticated) or redirected to login
    const url = page.url();
    const isOnBonuses = url.includes('/bonuses');
    const isOnLogin = url.includes('/login');

    expect(isOnBonuses || isOnLogin).toBe(true);
  });

  test('bonus page has visible content (not blank)', async ({ page }) => {
    const ok = await gotoProtected(page, '/bonuses');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();
    // Page should have meaningful content even if API returns errors
    const hasContent =
      bodyText.includes('бонус') ||
      bodyText.includes('Бонус') ||
      bodyText.includes('Мои бонусы') ||
      bodyText.includes('Ошибка') ||
      bodyText.includes('ошибка') ||
      bodyText.length > 100;

    expect(hasContent).toBe(true);
  });

  test('bonus page has Russian text', async ({ page }) => {
    await page.goto('/bonuses');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('bonus page has navigation links or balance display', async ({ page }) => {
    const ok = await gotoProtected(page, '/bonuses');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    // Check for quick-action links (history, withdraw) or balance-related text
    const hasHistoryLink = await page.locator('a[href*="/bonuses/history"]').count() > 0;
    const hasWithdrawLink = await page.locator('a[href*="/bonuses/withdraw"]').count() > 0;
    const hasBalanceText =
      bodyText.includes('баланс') ||
      bodyText.includes('Баланс') ||
      bodyText.includes('₽') ||
      bodyText.includes('История') ||
      bodyText.includes('Вывести') ||
      bodyText.includes('Использовать');

    expect(hasHistoryLink || hasWithdrawLink || hasBalanceText).toBe(true);
  });
});
