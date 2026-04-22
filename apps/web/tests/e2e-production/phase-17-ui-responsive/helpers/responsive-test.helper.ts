/**
 * Shared helpers for Phase 17 — UI Responsive tests.
 * Provides viewport constants, viewport switching, and touch-target assertions.
 */

import { type Page, type Locator, expect } from '@playwright/test';

// ─── Viewport definitions ───────────────────────────────────────────

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

// ─── Viewport helpers ───────────────────────────────────────────────

/**
 * Set the page viewport to a named size.
 * For mobile viewport, also emulates touch via the page context.
 */
export async function setViewport(
  page: Page,
  viewport: ViewportName
): Promise<void> {
  const size = VIEWPORTS[viewport];
  await page.setViewportSize(size);

  // Emulate touch for mobile viewport (helps CSS hover media queries)
  if (viewport === 'mobile') {
    await page.evaluate(() => {
      // Override maxTouchPoints so CSS `@media (hover: none)` works correctly
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: true });
    });
  }
}

/**
 * Navigate to a page at a specific viewport. Returns false if redirected to /login.
 */
export async function gotoAtViewport(
  page: Page,
  path: string,
  viewport: ViewportName
): Promise<boolean> {
  await setViewport(page, viewport);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  if (page.url().includes('/login')) {
    return false;
  }
  return true;
}

// ─── Touch target assertion ─────────────────────────────────────────

/**
 * Assert that an interactive element meets the minimum touch target size
 * (WCAG 2.5.8 recommends 24x24px minimum, best practice is 44-48px).
 */
export async function expectTouchTarget(
  locator: Locator,
  minSize = 44
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, 'Element should have a bounding box').toBeTruthy();
  if (box) {
    expect(
      box.width >= minSize || box.height >= minSize,
      `Touch target too small: ${box.width}x${box.height}px, need at least ${minSize}px`
    ).toBe(true);
  }
}

// ─── Responsive layout assertions ───────────────────────────────────

/**
 * Assert that an element is visible at given viewport and hidden at another.
 */
export async function expectVisibleAtViewport(
  page: Page,
  locator: Locator,
  visibleAt: ViewportName[],
  hiddenAt: ViewportName[],
  path?: string
): Promise<void> {
  for (const vp of visibleAt) {
    await setViewport(page, vp);
    if (path) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }
    await expect(locator).toBeVisible({ timeout: 5_000 });
  }

  for (const vp of hiddenAt) {
    await setViewport(page, vp);
    if (path) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }
    await expect(locator).not.toBeVisible({ timeout: 5_000 });
  }
}

/**
 * Count grid columns by comparing left offsets of child elements.
 */
export async function countGridColumns(
  page: Page,
  containerSelector: string,
  childSelector: string
): Promise<number> {
  return page.evaluate(
    ({ container, child }) => {
      const el = document.querySelector(container);
      if (!el) return 0;
      const children = el.querySelectorAll(child);
      if (children.length < 2) return children.length;

      const firstTop = children[0].getBoundingClientRect().top;
      let cols = 0;
      for (const c of children) {
        if (Math.abs(c.getBoundingClientRect().top - firstTop) < 5) {
          cols++;
        } else {
          break;
        }
      }
      return cols;
    },
    { container: containerSelector, child: childSelector }
  );
}

/**
 * Assert that an input has a font size >= minSize (prevents iOS zoom on focus).
 */
export async function expectMinFontSize(
  locator: Locator,
  minSize = 16
): Promise<void> {
  const fontSize = await locator.evaluate((el) => {
    return parseFloat(getComputedStyle(el).fontSize);
  });
  expect(
    fontSize >= minSize,
    `Font size ${fontSize}px is below minimum ${minSize}px (causes iOS zoom)`
  ).toBe(true);
}

// ─── Mobile-specific locators ───────────────────────────────────────

export const MOBILE = {
  /** Bottom navigation bar */
  bottomNav: 'nav[class*="fixed"][class*="bottom"], nav[class*="bottom-nav"]',
  /** Hamburger menu button */
  hamburger: 'button[aria-label*="меню" i], button[aria-label*="menu" i]',
  /** Mobile search button */
  searchButton: 'button[aria-label*="поиск" i], button[aria-label*="search" i]',
} as const;
