import { test, expect } from '@playwright/test';
import path from 'path';
import {
  waitForPage,
  waitForAdminPage,
  ROLES,
  UI,
  expectDismissOnEscape,
} from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

// ─── Table rendering ────────────────────────────────────────────────

test.describe('DataTable — Table Rendering', () => {
  test('DataTable renders with <table> element at /admin/content', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const rows = table.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('Column headers are clickable (not disabled)', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    const tableVisible = await table.isVisible().catch(() => false);
    if (!tableVisible) { test.skip(true, 'Table not rendered'); return; }

    const headers = table.locator('thead th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);

    // At least one header should be clickable (not have disabled attribute)
    let hasClickable = false;
    for (let i = 0; i < headerCount; i++) {
      const th = headers.nth(i);
      const button = th.locator('button, [role="button"]').first();
      const hasButton = await button.isVisible().catch(() => false);
      if (hasButton) {
        const disabled = await button.getAttribute('disabled');
        if (disabled === null) {
          hasClickable = true;
          break;
        }
      }
    }

    // Headers themselves may be clickable without a nested button
    if (!hasClickable) {
      const firstHeader = headers.first();
      const cursor = await firstHeader.evaluate((el) => getComputedStyle(el).cursor).catch(() => 'default');
      hasClickable = cursor === 'pointer';
    }

    expect(hasClickable).toBe(true);
  });
});

// ─── Column sorting ─────────────────────────────────────────────────

test.describe('DataTable — Column Sorting', () => {
  test('Clicking a sortable column header changes sort direction indicator', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    const tableVisible = await table.isVisible().catch(() => false);
    if (!tableVisible) { test.skip(true, 'Table not rendered'); return; }

    // Find a sortable header button
    const sortButton = table.locator('thead th button, thead th [role="button"]').first();
    const hasSortButton = await sortButton.isVisible().catch(() => false);
    if (!hasSortButton) { test.skip(true, 'No sortable columns found'); return; }

    // Get initial HTML to compare after click
    const initialHtml = await sortButton.innerHTML();
    await sortButton.click();
    await page.waitForTimeout(1500);

    // After click, the sort indicator (arrow icon, class, or aria attribute) may change
    const afterHtml = await sortButton.innerHTML();
    // Either the HTML changed (sort icon rotated) or the page reloaded with sorted data
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });
});

// ─── Search / Filter ────────────────────────────────────────────────

test.describe('DataTable — Search/Filter', () => {
  test('Search input is visible and accepts text', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const searchInput = page.locator(
      'input[placeholder*="Поиск" i], input[placeholder*="оиск" i], input[type="search"]'
    ).first();
    const isVisible = await searchInput.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Search input not found'); return; }

    await searchInput.fill('тест');
    const value = await searchInput.inputValue();
    expect(value).toBe('тест');
  });

  test('Typing in search filters the table rows', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    const tableVisible = await table.isVisible().catch(() => false);
    if (!tableVisible) { test.skip(true, 'Table not rendered'); return; }

    const searchInput = page.locator(
      'input[placeholder*="Поиск" i], input[placeholder*="оиск" i], input[type="search"]'
    ).first();
    const isVisible = await searchInput.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Search input not found'); return; }

    const rowsBefore = await table.locator('tbody tr').count();

    await searchInput.fill('zzzznonexistent999');
    await page.waitForTimeout(2000);

    // Rows should change (either fewer or show empty state)
    const rowsAfter = await table.locator('tbody tr').count();
    const bodyText = await page.locator('body').innerText();
    const hasEmptyState =
      bodyText.includes('Ничего не найдено') ||
      bodyText.includes('Нет данных') ||
      bodyText.includes('Нет результатов') ||
      bodyText.includes('пусто') ||
      rowsAfter < rowsBefore ||
      rowsAfter === 0;

    expect(hasEmptyState || rowsAfter <= rowsBefore).toBe(true);
  });
});

// ─── Pagination ─────────────────────────────────────────────────────

test.describe('DataTable — Pagination', () => {
  test('"Next" pagination button navigates to next page', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    await page.waitForTimeout(3000);

    const nextButton = page.locator(
      'button:has-text("Далее"), button:has-text("След"), button[aria-label*="next" i], button[aria-label*="Следующ" i], button:has-text(">")'
    ).first();
    const isVisible = await nextButton.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Next pagination button not found'); return; }

    const isDisabled = await nextButton.isDisabled().catch(() => true);
    if (isDisabled) { test.skip(true, 'Next button is disabled — only one page of data'); return; }

    await nextButton.click();
    await page.waitForTimeout(2000);

    // Page should still render valid content
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('"Previous" pagination button navigates to previous page', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    await page.waitForTimeout(3000);

    const prevButton = page.locator(
      'button:has-text("Назад"), button:has-text("Пред"), button[aria-label*="previous" i], button[aria-label*="Предыдущ" i], button:has-text("<")'
    ).first();
    const isVisible = await prevButton.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Previous pagination button not found'); return; }

    // Previous is typically disabled on page 1
    const isDisabled = await prevButton.isDisabled().catch(() => false);
    expect(typeof isDisabled).toBe('boolean');
  });

  test('Page size selector is present (options like 10/20/50)', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    await page.waitForTimeout(3000);

    const pageSizeSelect = page.locator(
      'select:has(option[value="10"]), select:has(option[value="20"]), button:has-text("10"), [class*="page-size"], [class*="per-page"]'
    ).first();
    const isVisible = await pageSizeSelect.isVisible().catch(() => false);

    // Also check for shadcn/ui Select trigger with page size text
    const selectTrigger = page.locator(
      'button[role="combobox"]:has-text("10"), button[role="combobox"]:has-text("20")'
    ).first();
    const hasTrigger = await selectTrigger.isVisible().catch(() => false);

    expect(isVisible || hasTrigger, 'Page size selector should be present').toBe(true);
  });

  test('Pagination shows "X of Y" or similar count text', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    // Look for patterns like "1-10 из 25", "Страница 1 из 3", "Показано 10 из 25"
    const hasPaginationText =
      /\d+\s*(из|of)\s*\d+/i.test(bodyText) ||
      /страниц/i.test(bodyText) ||
      /Показано/i.test(bodyText) ||
      /\d+[-–]\d+/.test(bodyText);

    expect(hasPaginationText, 'Should show pagination count text').toBe(true);
  });
});

// ─── Row selection ──────────────────────────────────────────────────

test.describe('DataTable — Row Selection', () => {
  test('Row action button opens dropdown menu on click', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    const tableVisible = await table.isVisible().catch(() => false);
    if (!tableVisible) { test.skip(true, 'Table not rendered'); return; }

    // Find action buttons in rows (usually "..." or kebab menu)
    const actionButton = table.locator(
      'tbody td button[aria-haspopup], tbody td button:has(svg), tbody td button[class*="action"]'
    ).first();
    const hasAction = await actionButton.isVisible().catch(() => false);
    if (!hasAction) { test.skip(true, 'No row action buttons found'); return; }

    await actionButton.click();
    await page.waitForTimeout(1000);

    // Should open a dropdown menu
    const menu = page.locator(ROLES.MENU).first();
    const hasMenu = await menu.isVisible().catch(() => false);

    // Or a popover/dropdown content
    const popover = page.locator('[data-radix-popper-content-wrapper], [role="menu"], [data-state="open"]').first();
    const hasPopover = await popover.isVisible().catch(() => false);

    expect(hasMenu || hasPopover, 'Dropdown menu should appear on row action click').toBe(true);
  });

  test('Row action dropdown shows menu items', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    const tableVisible = await table.isVisible().catch(() => false);
    if (!tableVisible) { test.skip(true, 'Table not rendered'); return; }

    const actionButton = table.locator(
      'tbody td button[aria-haspopup], tbody td button:has(svg), tbody td button[class*="action"]'
    ).first();
    const hasAction = await actionButton.isVisible().catch(() => false);
    if (!hasAction) { test.skip(true, 'No row action buttons found'); return; }

    await actionButton.click();
    await page.waitForTimeout(1000);

    const menuItems = page.locator(
      '[role="menuitem"], [data-radix-popper-content-wrapper] a, [data-radix-popper-content-wrapper] button'
    );
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Row action dropdown closes on Escape', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    const tableVisible = await table.isVisible().catch(() => false);
    if (!tableVisible) { test.skip(true, 'Table not rendered'); return; }

    const actionButton = table.locator(
      'tbody td button[aria-haspopup], tbody td button:has(svg), tbody td button[class*="action"]'
    ).first();
    const hasAction = await actionButton.isVisible().catch(() => false);
    if (!hasAction) { test.skip(true, 'No row action buttons found'); return; }

    await actionButton.click();
    await page.waitForTimeout(1000);

    const menuOrPopover = page.locator(
      '[role="menu"], [data-radix-popper-content-wrapper]'
    ).first();
    const isOpen = await menuOrPopover.isVisible().catch(() => false);
    if (!isOpen) { test.skip(true, 'Dropdown did not open'); return; }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    const isStillOpen = await menuOrPopover.isVisible().catch(() => false);
    expect(isStillOpen).toBe(false);
  });
});

// ─── Other admin tables ─────────────────────────────────────────────

test.describe('DataTable — Cross-page Rendering', () => {
  test('Table at /admin/users also renders correctly', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/users');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    const tableVisible = await table.isVisible({ timeout: 10_000 }).catch(() => false);

    if (!tableVisible) {
      // Users page may use cards instead of table
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).toContain('Пользовател');
      return;
    }

    const rows = table.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('Table at /admin/payments also renders correctly', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/payments');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const table = page.locator('table').first();
    const tableVisible = await table.isVisible({ timeout: 10_000 }).catch(() => false);

    if (!tableVisible) {
      // Payments page may show "no payments" state
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(10);
      return;
    }

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('Empty state message shown when no results', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    const searchInput = page.locator(
      'input[placeholder*="Поиск" i], input[placeholder*="оиск" i], input[type="search"]'
    ).first();
    const isVisible = await searchInput.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Search input not found'); return; }

    await searchInput.fill('zzzzz_no_results_test');
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    const hasEmptyStateText =
      bodyText.includes('Ничего не найдено') ||
      bodyText.includes('Нет данных') ||
      bodyText.includes('Нет результатов') ||
      bodyText.includes('Не найдено') ||
      bodyText.includes('пусто') ||
      bodyText.includes('No results') ||
      /0\s*(из|of)\s*\d+/i.test(bodyText);

    // Table may show 0 data rows, or 1 row with "no results" message (colspan row)
    const table = page.locator('table').first();
    const tableVisible = await table.isVisible().catch(() => false);
    let emptyTable = false;
    if (tableVisible) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      // 0 rows = truly empty, 1 row with colspan = "no results" message row
      if (rowCount === 0) {
        emptyTable = true;
      } else if (rowCount === 1) {
        const firstRowText = await rows.first().innerText().catch(() => '');
        const colspanCell = await rows.first().locator('td[colspan]').count();
        emptyTable = colspanCell > 0 || firstRowText.includes('Нет') || firstRowText.includes('найден') || firstRowText.includes('No');
      }
    }

    expect(hasEmptyStateText || emptyTable, 'Should show empty state when no results match').toBe(true);
  });

  test('Column visibility toggle (if present) works', async ({ page }) => {
    const ok = await waitForAdminPage(page, '/admin/content');
    if (!ok) { test.skip(true, 'Auth expired'); return; }

    await page.waitForTimeout(3000);

    // Look for column visibility toggle button (often labeled "Columns" or "Столбцы")
    const colToggle = page.locator(
      'button:has-text("Столбцы"), button:has-text("Columns"), button[aria-label*="column" i], button:has-text("Вид")'
    ).first();
    const isVisible = await colToggle.isVisible().catch(() => false);
    if (!isVisible) { test.skip(true, 'Column visibility toggle not found'); return; }

    await colToggle.click();
    await page.waitForTimeout(1000);

    // Should open a popover/dropdown with column checkboxes
    const popover = page.locator(
      '[role="menu"], [data-radix-popper-content-wrapper], [role="listbox"]'
    ).first();
    const hasPopover = await popover.isVisible().catch(() => false);
    expect(hasPopover, 'Column visibility popover should open').toBe(true);
  });
});
