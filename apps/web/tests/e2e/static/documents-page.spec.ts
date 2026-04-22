import { test, expect } from '../fixtures/pages.fixture';

test.describe('Documents Page', () => {
  test.describe('Valid Document Types', () => {
    test('should render user agreement at /documents/terms', async ({ documentPage, page }) => {
      await documentPage.goto('terms');
      await page.waitForTimeout(600);
      await expect(page.getByText('Пользовательское соглашение')).toBeVisible();
    });

    test('should render privacy policy at /documents/privacy', async ({ documentPage, page }) => {
      await documentPage.goto('privacy');
      await page.waitForTimeout(600);
      await expect(page.getByText('Политика конфиденциальности')).toBeVisible();
    });

    test('should render public offer at /documents/offer', async ({ documentPage, page }) => {
      await documentPage.goto('offer');
      await page.waitForTimeout(600);
      await expect(page.getByText('Публичная оферта')).toBeVisible();
    });

    test('should render partner agreement at /documents/partner', async ({ documentPage, page }) => {
      await documentPage.goto('partner');
      await page.waitForTimeout(600);
      await expect(page.getByText('Партнёрское соглашение')).toBeVisible();
    });
  });

  test.describe('Document Content', () => {
    test('should display document title and content', async ({ documentPage, page }) => {
      await documentPage.goto('terms');
      await page.waitForTimeout(600);

      // Title
      await expect(documentPage.heading).toHaveText('Пользовательское соглашение');

      // Content from placeholder
      await expect(page.getByText(/Общие положения/)).toBeVisible();
      await expect(page.getByText(/Предмет соглашения/)).toBeVisible();
    });

    test('should show version info', async ({ documentPage, page }) => {
      await documentPage.goto('terms');
      await page.waitForTimeout(600);
      await expect(page.getByText(/Версия 1.0/)).toBeVisible();
    });
  });

  test.describe('Invalid Document Type', () => {
    test('should show "Документ не найден" for unknown document type', async ({ documentPage }) => {
      await documentPage.goto('nonexistent');
      await expect(documentPage.notFoundMessage).toBeVisible();
    });
  });

  test.describe('Loading State', () => {
    test('should show loading spinner initially', async ({ page }) => {
      await page.goto('/documents/terms');
      // Spinner appears during 500ms loading period
      const spinner = page.locator('[class*="spinner"], [class*="animate-spin"]');
      await expect(spinner.first()).toBeVisible();
    });
  });
});
