# Pixel Run & Leap

私人本機使用的 HTML5 2D 平台遊戲，使用 Phaser 3 與 JavaScript 製作，參考
[`ffx0s/mario-html5`](https://github.com/ffx0s/mario-html5) 的遊戲內容與素材。

## 專案狀態

目前已完成開發規範、測試工具、Phaser 啟動骨架與第一個遊戲狀態切片；玩家操作與關卡內容仍在開發中。

## 環境需求

- Node.js 24+
- npm 11+
- 可執行 Chromium 的桌面環境，用於 Playwright 瀏覽器測試

## 開始使用

```bash
npm install
npm run dev
```

開啟終端機顯示的本機網址即可查看遊戲啟動骨架。

## 驗證命令

```bash
npm run format:check
npm run lint
npm test
npm run test:e2e
npm run build
```

一次執行所有不需 Playwright 瀏覽器安裝的檢查：

```bash
npm run check
```

Playwright 首次使用需要安裝 Chromium：

```bash
npx playwright install chromium
```

## 開發輔助

- `?debug=1`：預留給碰撞框、FPS、座標與遊戲狀態資訊。
- `?test=1`：預留給固定初始狀態與可重現關卡。
- Vitest：測試不依賴 Phaser 渲染的純 JavaScript 遊戲規則。
- Playwright：測試遊戲啟動、畫面、Console 錯誤與瀏覽器流程。
- VS Code 儲存時使用 Prettier 格式化，並套用 ESLint 修正。

## 文件

- [開發流程](CONTRIBUTING.md)
- [設計規格](docs/superpowers/specs/2026-09-10-pixel-run-leap-design.md)
- [素材來源](docs/assets.md)
- [變更記錄](CHANGELOG.md)
- [專案規範](AGENTS.md)

## 素材與使用範圍

本專案目前限定私人本機使用。參考專案的 MIT 程式碼授權不代表 Mario 圖片、音樂與音效可以公開散布，詳見 [素材來源記錄](docs/assets.md)。
