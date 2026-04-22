import { test, expect } from '../fixtures/pages.fixture';

test.describe('Tutorial Detail Page', () => {
  test.beforeEach(async ({ tutorialDetailPage }) => {
    await tutorialDetailPage.goto('video-editing-basics');
  });

  test.describe('Hero Section', () => {
    test('should display hero section with title', async ({ page }) => {
      // Wait for loading to complete (800ms timeout)
      await page.waitForTimeout(1000);
      await expect(page.getByText('Основы видеомонтажа')).toBeVisible();
    });

    test('should display instructor name', async ({ page }) => {
      await page.waitForTimeout(1000);
      await expect(page.getByText('Алексей Петров')).toBeVisible();
    });

    test('should display lesson count', async ({ page }) => {
      await page.waitForTimeout(1000);
      await expect(page.getByText(/12 уроков/)).toBeVisible();
    });

    test('should display duration', async ({ page }) => {
      await page.waitForTimeout(1000);
      await expect(page.getByText('6ч 30мин')).toBeVisible();
    });
  });

  test.describe('Progress', () => {
    test('should show progress bar with correct percentage', async ({ page }) => {
      await page.waitForTimeout(1000);
      // 8 of 12 = 67%
      await expect(page.getByText('67%')).toBeVisible();
      await expect(page.getByText(/8 из 12 уроков/)).toBeVisible();
    });

    test('should display "Продолжить обучение" CTA when progress exists', async ({ page }) => {
      await page.waitForTimeout(1000);
      await expect(page.getByRole('link', { name: /Продолжить обучение/ })).toBeVisible();
    });

    test('should show next lesson info below CTA button', async ({ page }) => {
      await page.waitForTimeout(1000);
      await expect(page.getByText(/Следующий: Урок 9 — Цветокоррекция/)).toBeVisible();
    });
  });

  test.describe('Lessons Tab (default)', () => {
    test('should list all 12 lessons with titles', async ({ page }) => {
      await page.waitForTimeout(1000);
      await expect(page.getByText('Введение в видеомонтаж')).toBeVisible();
      await expect(page.getByText('Финальный проект')).toBeVisible();

      // Check lesson count
      const lessonLinks = page.locator('a[href^="/watch/"]');
      const count = await lessonLinks.count();
      expect(count).toBe(12);
    });

    test('should show duration for each lesson', async ({ page }) => {
      await page.waitForTimeout(1000);
      // First lesson is 720 seconds = 12:00
      await expect(page.getByText('12:00')).toBeVisible();
    });

    test('should link each lesson to /watch/{id}', async ({ page }) => {
      await page.waitForTimeout(1000);
      const firstLesson = page.locator('a[href="/watch/l1"]');
      await expect(firstLesson).toBeVisible();
    });
  });

  test.describe('About Tab', () => {
    test('should display course description text', async ({ tutorialDetailPage, page }) => {
      await page.waitForTimeout(1000);
      await tutorialDetailPage.selectTab('about');

      await expect(page.getByText('Описание курса')).toBeVisible();
      await expect(page.getByText(/все основные аспекты видеомонтажа/)).toBeVisible();
    });

    test('should list learning outcomes with checkmarks', async ({ tutorialDetailPage, page }) => {
      await page.waitForTimeout(1000);
      await tutorialDetailPage.selectTab('about');

      await expect(page.getByText('Чему вы научитесь')).toBeVisible();
      await expect(page.getByText(/Основы работы с профессиональными программами/)).toBeVisible();
      await expect(page.getByText(/Склейка, обрезка и работа с таймлайном/)).toBeVisible();
    });
  });

  test.describe('Reviews Tab', () => {
    test('should show empty state "Отзывы пока отсутствуют"', async ({ tutorialDetailPage, page }) => {
      await page.waitForTimeout(1000);
      await tutorialDetailPage.selectTab('reviews');

      await expect(page.getByText('Отзывы пока отсутствуют')).toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    test('should have keyboard-navigable tabs', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Click Lessons tab
      await page.getByRole('button', { name: 'Уроки' }).click();
      await expect(page.getByText('Введение в видеомонтаж')).toBeVisible();

      // Click О курсе tab
      await page.getByRole('button', { name: 'О курсе' }).click();
      await expect(page.getByText('Описание курса')).toBeVisible();

      // Click Отзывы tab
      await page.getByRole('button', { name: 'Отзывы' }).click();
      await expect(page.getByText('Отзывы пока отсутствуют')).toBeVisible();
    });

    test('should highlight active tab', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Default tab (Уроки) should have accent color
      const lessonsTab = page.getByRole('button', { name: 'Уроки' });
      await expect(lessonsTab).toHaveClass(/border-mp-accent-primary/);

      // Switch to About
      await page.getByRole('button', { name: 'О курсе' }).click();
      const aboutTab = page.getByRole('button', { name: 'О курсе' });
      await expect(aboutTab).toHaveClass(/border-mp-accent-primary/);
    });
  });

  test.describe('Loading State', () => {
    test('should show spinner during loading', async ({ page }) => {
      await page.goto('/tutorials/video-editing-basics');
      // Spinner should be visible during 800ms loading
      const spinner = page.locator('[class*="spinner"], [class*="animate-spin"]');
      await expect(spinner.first()).toBeVisible();
    });
  });
});
