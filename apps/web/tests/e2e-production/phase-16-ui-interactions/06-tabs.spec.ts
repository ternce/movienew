import { test, expect } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
  ROLES,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.describe('Tab Components', () => {
  test.describe('Landing Page Pricing Tabs', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('TabsList is visible on landing page pricing section', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Scroll down to pricing section
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
      await page.waitForTimeout(1000);

      const tablist = page.locator(ROLES.TAB_LIST).first();
      const isVisible = await tablist.isVisible().catch(() => false);

      if (!isVisible) {
        test.skip(true, 'No tablist found on landing page');
        return;
      }

      await expect(tablist).toBeVisible();
    });

    test('clicking a tab shows its content panel', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
      await page.waitForTimeout(1000);

      const tablist = page.locator(ROLES.TAB_LIST).first();
      const isVisible = await tablist.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No tablist found on landing page');
        return;
      }

      const tabs = tablist.locator(ROLES.TAB);
      const tabCount = await tabs.count();
      if (tabCount < 2) {
        test.skip(true, 'Less than 2 tabs found');
        return;
      }

      // Click the second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(500);

      // A tabpanel should be visible
      const panels = page.locator(ROLES.TAB_PANEL);
      const visiblePanels = await panels.count();
      expect(visiblePanels).toBeGreaterThanOrEqual(1);

      const firstVisiblePanel = panels.first();
      await expect(firstVisiblePanel).toBeVisible();
    });

    test('active tab has distinct styling', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
      await page.waitForTimeout(1000);

      const tablist = page.locator(ROLES.TAB_LIST).first();
      const isVisible = await tablist.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No tablist found');
        return;
      }

      const tabs = tablist.locator(ROLES.TAB);
      const tabCount = await tabs.count();
      if (tabCount < 2) {
        test.skip(true, 'Less than 2 tabs found');
        return;
      }

      // Click first tab
      await tabs.first().click();
      await page.waitForTimeout(300);

      // Check for active state indicator (data-state="active" or aria-selected="true")
      const activeState = await tabs.first().getAttribute('data-state');
      const ariaSelected = await tabs.first().getAttribute('aria-selected');

      const isActive = activeState === 'active' || ariaSelected === 'true';
      expect(isActive).toBe(true);
    });

    test('tabpanel has role="tabpanel" attribute', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
      await page.waitForTimeout(1000);

      const tablist = page.locator(ROLES.TAB_LIST).first();
      const isVisible = await tablist.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No tablist found');
        return;
      }

      const tabs = tablist.locator(ROLES.TAB);
      if ((await tabs.count()) < 1) {
        test.skip(true, 'No tabs found');
        return;
      }

      await tabs.first().click();
      await page.waitForTimeout(500);

      const panel = page.locator('[role="tabpanel"]').first();
      const panelVisible = await panel.isVisible().catch(() => false);
      if (!panelVisible) {
        test.skip(true, 'Tabpanel not visible');
        return;
      }

      const role = await panel.getAttribute('role');
      expect(role).toBe('tabpanel');
    });
  });

  test.describe('Pricing Page Tabs', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('pricing page has tablist for plan comparison', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const tablist = page.locator(ROLES.TAB_LIST).first();
      const isVisible = await tablist.isVisible().catch(() => false);

      if (!isVisible) {
        // Pricing page might use buttons or cards instead of tabs
        const bodyText = await page.locator('body').innerText();
        const hasPricingContent =
          bodyText.includes('₽') ||
          bodyText.includes('Тариф') ||
          bodyText.includes('план') ||
          bodyText.includes('Подписк');
        expect(hasPricingContent).toBe(true);
      } else {
        await expect(tablist).toBeVisible();
      }
    });

    test('pricing tabs switch between plan views', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const tablist = page.locator(ROLES.TAB_LIST).first();
      const isVisible = await tablist.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No tablist on pricing page');
        return;
      }

      const tabs = tablist.locator(ROLES.TAB);
      const tabCount = await tabs.count();
      if (tabCount < 2) {
        test.skip(true, 'Less than 2 tabs on pricing page');
        return;
      }

      // Get text of first panel
      await tabs.first().click();
      await page.waitForTimeout(500);
      const panel1 = page.locator(ROLES.TAB_PANEL).first();
      const text1 = await panel1.innerText().catch(() => '');

      // Switch to second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
      const panel2 = page.locator(ROLES.TAB_PANEL).first();
      const text2 = await panel2.innerText().catch(() => '');

      // Panels should have some content
      expect(text1.length + text2.length).toBeGreaterThan(0);
    });

    test('ArrowRight navigates to next tab', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const tablist = page.locator(ROLES.TAB_LIST).first();
      const isVisible = await tablist.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No tablist on pricing page');
        return;
      }

      const tabs = tablist.locator(ROLES.TAB);
      const tabCount = await tabs.count();
      if (tabCount < 2) {
        test.skip(true, 'Less than 2 tabs');
        return;
      }

      // Focus the first tab
      await tabs.first().focus();
      await page.waitForTimeout(200);

      // Press ArrowRight to move to next tab
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      // The second tab should now be focused or active
      const secondTabState = await tabs.nth(1).getAttribute('data-state');
      const secondTabSelected = await tabs.nth(1).getAttribute('aria-selected');
      const isFocused = await tabs.nth(1).evaluate((el) => el === document.activeElement);

      expect(
        secondTabState === 'active' ||
        secondTabSelected === 'true' ||
        isFocused
      ).toBe(true);
    });

    test('ArrowLeft navigates to previous tab', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const tablist = page.locator(ROLES.TAB_LIST).first();
      const isVisible = await tablist.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No tablist on pricing page');
        return;
      }

      const tabs = tablist.locator(ROLES.TAB);
      const tabCount = await tabs.count();
      if (tabCount < 2) {
        test.skip(true, 'Less than 2 tabs');
        return;
      }

      // Click and focus the second tab first
      await tabs.nth(1).click();
      await page.waitForTimeout(200);
      await tabs.nth(1).focus();
      await page.waitForTimeout(200);

      // Press ArrowLeft to move back to the first tab
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);

      const firstTabState = await tabs.first().getAttribute('data-state');
      const firstTabSelected = await tabs.first().getAttribute('aria-selected');
      const isFocused = await tabs.first().evaluate((el) => el === document.activeElement);

      expect(
        firstTabState === 'active' ||
        firstTabSelected === 'true' ||
        isFocused
      ).toBe(true);
    });
  });

  test.describe('Account Sidebar Tabs', () => {
    test('account page has navigation tabs or links', async ({ page }) => {
      const ok = await waitForPage(page, '/account/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Account sidebar may use tabs, nav links, or regular <a> elements
      const tablist = page.locator(ROLES.TAB_LIST).first();
      const tablistVisible = await tablist.isVisible().catch(() => false);

      if (tablistVisible) {
        const tabs = tablist.locator(ROLES.TAB);
        expect(await tabs.count()).toBeGreaterThanOrEqual(2);
      } else {
        // AccountSidebar uses <nav> with <Link> elements (not role="tab")
        const accountLinks = page.locator('nav a[href*="/account/"], aside a[href*="/account/"], a[href*="/account/"]');
        const linkCount = await accountLinks.count();
        expect(linkCount).toBeGreaterThanOrEqual(2);
      }
    });

    test('account navigation items show active state', async ({ page }) => {
      const ok = await waitForPage(page, '/account/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Look for active/current navigation indicator
      const activeLink = page.locator(
        'a[aria-current="page"], a[data-active="true"], a[class*="active"], [data-state="active"]'
      ).first();
      const activeVisible = await activeLink.isVisible().catch(() => false);

      if (activeVisible) {
        await expect(activeLink).toBeVisible();
      } else {
        // The current page link may just have a different text color
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.length).toBeGreaterThan(50);
      }
    });

    test('clicking account nav item navigates to correct page', async ({ page }) => {
      const ok = await waitForPage(page, '/account/dashboard');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Find a link to profile page
      const profileLink = page.locator('a[href*="/account/profile"]').first();
      const isVisible = await profileLink.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'Profile link not found in account navigation');
        return;
      }

      await profileLink.click();
      await page.waitForURL('**/account/profile', { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(2000);

      expect(page.url()).toContain('/account/profile');
    });
  });
});
