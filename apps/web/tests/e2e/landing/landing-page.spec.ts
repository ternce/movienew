import { test, expect } from '@playwright/test';

/**
 * Mock content API response helper.
 * Used by tests that need content carousels to render with data.
 */
async function mockContentApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/content**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          items: Array.from({ length: 6 }, (_, i) => ({
            id: `content-${i}`,
            slug: `series-${i}`,
            title: `Сериал ${i + 1}`,
            contentType: 'SERIES',
            ageCategory: '0+',
            thumbnailUrl: '/images/placeholder-content.jpg',
          })),
          total: 6,
        },
      }),
    });
  });
}

test.describe('Landing Page', () => {
  // 1. Hero section is visible with CTA
  test('hero section is visible with CTA', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify hero heading is visible
    const heroHeading = page.getByRole('heading', { level: 1 });
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('Смотрите то, что вдохновляет');

    // Verify CTA buttons are visible in the hero section
    const ctaButton = page.getByRole('link', { name: /Начать бесплатно/ });
    await expect(ctaButton).toBeVisible();
  });

  // 2. CTA button navigates to /register
  test('CTA button navigates to /register', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the primary CTA in the hero section
    const ctaButton = page.getByRole('link', { name: /Начать бесплатно/ });
    await ctaButton.click();
    await page.waitForURL('**/register**', { timeout: 10000 });
  });

  // 3. Navigation header visible with links
  test('navigation header visible with links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Header element should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Navigation links inside header (desktop nav)
    const nav = header.locator('nav');
    await expect(nav).toBeVisible();

    // Verify specific nav links
    await expect(header.getByRole('link', { name: 'Сериалы' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Обучение' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Тарифы' })).toBeVisible();
  });

  // 4. "Войти" button visible in header
  test('"Войти" button visible in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header');
    const loginButton = header.getByRole('link', { name: 'Войти' });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveAttribute('href', '/login');
  });

  // 5. "Начать" button visible in header
  test('"Начать" button visible in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header');
    const registerButton = header.getByRole('link', { name: 'Начать' });
    await expect(registerButton).toBeVisible();
    await expect(registerButton).toHaveAttribute('href', '/register');
  });

  // 6. Content carousel "Популярные сериалы" visible
  test('content carousel "Популярные сериалы" visible', async ({ page }) => {
    await mockContentApi(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify the "Популярные сериалы" section heading is visible
    const seriesHeading = page.getByRole('heading', { name: /Популярные сериалы/ });
    await expect(seriesHeading).toBeVisible();

    // Verify content cards are rendered below it
    const seriesSection = seriesHeading.locator('..');
    const cards = seriesSection.locator('..').locator('[class*="flex-shrink-0"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  // 7. Content carousel "Обучающие курсы" visible
  test('content carousel "Обучающие курсы" visible', async ({ page }) => {
    await mockContentApi(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const coursesHeading = page.getByRole('heading', { name: /Обучающие курсы/ });
    await expect(coursesHeading).toBeVisible();
  });

  // 8. "Смотреть все" link navigates correctly
  test('"Смотреть все" link navigates correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find all "Смотреть все" links
    const viewAllLinks = page.getByRole('link', { name: /Смотреть все/ });
    const count = await viewAllLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // First "Смотреть все" should link to /series
    const firstLink = viewAllLinks.first();
    await expect(firstLink).toHaveAttribute('href', '/series');

    // Second "Смотреть все" should link to /tutorials
    const secondLink = viewAllLinks.nth(1);
    await expect(secondLink).toHaveAttribute('href', '/tutorials');
  });

  // 9. Feature cards section visible
  test('feature cards section visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify "Почему выбирают нас" heading
    const featuresHeading = page.getByRole('heading', { name: /Почему выбирают нас/ });
    await expect(featuresHeading).toBeVisible();

    // Verify feature card titles are visible (at least 3 cards)
    const featureTitles = [
      'HD качество',
      'Бонусная система',
      'Партнерская программа',
      'Безопасность',
    ];

    for (const title of featureTitles) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
  });

  // 10. Footer is visible with content
  test('footer is visible with content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Footer should have navigation links
    const footerLinks = footer.getByRole('link');
    const linkCount = await footerLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(5);

    // Footer should contain the platform name
    await expect(footer.getByText('MoviePlatform').first()).toBeVisible();
  });

  // 11. Footer has legal links
  test('footer has legal links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer');

    // Check for legal links
    const termsLink = footer.getByRole('link', { name: /Условия использования|Условия/ });
    await expect(termsLink.first()).toBeVisible();

    const privacyLink = footer.getByRole('link', { name: /Конфиденциальность/ });
    await expect(privacyLink.first()).toBeVisible();
  });

  // 12. Footer has contact info
  test('footer has contact info', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer');

    // Footer should have support link or contact info
    const supportLink = footer.getByRole('link', { name: /Поддержка|support/i });
    await expect(supportLink.first()).toBeVisible();
  });

  // 13. Page has proper title/heading
  test('page has proper title/heading', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();

    // Heading should contain platform-related text
    const headingText = await h1.textContent();
    expect(headingText).toBeTruthy();
    expect(headingText!.length).toBeGreaterThan(5);

    // Should relate to watching/viewing content
    expect(headingText).toContain('Смотрите');
  });

  // 14. Pricing section or link visible
  test('pricing section or link visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for pricing link in navigation or footer
    const pricingLinks = page.getByRole('link', { name: /Тарифы/ });
    const count = await pricingLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify the nav pricing link href
    const navPricingLink = page.locator('header').getByRole('link', { name: 'Тарифы' });
    await expect(navPricingLink).toHaveAttribute('href', '/pricing');
  });

  // 15. Series card hover shows preview
  test('series card hover shows preview', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find first content card in the "Популярные сериалы" section
    const contentCard = page.locator('[class*="flex-shrink-0"][class*="group"]').first();
    await expect(contentCard).toBeVisible();

    // The overlay (play button container) should be hidden by default
    const overlay = contentCard.locator('[class*="opacity-0"]');
    const overlayCount = await overlay.count();
    expect(overlayCount).toBeGreaterThanOrEqual(1);

    // Hover over the card
    await contentCard.hover();

    // After hover, the overlay should become visible (opacity changes via group-hover)
    const hoverOverlay = contentCard.locator('[class*="group-hover\\:opacity-100"]');
    await expect(hoverOverlay.first()).toBeVisible();
  });

  // 16. Page is scrollable
  test('page is scrollable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get page height and viewport height
    const dimensions = await page.evaluate(() => ({
      pageHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    }));

    // Page content should exceed viewport height (scrollable)
    expect(dimensions.pageHeight).toBeGreaterThan(dimensions.viewportHeight);

    // Verify scrolling works
    await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
    await page.waitForTimeout(300);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });

  // 17. Mobile responsive
  test('mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should still render
    const heroHeading = page.getByRole('heading', { level: 1 });
    await expect(heroHeading).toBeVisible();

    // Desktop nav should be hidden on mobile (has hidden md:flex)
    const desktopNav = page.locator('header nav.hidden');
    await expect(desktopNav).toBeHidden();

    // Header buttons (Войти / Начать) should still be visible
    const loginLink = page.locator('header').getByRole('link', { name: 'Войти' });
    await expect(loginLink).toBeVisible();

    // CTA button in hero should be full width on mobile
    const ctaButton = page.getByRole('link', { name: /Начать бесплатно/ });
    await expect(ctaButton).toBeVisible();

    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  // 18. No JavaScript errors on load
  test('no JavaScript errors on load', async ({ page }) => {
    const jsErrors: string[] = [];

    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any deferred scripts
    await page.waitForTimeout(1000);

    // Filter out known non-critical errors (ResizeObserver, hydration warnings)
    const criticalErrors = jsErrors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('hydrat') &&
        !e.includes('Loading chunk'),
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
