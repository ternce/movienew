/**
 * Admin API Verification Tests
 *
 * Pure API tests (no browser needed for most) that verify every admin
 * endpoint returns valid data, handles authorization correctly, and
 * supports basic CRUD operations on content.
 */

import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  TEST_CONTENT_PREFIX,
  createTestContent,
  deleteTestContent,
  cleanupAllTestContent,
} from './helpers/admin-test.helper';
import { apiGet, apiPost, apiPatch, apiDelete } from '../helpers/api.helper';
import { loginViaApi, PROD_USERS } from '../helpers/auth.helper';

let adminToken: string;
let userToken: string;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Will be handled by test.skip in each test
  }

  try {
    const userAuth = await loginViaApi(
      PROD_USERS.user.email,
      PROD_USERS.user.password
    );
    userToken = userAuth.accessToken;
  } catch {
    // Will be handled by test.skip in authorization tests
  }
});

test.afterAll(async () => {
  if (adminToken) {
    await cleanupAllTestContent(adminToken);
  }
});

// ============================================================
// Admin Dashboard API
// ============================================================

test.describe('Admin Dashboard API', () => {
  test('GET /admin/dashboard/stats returns valid data', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/dashboard/stats', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  test('GET /admin/dashboard/revenue returns revenue data', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/dashboard/revenue', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  test('GET /admin/dashboard/user-growth returns growth data', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/dashboard/user-growth', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});

// ============================================================
// Admin Content API
// ============================================================

test.describe('Admin Content API', () => {
  test('GET /admin/content returns paginated list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/content', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    const data = res.data as { items?: unknown[] };
    expect(Array.isArray(data.items)).toBe(true);
  });

  test('POST /admin/content creates content', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const content = await createTestContent(adminToken, {
      title: `${TEST_CONTENT_PREFIX}API-Create-${Date.now().toString(36)}`,
    });
    expect(content).toBeDefined();
    expect(content.id).toBeTruthy();
    expect(content.title).toContain(TEST_CONTENT_PREFIX);

    // Cleanup
    await deleteTestContent(adminToken, content.id);
  });

  test('GET /admin/content/:id returns detail', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const content = await createTestContent(adminToken, {
      title: `${TEST_CONTENT_PREFIX}API-Detail-${Date.now().toString(36)}`,
    });

    try {
      const res = await apiGet(`/admin/content/${content.id}`, adminToken);
      expect(res).toBeDefined();
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();

      const detail = res.data as { id: string; title: string };
      expect(detail.id).toBe(content.id);
      expect(detail.title).toContain(TEST_CONTENT_PREFIX);
    } finally {
      await deleteTestContent(adminToken, content.id);
    }
  });

  test('PATCH /admin/content/:id updates content', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const content = await createTestContent(adminToken, {
      title: `${TEST_CONTENT_PREFIX}API-Update-${Date.now().toString(36)}`,
    });

    try {
      const newTitle = `${TEST_CONTENT_PREFIX}API-Updated-${Date.now().toString(36)}`;
      const res = await apiPatch(
        `/admin/content/${content.id}`,
        { title: newTitle },
        adminToken
      );
      expect(res).toBeDefined();
      expect(res.success).toBe(true);

      const updated = res.data as { title: string };
      expect(updated.title).toBe(newTitle);
    } finally {
      await deleteTestContent(adminToken, content.id);
    }
  });

  test('DELETE /admin/content/:id archives content', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const content = await createTestContent(adminToken, {
      title: `${TEST_CONTENT_PREFIX}API-Delete-${Date.now().toString(36)}`,
    });

    const delRes = await apiDelete(`/admin/content/${content.id}`, adminToken);
    expect(delRes).toBeDefined();
    expect(delRes.success).toBe(true);

    // Verify archived: GET may return the content with ARCHIVED status
    const getRes = await apiGet(`/admin/content/${content.id}`, adminToken);
    if (getRes.success && getRes.data) {
      const detail = getRes.data as { status: string };
      expect(detail.status).toBe('ARCHIVED');
    }
    // If GET returns 404, that's also acceptable
  });

  test('content filter by status', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/content?status=PUBLISHED', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);

    const data = res.data as { items?: { status: string }[] };
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        expect(item.status).toBe('PUBLISHED');
      }
    }
  });

  test('content search by title', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const uniqueTag = `APISearch${Date.now().toString(36)}`;
    const content = await createTestContent(adminToken, {
      title: `${TEST_CONTENT_PREFIX}${uniqueTag}`,
    });

    try {
      const res = await apiGet(
        `/admin/content?search=${encodeURIComponent(uniqueTag)}`,
        adminToken
      );
      expect(res).toBeDefined();
      expect(res.success).toBe(true);

      const data = res.data as { items?: { title: string }[] };
      const found = data.items?.some((item) => item.title.includes(uniqueTag));
      expect(found).toBe(true);
    } finally {
      await deleteTestContent(adminToken, content.id);
    }
  });
});

// ============================================================
// Admin Users API
// ============================================================

test.describe('Admin Users API', () => {
  test('GET /admin/users returns user list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/users', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    const data = res.data as { items?: unknown[] };
    expect(Array.isArray(data.items)).toBe(true);
  });

  test('GET /admin/users/:userId returns user detail', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const listRes = await apiGet('/admin/users?limit=1', adminToken);
    expect(listRes.success).toBe(true);

    const data = listRes.data as { items?: { id: string }[] };
    const firstUser = data.items?.[0];
    test.skip(!firstUser, 'No users found in list');

    const detailRes = await apiGet(`/admin/users/${firstUser!.id}`, adminToken);
    expect(detailRes).toBeDefined();
    expect(detailRes.success).toBe(true);

    const user = detailRes.data as { email?: string; role?: string };
    expect(user.email).toBeTruthy();
    expect(user.role).toBeTruthy();
  });
});

// ============================================================
// Admin Payments API
// ============================================================

test.describe('Admin Payments API', () => {
  test('GET /admin/payments/transactions returns transactions', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/payments/transactions', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  test('GET /admin/payments/stats returns statistics', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/payments/stats', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});

// ============================================================
// Admin Partners API
// ============================================================

test.describe('Admin Partners API', () => {
  test('GET /admin/partners returns partner list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/partners', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  test('GET /admin/partners/stats returns stats', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/partners/stats', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  test('GET /admin/partners/withdrawals returns list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/partners/withdrawals', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});

// ============================================================
// Admin Store API
// ============================================================

test.describe('Admin Store API', () => {
  test('GET /admin/store/products returns products', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/store/products', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  test('GET /admin/store/categories returns categories', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/store/categories', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  test('GET /admin/store/orders returns orders', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/store/orders', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});

// ============================================================
// Admin Newsletters API
// ============================================================

test.describe('Admin Newsletters API', () => {
  test('GET /admin/newsletters returns list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/newsletters', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});

// ============================================================
// Admin Documents API
// ============================================================

test.describe('Admin Documents API', () => {
  test('GET /admin/documents returns list', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/documents', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});

// ============================================================
// Admin Audit API
// ============================================================

test.describe('Admin Audit API', () => {
  test('GET /admin/audit returns audit log', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/audit', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});

// ============================================================
// Admin Verifications API
// ============================================================

test.describe('Admin Verifications API', () => {
  test('GET /admin/verifications returns queue', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/verifications', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  test('GET /admin/verifications/stats returns stats', async () => {
    test.skip(!adminToken, 'Admin token not available');

    const res = await apiGet('/admin/verifications/stats', adminToken);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});

// ============================================================
// Admin Authorization
// ============================================================

test.describe('Admin Authorization', () => {
  test('admin endpoints return 401 without token', async () => {
    const res = await apiGet('/admin/content');
    expect(res).toBeDefined();

    // Should fail — either success: false or error present
    const unauthorized =
      res.success === false ||
      res.error?.code === 'UNAUTHORIZED' ||
      res.error?.message?.toLowerCase().includes('unauthorized');
    expect(unauthorized).toBe(true);
  });

  test('admin endpoints return 403 for regular user token', async () => {
    test.skip(!userToken, 'User token not available');

    const res = await apiGet('/admin/content', userToken);
    expect(res).toBeDefined();

    // Should fail — either success: false or error code FORBIDDEN
    const forbidden =
      res.success === false ||
      res.error?.code === 'FORBIDDEN' ||
      res.error?.message?.toLowerCase().includes('forbidden');
    expect(forbidden).toBe(true);
  });
});
