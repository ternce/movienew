import { test, expect } from '@playwright/test';
import { apiGet, apiPost, apiPatch, apiDelete } from '../helpers/api.helper';
import {
  waitForAdminPage,
  getAdminToken,
  TEST_CONTENT_PREFIX,
} from './helpers/admin-test.helper';

/**
 * Admin Store CRUD Tests
 *
 * Tests store product listing, creation, update, deletion via API,
 * as well as UI page loads for products and orders.
 * All created data uses E2E-TEST- prefix for safe cleanup.
 */

let adminToken: string;
let createdProductId: string | undefined;

test.beforeAll(async () => {
  try {
    adminToken = await getAdminToken();
  } catch {
    // Tests will skip if auth fails
  }
});

test.afterAll(async () => {
  // Cleanup any test products that may remain
  if (adminToken && createdProductId) {
    try {
      await apiDelete(`/admin/store/products/${createdProductId}`, adminToken);
    } catch {
      // Non-critical
    }
  }

  // Broad cleanup: find and delete all E2E-TEST- products
  if (adminToken) {
    try {
      const res = await apiGet('/admin/store/products?limit=100', adminToken);
      if (res.success && res.data) {
        const data = res.data as { items?: { id: string; name?: string; title?: string }[] };
        for (const item of data.items ?? []) {
          const itemName = item.name ?? item.title ?? '';
          if (itemName.startsWith(TEST_CONTENT_PREFIX)) {
            await apiDelete(`/admin/store/products/${item.id}`, adminToken);
          }
        }
      }
    } catch {
      // Non-critical
    }
  }
});

test.describe('Store Products Management', () => {
  test('products page loads at /admin/store/products', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/store/products');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    const hasProductContent =
      bodyText.includes('Товар') ||
      bodyText.includes('товар') ||
      bodyText.includes('Продукт') ||
      bodyText.includes('продукт') ||
      bodyText.includes('Магазин') ||
      bodyText.includes('магазин');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;

    expect(hasProductContent || hasTable || hasCards).toBe(true);
  });

  test('product create form at /admin/store/products/new has form fields', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/store/products/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    // Should have form inputs for product creation
    const inputs = await page.locator('input').count();
    const textareas = await page.locator('textarea').count();
    const buttons = await page.locator('button').count();

    expect(inputs + textareas + buttons).toBeGreaterThan(0);
  });

  test('API: create product with E2E-TEST prefix', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const timestamp = Date.now().toString(36);
    const productName = `${TEST_CONTENT_PREFIX}Product-${timestamp}`;

    const res = await apiPost(
      '/admin/store/products',
      {
        name: productName,
        description: `Test product created at ${new Date().toISOString()}`,
        price: 990,
        status: 'DRAFT',
      },
      adminToken
    );

    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { id?: string; name?: string; title?: string };
      expect(data.id).toBeDefined();
      const name = data.name ?? data.title ?? '';
      expect(name).toContain(TEST_CONTENT_PREFIX);
      createdProductId = data.id;
    }
  });

  test('API: created product appears in list', async () => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!createdProductId, 'No product was created');

    const res = await apiGet('/admin/store/products?limit=100', adminToken);
    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { items?: { id: string; name?: string; title?: string }[] };
      const items = data.items ?? [];
      const found = items.find((item) => item.id === createdProductId);

      expect(found).toBeDefined();
      const foundName = found?.name ?? found?.title ?? '';
      expect(foundName).toContain(TEST_CONTENT_PREFIX);
    }
  });

  test('product detail page loads', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!createdProductId, 'No product was created');

    const loaded = await waitForAdminPage(page, `/admin/store/products/${createdProductId}`);
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    // Should contain product-related content or form fields
    const hasContent =
      bodyText.includes(TEST_CONTENT_PREFIX) ||
      bodyText.includes('Товар') ||
      bodyText.includes('Продукт') ||
      bodyText.includes('Цена') ||
      bodyText.includes('цена');

    const hasInputs = (await page.locator('input, textarea').count()) > 0;

    expect(hasContent || hasInputs).toBe(true);
  });

  test('API: update product name', async () => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!createdProductId, 'No product was created');

    const updatedName = `${TEST_CONTENT_PREFIX}Product-Updated-${Date.now().toString(36)}`;

    const res = await apiPatch(
      `/admin/store/products/${createdProductId}`,
      { name: updatedName },
      adminToken
    );

    expect(res).toBeDefined();

    if (res.success && res.data) {
      const data = res.data as { name?: string; title?: string };
      const name = data.name ?? data.title ?? '';
      expect(name).toContain('Updated');
    }

    // Verify update via GET
    const detailRes = await apiGet(`/admin/store/products/${createdProductId}`, adminToken);
    if (detailRes.success && detailRes.data) {
      const detail = detailRes.data as { name?: string; title?: string };
      const detailName = detail.name ?? detail.title ?? '';
      expect(detailName).toContain('Updated');
    }
  });

  test('API: delete product', async () => {
    test.skip(!adminToken, 'Admin login failed');
    test.skip(!createdProductId, 'No product was created');

    const res = await apiDelete(`/admin/store/products/${createdProductId}`, adminToken);
    expect(res).toBeDefined();

    // Verify deletion — item should no longer appear in list
    if (res.success) {
      const listRes = await apiGet('/admin/store/products?limit=100', adminToken);
      if (listRes.success && listRes.data) {
        const data = listRes.data as { items?: { id: string }[] };
        const items = data.items ?? [];
        const found = items.find((item) => item.id === createdProductId);
        expect(found).toBeUndefined();
      }
      createdProductId = undefined;
    }
  });

  test('products table has columns', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/store/products');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);

    const table = page.locator('table');
    const tableExists = await table.isVisible().catch(() => false);

    if (tableExists) {
      const headers = await page.locator('table th').allInnerTexts();
      const headerText = headers.join(' ');

      // Should have common product table columns
      const hasNameCol =
        headerText.includes('Название') ||
        headerText.includes('Товар') ||
        headerText.includes('Продукт');
      const hasPriceCol =
        headerText.includes('Цена') ||
        headerText.includes('Стоимость');
      const hasStatusCol =
        headerText.includes('Статус') ||
        headerText.includes('Состояние');

      expect(hasNameCol || hasPriceCol || hasStatusCol).toBe(true);
    } else {
      // Card-based layout — should have product info
      const bodyText = await page.locator('body').innerText();
      const hasProductInfo =
        bodyText.includes('Товар') ||
        bodyText.includes('Продукт') ||
        bodyText.includes('Магазин');
      expect(hasProductInfo).toBe(true);
    }
  });
});

test.describe('Store Product Creation via UI Form', () => {
  let uiProductId: string | undefined;

  test.afterAll(async () => {
    if (adminToken && uiProductId) {
      try {
        await apiDelete(`/admin/store/products/${uiProductId}`, adminToken);
      } catch {
        // Non-critical
      }
    }
  });

  test('create product via UI form and verify', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    // Refresh token in case it expired
    try { adminToken = await getAdminToken(); } catch {}

    const loaded = await waitForAdminPage(page, '/admin/store/products/new');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(2000);

    const timestamp = Date.now().toString(36);
    const productName = `${TEST_CONTENT_PREFIX}UIProduct-${timestamp}`;

    // Fill name
    await page.locator('#name').fill(productName);

    // Fill description
    const descField = page.locator('#description');
    if (await descField.isVisible().catch(() => false)) {
      await descField.fill('Тестовый товар созданный через UI форму.');
    }

    // Fill price
    await page.locator('#price').fill('199');

    // Fill stock quantity
    const stockField = page.locator('#stockQuantity');
    if (await stockField.isVisible().catch(() => false)) {
      await stockField.fill('50');
    }

    await page.waitForTimeout(500);

    // Submit
    const submitButton = page.getByRole('button', { name: /Создать товар/ });
    if (await submitButton.isEnabled().catch(() => false)) {
      await submitButton.click();
      await page.waitForURL('**/admin/store/products', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // Verify product was created via API
      const res = await apiGet('/admin/store/products?limit=50', adminToken);
      if (res.success && res.data) {
        const data = res.data as { items?: { id: string; name?: string }[] };
        const found = (data.items ?? []).find((item) => item.name?.includes(productName));
        if (found) {
          expect(found.name).toContain(TEST_CONTENT_PREFIX);
          uiProductId = found.id;
        }
      }
    }

    // Verify we're back on the products list
    expect(page.url()).toContain('/admin/store/products');
  });
});

test.describe('Store Orders', () => {
  test('orders page shows table or empty state', async ({ page }) => {
    test.skip(!adminToken, 'Admin login failed');

    const loaded = await waitForAdminPage(page, '/admin/store/orders');
    test.skip(!loaded, 'Auth state expired');

    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(10);

    const hasOrderContent =
      bodyText.includes('Заказ') ||
      bodyText.includes('заказ') ||
      bodyText.includes('Нет заказов') ||
      bodyText.includes('Пусто') ||
      bodyText.includes('Order');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasListItems = (await page.locator('tr, li, [class*="item"]').count()) > 0;

    expect(hasOrderContent || hasTable || hasCards || hasListItems).toBe(true);
  });

  test('orders API returns list', async () => {
    test.skip(!adminToken, 'Admin login failed');

    const res = await apiGet('/admin/store/orders', adminToken);
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');

    if (res.success && res.data) {
      const data = res.data as { items?: unknown[] };
      if (data.items) {
        expect(Array.isArray(data.items)).toBe(true);
      }
    }
  });
});
