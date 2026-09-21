import { expect, test } from '@playwright/test';

test.describe('操作歷程記錄系統 (ActionLogger)', () => {
  test('遊戲啟動後可透過全域介面取得初始日誌且無 console.error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForFunction(() => window.__pixelRunLeapAudio !== undefined);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__pixelRunLeapReady === true);

    const logs = await page.evaluate(() => window.__pixelRunLeap.getLogs());
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);

    const sceneLog = logs.find((l) => l.category === 'system' && l.action === 'scene_start');
    expect(sceneLog).toBeDefined();
    expect(errors).toEqual([]);
  });

  test('記錄玩家移動、跳躍與暫停事件及其狀態快照', async ({ page }) => {
    await page.goto('/?test=1');
    await page.waitForFunction(() => window.__pixelRunLeapAudio !== undefined);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__pixelRunLeapReady === true);

    // 等待玩家落地
    await page.waitForFunction(() =>
      window.__pixelRunLeap
        .getLogs()
        .some((l) => l.category === 'player' && l.action === 'land_ground'),
    );

    // 清空啟動與落地產生的舊 log
    await page.evaluate(() => window.__pixelRunLeap.clearLogs());

    // 模擬跳躍
    await page.keyboard.down('Space');
    await page.waitForTimeout(50);
    await page.keyboard.up('Space');
    await page.waitForTimeout(100);

    // 模擬暫停
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(100);

    const logs = await page.evaluate(() => window.__pixelRunLeap.getLogs());
    const jumpLog = logs.find((l) => l.category === 'player' && l.action === 'jump_start');
    const pauseLog = logs.find((l) => l.category === 'system' && l.action === 'pause_toggle');

    expect(jumpLog).toBeDefined();
    expect(jumpLog.snapshot).toBeDefined();
    expect(jumpLog.snapshot.vy).toBeLessThan(0); // 跳躍初速為負值

    expect(pauseLog).toBeDefined();
    expect(pauseLog.details.paused).toBe(true);
  });
});
