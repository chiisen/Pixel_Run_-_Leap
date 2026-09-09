import { expect, test } from '@playwright/test';

test('loads the Pixel Run & Leap shell without browser errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle('Pixel Run & Leap');
  await expect(page.locator('canvas')).toBeVisible();
  expect(errors).toEqual([]);
});
