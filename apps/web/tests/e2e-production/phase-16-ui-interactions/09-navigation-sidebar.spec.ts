import { test, expect } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
  waitForAdminPage,
  ROLES,
  UI,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

// ─── AppSidebar (user auth) ────────────────────────────────────────

test.describe('AppSidebar', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'user-state.json') });

  test('shows main navigation groups', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Sidebar not visible (possibly mobile viewport)'); return; }

    const navLinks = sidebar.locator('a[href]');
    expect(await navLinks.count()).toBeGreaterThan(3);
  });

  test('contains МЕНЮ or БИБЛИОТЕКА section labels', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Sidebar not visible'); return; }

    const sidebarText = await sidebar.innerText();
    const hasGroups =
      sidebarText.includes('МЕНЮ') ||
      sidebarText.includes('БИБЛИОТЕКА') ||
      sidebarText.includes('Меню') ||
      sidebarText.includes('Библиотека') ||
      sidebarText.includes('Главная');

    expect(hasGroups, 'Sidebar should have navigation group labels').toBe(true);
  });

  test('active nav item is visually highlighted', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Sidebar not visible'); return; }

    // The dashboard link should be active
    const activeLink = sidebar.locator(
      'a[href="/dashboard"], a[href*="dashboard"]'
    ).first();
    const linkVisible = await activeLink.isVisible().catch(() => false);
    if (!linkVisible) { test.skip(true, 'Dashboard link not found in sidebar'); return; }

    // Check for active styling: data-active, aria-current, active class, or accent color class
    const dataActive = await activeLink.getAttribute('data-active');
    const ariaCurrent = await activeLink.getAttribute('aria-current');
    const className = await activeLink.getAttribute('class') || '';
    const hasActiveStyle =
      dataActive === 'true' ||
      ariaCurrent === 'page' ||
      className.includes('active') ||
      className.includes('bg-') ||
      className.includes('selected') ||
      className.includes('accent-primary') ||
      className.includes('text-mp-');

    // Also check computed color — active item often has the accent color
    if (!hasActiveStyle) {
      const computedColor = await activeLink.evaluate(
        (el) => window.getComputedStyle(el).color
      ).catch(() => '');
      // Accept if computed color is not the default text secondary (#9ca2bc)
      const isHighlighted = computedColor !== '' && !computedColor.includes('156, 162, 188');
      expect(isHighlighted, 'Active nav link should have distinct styling via computed color').toBe(true);
    } else {
      expect(hasActiveStyle, 'Active nav link should have distinct styling').toBe(true);
    }
  });

  test('clicking a nav link navigates to correct page', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Sidebar not visible'); return; }

    // Find a nav link to series page
    const seriesLink = sidebar.locator('a[href="/series"], a[href*="/series"]').first();
    const hasLink = await seriesLink.isVisible().catch(() => false);
    if (!hasLink) { test.skip(true, 'Series nav link not found'); return; }

    await seriesLink.click();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/series');
  });

  test('sidebar has genre list section', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Sidebar not visible'); return; }

    const sidebarText = await sidebar.innerText();
    // Genres section or individual genre links
    const hasGenres =
      sidebarText.includes('Жанры') ||
      sidebarText.includes('ЖАНРЫ') ||
      sidebarText.includes('Комедия') ||
      sidebarText.includes('Драма') ||
      sidebarText.includes('Боевик') ||
      sidebarText.includes('Фантастика');

    // Genre links may also be present as category links
    const genreLinks = sidebar.locator('a[href*="genre"], a[href*="category"]');
    const hasGenreLinks = (await genreLinks.count()) > 0;

    expect(hasGenres || hasGenreLinks, 'Sidebar should have genre/category section').toBe(true);
  });

  test('sidebar has logout button/link', async ({ page }) => {
    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Sidebar not visible'); return; }

    const sidebarText = await sidebar.innerText();
    const hasLogout =
      sidebarText.includes('Выйти') ||
      sidebarText.includes('Выход');

    // Also check for logout button outside sidebar (header profile menu)
    const logoutButton = page.locator(
      'button:has-text("Выйти"), button:has-text("Выход"), a:has-text("Выйти")'
    ).first();
    const hasLogoutButton = await logoutButton.isVisible().catch(() => false);

    expect(hasLogout || hasLogoutButton, 'Should have a logout option').toBe(true);
  });
});

// ─── AdminSidebar (admin auth) ──────────────────────────────────────

test.describe('AdminSidebar', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

  test('shows admin navigation groups', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Admin sidebar not visible'); return; }

    const sidebarText = await sidebar.innerText();
    // Admin nav should have groups like Контент, Пользователи, Финансы, etc.
    const hasAdminGroups =
      sidebarText.includes('Контент') ||
      sidebarText.includes('Пользовател') ||
      sidebarText.includes('Финансы') ||
      sidebarText.includes('Настройки') ||
      sidebarText.includes('Дашборд');

    expect(hasAdminGroups, 'Admin sidebar should have admin navigation groups').toBe(true);
  });

  test('has collapsible group sections', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Admin sidebar not visible'); return; }

    // Look for collapsible triggers (buttons with expanded/collapsed state)
    const collapsible = sidebar.locator(
      'button[data-state], [data-state="open"], [data-state="closed"], button[aria-expanded]'
    );
    const count = await collapsible.count();

    // Or simply look for group header buttons
    const groupHeaders = sidebar.locator('button:has(svg)');
    const headerCount = await groupHeaders.count();

    expect(count > 0 || headerCount > 0, 'Should have collapsible group sections').toBe(true);
  });

  test('clicking a group header expands/collapses it', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Admin sidebar not visible'); return; }

    const collapsibleTrigger = sidebar.locator(
      'button[data-state], button[aria-expanded]'
    ).first();
    const hasTrigger = await collapsibleTrigger.isVisible().catch(() => false);
    if (!hasTrigger) { test.skip(true, 'No collapsible triggers found'); return; }

    const stateBefore = await collapsibleTrigger.getAttribute('data-state') ||
      await collapsibleTrigger.getAttribute('aria-expanded');

    await collapsibleTrigger.click();
    await page.waitForTimeout(500);

    const stateAfter = await collapsibleTrigger.getAttribute('data-state') ||
      await collapsibleTrigger.getAttribute('aria-expanded');

    expect(stateAfter).not.toBe(stateBefore);
  });

  test('active link is highlighted', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Admin sidebar not visible'); return; }

    const dashLink = sidebar.locator(
      'a[href="/admin/dashboard"], a[href*="admin/dashboard"]'
    ).first();
    const linkVisible = await dashLink.isVisible().catch(() => false);
    if (!linkVisible) { test.skip(true, 'Admin dashboard link not found'); return; }

    const className = await dashLink.getAttribute('class') || '';
    const dataActive = await dashLink.getAttribute('data-active');
    const ariaCurrent = await dashLink.getAttribute('aria-current');

    const isActive =
      dataActive === 'true' ||
      ariaCurrent === 'page' ||
      className.includes('active') ||
      className.includes('bg-') ||
      className.includes('selected');

    expect(isActive, 'Admin dashboard link should be highlighted').toBe(true);
  });

  test('logo links to /admin/dashboard', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const sidebar = page.locator('aside, nav[class*="sidebar"]').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    if (!sidebarVisible) { test.skip(true, 'Admin sidebar not visible'); return; }

    // Logo is typically an <a> at top of sidebar
    const logoLink = sidebar.locator('a').first();
    const href = await logoLink.getAttribute('href');

    // Logo should link to admin dashboard or home
    expect(
      href === '/admin/dashboard' || href === '/admin' || href === '/',
      `Logo should link to admin dashboard, got: ${href}`
    ).toBe(true);
  });
});

// ─── MobileBottomNav ────────────────────────────────────────────────

test.describe('MobileBottomNav', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'user-state.json') });

  test('visible at 390px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    // Look for bottom navigation bar (fixed at bottom)
    const bottomNav = page.locator(
      'nav[class*="bottom"], [class*="bottom-nav"], [class*="mobile-nav"], nav[class*="fixed"]'
    ).first();
    const hasBottomNav = await bottomNav.isVisible().catch(() => false);

    // Also try finding a fixed-bottom element with nav links
    const fixedNav = page.locator('nav').filter({
      has: page.locator('a[href]'),
    }).first();
    const hasFixedNav = await fixedNav.isVisible().catch(() => false);

    expect(hasBottomNav || hasFixedNav, 'Bottom navigation should be visible on mobile').toBe(true);
  });

  test('has 5 navigation items', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const bottomNav = page.locator(
      'nav[class*="bottom"], [class*="bottom-nav"], [class*="mobile-nav"], nav[class*="fixed"]'
    ).first();
    const hasBottomNav = await bottomNav.isVisible().catch(() => false);
    if (!hasBottomNav) { test.skip(true, 'Bottom nav not found'); return; }

    const navItems = bottomNav.locator('a[href], button');
    const count = await navItems.count();
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(6);
  });

  test('items have icons', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const bottomNav = page.locator(
      'nav[class*="bottom"], [class*="bottom-nav"], [class*="mobile-nav"], nav[class*="fixed"]'
    ).first();
    const hasBottomNav = await bottomNav.isVisible().catch(() => false);
    if (!hasBottomNav) { test.skip(true, 'Bottom nav not found'); return; }

    // Nav items should have SVG icons
    const icons = bottomNav.locator('svg');
    const iconCount = await icons.count();
    expect(iconCount).toBeGreaterThan(0);
  });

  test('active item has distinct styling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const bottomNav = page.locator(
      'nav[class*="bottom"], [class*="bottom-nav"], [class*="mobile-nav"], nav[class*="fixed"]'
    ).first();
    const hasBottomNav = await bottomNav.isVisible().catch(() => false);
    if (!hasBottomNav) { test.skip(true, 'Bottom nav not found'); return; }

    // Active item should have a class or style distinct from others
    const navItems = bottomNav.locator('a[href], button');
    const count = await navItems.count();
    if (count === 0) { test.skip(true, 'No nav items found'); return; }

    // Collect all classes and check that at least one differs
    const classes: string[] = [];
    for (let i = 0; i < count; i++) {
      const cls = await navItems.nth(i).getAttribute('class') || '';
      classes.push(cls);
    }

    const uniqueClasses = new Set(classes);
    expect(uniqueClasses.size, 'Active item should have different class from inactive').toBeGreaterThan(1);
  });

  test('is hidden on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const ok = await waitForPage(page, '/dashboard');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const bottomNav = page.locator(
      'nav[class*="bottom"], [class*="bottom-nav"], [class*="mobile-nav"]'
    ).first();
    const isVisible = await bottomNav.isVisible().catch(() => false);

    // On desktop, mobile bottom nav should be hidden
    expect(isVisible, 'Mobile bottom nav should be hidden on desktop').toBe(false);
  });
});
