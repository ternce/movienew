/**
 * Phase 18.6: ADMIN Full Access Tests
 *
 * Verifies:
 * - Unrestricted access to ALL admin endpoints (including ADMIN-ONLY)
 * - All admin UI pages load correctly
 * - Content CRUD operations work
 * - Can access regular user features too
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import {
  rawApiFetch,
  getTokenForRole,
  waitForPage,
  clearTokenCache,
  ROLE_TEST_PREFIX,
} from './helpers/user-type-test.helper';
import { getFirstCategoryId } from '../phase-8-admin/helpers/admin-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');
test.use({ storageState: path.join(AUTH_DIR, 'admin-state.json') });

let adminToken: string;
let testContentId: string | null = null;

test.beforeAll(async () => {
  adminToken = await getTokenForRole('admin');
});

test.afterAll(async () => {
  if (testContentId) {
    try {
      await rawApiFetch('DELETE', `/admin/content/${testContentId}`, undefined, adminToken);
    } catch {
      // Non-critical
    }
  }
  clearTokenCache();
});

test.describe('ADMIN — Dashboard & Stats', () => {
  test('admin dashboard loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
    expect(/[\u0400-\u04FF]/.test(body)).toBe(true);
  });

  test('can access dashboard stats', async () => {
    const res = await rawApiFetch('GET', '/admin/dashboard/stats', undefined, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

test.describe('ADMIN — User Management (ADMIN-ONLY)', () => {
  test('can list all users', async () => {
    const res = await rawApiFetch('GET', '/admin/users', undefined, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('can view specific user', async () => {
    // First get user list to find a valid ID
    const listRes = await rawApiFetch('GET', '/admin/users?limit=1', undefined, adminToken);
    const items = (listRes.body.data as { items?: { id: string }[] })?.items;
    if (!items?.length) {
      test.skip(true, 'No users found');
      return;
    }

    const res = await rawApiFetch(
      'GET',
      `/admin/users/${items[0].id}`,
      undefined,
      adminToken
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('admin users page loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/users');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('ADMIN — Content Management', () => {
  test('can list content', async () => {
    const res = await rawApiFetch('GET', '/admin/content', undefined, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('can create content', async () => {
    let categoryId: string;
    try {
      categoryId = await getFirstCategoryId(adminToken);
    } catch {
      test.skip(true, 'No categories available');
      return;
    }

    const timestamp = Date.now().toString(36);
    const res = await rawApiFetch(
      'POST',
      '/admin/content',
      {
        title: `${ROLE_TEST_PREFIX}AdminTest-${timestamp}`,
        description: 'Admin content creation test',
        contentType: 'SERIES',
        categoryId,
        ageCategory: 'ZERO_PLUS',
        isFree: true,
      },
      adminToken
    );

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);

    const created = res.body.data as { id: string };
    testContentId = created.id;
  });

  test('can update content', async () => {
    test.skip(!testContentId, 'No test content to update');

    const res = await rawApiFetch(
      'PATCH',
      `/admin/content/${testContentId}`,
      { description: 'Updated by admin test' },
      adminToken
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('can delete content', async () => {
    test.skip(!testContentId, 'No test content to delete');

    const res = await rawApiFetch(
      'DELETE',
      `/admin/content/${testContentId}`,
      undefined,
      adminToken
    );
    expect([200, 204]).toContain(res.status);
    testContentId = null;
  });

  test('admin content page loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/content');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('ADMIN — Store Management', () => {
  test('can list store products', async () => {
    const res = await rawApiFetch('GET', '/admin/store/products', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('admin store page loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/store');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('ADMIN — Payments', () => {
  test('can view payments', async () => {
    const res = await rawApiFetch('GET', '/admin/payments/transactions', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can view payment stats', async () => {
    const res = await rawApiFetch('GET', '/admin/payments/stats', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('admin payments page loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/payments');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('ADMIN — Subscriptions', () => {
  test('can list subscriptions', async () => {
    const res = await rawApiFetch('GET', '/admin/subscriptions', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can view subscription stats', async () => {
    const res = await rawApiFetch('GET', '/admin/subscriptions/stats', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can view expiring subscriptions', async () => {
    const res = await rawApiFetch('GET', '/admin/subscriptions/expiring', undefined, adminToken);
    expect(res.status).toBe(200);
  });
});

test.describe('ADMIN — Partners', () => {
  test('can list partners', async () => {
    const res = await rawApiFetch('GET', '/admin/partners', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can view partner stats', async () => {
    const res = await rawApiFetch('GET', '/admin/partners/stats', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can list commissions', async () => {
    const res = await rawApiFetch('GET', '/admin/partners/commissions', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can list withdrawals', async () => {
    const res = await rawApiFetch('GET', '/admin/partners/withdrawals', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can view withdrawal stats', async () => {
    const res = await rawApiFetch('GET', '/admin/partners/withdrawals/stats', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('admin partners page loads', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/partners');
    test.skip(!loaded, 'Auth state expired');

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('ADMIN — Bonuses (ADMIN-ONLY)', () => {
  test('can view bonus stats', async () => {
    const res = await rawApiFetch('GET', '/admin/bonuses/stats', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can view bonus rates', async () => {
    const res = await rawApiFetch('GET', '/admin/bonuses/rates', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can view bonus campaigns', async () => {
    const res = await rawApiFetch('GET', '/admin/bonuses/campaigns', undefined, adminToken);
    expect(res.status).toBe(200);
  });
});

test.describe('ADMIN — Other Admin Sections', () => {
  test('can view verifications', async () => {
    const res = await rawApiFetch('GET', '/admin/verifications', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can view documents', async () => {
    const res = await rawApiFetch('GET', '/admin/documents', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('can view audit logs', async () => {
    const res = await rawApiFetch('GET', '/admin/audit', undefined, adminToken);
    expect(res.status).toBe(200);
  });

  test('admin navigation has all sections', async ({ page }) => {
    const loaded = await waitForPage(page, '/admin/dashboard');
    test.skip(!loaded, 'Auth state expired');

    const sidebar = page.locator('aside, nav, [role="navigation"]');
    if ((await sidebar.count()) > 0) {
      const text = await sidebar.first().innerText().then((t) => t.toLowerCase());
      // Admin should see key navigation sections
      const hasExpectedSections =
        text.includes('контент') || text.includes('пользовател') || text.includes('настройк');
      expect(hasExpectedSections, 'Admin sidebar should show key sections').toBe(true);
    }
  });
});

test.describe('ADMIN — Regular User Features', () => {
  test('can access own profile', async () => {
    const res = await rawApiFetch('GET', '/users/me', undefined, adminToken);
    expect(res.status).toBe(200);

    const user = res.body.data as { role: string };
    expect(user.role).toBe('ADMIN');
  });
});
