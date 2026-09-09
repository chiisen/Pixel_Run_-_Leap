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
- 金幣與道具位置改由 Tiled `modifiers` 層建立，減少關卡座標硬編碼。
- 新增玩家、Goomba、金幣與星星的像素動畫。
- 新增 `Pixel Run & Leap` 標題畫面與 HTML 開始按鈕。
- 實作 `?debug=1` 與 `?test=1` 輔助模式，供 AI 讀取 FPS、座標與遊戲狀態。
- 新增 P 鍵暫停/繼續，並同步控制物理、倒數與音效。
- 清理場景重新開始時的音樂與觸控事件，避免重複註冊。
- 修正玩家踩踏敵人時因 Phaser 碰撞回呼速度已歸零而被誤判為受傷的問題。
- 補上玩家掉出地圖的死亡判定，生命歸零後會顯示 Game Over。
- 將 Playwright Phaser 測試限制為單 worker，避免多 WebGL context 造成 GPU stall。
- 修正 Game Over 音效因終局碰撞回呼重複觸發而連續播放的問題。
- 修正 Game Over 後按 R 無法重設場景與恢復玩家控制的問題。
- 將 Tiled 地圖與關卡物件貼齊視窗底部，修正地板出現在畫面中央。
- 將 Phaser 物理世界寬度同步到完整地圖，修正玩家走到中途被 800px 邊界擋住。
- 新增 Tiled 管道資料解析、下方向鍵進入管道與互動磚塊處理。
- 新增龜型敵人、敵人類型資料與對應巡邏/踩踏外觀。
- 新增火焰花能力、Z/觸控火球輸入與火球擊敗敵人流程。
- 建立專案規範檔 `AGENTS.md`、`CLAUDE.md` 與 `GEMINI.md`，三份內容保持同步。
- 確認使用 Phaser 3 + JavaScript 製作遊戲。
- 設計單元測試以 Vitest 為主，瀏覽器測試作為 Phaser 整合驗證。
- 建立私人本機使用的遊戲設計規格。
- 建立 Node.js、建置產物、測試報告與本機設定的 `.gitignore`。
- 建立 Vite 啟動骨架、Vitest 單元測試與 Playwright smoke test。

### Documentation

- 記錄參考專案素材、私人使用限制與 AI 輔助開發流程。
- 記錄開發命令、程式碼格式化、靜態檢查與素材來源。
