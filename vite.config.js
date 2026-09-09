import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Phaser runtime 約 1.2MB，保留單一 chunk 可避免遊戲啟動時拆分過多請求。
    chunkSizeWarningLimit: 1300,
  },
});
