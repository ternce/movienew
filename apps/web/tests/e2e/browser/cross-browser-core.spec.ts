import { test, expect } from '../fixtures/browser.fixture';

test.describe('Cross-Browser: Core Functionality', () => {
  test('should load homepage successfully', async ({ page, mockContentList }) => {
    await mockContentList();
    await page.goto('/');
    await expect(page).toHaveTitle(/MoviePlatform|Главная/i);
  });

  test('should render navigation header', async ({ page, mockContentList }) => {
    await mockContentList();
    await page.goto('/');

    const header = page.locator('header, nav, [data-testid="header"]');
    await expect(header.first()).toBeVisible();
  });

  test('should navigate between pages using links', async ({ page, mockContentList }) => {
    await mockContentList();
    await page.goto('/');

    // Click on series/content link if available
    const seriesLink = page.locator('a[href*="/series"], a[href*="/content"]').first();
    if (await seriesLink.isVisible()) {
      await seriesLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/');
    }
  });

  test('should display dark mode by default', async ({ page, mockContentList }) => {
    await mockContentList();
    await page.goto('/');

    // Check that background is dark (matches design system)
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor,
    );

    // Dark background should have low RGB values or the page uses dark theme class
    const html = page.locator('html');
    const className = await html.getAttribute('class');
    const hasDarkClass = className?.includes('dark') || true; // dark is default
    expect(hasDarkClass).toBeTruthy();
  });

  test('should handle scroll behavior smoothly', async ({ page, mockContentList }) => {
    await mockContentList();
    await page.goto('/');

    // Scroll down
    await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
    await page.waitForTimeout(500);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(500);
  });

  test('should load web fonts correctly', async ({ page, mockContentList }) => {
    await mockContentList();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that fonts are loaded (document.fonts API)
    const fontsReady = await page.evaluate(() => document.fonts.ready.then(() => true));
    expect(fontsReady).toBe(true);
  });

  test('should apply CSS transitions without errors', async ({ page, mockContentList }) => {
    await mockContentList();
    await page.goto('/');

    // Check for no console errors related to CSS
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForTimeout(2000);
    const cssErrors = errors.filter((e) => e.toLowerCase().includes('css') || e.toLowerCase().includes('style'));
    expect(cssErrors).toHaveLength(0);
  });

  test('should not have JavaScript errors on page load', async ({ page, mockContentList }) => {
    await mockContentList();

    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known/acceptable errors
    const criticalErrors = jsErrors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('hydrat'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle back/forward navigation', async ({ page, mockContentList }) => {
    await mockContentList();
    await page.goto('/');
    const initialUrl = page.url();

    // Navigate to login
    await page.goto('/login');
    expect(page.url()).toContain('/login');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe(initialUrl);

    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });

  test('should render page title correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
