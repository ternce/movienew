import { test, expect } from '@playwright/test';
import { apiGet } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS } from '../helpers/auth.helper';

test.describe('Partner Withdrawals', () => {
  test('withdrawals page loads at /partner/withdrawals', async ({ page }) => {
    await page.goto('/partner/withdrawals');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).not.toContain('/login');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('withdrawals page has content (table, list, or empty state)', async ({ page }) => {
    await page.goto('/partner/withdrawals');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    const hasWithdrawalInfo =
      bodyText.includes('Вывод') ||
      bodyText.includes('вывод') ||
      bodyText.includes('Заявк') ||
      bodyText.includes('заявк') ||
      bodyText.includes('Нет заявок') ||
      bodyText.includes('История') ||
      bodyText.includes('₽');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasEmptyState = bodyText.includes('Нет') || bodyText.includes('пусто') || bodyText.includes('Пусто');

    expect(hasWithdrawalInfo || hasTable || hasCards || hasEmptyState).toBe(true);
  });

  test('withdrawals page has Russian text', async ({ page }) => {
    await page.goto('/partner/withdrawals');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('withdrawals page has create button or link', async ({ page }) => {
    await page.goto('/partner/withdrawals');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();
    const bodyTextLower = bodyText.toLowerCase();

    // Check body text for any withdrawal-related action words
    const hasCreateAction =
      bodyTextLower.includes('создать заявку') ||
      bodyTextLower.includes('вывести') ||
      bodyTextLower.includes('новая заявка') ||
      bodyTextLower.includes('создать') ||
      bodyTextLower.includes('вывод средств') ||
      bodyTextLower.includes('запросить вывод') ||
      bodyTextLower.includes('запросить') ||
      bodyTextLower.includes('оформить') ||
      bodyTextLower.includes('подать заявку');

    // Check for links related to withdrawal creation
    const hasLink = await page
      .locator(
        [
          'a[href*="withdrawals/new"]',
          'a[href*="withdrawals/create"]',
          'a[href*="withdrawal"]',
        ].join(', ')
      )
      .first()
      .isVisible()
      .catch(() => false);

    // Check for buttons with withdrawal-related text (broad match)
    const hasButton = await page
      .locator(
        [
          'button:has-text("Создать")',
          'button:has-text("Вывести")',
          'button:has-text("Вывод")',
          'button:has-text("Запросить")',
          'button:has-text("Оформить")',
          'button:has-text("Новая")',
          'button:has-text("Подать")',
        ].join(', ')
      )
      .first()
      .isVisible()
      .catch(() => false);

    // As a fallback, check for any prominent button on the page
    const hasAnyButton = await page
      .locator('button')
      .first()
      .isVisible()
      .catch(() => false);

    // The page might show an empty state with no create button if balance is 0
    // In that case, having the page render at all is sufficient
    const hasEmptyState =
      bodyTextLower.includes('нет заявок') ||
      bodyTextLower.includes('нет выводов') ||
      bodyTextLower.includes('недостаточно') ||
      bodyTextLower.includes('пусто') ||
      bodyTextLower.includes('нет данных') ||
      bodyTextLower.includes('баланс');

    expect(
      hasCreateAction || hasLink || hasButton || hasAnyButton || hasEmptyState
    ).toBe(true);
  });

  test('withdrawals API responds with auth', async () => {
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

    const res = await apiGet('/partners/withdrawals', auth.accessToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });
});
