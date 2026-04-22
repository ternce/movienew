import { test, expect } from '@playwright/test';
import { expectRussianText } from '../helpers/assertions.helper';

test.describe('Static Pages', () => {
  test('landing page renders hero section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Landing should have navigation and hero content
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
  });

  test('landing page contains Russian text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expectRussianText(page);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should have email and password inputs
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('login page has Russian text', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expectRussianText(page);
  });
});
