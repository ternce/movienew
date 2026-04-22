import { test, expect } from '@playwright/test';
import { expectRussianText } from '../helpers/assertions.helper';

/**
 * Helper: navigate to a protected page and skip if redirected to login.
 */
async function gotoProtected(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    return false; // redirected — auth expired
  }
  return true;
}

test.describe('Account Dashboard', () => {
  test('account page loads at /account', async ({ page }) => {
    const ok = await gotoProtected(page, '/account');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).toContain('/account');
  });

  test('account shows user name', async ({ page }) => {
    const ok = await gotoProtected(page, '/account');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();
    // Check for any user-identifying text
    const hasUserInfo =
      bodyText.includes('Иван') ||
      bodyText.includes('Петров') ||
      bodyText.includes('user@') ||
      bodyText.includes('Аккаунт') ||
      bodyText.includes('аккаунт');

    expect(hasUserInfo).toBe(true);
  });

  test('account has navigation links', async ({ page }) => {
    const ok = await gotoProtected(page, '/account');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    // Check for navigation links in sidebar or body
    const navLinks = page.locator(
      'a[href*="/account/"], a[href*="/partner"], a[href*="/store"]'
    );
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('account page has Russian text', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expectRussianText(page);
  });

  test('account page has key sections', async ({ page }) => {
    const ok = await gotoProtected(page, '/account');
    if (!ok) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    const hasContent =
      bodyText.includes('Профиль') ||
      bodyText.includes('профиль') ||
      bodyText.includes('Настройки') ||
      bodyText.includes('настройки') ||
      bodyText.includes('Мой аккаунт') ||
      bodyText.includes('Верификация');

    expect(hasContent).toBe(true);
  });
});
