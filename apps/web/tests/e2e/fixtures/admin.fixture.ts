import { test as base, expect, type Page, type Locator } from '@playwright/test';

/**
 * Admin test user credentials
 */
export const ADMIN_USER = {
  email: 'admin@test.movieplatform.ru',
  password: 'TestAdmin123!',
  firstName: 'Тест',
  lastName: 'Админ',
  role: 'ADMIN' as const,
};

/**
 * Mock admin dashboard data
 */
export const MOCK_ADMIN_STATS = {
  users: {
    total: 1250,
    newToday: 15,
    activeThisWeek: 450,
    pendingVerification: 8,
  },
  content: {
    total: 320,
    published: 280,
    draft: 25,
    pendingReview: 15,
  },
  subscriptions: {
    active: 850,
    newThisMonth: 120,
    revenue: 1250000,
    churnRate: 2.5,
  },
  partners: {
    total: 45,
    activeThisMonth: 32,
    pendingWithdrawals: 5,
    totalCommissions: 350000,
  },
};

/**
 * Mock users list for admin
 */
export const MOCK_ADMIN_USERS = [
  {
    id: 'user-1',
    email: 'user1@test.ru',
    firstName: 'Иван',
    lastName: 'Иванов',
    role: 'USER',
    verificationStatus: 'VERIFIED',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-2',
    email: 'user2@test.ru',
    firstName: 'Петр',
    lastName: 'Петров',
    role: 'USER',
    verificationStatus: 'PENDING',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-3',
    email: 'partner@test.ru',
    firstName: 'Мария',
    lastName: 'Сидорова',
    role: 'PARTNER',
    verificationStatus: 'VERIFIED',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Mock content list for admin
 */
export const MOCK_ADMIN_CONTENT = [
  {
    id: 'content-1',
    title: 'Сериал 1',
    slug: 'serial-1',
    contentType: 'SERIES',
    status: 'PUBLISHED',
    ageCategory: 'AGE_16',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'content-2',
    title: 'Сериал 2',
    slug: 'serial-2',
    contentType: 'SERIES',
    status: 'DRAFT',
    ageCategory: 'AGE_12',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Admin dashboard page object model
 */
export class AdminDashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly usersCard: Locator;
  readonly contentCard: Locator;
  readonly subscriptionsCard: Locator;
  readonly partnersCard: Locator;
  readonly recentActivityList: Locator;
  readonly quickActionsPanel: Locator;
  readonly notificationsBell: Locator;
  readonly userMenu: Locator;
  readonly sidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, [data-testid="admin-heading"]');
    this.usersCard = page.locator('[data-testid="users-card"], .stat-card:has-text("Пользователи")');
    this.contentCard = page.locator('[data-testid="content-card"], .stat-card:has-text("Контент")');
    this.subscriptionsCard = page.locator('[data-testid="subscriptions-card"], .stat-card:has-text("Подписки")');
    this.partnersCard = page.locator('[data-testid="partners-card"], .stat-card:has-text("Партнёры")');
    this.recentActivityList = page.locator('[data-testid="recent-activity"], .recent-activity');
    this.quickActionsPanel = page.locator('[data-testid="quick-actions"], .quick-actions');
    this.notificationsBell = page.locator('[data-testid="notifications-bell"], .notifications-bell');
    this.userMenu = page.locator('[data-testid="user-menu"], .user-menu');
    this.sidebar = page.locator('[data-testid="admin-sidebar"], aside, nav.sidebar');
  }

  async goto() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToUsers() {
    await this.sidebar.getByRole('link', { name: /пользователи/i }).click();
    await this.page.waitForURL('/admin/users**');
  }

  async navigateToContent() {
    await this.sidebar.getByRole('link', { name: /контент/i }).click();
    await this.page.waitForURL('/admin/content**');
  }

  async navigateToSubscriptions() {
    await this.sidebar.getByRole('link', { name: /подписки/i }).click();
    await this.page.waitForURL('/admin/subscriptions**');
  }

  async navigateToPartners() {
    await this.sidebar.getByRole('link', { name: /партнёры/i }).click();
    await this.page.waitForURL('/admin/partners**');
  }

  async navigateToVerifications() {
    await this.sidebar.getByRole('link', { name: /верификаци/i }).click();
    await this.page.waitForURL('/admin/verifications**');
  }

  async expectStatsLoaded() {
    await expect(this.usersCard).toBeVisible();
    await expect(this.contentCard).toBeVisible();
    await expect(this.subscriptionsCard).toBeVisible();
  }
}

/**
 * Admin users page object model
 */
export class AdminUsersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly usersTable: Locator;
  readonly userRow: Locator;
  readonly createUserButton: Locator;
  readonly pagination: Locator;
  readonly bulkActionsButton: Locator;
  readonly exportButton: Locator;
  readonly roleFilter: Locator;
  readonly statusFilter: Locator;
  readonly noResultsMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, [data-testid="users-heading"]');
    this.searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Поиск"]');
    this.filterButton = page.locator('[data-testid="filter-button"], button:has-text("Фильтры")');
    this.usersTable = page.locator('[data-testid="users-table"], table');
    this.userRow = page.locator('[data-testid="user-row"], tbody tr');
    this.createUserButton = page.locator('[data-testid="create-user"], button:has-text("Создать")');
    this.pagination = page.locator('[data-testid="pagination"], .pagination');
    this.bulkActionsButton = page.locator('[data-testid="bulk-actions"], button:has-text("Действия")');
    this.exportButton = page.locator('[data-testid="export-button"], button:has-text("Экспорт")');
    this.roleFilter = page.locator('[data-testid="role-filter"], select[name="role"]');
    this.statusFilter = page.locator('[data-testid="status-filter"], select[name="status"]');
    this.noResultsMessage = page.locator('[data-testid="no-results"], .no-results');
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner');
  }

  async goto() {
    await this.page.goto('/admin/users');
    await this.page.waitForLoadState('networkidle');
  }

  async searchUsers(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByRole(role: string) {
    await this.roleFilter.selectOption(role);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.page.waitForLoadState('networkidle');
  }

  async getUsersCount(): Promise<number> {
    return await this.userRow.count();
  }

  async clickUser(index: number) {
    await this.userRow.nth(index).click();
    await this.page.waitForURL('/admin/users/**');
  }

  async openUserMenu(index: number) {
    await this.userRow.nth(index).locator('[data-testid="user-menu"], .user-actions').click();
  }

  async expectUsersLoaded() {
    await expect(this.usersTable).toBeVisible();
    const count = await this.getUsersCount();
    expect(count).toBeGreaterThan(0);
  }

  async expectNoResults() {
    await expect(this.noResultsMessage).toBeVisible();
  }
}

/**
 * Admin content page object model
 */
export class AdminContentPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly contentTable: Locator;
  readonly contentRow: Locator;
  readonly createContentButton: Locator;
  readonly pagination: Locator;
  readonly typeFilter: Locator;
  readonly statusFilter: Locator;
  readonly ageFilter: Locator;
  readonly bulkActionsButton: Locator;
  readonly noResultsMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, [data-testid="content-heading"]');
    this.searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Поиск"]');
    this.filterButton = page.locator('[data-testid="filter-button"], button:has-text("Фильтры")');
    this.contentTable = page.locator('[data-testid="content-table"], table');
    this.contentRow = page.locator('[data-testid="content-row"], tbody tr');
    this.createContentButton = page.locator('[data-testid="create-content"], button:has-text("Добавить")');
    this.pagination = page.locator('[data-testid="pagination"], .pagination');
    this.typeFilter = page.locator('[data-testid="type-filter"], select[name="type"]');
    this.statusFilter = page.locator('[data-testid="status-filter"], select[name="status"]');
    this.ageFilter = page.locator('[data-testid="age-filter"], select[name="ageCategory"]');
    this.bulkActionsButton = page.locator('[data-testid="bulk-actions"], button:has-text("Действия")');
    this.noResultsMessage = page.locator('[data-testid="no-results"], .no-results');
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner');
  }

  async goto() {
    await this.page.goto('/admin/content');
    await this.page.waitForLoadState('networkidle');
  }

  async searchContent(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByType(type: string) {
    await this.typeFilter.selectOption(type);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByAge(ageCategory: string) {
    await this.ageFilter.selectOption(ageCategory);
    await this.page.waitForLoadState('networkidle');
  }

  async getContentCount(): Promise<number> {
    return await this.contentRow.count();
  }

  async clickContent(index: number) {
    await this.contentRow.nth(index).click();
    await this.page.waitForURL('/admin/content/**');
  }

  async openContentMenu(index: number) {
    await this.contentRow.nth(index).locator('[data-testid="content-menu"], .content-actions').click();
  }

  async publishContent(index: number) {
    await this.openContentMenu(index);
    await this.page.locator('button:has-text("Опубликовать")').click();
    await this.page.waitForLoadState('networkidle');
  }

  async unpublishContent(index: number) {
    await this.openContentMenu(index);
    await this.page.locator('button:has-text("Снять с публикации")').click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectContentLoaded() {
    await expect(this.contentTable).toBeVisible();
    const count = await this.getContentCount();
    expect(count).toBeGreaterThan(0);
  }

  async expectNoResults() {
    await expect(this.noResultsMessage).toBeVisible();
  }
}

/**
 * Admin verifications page object model
 */
export class AdminVerificationsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly pendingTab: Locator;
  readonly approvedTab: Locator;
  readonly rejectedTab: Locator;
  readonly verificationsTable: Locator;
  readonly verificationRow: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly viewDocumentsButton: Locator;
  readonly noResultsMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, [data-testid="verifications-heading"]');
    this.pendingTab = page.locator('[data-testid="pending-tab"], button:has-text("Ожидают")');
    this.approvedTab = page.locator('[data-testid="approved-tab"], button:has-text("Одобрены")');
    this.rejectedTab = page.locator('[data-testid="rejected-tab"], button:has-text("Отклонены")');
    this.verificationsTable = page.locator('[data-testid="verifications-table"], table');
    this.verificationRow = page.locator('[data-testid="verification-row"], tbody tr');
    this.approveButton = page.locator('[data-testid="approve-button"], button:has-text("Одобрить")');
    this.rejectButton = page.locator('[data-testid="reject-button"], button:has-text("Отклонить")');
    this.viewDocumentsButton = page.locator('[data-testid="view-documents"], button:has-text("Документы")');
    this.noResultsMessage = page.locator('[data-testid="no-results"], .no-results');
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading-spinner');
  }

  async goto() {
    await this.page.goto('/admin/verifications');
    await this.page.waitForLoadState('networkidle');
  }

  async switchToPending() {
    await this.pendingTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async switchToApproved() {
    await this.approvedTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async switchToRejected() {
    await this.rejectedTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getVerificationsCount(): Promise<number> {
    return await this.verificationRow.count();
  }

  async approveVerification(index: number) {
    await this.verificationRow.nth(index).locator(this.approveButton).click();
    await this.page.waitForLoadState('networkidle');
  }

  async rejectVerification(index: number, reason?: string) {
    await this.verificationRow.nth(index).locator(this.rejectButton).click();

    if (reason) {
      const reasonInput = this.page.locator('[data-testid="reject-reason"], textarea[name="reason"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill(reason);
      }
      await this.page.locator('button:has-text("Подтвердить")').click();
    }

    await this.page.waitForLoadState('networkidle');
  }

  async viewDocuments(index: number) {
    await this.verificationRow.nth(index).locator(this.viewDocumentsButton).click();
  }

  async expectVerificationsLoaded() {
    await expect(this.verificationsTable).toBeVisible();
  }
}

/**
 * Extended test fixture with admin helpers
 */
interface AdminFixtures {
  adminDashboardPage: AdminDashboardPage;
  adminUsersPage: AdminUsersPage;
  adminContentPage: AdminContentPage;
  adminVerificationsPage: AdminVerificationsPage;
  adminPage: Page;
  loginAsAdmin: () => Promise<void>;
  navigateToAdminSection: (section: 'dashboard' | 'users' | 'content' | 'subscriptions' | 'partners' | 'verifications') => Promise<void>;
}

/**
 * Create extended test with admin fixtures
 */
export const test = base.extend<AdminFixtures>({
  adminDashboardPage: async ({ page }, use) => {
    await use(new AdminDashboardPage(page));
  },

  adminUsersPage: async ({ page }, use) => {
    await use(new AdminUsersPage(page));
  },

  adminContentPage: async ({ page }, use) => {
    await use(new AdminContentPage(page));
  },

  adminVerificationsPage: async ({ page }, use) => {
    await use(new AdminVerificationsPage(page));
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  loginAsAdmin: async ({ page }, use) => {
    const login = async () => {
      await page.goto('/login');
      await page.fill('input[name="email"]', ADMIN_USER.email);
      await page.fill('input[name="password"]', ADMIN_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(admin)?/);
    };
    await use(login);
  },

  navigateToAdminSection: async ({ page }, use) => {
    const navigate = async (section: 'dashboard' | 'users' | 'content' | 'subscriptions' | 'partners' | 'verifications') => {
      const urls: Record<string, string> = {
        dashboard: '/admin',
        users: '/admin/users',
        content: '/admin/content',
        subscriptions: '/admin/subscriptions',
        partners: '/admin/partners',
        verifications: '/admin/verifications',
      };
      await page.goto(urls[section]);
      await page.waitForLoadState('networkidle');
    };
    await use(navigate);
  },
});

export { expect };

/**
 * Mock admin API responses for isolated tests
 */
export async function mockAdminApi(page: Page) {
  // Mock dashboard stats
  await page.route('**/api/v1/admin/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_ADMIN_STATS }),
    });
  });

  // Mock users list
  await page.route('**/api/v1/admin/users*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_ADMIN_USERS,
        meta: { total: MOCK_ADMIN_USERS.length, page: 1, limit: 10 },
      }),
    });
  });

  // Mock content list
  await page.route('**/api/v1/admin/content*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_ADMIN_CONTENT,
        meta: { total: MOCK_ADMIN_CONTENT.length, page: 1, limit: 10 },
      }),
    });
  });
}

/**
 * Helper to wait for admin page to load
 */
export async function waitForAdminPageLoad(page: Page, timeout = 10000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
  // Wait for sidebar to be visible (indicates admin layout loaded)
  await page.waitForSelector('[data-testid="admin-sidebar"], aside, nav.sidebar', { timeout });
}

/**
 * Helper to verify admin access
 */
export async function verifyAdminAccess(page: Page): Promise<boolean> {
  try {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Check if redirected to login or access denied
    const url = page.url();
    return url.includes('/admin') && !url.includes('/login');
  } catch {
    return false;
  }
}
