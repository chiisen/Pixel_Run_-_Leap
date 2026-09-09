# 開發流程

## 開始前

1. 閱讀 `AGENTS.md`、`CLAUDE.md` 或 `GEMINI.md`，三份內容相同。
2. 閱讀 `docs/superpowers/specs/` 下最新的設計規格。
3. 檢查 `git status`，不要覆蓋其他協作者的變更。
4. 確認需求、成功條件與不在範圍內的內容。

## 實作流程

1. 先為新的遊戲規則寫單元測試。
2. 先確認測試因功能不存在而失敗。
3. 寫最小實作讓測試通過。
4. 在測試通過後才進行必要的重構。
5. Phaser 場景、畫面與觸控行為再使用瀏覽器測試驗證。

## 程式碼格式與靜態檢查

- 使用 Prettier 格式化 JavaScript、JSON 與 Markdown。
- 使用 ESLint 檢查 JavaScript。
- 使用 EditorConfig 統一換行、縮排與檔案編碼。
- VS Code 儲存檔案時會自動格式化，並在可行時套用 ESLint 修正。
- 新增套件與正式命令時，於 `package.json` 記錄對應 script；目前工具設定已建立，套件安裝於實作階段處理。

常用命令：

```bash
npm run dev
npm run format:check
npm run lint
npm test
npm run test:e2e
npm run build
npm run check
```

## 測試層級

### 單元測試

使用 Vitest 測試純 JavaScript 規則，例如生命、分數、移動狀態、道具效果、碰撞計算與關卡資料解析。

### 瀏覽器測試

使用瀏覽器自動化測試實際啟動遊戲，檢查資源載入、場景切換、鍵盤與觸控、Console 錯誤及截圖結果。

### 開發測試模式

- `?debug=1`：顯示碰撞框、FPS、座標與遊戲狀態。
- `?test=1`：使用固定初始狀態與可重現關卡。
- 測試模式可提供快速傳送、無敵、補生命與跳過關卡。
- 正式遊戲預設關閉測試模式。

## 完成前檢查

- 執行單元測試與專案建置命令。
- 執行 Prettier 格式檢查與 ESLint。
- 執行 Playwright 瀏覽器 smoke test。
- 測試桌面鍵盤與手機觸控。
- 檢查瀏覽器 Console 沒有錯誤。
- 執行 `git diff --check`。
- 更新 `CHANGELOG.md` 的未發布區段。
- 回報已執行與尚未執行的驗證，不宣稱未執行的測試已通過。

## 規範檔同步

修改 `AGENTS.md`、`CLAUDE.md` 或 `GEMINI.md` 時，必須同步修改另外兩份，並用檔案比較確認三份逐字一致。
