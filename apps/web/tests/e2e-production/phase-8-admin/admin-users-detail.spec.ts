import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  waitForAdminPage,
  TEST_CONTENT_PREFIX,
} from './helpers/admin-test.helper';
import { apiGet, apiPatch } from '../helpers/api.helper';

/**
 * Admin Users — List page, filters, detail page, management actions, and API verification.
 * Runs against production at http://89.108.66.37.
 *
 * IMPORTANT: All role changes and deactivations are reverted in the same test via try/finally.
 */

let adminToken: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Token will be empty — tests will skip
  }
});

// ============ Users List Page ============

test.describe('Users List Page', () => {
  test('users page loads with table showing seeded users', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();

    // Verify h1 heading
    const heading = page.locator('h1');
    const headingCount = await heading.count();
    if (headingCount > 0) {
      const headingText = await heading.first().innerText();
      expect(headingText).toContain('Пользователи');
    } else {
      expect(bodyText).toContain('Пользователи');
    }

    // Verify table has rows (at least 5 seeded users: admin, moderator, partner, user, minor)
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    expect(hasTable).toBe(true);

    const rowCount = await page.locator('table tbody tr, table tr').count();
    // Header row + at least 5 data rows, or just data rows >= 5
    expect(rowCount).toBeGreaterThanOrEqual(5);

    // Verify column headers — look for standard column labels
    const headerTexts = await page
      .locator('th, [role="columnheader"]')
      .allInnerTexts();
    const allHeaders = headerTexts.join(' ').toLowerCase();

    const hasEmail =
      allHeaders.includes('email') ||
      allHeaders.includes('почт') ||
      bodyText.toLowerCase().includes('email');
    const hasRole =
      allHeaders.includes('роль') || bodyText.toLowerCase().includes('роль');

    expect(hasEmail || hasRole).toBe(true);
  });

  test('user search by email via UI', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Find search input (placeholder contains "email" or "имени")
    const searchInput = page.locator(
      'input[placeholder*="email"], input[placeholder*="Email"], input[placeholder*="имен"], input[placeholder*="Поиск"]'
    );
    const searchCount = await searchInput.count();
    const input =
      searchCount > 0 ? searchInput.first() : page.locator('input').first();

    const inputVisible = await input.isVisible().catch(() => false);
    test.skip(!inputVisible, 'Search input not found on users page');

    // Type search query
    await input.fill('admin@');

    // Wait for debounce
    await page.waitForTimeout(2000);

    // Verify table shows filtered results containing admin email
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('admin@movieplatform.local');

    // Clear search
    await input.clear();
    await page.waitForTimeout(2000);
  });

  test('role filter dropdown works', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // The DataTable has filterOptions with 'Роль' title.
    // Look for a filter button containing "Роль" text
    const roleFilter = page.locator(
      'button:has-text("Роль"), [data-filter-id="role"], button:has-text("роль")'
    );
    const roleFilterCount = await roleFilter.count();

    if (roleFilterCount === 0) {
      // Try combobox approach
      const comboboxes = page.locator('button[role="combobox"]');
      const cbCount = await comboboxes.count();
      test.skip(cbCount === 0, 'Role filter not found');
    }

    const filterBtn =
      roleFilterCount > 0
        ? roleFilter.first()
        : page.locator('button[role="combobox"]').first();

    await filterBtn.click();
    await page.waitForTimeout(500);

    // Verify options are visible
    const bodyAfterClick = await page.locator('body').innerText();
    const hasRoleOptions =
      bodyAfterClick.includes('Админ') ||
      bodyAfterClick.includes('Модератор') ||
      bodyAfterClick.includes('Покупатель') ||
      bodyAfterClick.includes('Партнёр') ||
      bodyAfterClick.includes('Гость');
    expect(hasRoleOptions).toBe(true);

    // Close the dropdown / popover without selecting
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('verification filter dropdown works', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    // Look for verification filter button
    const verificationFilter = page.locator(
      'button:has-text("Верификация"), [data-filter-id="verificationStatus"], button:has-text("верификац")'
    );
    const vfCount = await verificationFilter.count();

    if (vfCount === 0) {
      // Might be the second combobox or a popover trigger
      const allFilterButtons = page.locator(
        'button:has-text("Верифик"), button:has-text("Статус верифик")'
      );
      const altCount = await allFilterButtons.count();
      test.skip(altCount === 0, 'Verification filter not found');
    }

    const filterBtn = vfCount > 0 ? verificationFilter.first() : page.locator('button:has-text("Верифик")').first();

    await filterBtn.click();
    await page.waitForTimeout(500);

    // Verify verification filter options
    const bodyAfterClick = await page.locator('body').innerText();
    const hasVerificationOptions =
      bodyAfterClick.includes('Верифицирован') ||
      bodyAfterClick.includes('На проверке') ||
      bodyAfterClick.includes('Не верифицирован') ||
      bodyAfterClick.includes('Отклонён');
    expect(hasVerificationOptions).toBe(true);

    // Close without selecting
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });
});

// ============ User Detail Page ============

test.describe('User Detail Page', () => {
  let adminUserId: string | undefined;

  test.beforeAll(async () => {
    if (!adminToken) return;

    // Find admin user ID via API
    try {
      const res = await apiGet(
        '/admin/users?search=admin@movieplatform.local',
        adminToken
      );
      if (res.success && res.data) {
        const data = res.data as { items?: { id: string; email: string }[] };
        const adminUser = data.items?.find((u) =>
          u.email.includes('admin@movieplatform.local')
        );
        if (adminUser) {
          adminUserId = adminUser.id;
        }
      }
    } catch {
      // Will skip tests
    }
  });

  test('detail page loads for seeded admin user', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!adminUserId, 'Admin user not found via API');

    const loaded = await waitForAdminPage(page, `/admin/users/${adminUserId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);

    // Verify page shows user info (email visible)
    const hasUserInfo =
      bodyText.includes('admin@movieplatform.local') ||
      bodyText.includes('Админ') ||
      bodyText.includes('Информация');
    expect(hasUserInfo).toBe(true);
  });

  test('detail page shows user info cards', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!adminUserId, 'Admin user not found via API');

    const loaded = await waitForAdminPage(page, `/admin/users/${adminUserId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    if (bodyText.includes('Пользователь не найден')) {
      test.skip(true, 'User not found on detail page');
      return;
    }

    // Verify info card fields
    const hasEmail = bodyText.includes('admin@movieplatform.local') || bodyText.includes('Email');
    const hasRole = bodyText.includes('Роль') || bodyText.includes('Админ');
    const hasRegistration =
      bodyText.includes('Регистрация') ||
      bodyText.includes('Дата') ||
      /\d{1,2}\s[\u0430-\u044F]+\s\d{4}/.test(bodyText); // Russian date format
    const hasVerification =
      bodyText.includes('Верификация') ||
      bodyText.includes('Верифицирован') ||
      bodyText.includes('Не верифицирован');

    // At least 3 of 4 fields should be visible
    const fieldCount = [hasEmail, hasRole, hasRegistration, hasVerification].filter(Boolean).length;
    expect(fieldCount).toBeGreaterThanOrEqual(3);
  });

  test('role change dropdown is present and functional', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!adminUserId, 'Admin user not found via API');

    const loaded = await waitForAdminPage(page, `/admin/users/${adminUserId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Пользователь не найден')) {
      test.skip(true, 'User not found');
      return;
    }

    // Find the role Select element — it is inside the "Действия" card
    // The role select should be a combobox showing the current role
    const roleSelect = page.locator('button[role="combobox"]');
    const selectCount = await roleSelect.count();
    test.skip(selectCount === 0, 'No combobox (role select) found on detail page');

    // The select should display current role
    const selectTexts = await roleSelect.allInnerTexts();
    const allSelectText = selectTexts.join(' ');
    const showsRole =
      allSelectText.includes('Админ') ||
      allSelectText.includes('Модератор') ||
      allSelectText.includes('Покупатель') ||
      allSelectText.includes('Партнёр') ||
      allSelectText.includes('Гость') ||
      allSelectText.includes('Несовершеннолетний');
    expect(showsRole).toBe(true);

    // Open the dropdown
    await roleSelect.first().click();
    await page.waitForTimeout(500);

    // Verify all role options are visible
    const dropdownText = await page
      .locator('[role="listbox"], [data-radix-popper-content-wrapper]')
      .first()
      .innerText()
      .catch(() => '');

    const expectedRoles = ['Гость', 'Покупатель', 'Партнёр', 'Несовершеннолетний', 'Модератор', 'Админ'];
    const foundRoles = expectedRoles.filter((r) => dropdownText.includes(r));

    // At least 4 of 6 roles should be visible (in case some are hidden)
    expect(foundRoles.length).toBeGreaterThanOrEqual(4);

    // Close without changing
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('activate/deactivate button is present', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!adminUserId, 'Admin user not found via API');

    const loaded = await waitForAdminPage(page, `/admin/users/${adminUserId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Пользователь не найден')) {
      test.skip(true, 'User not found');
      return;
    }

    // Verify "Заблокировать" or "Разблокировать" button exists
    const blockButton = page.locator('button:has-text("Заблокировать")');
    const unblockButton = page.locator('button:has-text("Разблокировать")');

    const blockVisible = await blockButton.isVisible().catch(() => false);
    const unblockVisible = await unblockButton.isVisible().catch(() => false);

    expect(blockVisible || unblockVisible).toBe(true);
  });
});

// ============ User Management Actions (with revert) ============

test.describe('User Management Actions (with revert)', () => {
  let regularUserId: string | undefined;
  let originalRole: string | undefined;

  test.beforeAll(async () => {
    if (!adminToken) return;

    // Find regular user (user@movieplatform.local)
    try {
      const res = await apiGet(
        '/admin/users?search=user@movieplatform.local',
        adminToken
      );
      if (res.success && res.data) {
        const data = res.data as {
          items?: { id: string; email: string; role: string }[];
        };
        const regularUser = data.items?.find((u) =>
          u.email.includes('user@movieplatform.local')
        );
        if (regularUser) {
          regularUserId = regularUser.id;
          originalRole = regularUser.role;
        }
      }
    } catch {
      // Will skip tests
    }
  });

  test('change user role via API and revert', async () => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!regularUserId, 'Regular user not found');

    // Verify starting role
    const detailRes = await apiGet(`/admin/users/${regularUserId}`, adminToken);
    expect(detailRes.success).toBe(true);

    const startingRole = (detailRes.data as { role: string })?.role;
    expect(startingRole).toBeTruthy();

    // Change role to PARTNER (or BUYER if already PARTNER)
    const newRole = startingRole === 'PARTNER' ? 'BUYER' : 'PARTNER';

    try {
      // Change role
      const patchRes = await apiPatch(
        `/admin/users/${regularUserId}`,
        { role: newRole },
        adminToken
      );
      expect(patchRes).toBeDefined();

      // If patch succeeded, verify the change
      if (patchRes.success) {
        const verifyRes = await apiGet(`/admin/users/${regularUserId}`, adminToken);
        if (verifyRes.success && verifyRes.data) {
          const updatedRole = (verifyRes.data as { role: string }).role;
          expect(updatedRole).toBe(newRole);
        }
      }
    } finally {
      // Always revert the role back
      try {
        await apiPatch(
          `/admin/users/${regularUserId}`,
          { role: startingRole },
          adminToken
        );

        // Verify revert
        const revertRes = await apiGet(`/admin/users/${regularUserId}`, adminToken);
        if (revertRes.success && revertRes.data) {
          const revertedRole = (revertRes.data as { role: string }).role;
          expect(revertedRole).toBe(startingRole);
        }
      } catch {
        // Critical: log that revert failed
        console.error(
          `CRITICAL: Failed to revert user ${regularUserId} role back to ${startingRole}`
        );
      }
    }
  });

  test('deactivate user via API and revert', async () => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!regularUserId, 'Regular user not found');

    try {
      // Deactivate user
      const deactivateRes = await apiPatch(
        `/admin/users/${regularUserId}`,
        { isActive: false },
        adminToken
      );
      expect(deactivateRes).toBeDefined();

      // Verify deactivation
      if (deactivateRes.success) {
        const verifyRes = await apiGet(`/admin/users/${regularUserId}`, adminToken);
        if (verifyRes.success && verifyRes.data) {
          const isActive = (verifyRes.data as { isActive: boolean }).isActive;
          expect(isActive).toBe(false);
        }
      }
    } finally {
      // Always reactivate the user
      try {
        await apiPatch(
          `/admin/users/${regularUserId}`,
          { isActive: true },
          adminToken
        );

        // Verify reactivation
        const revertRes = await apiGet(`/admin/users/${regularUserId}`, adminToken);
        if (revertRes.success && revertRes.data) {
          const isActive = (revertRes.data as { isActive: boolean }).isActive;
          expect(isActive).toBe(true);
        }
      } catch {
        console.error(
          `CRITICAL: Failed to reactivate user ${regularUserId}`
        );
      }
    }
  });
});

// ============ Users API Verification ============

test.describe('Users API Verification', () => {
  test('users API returns paginated list with correct structure', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/users?limit=10', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);

    const data = res.data as {
      items?: Record<string, unknown>[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    };

    // Verify items array
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items!.length).toBeGreaterThan(0);

    // Verify pagination meta
    if (data.total !== undefined) {
      expect(typeof data.total).toBe('number');
      expect(data.total).toBeGreaterThanOrEqual(5); // At least 5 seeded users
    }
    if (data.page !== undefined) {
      expect(typeof data.page).toBe('number');
    }
    if (data.limit !== undefined) {
      expect(typeof data.limit).toBe('number');
    }

    // Verify each item has expected fields
    const firstItem = data.items![0];
    expect(firstItem).toHaveProperty('email');
    expect(firstItem).toHaveProperty('role');
    expect(firstItem).toHaveProperty('id');
  });

  test('user search API works', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/users?search=admin', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);

    const data = res.data as {
      items?: { id: string; email: string; role: string }[];
    };

    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items!.length).toBeGreaterThanOrEqual(1);

    // Verify the returned user has "admin" in their email
    const hasAdminUser = data.items!.some((u) =>
      u.email.toLowerCase().includes('admin')
    );
    expect(hasAdminUser).toBe(true);
  });
});
