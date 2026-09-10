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
  await page.keyboard.press('Space');
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
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state).toMatchObject({ lives: 3, status: 'playing', timeRemaining: 300 });
});

test('手機觸控按鈕可讓玩家向右移動', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  const startX = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);
  await page.locator('#touch-right').dispatchEvent('pointerdown');
  await page.waitForTimeout(250);
  await page.locator('#touch-right').dispatchEvent('pointerup');
  const endX = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);

  expect(endX).toBeGreaterThan(startX);
});

test('按下 P 鍵之後物理停止並顯示暫停文字', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  const movingStart = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);
  await page.locator('canvas').click();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(50);
  await page.keyboard.up('ArrowRight');
  const moved = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);
  expect(moved).toBeGreaterThan(movingStart);

  await page.locator('canvas').press('p');
  const paused = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(paused.paused).toBe(true);

  const duringPause = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);
  await page.waitForTimeout(400);
  const pausedStill = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);
  expect(pausedStill).toBe(duringPause);

  await page.locator('canvas').press('p');
  const resumed = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(resumed.paused).toBe(false);
});

test('moves the player with keyboard input', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  const startX = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowRight');
  const endX = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);

  expect(endX).toBeGreaterThan(startX);
});

test('物理世界寬度涵蓋完整關卡', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  const bounds = await page.evaluate(() => window.__pixelRunLeap.getWorldBounds());
  expect(bounds.width).toBeGreaterThan(800);
});

test('從地圖載入 Goomba 與龜型敵人', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  const enemyTypes = await page.evaluate(() => [
    ...new Set(window.__pixelRunLeap.getEnemies().map((enemy) => enemy.type)),
  ]);
  expect(enemyTypes).toEqual(expect.arrayContaining(['goomba', 'turtle']));
});

test('玩家從敵人上方落下時可以踩踏敵人', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  const enemy = await page.evaluate(() => window.__pixelRunLeap.getEnemies()[0]);
  await page.evaluate(({ x, y }) => {
    window.__pixelRunLeap.setPlayerPosition(x, y - 40);
  }, enemy);
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state.score).toBeGreaterThanOrEqual(100);
});

test('玩家連續掉出地圖三次後進入 Game Over', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.evaluate(() => window.__pixelRunLeap.setPlayerPosition(100, 1000));
    await page.waitForTimeout(350);
  }

  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state).toMatchObject({ lives: 0, status: 'game-over' });
});

test('可以從標題畫面關閉背景音樂', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(() => {
    window.__pixelRunLeapAudio.musicEnabled = false;
  });
  const audioState = await page.evaluate(() => window.__pixelRunLeapAudio);
  expect(audioState.musicEnabled).toBe(false);
});

test('Game Over 按 R 後重設狀態並恢復移動', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.evaluate(() => window.__pixelRunLeap.setPlayerPosition(100, 1000));
    await page.waitForTimeout(350);
  }

  await page.keyboard.press('r');
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state).toMatchObject({ lives: 3, status: 'playing' });

  const startX = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowRight');
  const endX = await page.evaluate(() => window.__pixelRunLeap.getPlayer().x);
  expect(endX).toBeGreaterThan(startX);
});
