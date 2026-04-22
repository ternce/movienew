import { test, expect } from '@playwright/test';

test.describe('Site Availability', () => {
  test('homepage returns 200 and renders Next.js app', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    const html = await page.content();
    expect(html).toContain('__next');
  });

  test('homepage loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10_000);
  });

  test('no critical JS console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known non-critical errors
        if (
          text.includes('favicon') ||
          text.includes('404') ||
          text.includes('Failed to load resource') ||
          text.includes('hydration') ||
          text.includes('Hydration') ||
          text.includes('Cross-Origin') ||
          text.includes('COOP')
        ) {
          return;
        }
        errors.push(text);
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait a bit for async errors to appear
    await page.waitForTimeout(5000);

    expect(
      errors,
      `Critical console errors: ${errors.join('\n')}`
    ).toHaveLength(0);
  });

  test('page has a visible title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('page contains body content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
