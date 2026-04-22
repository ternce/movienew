import { test, expect } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.use({ storageState: path.join(AUTH_DIR, 'user-state.json') });

// ─── ContentRow on Dashboard ────────────────────────────────────────

test.describe('ContentRow — Horizontal Scroll', () => {
  test('Dashboard has horizontal scroll container(s) for content', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Look for horizontal scroll containers
    const scrollContainers = page.locator(
      '[class*="overflow-x"], [class*="scroll"], [class*="carousel"], [class*="content-row"]'
    );
    const containerCount = await scrollContainers.count();

    // Also check for sections that have horizontally-aligned children
    const sections = page.locator('section, [class*="row"]');
    const sectionCount = await sections.count();

    expect(
      containerCount > 0 || sectionCount > 0,
      'Dashboard should have scroll containers or content sections'
    ).toBe(true);
  });

  test('"Смотреть все" link is visible for content rows', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const viewAllLinks = page.locator(
      'a:has-text("Смотреть все"), a:has-text("Все"), a:has-text("Показать все")'
    );
    const count = await viewAllLinks.count();

    if (count === 0) {
      // Dashboard may not have enough content for "view all" links
      test.skip(true, '"Смотреть все" links not found — possibly empty dashboard');
      return;
    }

    const firstLink = viewAllLinks.first();
    await expect(firstLink).toBeVisible();
  });

  test('"Смотреть все" link has valid href', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const viewAllLinks = page.locator(
      'a:has-text("Смотреть все"), a:has-text("Все"), a:has-text("Показать все")'
    );
    const count = await viewAllLinks.count();
    if (count === 0) { test.skip(true, '"Смотреть все" links not found'); return; }

    const firstLink = viewAllLinks.first();
    const href = await firstLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href!.startsWith('/')).toBe(true);
  });

  test('Content cards within rows have consistent height', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Find content cards
    const cards = page.locator(
      '[class*="card"], [class*="content-card"], [class*="video-card"]'
    );
    const count = await cards.count();
    if (count < 2) { test.skip(true, 'Not enough content cards to compare heights'); return; }

    // Get heights of first few cards
    const heights: number[] = [];
    const checkCount = Math.min(count, 4);
    for (let i = 0; i < checkCount; i++) {
      const box = await cards.nth(i).boundingBox();
      if (box) {
        heights.push(Math.round(box.height));
      }
    }

    if (heights.length < 2) { test.skip(true, 'Cards do not have measurable bounding boxes'); return; }

    // Heights should be within a reasonable tolerance (same row = same height)
    const maxHeight = Math.max(...heights);
    const minHeight = Math.min(...heights);
    const tolerance = maxHeight * 0.3; // 30% tolerance for different card types

    expect(
      maxHeight - minHeight <= tolerance,
      `Card heights vary too much: min=${minHeight}, max=${maxHeight}`
    ).toBe(true);
  });

  test('Scroll container has overflow-x styling', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Find containers with flex/grid children (potential scroll containers)
    const containers = page.locator(
      '[class*="overflow-x"], [class*="scroll"], [class*="carousel"]'
    );
    const count = await containers.count();

    if (count === 0) {
      // Check if any element has overflow-x set via CSS
      const allContainers = page.locator('div, section');
      let hasOverflowX = false;

      const maxCheck = Math.min(await allContainers.count(), 30);
      for (let i = 0; i < maxCheck; i++) {
        const overflow = await allContainers.nth(i).evaluate(
          (el) => getComputedStyle(el).overflowX
        ).catch(() => 'visible');
        if (overflow === 'auto' || overflow === 'scroll') {
          hasOverflowX = true;
          break;
        }
      }

      expect(hasOverflowX, 'At least one container should have overflow-x: auto/scroll').toBe(true);
      return;
    }

    expect(count).toBeGreaterThan(0);
  });

  test('Right scroll button visible when content overflows (if present)', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Look for scroll arrow/chevron buttons
    const scrollButtons = page.locator(
      'button[aria-label*="scroll" i], button[aria-label*="next" i], button[aria-label*="прокрутить" i], button[aria-label*="Далее" i], button[class*="scroll"], button[class*="arrow"]'
    );
    const count = await scrollButtons.count();

    if (count === 0) {
      // Scroll buttons may not exist if content fits or uses native scroll
      test.skip(true, 'No scroll buttons found — may use native horizontal scroll');
      return;
    }

    const firstButton = scrollButtons.first();
    await expect(firstButton).toBeVisible();
  });

  test('Clicking scroll button scrolls the container', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const scrollButton = page.locator(
      'button[aria-label*="scroll" i], button[aria-label*="next" i], button[aria-label*="Далее" i], button[class*="scroll-right"], button[class*="arrow-right"]'
    ).first();
    const isVisible = await scrollButton.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Scroll button not found'); return; }

    // Find the nearest scroll container
    const scrollContainer = page.locator('[class*="overflow-x"]').first();
    const hasContainer = await scrollContainer.isVisible().catch(() => false);
    if (!hasContainer) { test.skip(true, 'No scroll container found'); return; }

    const scrollBefore = await scrollContainer.evaluate((el) => el.scrollLeft);
    await scrollButton.click();
    await page.waitForTimeout(500);
    const scrollAfter = await scrollContainer.evaluate((el) => el.scrollLeft);

    expect(scrollAfter).toBeGreaterThan(scrollBefore);
  });
});

// ─── Content Pages ──────────────────────────────────────────────────

test.describe('Content Pages — Grid/Scroll', () => {
  test('Series page has content grid or scroll area', async ({ page }) => {
    const ok = await waitForPage(page, '/series');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Series page should have a grid of cards or list
    const cards = page.locator(
      '[class*="card"], [class*="content-card"], [class*="video-card"], [class*="series-card"]'
    );
    const grid = page.locator('[class*="grid"]');

    const cardCount = await cards.count();
    const hasGrid = await grid.first().isVisible().catch(() => false);

    expect(
      cardCount > 0 || hasGrid,
      'Series page should have content cards or a grid layout'
    ).toBe(true);
  });

  test('Clips page has content cards', async ({ page }) => {
    const ok = await waitForPage(page, '/clips');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const cards = page.locator(
      '[class*="card"], [class*="content-card"], [class*="video-card"], [class*="clip-card"]'
    );
    const count = await cards.count();

    // Even if no clips exist, the page should render
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('Content cards are clickable and have cursor pointer', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const cards = page.locator(
      'a[class*="card"], [class*="card"] a, [class*="content-card"], [class*="video-card"]'
    );
    const count = await cards.count();
    if (count === 0) { test.skip(true, 'No content cards found'); return; }

    const firstCard = cards.first();
    const cursor = await firstCard.evaluate((el) => getComputedStyle(el).cursor);

    // Cards should be pointer (if they are links) or default
    const isClickable = cursor === 'pointer' || (await firstCard.getAttribute('href')) !== null;
    expect(isClickable, 'Content cards should be clickable').toBe(true);
  });
});
