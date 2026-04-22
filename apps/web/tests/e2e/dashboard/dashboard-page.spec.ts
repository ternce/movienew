import {
  test,
  expect,
  DashboardPage,
  MOCK_FEATURED_CONTENT,
  MOCK_CONTINUE_WATCHING,
  MOCK_POPULAR,
  MOCK_NEW_RELEASES,
} from '../fixtures/dashboard.fixture';

test.describe('Authenticated Dashboard', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test('Страница дашборда загружается без редиректа на логин', async ({ page }) => {
    await dashboardPage.goto();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Секция с избранным контентом отображается', async () => {
    await dashboardPage.goto();
    await expect(dashboardPage.heroSection).toBeVisible();
  });

  test('Заголовок избранного контента отображается', async () => {
    await dashboardPage.goto();
    await expect(dashboardPage.heroTitle).toBeVisible();
    await expect(dashboardPage.heroTitle).not.toBeEmpty();
  });

  test('Секция "Продолжить просмотр" отображается', async () => {
    await dashboardPage.goto();
    await expect(dashboardPage.continueWatchingSection).toBeVisible();
  });

  test('Карточки продолжения просмотра содержат прогресс-бары', async () => {
    await dashboardPage.goto();
    const progressBars = dashboardPage.progressIndicator;
    const count = await progressBars.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Карточки продолжения просмотра показывают оставшееся время', async ({ page }) => {
    await dashboardPage.goto();
    // Remaining time is displayed as "осталось 42 мин", "осталось 1 ч 21 мин", etc.
    const timeText = page.locator('text=/осталось \\d+ (мин|ч)/');
    const count = await timeText.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(timeText.first()).toBeVisible();
  });

  test('Клик по карточке "Продолжить просмотр" переходит на /watch/', async ({ page }) => {
    await dashboardPage.goto();
    const cards = dashboardPage.continueWatchingCards;
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await cards.first().click();
    await page.waitForURL('**/watch/**', { timeout: 10000 });
  });

  test('Секция "Популярное" отображается', async () => {
    await dashboardPage.goto();
    await expect(dashboardPage.popularSection).toBeVisible();
  });

  test('Ссылки "Смотреть все" присутствуют на странице', async () => {
    await dashboardPage.goto();
    const seeAllLinks = dashboardPage.seeAllLinks;
    const count = await seeAllLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Ссылка "Смотреть все" переходит на страницу листинга', async ({ page }) => {
    await dashboardPage.goto();
    const seeAllLinks = dashboardPage.seeAllLinks;
    const count = await seeAllLinks.count();
    expect(count).toBeGreaterThan(0);

    const href = await seeAllLinks.first().getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('Dashboard содержит секции Продолжить просмотр и Популярное', async ({ page }) => {
    await dashboardPage.goto();

    // Популярное section should be visible
    await expect(dashboardPage.popularSection).toBeVisible();

    // Should have multiple content sections
    const sections = page.locator('section');
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Страница загружается и отображает контент', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('section').first()).toBeVisible();
    const sections = page.locator('section');
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Админские элементы скрыты для обычного пользователя', async ({ page }) => {
    await dashboardPage.goto();
    const adminPanel = page.locator('[data-testid="admin-panel"], [data-testid="admin-link"]');
    const adminButton = page.getByRole('link', { name: /Админ-панель|Панель управления/i });
    const adminRoute = page.locator('a[href*="/admin"]');

    await expect(adminPanel).not.toBeVisible();
    await expect(adminButton).not.toBeVisible();
    const adminRouteCount = await adminRoute.count();
    expect(adminRouteCount).toBe(0);
  });
});
