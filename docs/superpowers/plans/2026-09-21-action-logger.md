# 操作歷程記錄系統 (Action & Event Logger) 實作規劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為遊戲建立一套輕量且完整的操作歷程記錄系統（Action & Event Logger），支援 Console 即時輸出與記憶體環形緩衝區查詢，協助 AI Agent 與開發者排查問題。

**Architecture:**

1. 建立純 JavaScript 的 `ActionLogger` 模組，管理容量 200 筆的環形緩衝區、快照產生、過濾查詢與格式化輸出。
2. 在 `src/main.js` 整合 `ActionLogger`，掛載全域 `window.__pixelRunLeap.getLogs` 等介面，並在輸入、玩家動作轉移、戰鬥碰撞、道具收集與系統狀態轉移點記錄事件。
3. 撰寫 Vitest 單元測試與 Playwright 端對端測試全面驗證。

**Tech Stack:** JavaScript (ES Module), Phaser 3, Vitest 5, Playwright.

## Global Constraints

- 不更動原有遊戲操作手感與物理判定。
- 記憶體緩衝區上限固定為 200 筆，避免長時間運行導致記憶體洩漏。
- Console 輸出格式統一使用 `[PixelRun][CATEGORY] action ...`，不得觸發任何 `console.error`。
- 所有變更遵守 ESLint 與 Prettier 規範，通過 `npm run check` 與 Playwright 測試。
- CHANGELOG 與 Commit 訊息一律使用繁體中文。

---

### Task 1: 建立核心 `ActionLogger` 模組與單元測試

**Files:**

- Create: `src/game/actionLogger.js`
- Test: `tests/unit/actionLogger.test.js`

**Interfaces:**

- Produces:
  - `class ActionLogger`:
    - `constructor(options?: { maxSize?: number, consoleOutput?: boolean, loggerFn?: Function })`
    - `log(category: string, action: string, details?: object, snapshot?: object): object`
    - `getLogs(filter?: { category?: string, action?: string, limit?: number }): object[]`
    - `clear(): void`
    - `setConsoleOutput(enabled: boolean): void`
    - `exportLogs(): string`

- [ ] **Step 1: 撰寫 ActionLogger 失敗單元測試**

在 `tests/unit/actionLogger.test.js` 撰寫涵蓋環形緩衝區上限、過濾器、快照與開關的測試案例：

```javascript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionLogger } from '../../src/game/actionLogger.js';

describe('ActionLogger', () => {
  let logger;
  let mockConsoleLog;

  beforeEach(() => {
    mockConsoleLog = vi.fn();
    logger = new ActionLogger({
      maxSize: 3,
      consoleOutput: true,
      loggerFn: mockConsoleLog,
    });
  });

  it('記錄事件並指派遞增 ID 與時間戳記', () => {
    const entry = logger.log('input', 'key_down', { key: 'ArrowRight' });
    expect(entry).toMatchObject({
      id: 1,
      category: 'input',
      action: 'key_down',
      details: { key: 'ArrowRight' },
    });
    expect(entry.timestamp).toBeTypeOf('number');
    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
  });

  it('超過 maxSize 時維護環形緩衝區，淘汰最舊記錄', () => {
    logger.log('input', 'key1');
    logger.log('input', 'key2');
    logger.log('input', 'key3');
    logger.log('input', 'key4');

    const logs = logger.getLogs();
    expect(logs).toHaveLength(3);
    expect(logs.map((l) => l.action)).toEqual(['key2', 'key3', 'key4']);
  });

  it('支援依 category、action 與 limit 進行過濾查詢', () => {
    logger = new ActionLogger({ maxSize: 10, consoleOutput: false });
    logger.log('input', 'press', { key: 'Space' });
    logger.log('combat', 'stomp', { enemy: 'goomba' });
    logger.log('combat', 'stomp', { enemy: 'turtle' });
    logger.log('item', 'coin');

    expect(logger.getLogs({ category: 'combat' })).toHaveLength(2);
    expect(logger.getLogs({ action: 'coin' })).toHaveLength(1);
    expect(logger.getLogs({ limit: 2 })).toHaveLength(2);
    expect(logger.getLogs({ limit: 2 })[1].action).toBe('coin');
  });

  it('清空與開關 console 輸出', () => {
    logger.setConsoleOutput(false);
    logger.log('input', 'press');
    expect(mockConsoleLog).not.toHaveBeenCalled();

    logger.clear();
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('支援匯出 JSON 字串', () => {
    logger.log('system', 'start');
    const json = logger.exportLogs();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].action).toBe('start');
  });
});
```

- [ ] **Step 2: 執行測試驗證失敗**

執行：`npm test tests/unit/actionLogger.test.js`
預期：FAIL（找不到模組 `ActionLogger`）

- [ ] **Step 3: 實作 `src/game/actionLogger.js`**

```javascript
export class ActionLogger {
  constructor(options = {}) {
    this.maxSize = options.maxSize ?? 200;
    this.consoleOutput = options.consoleOutput ?? true;
    this.loggerFn = options.loggerFn ?? console.log;
    this.logs = [];
    this.nextId = 1;
  }

  log(category, action, details = {}, snapshot = null) {
    const entry = {
      id: this.nextId++,
      timestamp: Date.now(),
      category,
      action,
      details: { ...details },
    };

    if (snapshot) {
      entry.snapshot = { ...snapshot };
      if (snapshot.gameTime !== undefined) {
        entry.gameTime = snapshot.gameTime;
      }
    }

    this.logs.push(entry);
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }

    if (this.consoleOutput && typeof this.loggerFn === 'function') {
      const detailStr = Object.keys(details).length > 0 ? JSON.stringify(details) : '';
      const snapStr = snapshot ? ` (x:${snapshot.x}, y:${snapshot.y})` : '';
      this.loggerFn(
        `[PixelRun][${category.toUpperCase()}] ${action}${snapStr} ${detailStr}`.trim(),
      );
    }

    return entry;
  }

  getLogs(filter = {}) {
    let result = this.logs;

    if (filter.category) {
      result = result.filter((item) => item.category === filter.category);
    }
    if (filter.action) {
      result = result.filter((item) => item.action === filter.action);
    }
    if (typeof filter.limit === 'number' && filter.limit > 0) {
      result = result.slice(-filter.limit);
    }

    return result.map((entry) => ({
      ...entry,
      details: { ...entry.details },
      snapshot: entry.snapshot ? { ...entry.snapshot } : undefined,
    }));
  }

  clear() {
    this.logs = [];
  }

  setConsoleOutput(enabled) {
    this.consoleOutput = Boolean(enabled);
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}
```

- [ ] **Step 4: 執行單元測試驗證通過**

執行：`npm test tests/unit/actionLogger.test.js`
預期：PASS

- [ ] **Step 5: 提交任務代碼**

```bash
git add src/game/actionLogger.js tests/unit/actionLogger.test.js
git commit -m "feat(日誌): 建立核心 ActionLogger 模組與單元測試"
```

---

### Task 2: 在遊戲場景 (`src/main.js`) 整合 ActionLogger 與全域介面

**Files:**

- Modify: `src/main.js`

**Interfaces:**

- Consumes: `ActionLogger` from `./game/actionLogger.js`
- Produces:
  - `window.__pixelRunLeap.getLogs(filter)`
  - `window.__pixelRunLeap.clearLogs()`
  - `window.__pixelRunLeap.exportLogs()`
  - `window.__pixelRunLeap.setLogConfig(options)`

- [ ] **Step 1: 引入 ActionLogger 並在全域建立單例實例**

在 `src/main.js` 引入 `ActionLogger`，初始化 `const globalActionLogger = new ActionLogger();`。
在 `window.__pixelRunLeap` 暴露日誌 API：

```javascript
window.__pixelRunLeap = {
  ...window.__pixelRunLeap,
  getLogs: (filter) => globalActionLogger.getLogs(filter),
  clearLogs: () => globalActionLogger.clear(),
  exportLogs: () => globalActionLogger.exportLogs(),
  setLogConfig: (options = {}) => {
    if (options.consoleOutput !== undefined) {
      globalActionLogger.setConsoleOutput(options.consoleOutput);
    }
    if (options.maxSize !== undefined) {
      globalActionLogger.maxSize = options.maxSize;
    }
  },
};
```

- [ ] **Step 2: 建立快照擷取小工具函式 `captureSnapshot`**

在 `GameScene` 內提供 `captureSnapshot()` 方法：

```javascript
captureSnapshot() {
  if (!this.player || !this.player.body) return null;
  return {
    x: Math.round(this.player.x * 10) / 10,
    y: Math.round(this.player.y * 10) / 10,
    vx: Math.round(this.player.body.velocity.x),
    vy: Math.round(this.player.body.velocity.y),
    onGround: Boolean(this.player.body.blocked.down),
    power: this.gameState.power,
    lives: this.gameState.lives,
    score: this.gameState.score,
    coins: this.gameState.coins,
    status: this.gameState.status,
    gameTime: this.gameState.timeRemaining,
  };
}
```

- [ ] **Step 3: 插入事件擷取點**

1. **Input 事件**：
   - 鍵盤監聽（ArrowLeft/Right/Down, Space, KeyZ, KeyP, KeyR, KeyT）於 keydown / keyup 記錄。
   - 手機觸控 `#touch-left`, `#touch-right`, `#touch-jump` 記錄 `touch_start` / `touch_end`。
   - 音效與音樂切換記錄 `audio_toggle`。
2. **Player 動作與狀態**：
   - 跳躍（起跳瞬間記錄 `jump_start`）。
   - 著地瞬間（由空中進入地面記錄 `land_ground`）。
   - 蹲下與站起（`crouch_start`, `crouch_end`）。
   - 管道傳送（`enter_pipe` 記錄目標坐標）。
   - 墜落深淵（`fall_pit`）。
3. **Combat 戰鬥**：
   - `handleEnemyContact`: 踩怪記錄 `stomp_enemy`；被撞記錄 `hit_by_enemy`。
   - `handleFireballEnemy`: 記錄 `fireball_hit_enemy`。
4. **Item 道具與磚塊**：
   - `handlePlayerTileCollision`: 頂磚記錄 `bump_block`（磚塊位置與生成內容）。
   - `handleCoin`: 記錄 `collect_coin`。
   - `handlePowerUp`: 記錄 `collect_powerup`。
   - `shootFireball`: 記錄 `fireball_shoot`。
5. **System 系統事件**：
   - `TitleScene.create`: 記錄 `scene_start`。
   - `GameScene.create`: 記錄 `scene_start`。
   - `togglePause`: 記錄 `pause_toggle`。
   - `completeLevel`: 記錄 `level_complete`。
   - `triggerGameOver`: 記錄 `game_over`。
   - `restartGame`: 記錄 `game_restart`。

- [ ] **Step 4: 執行既有單元測試確認無語法錯誤**

執行：`npm test`
預期：PASS

- [ ] **Step 5: 提交任務代碼**

```bash
git add src/main.js
git commit -m "feat(日誌): 在遊戲場景與玩家操作整合歷程記錄"
```

---

### Task 3: 撰寫 Playwright 端對端測試並驗證完整流程

**Files:**

- Create: `tests/e2e/actionLogger.spec.js`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: 撰寫 `tests/e2e/actionLogger.spec.js`**

```javascript
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

    // 清空啟動前的舊 log
    await page.evaluate(() => window.__pixelRunLeap.clearLogs());

    // 模擬跳躍
    await page.locator('canvas').click();
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

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
```

- [ ] **Step 2: 執行 E2E 測試驗證**

執行：`npx playwright test tests/e2e/actionLogger.spec.js`
預期：PASS

- [ ] **Step 3: 執行全套品質檢查**

執行：`npm run check` 與 `npm run test:e2e`
預期：全部通過（包含格式、Lint、單元測試、E2E 測試與建置）

- [ ] **Step 4: 更新 CHANGELOG.md**

在 `CHANGELOG.md` 的 `[Unreleased]` 區塊新增新增功能項目說明。

- [ ] **Step 5: 提交任務代碼**

```bash
git add tests/e2e/actionLogger.spec.js CHANGELOG.md
git commit -m "test(日誌): 新增操作歷程 E2E 測試並更新 CHANGELOG"
```
