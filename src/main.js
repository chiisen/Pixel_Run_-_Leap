import Phaser from 'phaser';

import { collectCoin, createGameState } from './game/gameState.js';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;

class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // 參考專案的 atlas 同時包含玩家、金幣、磚塊與敵人等像素素材。
    this.load.atlas('mario', '/assets/mario-sprites.png', '/assets/mario-sprites.json');
    this.load.image('clouds', '/assets/images/clouds.png');
  }

  create() {
    this.scene.start('GameScene');
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.gameState = createGameState();
  }

  create() {
    // 目前先以單一場景驗證素材、物理與遊戲狀態可以正常串接。
    this.createBackground();
    this.createPlatforms();
    this.createPlayer();
    this.createCoin();
    this.createHud();
    this.createInput();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.coin, () => this.collectCoin());

    // 供 Playwright 與 AI 測試確認資產載入及場景初始化已完成。
    window.__pixelRunLeapReady = true;
  }

  update() {
    const { a, d, left, right, jump } = this.inputState;

    if (left.isDown || a.isDown) {
      this.player.setVelocityX(-140);
      this.player.setFlipX(true);
    } else if (right.isDown || d.isDown) {
      this.player.setVelocityX(140);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(jump) && this.player.body.blocked.down) {
      this.player.setVelocityY(-300);
    }
  }

  createBackground() {
    this.cameras.main.setBackgroundColor('#5c94fc');
    this.add.image(400, 105, 'clouds').setScale(3).setAlpha(0.9);
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    // 先用參考專案的磚塊組成測試平台，正式關卡會改由地圖資料建立。
    this.platforms.create(400, 430, 'mario', 'brick').setScale(8, 4).refreshBody();
    this.platforms.create(630, 335, 'mario', 'brick').setScale(3, 2).refreshBody();
  }

  createPlayer() {
    this.player = this.physics.add.sprite(120, 350, 'mario', 'mario/stand');
    this.player.setScale(2);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(12, 16).setOffset(2, 0);
  }

  createCoin() {
    this.coin = this.physics.add.staticSprite(300, 350, 'mario', 'coin/coin1');
    this.coin.setScale(2);
  }

  createHud() {
    this.hud = this.add
      .text(16, 16, '', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '16px',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setScrollFactor(0);
    this.updateHud();
  }

  createInput() {
    // 鍵盤輸入先集中成狀態，之後可與手機觸控按鈕共用 update() 規則。
    this.inputState = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
  }

  collectCoin() {
    this.gameState = collectCoin(this.gameState);
    this.coin.destroy();
    this.updateHud();
  }

  updateHud() {
    this.hud.setText(
      `分數 ${this.gameState.score} | 金幣 ${this.gameState.coins} | 生命 ${this.gameState.lives}`,
    );
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#5c94fc',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 700 },
      debug: new URLSearchParams(window.location.search).has('debug'),
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, GameScene],
});
