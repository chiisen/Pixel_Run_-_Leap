import { globalActionLogger } from './actionLog.js';

export function exposeGlobalDebugApi() {
  window.__pixelRunLeap = {
    ...window.__pixelRunLeap,
    clearLogs: () => globalActionLogger.clear(),
    exportLogs: () => globalActionLogger.exportLogs(),
    getLogs: (filter) => globalActionLogger.getLogs(filter),
    setLogConfig: (options = {}) => {
      if (options.consoleOutput !== undefined) {
        globalActionLogger.setConsoleOutput(options.consoleOutput);
      }
      if (options.maxSize !== undefined) {
        globalActionLogger.maxSize = options.maxSize;
      }
    },
  };
}

// 傳送與狀態查詢只留在開發建置。正式打包時 DEV 為 false，這段會被移除。
export function attachPlaytestApi(scene) {
  if (!import.meta.env.DEV || !(scene.debugMode || scene.testMode)) {
    return;
  }

  window.__pixelRunLeap = {
    ...window.__pixelRunLeap,
    getCamera: () => ({
      scrollX: scene.cameras.main.scrollX,
      scrollY: scene.cameras.main.scrollY,
    }),
    getEnemies: () =>
      scene.enemies.getChildren().map((enemy) => ({
        active: enemy.active,
        body: {
          bottom: enemy.body.bottom,
          top: enemy.body.top,
          touching: { ...enemy.body.touching },
          velocityY: enemy.body.velocity.y,
        },
        homeX: enemy.getData('homeX'),
        type: enemy.getData('type'),
        x: enemy.x,
        y: enemy.y,
      })),
    getItems: () => ({
      coins: scene.coins
        .getChildren()
        .map((coin) => ({ x: Math.round(coin.x), y: Math.round(coin.y) })),
      fireballs: scene.fireballs
        .getChildren()
        .map((fireball) => ({ x: Math.round(fireball.x), y: Math.round(fireball.y) })),
      powerUps: scene.powerUps.getChildren().map((powerUp) => ({
        type: powerUp.getData('type'),
        x: Math.round(powerUp.x),
        y: Math.round(powerUp.y),
      })),
      spawned: scene.spawnedItems
        .getChildren()
        .map((item) => ({
          type: item.getData('type'),
          x: Math.round(item.x),
          y: Math.round(item.y),
        })),
    }),
    getPlayer: () => ({
      body: {
        bottom: scene.player.body.bottom,
        top: scene.player.body.top,
        touching: { ...scene.player.body.touching },
        velocityY: scene.player.body.velocity.y,
      },
      crouching: scene.isCrouching,
      x: scene.player.x,
      y: scene.player.y,
    }),
    getState: () => ({ ...scene.gameState }),
    getWorldBounds: () => ({
      height: scene.physics.world.bounds.height,
      width: scene.physics.world.bounds.width,
    }),
    setPlayerPosition: (x, y) => {
      scene.player.setPosition(x, y);
      scene.player.setVelocityY(100);
    },
  };
}
