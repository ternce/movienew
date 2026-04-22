import { test, expect } from '../fixtures/pages.fixture';

test.describe('About Page', () => {
  test.beforeEach(async ({ aboutPage }) => {
    await aboutPage.goto();
  });

  test.describe('Content', () => {
    test('should display hero section "О MoviePlatform"', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1 })).toContainText('MoviePlatform');
    });

    test('should show mission section', async ({ aboutPage }) => {
      await expect(aboutPage.missionSection).toBeVisible();
    });

    test('should display 6 feature cards in grid', async ({ page }) => {
      const featureTitles = [
        'Видеоконтент',
        'Партнёрская программа',
        'Бонусная система',
        'Безопасность',
        'Обучение',
        'Качество',
      ];

      for (const title of featureTitles) {
        await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
      }
    });

    test('should show contact section with email', async ({ aboutPage }) => {
      await expect(aboutPage.contactEmail).toBeVisible();
      await expect(aboutPage.contactEmail).toHaveAttribute('href', 'mailto:support@movieplatform.ru');
    });
  });

  test.describe('Structure', () => {
    test('should have proper heading hierarchy (h1 > h2)', async ({ page }) => {
      // h1 - main title
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // h2 - section titles
      const h2Headings = page.getByRole('heading', { level: 2 });
      const count = await h2Headings.count();
      expect(count).toBeGreaterThanOrEqual(2); // Mission, Features, Contact
    });

    test('should use article semantic element', async ({ page }) => {
      const article = page.locator('article');
      await expect(article).toBeVisible();
    });
  });

  test.describe('Meta', () => {
    test('should have correct page title', async ({ page }) => {
      await expect(page).toHaveTitle(/О платформе.*MoviePlatform/);
    });
  });
});
