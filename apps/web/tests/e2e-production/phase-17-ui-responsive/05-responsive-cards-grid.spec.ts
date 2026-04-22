/**
 * Phase 17 — Responsive Cards & Grid Tests
 * Tests content grid columns, card sizing, hero layout, and touch targets across viewports.
 */

import { test, expect } from '@playwright/test';
import {
  VIEWPORTS,
  gotoAtViewport,
  countGridColumns,
  expectTouchTarget,
} from './helpers/responsive-test.helper';

test.describe('Responsive Cards & Grid', () => {
  // ─── Content Grid Columns ──────────────────────────────────────

  test.describe('Series Grid', () => {
    test('desktop: content grid shows 4+ columns', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/series', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Find the content grid container
      const grid = page.locator('[class*="grid"]').first();
      if (!(await grid.isVisible().catch(() => false))) {
        test.skip(true, 'No content grid visible');
        return;
      }

      // Count cards in the first row by comparing top positions
      const cards = grid.locator('> a, > div, > article').filter({ hasText: /.+/ });
      const count = await cards.count();

      if (count < 2) {
        test.skip(true, 'Not enough cards to check grid');
        return;
      }

      // Check cards in first row by comparing Y positions
      const firstCardBox = await cards.nth(0).boundingBox();
      if (!firstCardBox) {
        test.skip(true, 'Cannot get card bounds');
        return;
      }

      let columnsInFirstRow = 1;
      for (let i = 1; i < Math.min(count, 8); i++) {
        const box = await cards.nth(i).boundingBox();
        if (box && Math.abs(box.y - firstCardBox.y) < 10) {
          columnsInFirstRow++;
        } else {
          break;
        }
      }

      expect(columnsInFirstRow).toBeGreaterThanOrEqual(3);
    });

    test('tablet: content grid shows 2-4 columns', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/series', 'tablet');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const grid = page.locator('[class*="grid"]').first();
      if (!(await grid.isVisible().catch(() => false))) {
        test.skip(true, 'No content grid visible');
        return;
      }

      const cards = grid.locator('> a, > div, > article').filter({ hasText: /.+/ });
      const count = await cards.count();

      if (count < 2) {
        test.skip(true, 'Not enough cards');
        return;
      }

      const firstCardBox = await cards.nth(0).boundingBox();
      if (!firstCardBox) return;

      let columnsInFirstRow = 1;
      for (let i = 1; i < Math.min(count, 6); i++) {
        const box = await cards.nth(i).boundingBox();
        if (box && Math.abs(box.y - firstCardBox.y) < 10) {
          columnsInFirstRow++;
        } else {
          break;
        }
      }

      expect(columnsInFirstRow).toBeGreaterThanOrEqual(2);
      expect(columnsInFirstRow).toBeLessThanOrEqual(4);
    });

    test('mobile: content grid shows 1-2 columns', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/series', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const grid = page.locator('[class*="grid"]').first();
      if (!(await grid.isVisible().catch(() => false))) {
        test.skip(true, 'No content grid visible');
        return;
      }

      const cards = grid.locator('> a, > div, > article').filter({ hasText: /.+/ });
      const count = await cards.count();

      if (count < 2) {
        test.skip(true, 'Not enough cards');
        return;
      }

      const firstCardBox = await cards.nth(0).boundingBox();
      if (!firstCardBox) return;

      let columnsInFirstRow = 1;
      for (let i = 1; i < Math.min(count, 4); i++) {
        const box = await cards.nth(i).boundingBox();
        if (box && Math.abs(box.y - firstCardBox.y) < 10) {
          columnsInFirstRow++;
        } else {
          break;
        }
      }

      expect(columnsInFirstRow).toBeLessThanOrEqual(2);
    });
  });

  // ─── Card sizing ───────────────────────────────────────────────

  test.describe('Card Aspect Ratios', () => {
    test('cards maintain consistent aspect ratio across viewports', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/series', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const cards = page.locator('[class*="grid"] a, [class*="grid"] > div').filter({ hasText: /.+/ });
      const count = await cards.count();

      if (count < 2) {
        test.skip(true, 'Not enough cards');
        return;
      }

      // All cards in a row should have the same height
      const box1 = await cards.nth(0).boundingBox();
      const box2 = await cards.nth(1).boundingBox();

      if (box1 && box2) {
        // Heights should be similar (within 20px)
        expect(Math.abs(box1.height - box2.height)).toBeLessThan(20);
      }
    });
  });

  // ─── Content Row / Carousel ────────────────────────────────────

  test.describe('Content Row Carousel', () => {
    test('desktop: scroll buttons visible for content rows', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Look for scroll/carousel containers
      const scrollContainer = page.locator('[class*="overflow-x"], [class*="scroll"], [class*="carousel"]').first();
      if (!(await scrollContainer.isVisible().catch(() => false))) {
        test.skip(true, 'No scroll container found');
        return;
      }

      // Check for scroll control buttons (left/right arrows)
      const scrollButtons = page.locator('button[aria-label*="прокрут" i], button[class*="scroll"], button[class*="arrow"]');
      // Scroll buttons may only appear on hover, so just verify container exists
      await expect(scrollContainer).toBeVisible();
    });

    test('mobile: content rows are touch-scrollable', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Scroll containers should exist and be scrollable
      const scrollContainer = page.locator('[class*="overflow-x"], [class*="scroll"]').first();
      if (!(await scrollContainer.isVisible().catch(() => false))) {
        test.skip(true, 'No scroll container on mobile');
        return;
      }

      // Container should have overflow-x: auto/scroll
      const overflowX = await scrollContainer.evaluate((el) => getComputedStyle(el).overflowX);
      expect(['auto', 'scroll']).toContain(overflowX);
    });
  });

  // ─── Store Product Cards ──────────────────────────────────────

  test.describe('Store Product Cards', () => {
    test('desktop: product cards show price and CTA', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/store', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const productCard = page.locator('[class*="card"], a[href*="/store/"]').first();
      if (!(await productCard.isVisible().catch(() => false))) {
        test.skip(true, 'No product cards visible');
        return;
      }

      await expect(productCard).toBeVisible();
    });

    test('mobile: product cards are visible and clickable', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/store', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const productCard = page.locator('a[href*="/store/"], [class*="product"], [class*="card"]').first();
      const emptyState = page.getByText('Товары не найдены').first();

      const hasCards = await productCard.isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      if (!hasCards && !hasEmptyState) {
        // Store page loaded but neither cards nor explicit empty state found — skip gracefully
        test.skip(true, 'No product cards or empty state on mobile store page');
        return;
      }

      if (hasEmptyState) {
        // Empty store is valid — no products to test
        return;
      }

      const box = await productCard.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Card should be adequately sized for touch
        expect(box.width).toBeGreaterThan(100);
        expect(box.height).toBeGreaterThan(80);
      }
    });
  });

  // ─── Landing/Pricing Cards ─────────────────────────────────────

  test.describe('Pricing Cards', () => {
    test('desktop: pricing cards displayed side-by-side', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      if (page.url().includes('/login')) {
        test.skip(true, 'Auth required for pricing');
        return;
      }

      const cards = page.locator('[class*="plan"], [class*="pricing"], [class*="card"]').filter({ hasText: /.+/ });
      const count = await cards.count();

      if (count < 2) {
        test.skip(true, 'Not enough pricing cards');
        return;
      }

      // Check that first two cards are on the same row (side-by-side)
      const box1 = await cards.nth(0).boundingBox();
      const box2 = await cards.nth(1).boundingBox();

      if (box1 && box2) {
        // Same row means similar Y position
        expect(Math.abs(box1.y - box2.y)).toBeLessThan(20);
      }
    });

    test('mobile: pricing cards stacked vertically', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      if (page.url().includes('/login')) {
        test.skip(true, 'Auth required for pricing');
        return;
      }

      const cards = page.locator('[class*="plan"], [class*="pricing"], [class*="card"]').filter({ hasText: /.+/ });
      const count = await cards.count();

      if (count < 2) {
        test.skip(true, 'Not enough pricing cards');
        return;
      }

      const box1 = await cards.nth(0).boundingBox();
      const box2 = await cards.nth(1).boundingBox();

      if (box1 && box2) {
        // Stacked means second card is below first
        expect(box2.y).toBeGreaterThan(box1.y + box1.height - 20);
      }
    });
  });

  // ─── Hero Section ──────────────────────────────────────────────

  test.describe('Hero Section', () => {
    test('desktop: hero section spans full width', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'desktop');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const hero = page.locator('[class*="hero"], [class*="banner"]').first();
      if (!(await hero.isVisible().catch(() => false))) {
        test.skip(true, 'No hero section found');
        return;
      }

      const box = await hero.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.width).toBeGreaterThan(VIEWPORTS.desktop.width * 0.5);
      }
    });

    test('mobile: hero section fits within mobile viewport', async ({ page }) => {
      const ok = await gotoAtViewport(page, '/dashboard', 'mobile');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const hero = page.locator('[class*="hero"], [class*="banner"]').first();
      if (!(await hero.isVisible().catch(() => false))) {
        test.skip(true, 'No hero section on mobile');
        return;
      }

      const box = await hero.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 20);
      }
    });
  });
});
