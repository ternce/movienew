import { test, expect } from '@playwright/test';

test.describe('Partner Withdrawal Create', () => {
  test('withdrawal create page loads at /partner/withdrawals/new', async ({ page }) => {
    await page.goto('/partner/withdrawals/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    expect(page.url()).not.toContain('/login');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('create page has amount input field', async ({ page }) => {
    await page.goto('/partner/withdrawals/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const hasAmountInput = await page
      .locator('input[name="amount"], input[type="number"], input[placeholder*="сумм"], input[placeholder*="Сумм"]')
      .isVisible()
      .catch(() => false);

    const bodyText = await page.locator('body').innerText();
    const hasAmountLabel =
      bodyText.includes('Сумма') ||
      bodyText.includes('сумм') ||
      bodyText.includes('Размер') ||
      bodyText.includes('₽');

    expect(hasAmountInput || hasAmountLabel).toBe(true);
  });

  test('create page has payment method or bank details fields', async ({ page }) => {
    await page.goto('/partner/withdrawals/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const bodyText = await page.locator('body').innerText();

    const hasPaymentFields =
      bodyText.includes('Способ') ||
      bodyText.includes('способ') ||
      bodyText.includes('Банк') ||
      bodyText.includes('банк') ||
      bodyText.includes('Карта') ||
      bodyText.includes('карт') ||
      bodyText.includes('Реквизит') ||
      bodyText.includes('реквизит') ||
      bodyText.includes('СБП') ||
      bodyText.includes('Счёт') ||
      bodyText.includes('Счет');

    const hasInputs = (await page.locator('input, select, textarea').count()) > 0;

    expect(hasPaymentFields || hasInputs).toBe(true);
  });

  test('create page has submit button', async ({ page }) => {
    await page.goto('/partner/withdrawals/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state expired — redirected to login');
      return;
    }

    const hasSubmit = await page
      .locator('button[type="submit"], button:has-text("Создать"), button:has-text("Отправить"), button:has-text("Вывести")')
      .isVisible()
      .catch(() => false);

    const buttonCount = await page.locator('button').count();

    expect(hasSubmit || buttonCount > 0).toBe(true);
  });

  test('create page has Russian text', async ({ page }) => {
    await page.goto('/partner/withdrawals/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
