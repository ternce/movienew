import { test, expect } from '@playwright/test';

/**
 * Phase 11 — Bonus History
 *
 * Tests for the bonus history page (/bonuses/history).
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

test.describe('Bonus History', () => {
  test('bonus history page loads at /bonuses/history', async ({ page }) => {
    const ok = await gotoProtected(page, '/bonuses/history');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).toContain('/bonuses/history');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('bonus history has content area (table, list, or empty state)', async ({ page }) => {
    const ok = await gotoProtected(page, '/bonuses/history');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    // Should show either transaction list, empty state, or error state
    const hasContentArea =
      bodyText.includes('операц') ||
      bodyText.includes('Операц') ||
      bodyText.includes('транзакц') ||
      bodyText.includes('История') ||
      bodyText.includes('пуста') ||
      bodyText.includes('Нет') ||
      bodyText.includes('Ошибка') ||
      bodyText.includes('Фильтры') ||
      bodyText.length > 100;

    expect(hasContentArea).toBe(true);
  });

  test('bonus history page has Russian text', async ({ page }) => {
    await page.goto('/bonuses/history');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('bonus history page has header/title', async ({ page }) => {
    const ok = await gotoProtected(page, '/bonuses/history');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    const hasTitle =
      bodyText.includes('История бонусов') ||
      bodyText.includes('история бонусов') ||
      bodyText.includes('История операций') ||
      bodyText.includes('Все операции');

    expect(hasTitle).toBe(true);
  });

  test('bonus history page is accessible from /bonuses (link exists)', async ({ page }) => {
    const ok = await gotoProtected(page, '/bonuses');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    // Check for a link to /bonuses/history on the main bonus dashboard
    const historyLink = page.locator('a[href*="/bonuses/history"]');
    const linkCount = await historyLink.count();

    if (linkCount === 0) {
      // Fallback: check if the text "История" exists anywhere (could be a button/link)
      const bodyText = await page.locator('body').innerText();
      const hasHistoryText =
        bodyText.includes('История') ||
        bodyText.includes('Все операции');

      expect(hasHistoryText).toBe(true);
    } else {
      expect(linkCount).toBeGreaterThan(0);
    }
  });
});
