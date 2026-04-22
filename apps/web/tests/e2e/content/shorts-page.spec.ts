import { test, expect } from '../fixtures/pages.fixture';

test.describe('Shorts Page', () => {
  test.beforeEach(async ({ shortsPage }) => {
    await shortsPage.goto();
  });

  test.describe('Display', () => {
    test('should display short cards with scroll snap', async ({ shortsPage }) => {
      const cards = await shortsPage.shortCards.count();
      expect(cards).toBe(5);
    });

    test('should display creator name and title on each short', async ({ page }) => {
      await expect(page.getByText('За кадром: Ночной Патруль')).toBeVisible();
      await expect(page.getByText('@movieplatform').first()).toBeVisible();
    });

    test('should show like, comment, share buttons', async ({ page }) => {
      const likeButtons = page.getByRole('button', { name: 'Нравится' });
      const commentButtons = page.getByRole('button', { name: 'Комментарии' });
      const shareButtons = page.getByRole('button', { name: 'Поделиться' });

      await expect(likeButtons.first()).toBeVisible();
      await expect(commentButtons.first()).toBeVisible();
      await expect(shareButtons.first()).toBeVisible();
    });
  });

  test.describe('Navigation Controls', () => {
    test('should have next/prev buttons on the right side', async ({ shortsPage }) => {
      await expect(shortsPage.prevButton).toBeVisible();
      await expect(shortsPage.nextButton).toBeVisible();
    });

    test('should have progress dots', async ({ shortsPage }) => {
      const dots = await shortsPage.progressDots.count();
      expect(dots).toBe(5);
    });

    test('should disable prev button at first short', async ({ shortsPage }) => {
      // First short is active by default
      await expect(shortsPage.prevButton).toBeDisabled();
    });

    test('should enable next button at first short', async ({ shortsPage }) => {
      await expect(shortsPage.nextButton).not.toBeDisabled();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should respond to ArrowDown key', async ({ page }) => {
      // Press ArrowDown to go to next short
      await page.keyboard.press('ArrowDown');
      // Scrolling happens, verify the next button state didn't crash
      await page.waitForTimeout(500);
      // Prev button should now be enabled (moved to index 1)
      const prevButton = page.getByRole('button', { name: 'Предыдущее видео' });
      await expect(prevButton).not.toBeDisabled();
    });

    test('should respond to ArrowUp key', async ({ page }) => {
      // First go down
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);
      // Then go back up
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(500);
      // Should be back at first position
      const prevButton = page.getByRole('button', { name: 'Предыдущее видео' });
      await expect(prevButton).toBeDisabled();
    });

    test('should respond to j key (next)', async ({ page }) => {
      await page.keyboard.press('j');
      await page.waitForTimeout(500);
      const prevButton = page.getByRole('button', { name: 'Предыдущее видео' });
      await expect(prevButton).not.toBeDisabled();
    });

    test('should respond to k key (prev)', async ({ page }) => {
      // First go down
      await page.keyboard.press('j');
      await page.waitForTimeout(500);
      // Then go back up with k
      await page.keyboard.press('k');
      await page.waitForTimeout(500);
      const prevButton = page.getByRole('button', { name: 'Предыдущее видео' });
      await expect(prevButton).toBeDisabled();
    });
  });

  test.describe('Progress Dots', () => {
    test('should have progress dot aria labels', async ({ page }) => {
      const dot1 = page.getByRole('button', { name: 'Перейти к видео 1' });
      const dot5 = page.getByRole('button', { name: 'Перейти к видео 5' });
      await expect(dot1).toBeVisible();
      await expect(dot5).toBeVisible();
    });
  });
});
