# 操作歷程記錄系統設計規格 (Action & Event Logger)

日期：2026-09-21
狀態：已確認，待實作

## 1. 目標與背景

為了讓 AI Agent（自動化測試／Playwright）與開發者在除錯及排查遊戲行為問題時，能迅速掌握玩家每一步的操作與遊戲狀態演進，本專案新增一套專門的操作歷程記錄系統（Action & Event Logger）。

此系統具備「雙軌輸出」特色：

1. **結構化記憶體記錄（Ring Buffer）**：保留最新 200 筆關鍵事件與狀態快照，供 AI Agent 或 Playwright 透過 `window.__pixelRunLeap.getLogs()` 隨時抓取結構化 JSON 資料進行斷言與除錯。
2. **即時 Console 格式化日誌**：以醒目的顏色前綴（如 `[PixelRun][ACTION]`、`[PixelRun][EVENT]`）輸出至瀏覽器 DevTools Console，方便人類工程師肉眼追蹤。
3. **低開銷與防洗版**：僅在「輸入事件」、「關鍵狀態轉移（起跳、著地、蹲下、管道）」與「遊戲重大交互（受傷、踩怪、吃道具、通關、死亡）」時觸發記錄，避免每幀記錄造成效能損耗與 Log 爆炸。

---

## 2. 模組架構設計

### 2.1 獨立模組 `src/game/actionLogger.js`

模組獨立於 Phaser 渲染邏輯，純 JavaScript 實作，便於單元測試。

```javascript
export class ActionLogger {
  constructor(options = {}) {
    this.maxSize = options.maxSize ?? 200;
    this.consoleOutput = options.consoleOutput ?? true;
    this.logs = [];
    this.nextId = 1;
  }

  log(category, action, details = {}, snapshot = {}) {
    // 記錄一筆事件並維護環形緩衝區大小
  }

  getLogs(filter = {}) {
    // 支援 category, action, limit 過濾
  }

  clear() {
    // 清空日誌緩衝區
  }

  setConsoleOutput(enabled) {
    // 動態開關 Console 輸出
  }

  exportLogs() {
    // 匯出為 JSON 字串
  }
}
```

### 2.2 事件結構定義 (Event Schema)

每筆事件物件遵循以下資料規格：

```typescript
interface ActionLogEntry {
  id: number; // 遞增唯一序號 (從 1 開始)
  timestamp: number; // Date.now() 毫秒時間戳
  gameTime?: number; // 遊戲內倒數秒數 (timeRemaining)
  category: 'input' | 'player' | 'combat' | 'item' | 'system';
  action: string; // 具體動作識別碼
  details: Record<string, any>; // 動作細部參數
  snapshot?: {
    // 玩家與遊戲世界快照
    x: number; // 玩家 X 座標 (四捨五入至小數一位)
    y: number; // 玩家 Y 座標 (四捨五入至小數一位)
    vx: number; // 玩家 X 軸速度
    vy: number; // 玩家 Y 軸速度
    onGround: boolean; // 是否著地
    power: 'small' | 'super' | 'fire'; // 當前能力形態
    lives: number; // 剩餘生命數
    score: number; // 當前總分
    coins: number; // 金幣數量
    status: 'playing' | 'paused' | 'game-over' | 'complete';
  };
}
```

---

## 3. 記錄範疇與事件清單

記錄點依類別分為 5 大領域：

### 3.1 `input`（輸入與控制）

- `key_down`: 按鍵按下（鍵名：`ArrowLeft`, `ArrowRight`, `ArrowDown`, `Space`, `KeyZ`, `KeyP`, `KeyR`, `KeyT`）。
- `key_up`: 按鍵放開。
- `touch_start`: 觸控虛擬按鈕按下（`#touch-left`, `#touch-right`, `#touch-jump`）。
- `touch_end`: 觸控虛擬按鈕放開。
- `audio_toggle`: 音效或音樂開關（`type`: `'music' | 'sfx'`, `enabled`: `boolean`）。

### 3.2 `player`（玩家移動與動作狀態轉移）

- `jump_start`: 玩家在地面按下跳躍鍵、離開地面並賦予向上初速的瞬間。
- `land_ground`: 玩家在空中下墜後，重新變為 `body.blocked.down === true` 的瞬間。
- `crouch_start`: 進入蹲下狀態（包含縮小碰撞箱與替換貼圖）。
- `crouch_end`: 站起解除蹲下狀態（手動放開或騰空自動站起）。
- `enter_pipe`: 玩家按下鍵成功進入管道（記錄入口水管編號與目的地座標）。
- `fall_pit`: 玩家落入坑洞（Y 軸超過地圖底層界限）。

### 3.3 `combat`（戰鬥與敵人互動）

- `stomp_enemy`: 踩踏敵人（`enemyType`: `'goomba' | 'turtle'`, `x`, `y`, `scoreGained`）。
- `hit_by_enemy`: 遭到敵人撞擊（`enemyType`, `result`: `'lose_power' | 'die'`, `newPower`: `'super' | 'small'`）。
- `fireball_hit_enemy`: 火球擊中敵人（`enemyType`, `scoreGained`）。

### 3.4 `item`（磚塊、道具與火球）

- `bump_block`: 撞擊上方磚塊（`tileX`, `tileY`, `type`: `'question' | 'breakable'`, `spawn`: `'coin' | 'mushroom' | 'flower' | 'star' | '1up' | 'none'`）。
- `collect_coin`: 收集金幣（`source`: `'map' | 'block'`, `amount`: 1, `newTotal`: `number`）。
- `collect_powerup`: 吃到強化道具（`itemType`: `'mushroom' | 'flower' | 'star' | '1up'`, `newPower`: `string`）。
- `fireball_shoot`: 火球丟出（`direction`: `1 | -1`, `currentFireballsCount`: `number`）。

### 3.5 `system`（系統與流程）

- `scene_start`: 場景啟動（`sceneName`: `'TitleScene' | 'GameScene'`）。
- `pause_toggle`: 暫停狀態切換（`paused`: `boolean`）。
- `level_complete`: 觸碰旗杆通關（`timeRemaining`: `number`, `timeBonus`: `number`, `finalScore`: `number`）。
- `game_over`: 遊戲結束（`reason`: `'damage' | 'pit' | 'time_out'`, `finalScore`: `number`）。
- `game_restart`: 重新開始遊戲或返回標題。

---

## 4. 全域除錯介面 (`window.__pixelRunLeap`)

無論遊戲處於何種 URL 參數（一般模式、`?debug=1`、`?test=1`），全域物件 `window.__pixelRunLeap` 皆暴露以下除錯記錄介面：

1. `window.__pixelRunLeap.getLogs(filter?: { category?: string, action?: string, limit?: number }): ActionLogEntry[]`
   - 回傳深拷貝或安全唯讀的事件陣列。
   - `limit` 預設回傳全部（最多 200 筆）；若指定則回傳最新的 N 筆。
2. `window.__pixelRunLeap.clearLogs(): void`
   - 清空日誌緩衝區。
3. `window.__pixelRunLeap.exportLogs(): string`
   - 回傳格式化的 JSON 字串，方便直接複製或儲存。
4. `window.__pixelRunLeap.setLogConfig(options: { consoleOutput?: boolean, maxSize?: number }): void`
   - 動態開啟或關閉 Console 輸出。

---

## 5. 測試與驗證規劃

### 5.1 單元測試 (Vitest)

新增 `tests/unit/actionLogger.test.js`，覆蓋：

- 緩衝區容量限制：寫入超過容量上限時淘汰最舊事件，最新 200 筆順序與 ID 正確。
- 過濾邏輯：依 `category`、`action` 或 `limit` 過濾回傳。
- 快照結構：驗證當下數值是否被正確封裝且不隨後續狀態突變。
- Console 輸出控制：開啟時調用 `console.log`，關閉時保持靜默。

### 5.2 端對端測試 (Playwright)

新增 `tests/e2e/actionLogger.spec.js`，覆蓋：

- 驗證遊戲初始化即掛載 `window.__pixelRunLeap.getLogs`。
- 模擬玩家鍵盤操作（向右走、起跳、暫停），驗證 `getLogs()` 是否包含對應的 `input`、`player`、`system` 事件。
- 驗證事件快照中的 `vx`, `vy`, `x`, `y` 數值合理。
- 驗證整個過程無任何 `console.error`，既有 `tests/e2e/smoke.spec.js` 與 `tests/e2e/regression.spec.js` 維持 100% 通過。

### 5.3 驗證命令清單

1. `npm run test`（單元測試，包含 logger 與既有 state 測試）
2. `npm run check`（Prettier + ESLint + Vitest + Vite Build）
3. `npm run test:e2e`（Playwright 瀏覽器測試）
4. `git diff --check`（無格式或空白字元殘留）
