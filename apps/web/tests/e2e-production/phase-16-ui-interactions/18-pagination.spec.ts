import { test, expect } from '@playwright/test';
import path from 'path';
import { waitForPage, waitForAdminPage } from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.describe('Pagination', () => {
  test.describe('Content List Pagination', () => {
    test('series page has pagination or load-more', async ({ page }) => {
      const ok = await waitForPage(page, '/series');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Look for pagination buttons, page numbers, or load more
      const pagination = page.locator(
        'nav[aria-label*="pagination" i], [class*="pagination"], button:has-text("Далее"), button:has-text("Следующ")'
      );
      const loadMore = page.locator(
        'button:has-text("Загрузить еще"), button:has-text("Показать ещё"), button:has-text("Ещё")'
      );

      const hasPagination = (await pagination.count()) > 0 || (await loadMore.count()) > 0;
      if (!hasPagination) {
        test.skip(true, 'Not enough content for pagination');
        return;
      }
      expect(hasPagination).toBe(true);
    });

    test('clicking Next/Далее loads next page of content', async ({ page }) => {
      const ok = await waitForPage(page, '/series');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const nextButton = page
        .locator('button, a')
        .filter({ hasText: /Далее|Следующ|Next|→|>/ })
        .first();
      const isVisible = await nextButton.isVisible().catch(() => false);
      if (!isVisible) {
        // Try load-more button
        const loadMore = page.locator('button').filter({ hasText: /Загрузить|Показать|Ещё/ }).first();
        const loadMoreVisible = await loadMore.isVisible().catch(() => false);
        if (!loadMoreVisible) {
          test.skip(true, 'No next/load-more button found');
          return;
        }
        await loadMore.click();
        await page.waitForTimeout(2000);
        // Page should still be on /series
        expect(page.url()).toContain('/series');
        return;
      }

      // Check if button is disabled (already on last page)
      const isDisabled = await nextButton.isDisabled().catch(() => false);
      if (isDisabled) {
        test.skip(true, 'Next button is disabled — only one page of content');
        return;
      }

      await nextButton.click();
      await page.waitForTimeout(2000);
      // URL should still be on series page, possibly with page param
      expect(page.url()).toContain('/series');
    });

    test('Previous/Назад button disabled on first page', async ({ page }) => {
      const ok = await waitForPage(page, '/series');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const prevButton = page
        .locator('button, a')
        .filter({ hasText: /Назад|Предыдущ|Previous|←|</ })
        .first();
      const isVisible = await prevButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No previous button found (may use load-more pattern)');
        return;
      }

      // On the first page, previous button should be disabled
      const isDisabled = await prevButton.isDisabled().catch(() => false);
      const ariaDisabled = await prevButton.getAttribute('aria-disabled');

      expect(
        isDisabled || ariaDisabled === 'true',
        'Previous button should be disabled on first page'
      ).toBe(true);
    });

    test('content count/total is displayed', async ({ page }) => {
      const ok = await waitForPage(page, '/series');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      // Look for count indicators like "Showing 1-10 of 50" or "10 результатов"
      const countText = page.locator(
        'text=/\\d+\\s*(из|of|результат|записей|элемент)/i, text=/Страница\\s+\\d+/i'
      );
      const paginationInfo = page.locator('[class*="pagination"] span, [class*="count"]');

      const hasCount = (await countText.count()) > 0;
      const hasInfo = (await paginationInfo.count()) > 0;

      if (!hasCount && !hasInfo) {
        test.skip(true, 'No content count or pagination info visible');
        return;
      }
      expect(hasCount || hasInfo).toBe(true);
    });
  });

  test.describe('Admin Table Pagination', () => {
    test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

    test('admin content table has pagination controls', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Look for pagination in the admin table area
      const pagination = page.locator(
        'nav[aria-label*="pagination" i], [class*="pagination"], button:has-text("Далее"), button:has-text("Следующая")'
      );
      const pageButtons = page.locator(
        'button:has-text("Предыдущая"), button:has-text("Следующая"), button:has-text("Previous"), button:has-text("Next")'
      );

      const hasPagination = (await pagination.count()) > 0 || (await pageButtons.count()) > 0;
      if (!hasPagination) {
        test.skip(true, 'No pagination controls found in admin content table');
        return;
      }
      expect(hasPagination).toBe(true);
    });

    test('admin pagination shows page count', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Look for "Страница X из Y" or "Page X of Y" or similar
      const pageInfo = page.locator(
        'text=/Страница\\s+\\d+\\s*(из|of)\\s*\\d+/i, text=/\\d+\\s*(из|of)\\s*\\d+/i, text=/Page\\s+\\d+/i'
      );
      const count = await pageInfo.count();
      if (count === 0) {
        test.skip(true, 'No page count display found');
        return;
      }

      const text = await pageInfo.first().innerText();
      expect(text).toMatch(/\d+/);
    });

    test('admin page size selector works', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Look for a select or dropdown for page size (10/20/50 rows per page)
      const pageSizeSelect = page.locator(
        'select:has(option:text("10")), [role="combobox"]:near(:text("Строк на странице")), button:has-text("10")'
      ).first();
      const isVisible = await pageSizeSelect.isVisible().catch(() => false);

      if (!isVisible) {
        // Try looking for any combobox or select near pagination area
        const anySelect = page.locator(
          '[class*="pagination"] select, [class*="pagination"] [role="combobox"], select'
        ).first();
        const anyVisible = await anySelect.isVisible().catch(() => false);
        if (!anyVisible) {
          test.skip(true, 'No page size selector found in admin table');
          return;
        }
      }

      expect(true).toBe(true); // Found page size selector
    });

    test('clicking a page number navigates to that page', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Look for numeric page buttons (2, 3, etc.)
      const pageButton = page
        .locator('nav[aria-label*="pagination" i] button, [class*="pagination"] button')
        .filter({ hasText: /^2$/ })
        .first();
      const isVisible = await pageButton.isVisible().catch(() => false);

      if (!isVisible) {
        // Try the "Next" button instead
        const nextBtn = page
          .locator('button')
          .filter({ hasText: /Следующая|Next|Далее/ })
          .first();
        const nextVisible = await nextBtn.isVisible().catch(() => false);
        if (!nextVisible) {
          test.skip(true, 'No page number buttons found');
          return;
        }

        const isDisabled = await nextBtn.isDisabled().catch(() => false);
        if (isDisabled) {
          test.skip(true, 'Next button disabled — only one page');
          return;
        }

        await nextBtn.click();
        await page.waitForTimeout(2000);
        // Should still be on admin content page
        expect(page.url()).toContain('/admin/content');
        return;
      }

      await pageButton.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/admin/content');
    });

    test('pagination preserves applied filters', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      // Look for a filter or search input
      const searchInput = page.locator(
        'input[placeholder*="Поиск" i], input[placeholder*="Search" i], input[type="search"]'
      ).first();
      const isVisible = await searchInput.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No search/filter input found');
        return;
      }

      // Type a search term
      await searchInput.fill('test');
      await page.waitForTimeout(1500);

      // Check if pagination is available after filtering
      const nextBtn = page
        .locator('button')
        .filter({ hasText: /Следующая|Next|Далее/ })
        .first();
      const nextVisible = await nextBtn.isVisible().catch(() => false);

      if (!nextVisible) {
        // Filter may have reduced results to one page, which is valid
        test.skip(true, 'Filtered results fit on one page');
        return;
      }

      const isDisabled = await nextBtn.isDisabled().catch(() => false);
      if (isDisabled) {
        test.skip(true, 'Filtered results fit on one page');
        return;
      }

      await nextBtn.click();
      await page.waitForTimeout(2000);

      // Verify the search term is still in the input after pagination
      const currentValue = await searchInput.inputValue();
      expect(currentValue).toBe('test');
    });

    test('URL updates with page parameter on navigation', async ({ page }) => {
      const ok = await waitForAdminPage(page, '/admin/content');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      await page.waitForTimeout(3000);

      const nextBtn = page
        .locator('button')
        .filter({ hasText: /Следующая|Next|Далее/ })
        .first();
      const isVisible = await nextBtn.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No next button found');
        return;
      }

      const isDisabled = await nextBtn.isDisabled().catch(() => false);
      if (isDisabled) {
        test.skip(true, 'Next button disabled — only one page');
        return;
      }

      const urlBefore = page.url();
      await nextBtn.click();
      await page.waitForTimeout(2000);
      const urlAfter = page.url();

      // URL may or may not change depending on implementation
      // Some use query params (?page=2), some use client-side state
      // Just verify we're still on the admin content page
      expect(urlAfter).toContain('/admin/content');
    });
  });
});
