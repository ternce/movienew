import { test, expect } from '@playwright/test';

test.describe('Category Pages', () => {
  const categories = [
    { slug: 'series', name: 'Сериалы' },
    { slug: 'films', name: 'Фильмы' },
    { slug: 'shorts', name: 'Шортсы' },
    { slug: 'tutorials', name: 'Обучение' },
  ];

  for (const category of categories) {
    test(`/category/${category.slug} loads`, async ({ page }) => {
      await page.goto(`/category/${category.slug}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      await expect(page.locator('body')).not.toBeEmpty();

      // Should not be a 500 error page
      const title = await page.title();
      expect(title).not.toContain('500');
    });
  }

  test('category page has content cards or empty state', async ({ page }) => {
    await page.goto('/category/series');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    // Should have either content or a Russian empty message
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });

  test('category pages have Russian text', async ({ page }) => {
    await page.goto('/category/series');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.locator('body').innerText();
    expect(/[\u0400-\u04FF]/.test(bodyText)).toBe(true);
  });
});
