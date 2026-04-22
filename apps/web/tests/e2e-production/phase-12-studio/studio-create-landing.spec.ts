/**
 * Studio Create Landing Page — Production E2E Tests
 *
 * Validates the /studio/create type selector page with 4 content type cards:
 * Сериал, Клип, Шорт, Туториал — each linking to its dedicated wizard.
 * Uses admin-state.json storageState (ADMIN role).
 */

import { test, expect } from '@playwright/test';
import { waitForStudioPage } from './helpers/studio-test.helper';

test.describe('Studio Create Landing Page', () => {
  test('page loads with "Что вы хотите создать?" heading', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired — redirected to login');

    await expect(page.getByText('Что вы хотите создать?')).toBeVisible({ timeout: 10_000 });
  });

  test('shows all 4 content type cards', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    expect(bodyText).toContain('Сериал');
    expect(bodyText).toContain('Клип');
    expect(bodyText).toContain('Шорт');
    expect(bodyText).toContain('Туториал');
  });

  test('each card has correct description text', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    const bodyText = await page.locator('body').innerText();

    expect(bodyText).toContain('Многосерийный контент с сезонами и эпизодами');
    expect(bodyText).toContain('Музыкальные клипы, трейлеры и промо-видео');
    expect(bodyText).toContain('Короткие вертикальные видео до 60 секунд');
    expect(bodyText).toContain('Обучающие курсы с главами и уроками');
  });

  test('Сериал card links to /studio/create/series', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    const seriesLink = page.locator('a[href="/studio/create/series"]');
    await expect(seriesLink).toBeVisible();
    expect(await seriesLink.innerText()).toContain('Сериал');
  });

  test('Клип card links to /studio/create/clip', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    const clipLink = page.locator('a[href="/studio/create/clip"]');
    await expect(clipLink).toBeVisible();
    expect(await clipLink.innerText()).toContain('Клип');
  });

  test('Шорт card links to /studio/create/short', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    const shortLink = page.locator('a[href="/studio/create/short"]');
    await expect(shortLink).toBeVisible();
    expect(await shortLink.innerText()).toContain('Шорт');
  });

  test('Туториал card links to /studio/create/tutorial', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    const tutorialLink = page.locator('a[href="/studio/create/tutorial"]');
    await expect(tutorialLink).toBeVisible();
    expect(await tutorialLink.innerText()).toContain('Туториал');
  });

  test('clicking Сериал card navigates to series wizard', async ({ page }) => {
    const loaded = await waitForStudioPage(page, '/studio/create');
    test.skip(!loaded, 'Auth state expired');

    await page.locator('a[href="/studio/create/series"]').click();
    await page.waitForURL('**/studio/create/series', { timeout: 15_000 });
    expect(page.url()).toContain('/studio/create/series');
  });
});
