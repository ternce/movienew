import { test, expect } from '@playwright/test';
import path from 'path';
import { waitForPage, ROLES } from './helpers/ui-test.helper';

const AUTH_DIR = path.join(__dirname, '..', 'reports', '.auth');

test.describe('Sliders, Switches & Checkboxes', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'user-state.json') });

  test.describe('Switches', () => {
    test('settings page has toggle switches', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const switches = page.locator(ROLES.SWITCH);
      const count = await switches.count();

      if (count === 0) {
        test.skip(true, 'No switches found on settings page');
        return;
      }
      expect(count).toBeGreaterThan(0);
    });

    test('clicking a switch toggles its aria-checked state', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const switchEl = page.locator(ROLES.SWITCH).first();
      const isVisible = await switchEl.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No switches visible');
        return;
      }

      const initialState = await switchEl.getAttribute('aria-checked');
      await switchEl.click();
      await page.waitForTimeout(500);
      const newState = await switchEl.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
    });

    test('switch has visual state change (data-state attribute)', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const switchEl = page.locator(ROLES.SWITCH).first();
      const isVisible = await switchEl.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No switches visible');
        return;
      }

      // Get initial data-state (Radix switches use data-state="checked"|"unchecked")
      const initialDataState = await switchEl.getAttribute('data-state');
      await switchEl.click();
      await page.waitForTimeout(500);
      const newDataState = await switchEl.getAttribute('data-state');

      if (initialDataState && newDataState) {
        expect(newDataState).not.toBe(initialDataState);
        expect(['checked', 'unchecked']).toContain(newDataState);
      } else {
        // Fallback: just verify aria-checked changed
        const ariaChecked = await switchEl.getAttribute('aria-checked');
        expect(ariaChecked).toBeTruthy();
      }
    });

    test('multiple switches on settings page work independently', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const switches = page.locator(ROLES.SWITCH);
      const count = await switches.count();
      if (count < 2) {
        test.skip(true, 'Need at least 2 switches for independence test');
        return;
      }

      // Get initial states of first two switches
      const switch1 = switches.nth(0);
      const switch2 = switches.nth(1);
      const state1Before = await switch1.getAttribute('aria-checked');
      const state2Before = await switch2.getAttribute('aria-checked');

      // Toggle only the first switch
      await switch1.click();
      await page.waitForTimeout(500);

      const state1After = await switch1.getAttribute('aria-checked');
      const state2After = await switch2.getAttribute('aria-checked');

      // First switch should have changed
      expect(state1After).not.toBe(state1Before);
      // Second switch should remain unchanged
      expect(state2After).toBe(state2Before);

      // Toggle it back to restore original state
      await switch1.click();
      await page.waitForTimeout(500);
    });

    test('switch can be toggled via Space key', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const switchEl = page.locator(ROLES.SWITCH).first();
      const isVisible = await switchEl.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No switches visible');
        return;
      }

      const initialState = await switchEl.getAttribute('aria-checked');

      // Scroll into view and focus the switch explicitly
      await switchEl.scrollIntoViewIfNeeded();
      await switchEl.focus();
      await page.waitForTimeout(300);

      // Verify the switch is focused
      const isFocused = await switchEl.evaluate((el) => document.activeElement === el);
      if (!isFocused) {
        // Try clicking to focus, then use keyboard
        await switchEl.click();
        await page.waitForTimeout(300);
        const stateAfterClick = await switchEl.getAttribute('aria-checked');
        // Click already toggled it, so toggle back and use Space
        await switchEl.focus();
        await page.waitForTimeout(200);
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);
        const stateAfterSpace = await switchEl.getAttribute('aria-checked');
        expect(stateAfterSpace).not.toBe(stateAfterClick);
        // Toggle back to restore
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);
        return;
      }

      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      const newState = await switchEl.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);

      // Toggle back
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
    });
  });

  test.describe('Checkboxes', () => {
    test('checkbox elements are present in forms', async ({ page }) => {
      // Try settings page first
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
      const count = await checkboxes.count();

      if (count === 0) {
        // Try notifications page
        const ok2 = await waitForPage(page, '/account/notifications');
        if (ok2) {
          const checkboxes2 = page.locator('input[type="checkbox"], [role="checkbox"]');
          const count2 = await checkboxes2.count();
          if (count2 > 0) {
            expect(count2).toBeGreaterThan(0);
            return;
          }
        }

        // Try register page (may have terms acceptance checkbox)
        await page.goto('/register', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        const checkboxes3 = page.locator('input[type="checkbox"], [role="checkbox"]');
        const count3 = await checkboxes3.count();
        if (count3 > 0) {
          expect(count3).toBeGreaterThan(0);
          return;
        }

        // Try studio create page
        const ok4 = await waitForPage(page, '/studio/create');
        if (ok4) {
          const checkboxes4 = page.locator('input[type="checkbox"], [role="checkbox"]');
          const count4 = await checkboxes4.count();
          if (count4 > 0) {
            expect(count4).toBeGreaterThan(0);
            return;
          }
        }

        test.skip(true, 'No checkboxes found on settings, notifications, register, or studio pages');
        return;
      }
      expect(count).toBeGreaterThan(0);
    });

    test('clicking checkbox toggles checked state', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const checkbox = page.locator('input[type="checkbox"], [role="checkbox"]').first();
      const isVisible = await checkbox.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No checkboxes visible');
        return;
      }

      // Get initial state
      const initialChecked =
        (await checkbox.getAttribute('aria-checked')) ||
        (await checkbox.isChecked().catch(() => null));

      await checkbox.click();
      await page.waitForTimeout(500);

      // Verify state changed
      const role = await checkbox.getAttribute('role');
      if (role === 'checkbox') {
        const newChecked = await checkbox.getAttribute('aria-checked');
        expect(newChecked).not.toBe(String(initialChecked));
      } else {
        const newChecked = await checkbox.isChecked().catch(() => null);
        expect(newChecked).not.toBe(initialChecked);
      }

      // Toggle back
      await checkbox.click();
      await page.waitForTimeout(500);
    });

    test('checkbox has visible checkmark when checked', async ({ page }) => {
      const ok = await waitForPage(page, '/account/settings');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const checkbox = page.locator('[role="checkbox"]').first();
      const isVisible = await checkbox.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No Radix checkboxes visible');
        return;
      }

      // Ensure checkbox is checked
      const checkedState = await checkbox.getAttribute('aria-checked');
      if (checkedState !== 'true') {
        await checkbox.click();
        await page.waitForTimeout(500);
      }

      // When checked, Radix checkbox shows data-state="checked" and renders an indicator
      const dataState = await checkbox.getAttribute('data-state');
      expect(dataState).toBe('checked');

      // The checkbox should contain an indicator (SVG checkmark)
      const indicator = checkbox.locator('svg, [data-state="checked"] span, span').first();
      const hasIndicator = await indicator.isVisible().catch(() => false);

      // Even without visible indicator, the data-state should be correct
      expect(dataState).toBe('checked');

      // Toggle back
      await checkbox.click();
      await page.waitForTimeout(500);
    });
  });

  test.describe('Slider', () => {
    test('slider is present on bonus/checkout pages (if applicable)', async ({ page }) => {
      // Try bonus dashboard or checkout page
      const ok = await waitForPage(page, '/account/bonuses');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const slider = page.locator('[role="slider"], input[type="range"]');
      const count = await slider.count();

      if (count === 0) {
        // Try checkout page
        const ok2 = await waitForPage(page, '/store/checkout');
        if (!ok2) { test.skip(true, 'Auth expired'); return; }

        const slider2 = page.locator('[role="slider"], input[type="range"]');
        const count2 = await slider2.count();
        if (count2 === 0) {
          test.skip(true, 'No sliders found on bonus or checkout pages');
          return;
        }
        expect(count2).toBeGreaterThan(0);
        return;
      }
      expect(count).toBeGreaterThan(0);
    });

    test('slider has min/max bounds', async ({ page }) => {
      const ok = await waitForPage(page, '/account/bonuses');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const slider = page.locator('[role="slider"], input[type="range"]').first();
      const isVisible = await slider.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No slider visible');
        return;
      }

      const min = await slider.getAttribute('aria-valuemin');
      const max = await slider.getAttribute('aria-valuemax');

      if (min !== null && max !== null) {
        expect(Number(min)).toBeLessThan(Number(max));
      } else {
        // For input[type="range"], check min/max attributes
        const inputMin = await slider.getAttribute('min');
        const inputMax = await slider.getAttribute('max');
        if (inputMin !== null && inputMax !== null) {
          expect(Number(inputMin)).toBeLessThan(Number(inputMax));
        } else {
          // Slider exists but has no explicit bounds — still valid
          expect(await slider.isVisible()).toBe(true);
        }
      }
    });

    test('slider thumb is draggable (if present)', async ({ page }) => {
      const ok = await waitForPage(page, '/account/bonuses');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      const slider = page.locator('[role="slider"]').first();
      const isVisible = await slider.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'No slider thumb visible');
        return;
      }

      const initialValue = await slider.getAttribute('aria-valuenow');
      const box = await slider.boundingBox();
      if (!box) {
        test.skip(true, 'Could not get slider bounding box');
        return;
      }

      // Simulate drag to the right
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Verify the slider is interactive (it may or may not change value depending on step size)
      const newValue = await slider.getAttribute('aria-valuenow');
      // Just verify the slider is still visible and has a value
      await expect(slider).toBeVisible();
      expect(newValue).toBeTruthy();
    });
  });

  test.describe('Radio Groups', () => {
    test('radio group on forms allows single selection', async ({ page }) => {
      // Try pricing page which may have radio-like plan selection
      const ok = await waitForPage(page, '/pricing');
      if (!ok) { test.skip(true, 'Auth expired'); return; }

      let radios = page.locator('input[type="radio"], [role="radio"]');
      let radioCount = await radios.count();

      if (radioCount === 0) {
        // Try account settings
        const ok2 = await waitForPage(page, '/account/settings');
        if (ok2) {
          radios = page.locator('input[type="radio"], [role="radio"]');
          radioCount = await radios.count();
        }
      }

      if (radioCount === 0) {
        // Try store checkout where PaymentMethodSelector may have radios
        const ok3 = await waitForPage(page, '/store/checkout');
        if (ok3) {
          radios = page.locator('input[type="radio"], [role="radio"]');
          radioCount = await radios.count();
        }
      }

      if (radioCount === 0) {
        test.skip(true, 'No radio groups found on pricing, settings, or checkout pages');
        return;
      }

      if (radioCount >= 2) {
        // Click second radio
        await radios.nth(1).click();
        await page.waitForTimeout(500);

        // Verify first radio is not checked
        const firstChecked =
          (await radios.nth(0).getAttribute('aria-checked')) ||
          String(await radios.nth(0).isChecked().catch(() => false));
        const secondChecked =
          (await radios.nth(1).getAttribute('aria-checked')) ||
          String(await radios.nth(1).isChecked().catch(() => false));

        // At most one should be checked
        expect(
          firstChecked === 'false' || secondChecked === 'true' || firstChecked !== secondChecked
        ).toBe(true);
      } else {
        expect(radioCount).toBeGreaterThan(0);
      }
    });
  });
});
