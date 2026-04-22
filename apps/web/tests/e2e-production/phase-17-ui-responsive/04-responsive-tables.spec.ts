/**
 * Phase 17 — Responsive Table Tests
 * Tests DataTable layout, column visibility, and card view transitions across viewports.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import {
  VIEWPORTS,
  gotoAtViewport,
  setViewport,
} from './helpers/responsive-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.describe('Responsive Tables', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

  // ─── Desktop table rendering ────────────────────────────────────

  test('desktop: DataTable renders as HTML table', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/content', 'desktop');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Should have thead and tbody
    const thead = table.locator('thead');
    const tbody = table.locator('tbody');
    await expect(thead).toBeVisible();
    await expect(tbody).toBeVisible();
  });

  test('desktop: table has multiple visible columns', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/content', 'desktop');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const headerCells = table.locator('thead th, thead td');
    const columnCount = await headerCells.count();
    expect(columnCount).toBeGreaterThanOrEqual(3);
  });

  // ─── Tablet behavior ───────────────────────────────────────────

  test('tablet: table or card view is visible', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/content', 'tablet');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // On tablet, should still show table or switch to card view
    const table = page.locator('table').first();
    const cardView = page.locator('[class*="card-view"], [class*="grid"]').first();

    const hasTable = await table.isVisible().catch(() => false);
    const hasCards = await cardView.isVisible().catch(() => false);

    expect(hasTable || hasCards, 'Should show table or card view on tablet').toBe(true);
  });

  test('tablet: no horizontal overflow on table page', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/content', 'tablet');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    await page.waitForTimeout(3000);

    // Table may have horizontal scroll container, which is acceptable
    // But the page itself should not overflow
    const pageOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });

    // Page-level overflow is not acceptable (table scroll container is fine)
    expect(pageOverflow).toBe(false);
  });

  // ─── Mobile behavior ───────────────────────────────────────────

  test('mobile: content adapts to mobile width', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/content', 'mobile');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // On mobile, might show card view or horizontally scrollable table
    const main = page.locator('main, [class*="content"]').first();
    await expect(main).toBeVisible();

    const box = await main.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 20);
    }
  });

  test('mobile: search/filter toolbar stacks', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/content', 'mobile');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Find search input and filter buttons
    const searchInput = page.locator('input[placeholder*="Поиск" i], input[placeholder*="search" i]').first();
    if (!(await searchInput.isVisible().catch(() => false))) {
      test.skip(true, 'Search input not visible on mobile');
      return;
    }

    const box = await searchInput.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Search should take significant width on mobile
      expect(box.width).toBeGreaterThan(VIEWPORTS.mobile.width * 0.5);
    }
  });

  // ─── Pagination across viewports ───────────────────────────────

  test('desktop: pagination shows full controls', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/content', 'desktop');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const pagination = page.locator('[class*="pagination"], nav[aria-label*="pagination"]').first();
    if (!(await pagination.isVisible().catch(() => false))) {
      test.skip(true, 'No pagination visible');
      return;
    }

    // Should show page numbers or navigation buttons
    const buttons = pagination.locator('button, a');
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test('mobile: pagination controls fit within viewport', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/content', 'mobile');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const pagination = page.locator('[class*="pagination"], nav[aria-label*="pagination"]').first();
    if (!(await pagination.isVisible().catch(() => false))) {
      test.skip(true, 'No pagination visible on mobile');
      return;
    }

    const box = await pagination.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(VIEWPORTS.mobile.width);
    }
  });

  // ─── Users table across viewports ──────────────────────────────

  test('desktop: users table renders at /admin/users', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/users', 'desktop');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    const cardView = page.locator('[class*="card"], [class*="grid"]').first();

    const hasContent = (await table.isVisible().catch(() => false)) ||
                       (await cardView.isVisible().catch(() => false));
    expect(hasContent).toBe(true);
  });

  test('mobile: users page content fits viewport', async ({ page }) => {
    const ok = await gotoAtViewport(page, '/admin/users', 'mobile');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const main = page.locator('main, [class*="content"]').first();
    await expect(main).toBeVisible();

    // No page-level horizontal overflow
    const pageOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });
    expect(pageOverflow).toBe(false);
  });
});
