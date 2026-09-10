import { expect, test } from '@playwright/test';

// 迴歸測試：旗杆、問號磚頂出、星星無敵、懸崖偵測。
// 這些行為曾以臨時測試驗證後刪除，現轉為常駐，避免後續改動造成退化。

test('碰到旗杆杆身可過關', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  // 旗杆柱 x=198（中心 3176），杆身 y 範圍 242～418。
  await page.evaluate(() => window.__pixelRunLeap.setPlayerPosition(3176, 350));
  await page.waitForFunction(() => window.__pixelRunLeap.getState().status === 'complete', null, {
    timeout: 5000,
  });

  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state.status).toBe('complete');
});

test('頂無標記問號磚會冒出金幣', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);
  await page.locator('canvas').click();

  // 無標記 ? 磚 tile(16,9)：中心 x=264，磚底 y=370；站地面跳躍頂磚。
  await page.evaluate(() => window.__pixelRunLeap.setPlayerPosition(264, 402));
  await page.waitForTimeout(150);
  await page.keyboard.down('Space');
  await page.waitForTimeout(200);
  await page.keyboard.up('Space');
  await page.waitForTimeout(800);

  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state.coins).toBe(1);
});

test('頂蘑菇磚追到蘑菇會變大', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);
  await page.locator('canvas').click();

  // 站在 (109,9) ? 磚頂跳躍，頂上方 (109,5) 蘑菇磚，再往右追滑出的蘑菇。
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.evaluate(() => window.__pixelRunLeap.setPlayerPosition(1752, 338));
    await page.waitForTimeout(150);
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    await page.keyboard.up('Space');
    await page.waitForTimeout(600);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowRight');
    const power = await page.evaluate(() => window.__pixelRunLeap.getState().power);
    if (power === 'super') {
      break;
    }
  }

  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state.power).toBe('super');
});

test('頂星星磚追到星星會無敵', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);
  await page.locator('canvas').click();

  // 星星 ? 磚 tile(101,9)：中心 x=1624；頂磚後左右追彈跳的星星。
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.evaluate(() => window.__pixelRunLeap.setPlayerPosition(1624, 402));
    await page.waitForTimeout(150);
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    await page.keyboard.up('Space');
    await page.waitForTimeout(600);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1200);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1200);
    await page.keyboard.up('ArrowLeft');
    const invincible = await page.evaluate(() => window.__pixelRunLeap.getState().invincible);
    if (invincible === true) {
      break;
    }
  }

  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state.invincible).toBe(true);
});

test('高台敵人到邊緣回頭不掉落', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);

  // getEnemies()[4] 出生高台（y≈274）；懸崖偵測應讓牠留守，不掉到地面 y=402。
  for (let i = 0; i < 6; i += 1) {
    await page.waitForTimeout(2000);
    const y = await page.evaluate(() => window.__pixelRunLeap.getEnemies()[4].y);
    expect(y).toBeLessThan(350);
  }
});

test('開局無靜態道具裸露', async ({ page }) => {
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);
  await page.waitForTimeout(500);

  // 有磚標記走頂出生成；無磚標記（1UP）藏進空閒問號磚；
  // 有標記種類不再靜態擺放，只剩無標記的花朵一朵靜態。
  const items = await page.evaluate(() => window.__pixelRunLeap.getItems());
  expect(items.powerUps).toEqual([{ type: 'flower', x: 620, y: 360 }]);
  expect(items.spawned).toEqual([]);
});

test('頂出的蘑菇15秒未吃會消失', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/?test=1');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__pixelRunLeapReady === true);
  await page.locator('canvas').click();

  // 頂 (109,5) 蘑菇磚後傳送離開不追，漫遊蘑菇逾時應自動移除且玩家維持小型。
  await page.evaluate(() => window.__pixelRunLeap.setPlayerPosition(1752, 338));
  await page.waitForTimeout(150);
  await page.keyboard.down('Space');
  await page.waitForTimeout(200);
  await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__pixelRunLeap.getItems().spawned.length > 0, null, {
    timeout: 6000,
  });
  await page.evaluate(() => window.__pixelRunLeap.setPlayerPosition(96, 402));
  await page.waitForFunction(() => window.__pixelRunLeap.getItems().spawned.length === 0, null, {
    timeout: 20000,
  });

  const state = await page.evaluate(() => window.__pixelRunLeap.getState());
  expect(state.power).toBe('small');
});
