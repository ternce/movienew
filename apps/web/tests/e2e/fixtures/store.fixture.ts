import { test as base, expect, type Page } from '@playwright/test';
import { TEST_USERS } from './auth.fixture';

// =============================================================================
// Mock Data
// =============================================================================

export const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Мерч', slug: 'merch', order: 1 },
  { id: 'cat-2', name: 'Аксессуары', slug: 'accessories', order: 2 },
  { id: 'cat-3', name: 'Подарки', slug: 'gifts', order: 3 },
];

export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Футболка MoviePlatform',
    slug: 'futbolka-movieplatform',
    description: 'Стильная футболка с логотипом MoviePlatform из 100% хлопка.',
    category: MOCK_CATEGORIES[0],
    price: 1990,
    bonusPrice: 3000,
    allowsPartialBonus: true,
    stockQuantity: 50,
    inStock: true,
    images: ['/images/product-1.jpg', '/images/product-1b.jpg'],
    status: 'ACTIVE',
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'Кепка с вышивкой',
    slug: 'kepka-s-vyshivkoy',
    description: 'Бейсболка с вышитым логотипом.',
    category: MOCK_CATEGORIES[1],
    price: 990,
    bonusPrice: 1500,
    allowsPartialBonus: true,
    stockQuantity: 30,
    inStock: true,
    images: ['/images/product-2.jpg'],
    status: 'ACTIVE',
    createdAt: '2024-12-02T10:00:00Z',
  },
  {
    id: 'prod-3',
    name: 'Постер коллекционный',
    slug: 'poster-kollektsionnyy',
    description: 'Коллекционный постер с автографом.',
    category: MOCK_CATEGORIES[2],
    price: 2490,
    bonusPrice: undefined,
    allowsPartialBonus: false,
    stockQuantity: 0,
    inStock: false,
    images: [],
    status: 'OUT_OF_STOCK',
    createdAt: '2024-12-03T10:00:00Z',
  },
  {
    id: 'prod-4',
    name: 'Кружка тематическая',
    slug: 'kruzhka-tematicheskaya',
    description: 'Кружка с тематическим принтом.',
    category: MOCK_CATEGORIES[2],
    price: 690,
    bonusPrice: 1000,
    allowsPartialBonus: true,
    stockQuantity: 100,
    inStock: true,
    images: ['/images/product-4.jpg'],
    status: 'ACTIVE',
    createdAt: '2024-12-04T10:00:00Z',
  },
  {
    id: 'prod-5',
    name: 'Брелок MoviePlatform',
    slug: 'brelok-movieplatform',
    description: 'Металлический брелок.',
    category: MOCK_CATEGORIES[1],
    price: 390,
    bonusPrice: 600,
    allowsPartialBonus: true,
    stockQuantity: 200,
    inStock: true,
    images: ['/images/product-5.jpg'],
    status: 'ACTIVE',
    createdAt: '2024-12-05T10:00:00Z',
  },
  {
    id: 'prod-6',
    name: 'Худи Premium',
    slug: 'hudi-premium',
    description: 'Тёплое худи премиум качества.',
    category: MOCK_CATEGORIES[0],
    price: 4990,
    bonusPrice: 7500,
    allowsPartialBonus: true,
    stockQuantity: 15,
    inStock: true,
    images: ['/images/product-6.jpg', '/images/product-6b.jpg'],
    status: 'ACTIVE',
    createdAt: '2024-12-06T10:00:00Z',
  },
];

export const MOCK_CART = {
  items: [
    {
      productId: 'prod-1',
      productName: 'Футболка MoviePlatform',
      productSlug: 'futbolka-movieplatform',
      productImage: '/images/product-1.jpg',
      price: 1990,
      bonusPrice: 3000,
      quantity: 2,
      totalPrice: 3980,
      inStock: true,
      availableQuantity: 50,
    },
    {
      productId: 'prod-4',
      productName: 'Кружка тематическая',
      productSlug: 'kruzhka-tematicheskaya',
      productImage: '/images/product-4.jpg',
      price: 690,
      bonusPrice: 1000,
      quantity: 1,
      totalPrice: 690,
      inStock: true,
      availableQuantity: 100,
    },
  ],
  itemCount: 2,
  totalQuantity: 3,
  totalAmount: 4670,
  maxBonusApplicable: 2335,
  updatedAt: new Date().toISOString(),
};

export const MOCK_CART_SUMMARY = {
  itemCount: 2,
  totalAmount: 4670,
};

export const MOCK_EMPTY_CART = {
  items: [],
  itemCount: 0,
  totalQuantity: 0,
  totalAmount: 0,
  maxBonusApplicable: 0,
  updatedAt: new Date().toISOString(),
};

export const MOCK_ORDERS = [
  {
    id: 'order-1',
    status: 'DELIVERED',
    items: [
      {
        productId: 'prod-1',
        productName: 'Футболка MoviePlatform',
        productImage: '/images/product-1.jpg',
        quantity: 1,
        priceAtPurchase: 1990,
        bonusUsed: 0,
        total: 1990,
      },
    ],
    totalAmount: 1990,
    bonusAmountUsed: 0,
    amountPaid: 1990,
    shippingAddress: {
      fullName: 'Тест Пользователь',
      phone: '+71234567890',
      postalCode: '123456',
      city: 'Москва',
      address: 'ул. Тестовая, д. 1',
    },
    trackingNumber: 'RU123456789',
    createdAt: '2024-11-15T10:00:00Z',
  },
  {
    id: 'order-2',
    status: 'PROCESSING',
    items: [
      {
        productId: 'prod-4',
        productName: 'Кружка тематическая',
        productImage: '/images/product-4.jpg',
        quantity: 2,
        priceAtPurchase: 690,
        bonusUsed: 200,
        total: 1180,
      },
    ],
    totalAmount: 1380,
    bonusAmountUsed: 200,
    amountPaid: 1180,
    shippingAddress: {
      fullName: 'Тест Пользователь',
      phone: '+71234567890',
      postalCode: '123456',
      city: 'Москва',
      address: 'ул. Тестовая, д. 1',
    },
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: 'order-3',
    status: 'PENDING',
    items: [
      {
        productId: 'prod-6',
        productName: 'Худи Premium',
        productImage: null,
        quantity: 1,
        priceAtPurchase: 4990,
        bonusUsed: 0,
        total: 4990,
      },
    ],
    totalAmount: 4990,
    bonusAmountUsed: 0,
    amountPaid: 4990,
    shippingAddress: {
      fullName: 'Тест Пользователь',
      phone: '+71234567890',
      postalCode: '654321',
      city: 'Санкт-Петербург',
      address: 'Невский проспект, д. 10',
    },
    createdAt: '2024-12-10T10:00:00Z',
  },
];

export const MOCK_ORDER_DETAIL = MOCK_ORDERS[0];

// =============================================================================
// Mock API
// =============================================================================

export async function mockStoreApi(page: Page) {
  // Products list
  await page.route('**/api/v1/store/products?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_PRODUCTS, total: MOCK_PRODUCTS.length, page: 1, limit: 12 },
      }),
    });
  });

  // Products without query params
  await page.route('**/api/v1/store/products', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: MOCK_PRODUCTS, total: MOCK_PRODUCTS.length, page: 1, limit: 12 },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Categories
  await page.route('**/api/v1/store/products/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_CATEGORIES }),
    });
  });

  // Product by slug
  await page.route('**/api/v1/store/products/slug/*', async (route) => {
    const url = route.request().url();
    const slug = url.split('/slug/')[1]?.split('?')[0];
    const product = MOCK_PRODUCTS.find((p) => p.slug === slug);

    if (product) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: product }),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Not found' } }),
      });
    }
  });

  // Cart
  await page.route('**/api/v1/store/cart', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART }),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_EMPTY_CART }),
      });
    } else {
      await route.fallback();
    }
  });

  // Cart summary
  await page.route('**/api/v1/store/cart/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_CART_SUMMARY }),
    });
  });

  // Cart items (add)
  await page.route('**/api/v1/store/cart/items', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART }),
      });
    } else {
      await route.fallback();
    }
  });

  // Cart item (update/remove)
  await page.route('**/api/v1/store/cart/items/*', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART }),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.fallback();
    }
  });

  // Orders list
  await page.route('**/api/v1/store/orders?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_ORDERS, total: MOCK_ORDERS.length, page: 1, limit: 10 },
      }),
    });
  });

  // Orders (no query params) — POST (create order)
  await page.route('**/api/v1/store/orders', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: MOCK_ORDERS, total: MOCK_ORDERS.length, page: 1, limit: 10 },
        }),
      });
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orderId: 'order-new',
            transactionId: 'tx-new',
            status: 'COMPLETED',
            amount: 4670,
            bonusAmountUsed: 0,
            amountToPay: 4670,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Single order
  await page.route('**/api/v1/store/orders/*/cancel', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...MOCK_ORDERS[2], status: 'CANCELLED' },
        }),
      });
    } else {
      await route.fallback();
    }
  });

  await page.route(/\/api\/v1\/store\/orders\/[^/]+$/, async (route) => {
    if (route.request().method() === 'GET') {
      const url = route.request().url();
      const orderId = url.split('/orders/')[1]?.split('?')[0];
      const order = MOCK_ORDERS.find((o) => o.id === orderId) || MOCK_ORDER_DETAIL;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: order }),
      });
    } else {
      await route.fallback();
    }
  });

  // Bonus balance
  await page.route('**/api/v1/bonuses/balance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { balance: 500 } }),
    });
  });

  // Max applicable bonuses
  await page.route('**/api/v1/bonuses/max-applicable*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { maxAmount: 2335 } }),
    });
  });

  // Mock auth state
  await page.addInitScript(() => {
    localStorage.setItem('mp-auth-storage', JSON.stringify({
      state: {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        isAuthenticated: true,
        isHydrated: true,
        user: {
          id: 'user-1',
          email: 'user@test.movieplatform.ru',
          firstName: 'Тест',
          lastName: 'Пользователь',
          role: 'USER',
        },
      },
    }));
  });
}

// =============================================================================
// Test Fixture
// =============================================================================

interface StoreFixtures {
  mockApi: void;
}

export const test = base.extend<StoreFixtures>({
  mockApi: [
    async ({ page }, use) => {
      await mockStoreApi(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
