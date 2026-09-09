import { expect, test } from '@playwright/test';

test('loads the Pixel Run & Leap shell without browser errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.goto('/');

  await expect(page).toHaveTitle('Pixel Run & Leap');
  await expect(page.locator('canvas')).toBeVisible();
  await page.locator('#start-game').click();
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);
  expect(errors).toEqual([]);
});

test('shows touch controls on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await expect(page.locator('#touch-left')).toBeVisible();
  await expect(page.locator('#touch-right')).toBeVisible();
  await expect(page.locator('#touch-jump')).toBeVisible();
});

test('exposes deterministic debug state in test mode', async ({ page }) => {
  await page.goto('/?debug=1&test=1');
  await page.locator('#start-game').click();
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state).toMatchObject({ lives: 3, status: 'playing', timeRemaining: 300 });
});
