import { test, expect } from '@playwright/test';

/**
 * Admin Store E2E Tests
 *
 * Tests for /admin/store/products and /admin/store/orders pages:
 * - Products: page rendering, stats cards, DataTable, search, filters, add button
 * - Orders: page rendering, stats cards, DataTable, search, status filters
 */

// ============ Products Mock Data ============

const MOCK_PRODUCT_STATS = {
  success: true,
  data: {
    totalProducts: 45,
    activeCount: 32,
    draftCount: 8,
    outOfStockCount: 5,
    discontinuedCount: 0,
  },
};

const MOCK_PRODUCTS = {
  success: true,
  data: {
    items: [
      {
        id: 'prod-1',
        name: 'Футболка MoviePlatform',
        slug: 'futbolka-movieplatform',
        description: 'Мерч футболка',
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Одежда', slug: 'odezhda' },
        price: 2500,
        bonusPrice: 250,
        allowsPartialBonus: true,
        stockQuantity: 100,
        images: [],
        status: 'ACTIVE',
        createdAt: '2025-07-01T10:00:00.000Z',
      },
      {
        id: 'prod-2',
        name: 'Кружка лимитированная',
        slug: 'kruzhka-limitirovannaya',
        description: 'Кружка с логотипом',
        categoryId: 'cat-2',
        category: { id: 'cat-2', name: 'Аксессуары', slug: 'aksessuary' },
        price: 1200,
        bonusPrice: null,
        allowsPartialBonus: false,
        stockQuantity: 0,
        images: [],
        status: 'OUT_OF_STOCK',
        createdAt: '2025-06-20T10:00:00.000Z',
      },
      {
        id: 'prod-3',
        name: 'Стикерпак',
        slug: 'stickerpak',
        description: 'Набор стикеров',
        categoryId: 'cat-2',
        category: { id: 'cat-2', name: 'Аксессуары', slug: 'aksessuary' },
        price: 500,
        bonusPrice: 50,
        allowsPartialBonus: true,
        stockQuantity: 500,
        images: [],
        status: 'DRAFT',
        createdAt: '2025-07-10T10:00:00.000Z',
      },
    ],
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1,
  },
};

// ============ Orders Mock Data ============

const MOCK_ORDER_STATS = {
  success: true,
  data: {
    totalOrders: 156,
    pendingCount: 12,
    processingCount: 8,
    shippedCount: 5,
    deliveredCount: 120,
    cancelledCount: 11,
    totalRevenue: 450000,
  },
};

const MOCK_ORDERS = {
  success: true,
  data: {
    items: [
      {
        id: 'order-1',
        userId: 'user-1',
        user: { id: 'user-1', email: 'buyer1@test.ru', firstName: 'Иван', lastName: 'Иванов' },
        status: 'PENDING',
        totalAmount: 2500,
        bonusAmountUsed: 0,
        shippingAddress: null,
        trackingNumber: null,
        items: [
          {
            orderId: 'order-1',
            productId: 'prod-1',
            product: { id: 'prod-1', name: 'Футболка MoviePlatform', slug: 'futbolka', images: [] },
            quantity: 1,
            priceAtPurchase: 2500,
            bonusUsed: 0,
          },
        ],
        createdAt: '2025-07-15T10:00:00.000Z',
      },
      {
        id: 'order-2',
        userId: 'user-2',
        user: { id: 'user-2', email: 'buyer2@test.ru', firstName: 'Пётр', lastName: 'Петров' },
        status: 'DELIVERED',
        totalAmount: 1200,
        bonusAmountUsed: 100,
        shippingAddress: null,
        trackingNumber: 'TRACK-123',
        items: [
          {
            orderId: 'order-2',
            productId: 'prod-2',
            product: { id: 'prod-2', name: 'Кружка лимитированная', slug: 'kruzhka', images: [] },
            quantity: 1,
            priceAtPurchase: 1200,
            bonusUsed: 100,
          },
        ],
        createdAt: '2025-07-10T10:00:00.000Z',
      },
    ],
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
};

test.describe('Admin Store - Products', () => {
  test.beforeEach(async ({ page }) => {
    // Set admin auth state
    await page.addInitScript(() => {
      window.localStorage.setItem('mp-auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          isHydrated: true,
          accessToken: 'mock-admin-token',
          user: {
            id: 'admin-1',
            email: 'admin@test.ru',
            role: 'ADMIN',
            firstName: 'Тест',
            lastName: 'Админ',
          },
        },
      }));
    });

    // Mock product stats API
    await page.route('**/api/v1/admin/store/products/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PRODUCT_STATS),
      });
    });

    // Mock products list API
    await page.route('**/api/v1/admin/store/products*', async (route) => {
      const url = route.request().url();
      if (url.includes('/stats')) return;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PRODUCTS),
      });
    });
  });

  test.describe('Page Rendering', () => {
    test('should display page title "Товары"', async ({ page }) => {
      await page.goto('/admin/store/products');

      await expect(page.getByText('Товары', { exact: false }).first()).toBeVisible();
    });

    test('should display description "Управление товарами магазина"', async ({ page }) => {
      await page.goto('/admin/store/products');

      await expect(page.getByText('Управление товарами магазина')).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display "Всего" stats card with product count', async ({ page }) => {
      await page.goto('/admin/store/products');

      await expect(page.getByText('Всего').first()).toBeVisible();
    });

    test('should display "Активные" stats card', async ({ page }) => {
      await page.goto('/admin/store/products');

      await expect(page.getByText('Активные')).toBeVisible();
    });

    test('should display "Черновики" stats card', async ({ page }) => {
      await page.goto('/admin/store/products');

      await expect(page.getByText('Черновики')).toBeVisible();
    });

    test('should display "Нет в наличии" stats card', async ({ page }) => {
      await page.goto('/admin/store/products');

      await expect(page.getByText('Нет в наличии')).toBeVisible();
    });
  });

  test.describe('Add Product Button', () => {
    test('should display "Добавить товар" button', async ({ page }) => {
      await page.goto('/admin/store/products');

      await expect(page.getByText('Добавить товар')).toBeVisible();
    });

    test('should have link to /admin/store/products/new', async ({ page }) => {
      await page.goto('/admin/store/products');

      const addButton = page.locator('a[href="/admin/store/products/new"]');
      await expect(addButton).toBeVisible();
    });
  });

  test.describe('Filters', () => {
    test('should display "Фильтры:" label', async ({ page }) => {
      await page.goto('/admin/store/products');

      await expect(page.getByText('Фильтры:')).toBeVisible();
    });

    test('should display search input for product name', async ({ page }) => {
      await page.goto('/admin/store/products');

      const searchInput = page.locator('input[placeholder*="Название"]');
      await expect(searchInput).toBeVisible();
    });
  });
});

test.describe('Admin Store - Orders', () => {
  test.beforeEach(async ({ page }) => {
    // Set admin auth state
    await page.addInitScript(() => {
      window.localStorage.setItem('mp-auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          isHydrated: true,
          accessToken: 'mock-admin-token',
          user: {
            id: 'admin-1',
            email: 'admin@test.ru',
            role: 'ADMIN',
            firstName: 'Тест',
            lastName: 'Админ',
          },
        },
      }));
    });

    // Mock order stats API
    await page.route('**/api/v1/admin/store/orders/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ORDER_STATS),
      });
    });

    // Mock orders list API
    await page.route('**/api/v1/admin/store/orders*', async (route) => {
      const url = route.request().url();
      if (url.includes('/stats')) return;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ORDERS),
      });
    });
  });

  test.describe('Page Rendering', () => {
    test('should display page title "Заказы"', async ({ page }) => {
      await page.goto('/admin/store/orders');

      await expect(page.getByText('Заказы', { exact: false }).first()).toBeVisible();
    });

    test('should display description "Управление заказами"', async ({ page }) => {
      await page.goto('/admin/store/orders');

      await expect(page.getByText('Управление заказами')).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display all 5 stats cards', async ({ page }) => {
      await page.goto('/admin/store/orders');

      await expect(page.getByText('Всего').first()).toBeVisible();
      await expect(page.getByText('Ожидание')).toBeVisible();
      await expect(page.getByText('Обработка')).toBeVisible();
      await expect(page.getByText('Отправлено')).toBeVisible();
      await expect(page.getByText('Доставлено')).toBeVisible();
    });
  });

  test.describe('Filters', () => {
    test('should display "Фильтры:" label', async ({ page }) => {
      await page.goto('/admin/store/orders');

      await expect(page.getByText('Фильтры:')).toBeVisible();
    });

    test('should display search input for email or order ID', async ({ page }) => {
      await page.goto('/admin/store/orders');

      const searchInput = page.locator('input[placeholder*="Email"]');
      await expect(searchInput).toBeVisible();
    });

    test('should display status filter dropdown with "Все статусы"', async ({ page }) => {
      await page.goto('/admin/store/orders');

      await expect(page.getByText('Все статусы')).toBeVisible();
    });
  });
});
