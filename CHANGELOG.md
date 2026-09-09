# Changelog

本檔案記錄 `Pixel Run & Leap` 的重要變更。

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，版本遵循語意化版本原則。

## [未發布]

### Added

- 建立不可變的遊戲狀態模組，支援初始狀態、金幣、生命、倒數與通關狀態。
- 新增中文 Vitest 單元測試，覆蓋遊戲狀態的核心行為。
- 新增 Goomba 巡邏、踩踏、受傷與生命扣除流程。
- 新增倒數時間、旗幟通關、Game Over、R 鍵重來與手機觸控按鈕。
- 載入參考專案的背景音樂與音效 sprite，並在首次使用者互動後播放。
- 載入參考專案的 Tiled 地圖、tileset 與地圖敵人資料，並啟用攝影機跟隨。
- 新增蘑菇、星星與 1UP 道具，以及超級、無敵與增加生命效果。
- 建立專案規範檔 `AGENTS.md`、`CLAUDE.md` 與 `GEMINI.md`，三份內容保持同步。
- 確認使用 Phaser 3 + JavaScript 製作遊戲。
- 設計單元測試以 Vitest 為主，瀏覽器測試作為 Phaser 整合驗證。
- 建立私人本機使用的遊戲設計規格。
- 建立 Node.js、建置產物、測試報告與本機設定的 `.gitignore`。
- 建立 Vite 啟動骨架、Vitest 單元測試與 Playwright smoke test。

### Documentation

- 記錄參考專案素材、私人使用限制與 AI 輔助開發流程。
- 記錄開發命令、程式碼格式化、靜態檢查與素材來源。
