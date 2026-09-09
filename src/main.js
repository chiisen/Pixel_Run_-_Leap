import Phaser from 'phaser';

import './styles.css';

import {
  collectCoin,
  completeLevel,
  createGameState,
  damagePlayer,
  defeatEnemy,
  tickTimer,
} from './game/gameState.js';

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
    this.createEnemies();
    this.createGoal();
    this.createHud();
    this.createInput();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.player, this.enemies, this.handleEnemyContact, null, this);
    this.physics.add.overlap(this.player, this.coin, () => this.collectCoin());
    this.physics.add.overlap(this.player, this.goal, () => this.completeLevel());

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.tickGameTimer,
      callbackScope: this,
    });

    // 供 Playwright 與 AI 測試確認資產載入及場景初始化已完成。
    window.__pixelRunLeapReady = true;
  }

  update() {
    const { a, d, left, right, jump, restart } = this.inputState;

    if (this.gameState.status !== 'playing') {
      if (Phaser.Input.Keyboard.JustDown(restart)) {
        this.scene.restart();
      }
      return;
    }

    if (left.isDown || a.isDown || this.touchState.left) {
      this.player.setVelocityX(-140);
      this.player.setFlipX(true);
    } else if (right.isDown || d.isDown || this.touchState.right) {
      this.player.setVelocityX(140);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    const jumpPressed = Phaser.Input.Keyboard.JustDown(jump) || this.touchJumpQueued;
    this.touchJumpQueued = false;

    if (jumpPressed && this.player.body.blocked.down) {
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

  createGoal() {
    this.goal = this.physics.add.staticSprite(750, 370, 'mario', 'flag');
    this.goal.setScale(2);
  }

  createEnemies() {
    this.enemies = this.physics.add.group();

    [
      { x: 470, y: 385, speed: -35 },
      { x: 680, y: 290, speed: -25 },
    ].forEach(({ x, y, speed }) => {
      const enemy = this.enemies.create(x, y, 'mario', 'goomba/walk1');
      enemy.setScale(2);
      enemy.setVelocityX(speed);
      enemy.setBounceX(1);
      enemy.setCollideWorldBounds(true);
      enemy.body.setSize(14, 14).setOffset(1, 2);
    });
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

    this.resultText = this.add
      .text(400, 220, '', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '28px',
        align: 'center',
        backgroundColor: '#101a3acc',
        padding: { x: 18, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
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
      restart: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.touchState = { left: false, right: false };
    this.touchJumpQueued = false;
    this.bindTouchButton('touch-left', 'left');
    this.bindTouchButton('touch-right', 'right');
    document.querySelector('#touch-jump').addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.touchJumpQueued = true;
    });
  }

  collectCoin() {
    if (!this.coin.active) {
      return;
    }

    this.gameState = collectCoin(this.gameState);
    this.coin.destroy();
    this.updateHud();
  }

  handleEnemyContact(player, enemy) {
    if (!enemy.active) {
      return;
    }

    const stomping = player.body.velocity.y > 0 && player.body.bottom <= enemy.body.top + 12;

    if (stomping) {
      // 踩踏會反彈玩家、停用敵人碰撞，再延遲移除其 Sprite。
      this.gameState = defeatEnemy(this.gameState);
      enemy.setFrame('goomba/flat');
      enemy.setVelocity(0, 0);
      enemy.body.enable = false;
      player.setVelocityY(-220);
      this.time.delayedCall(300, () => enemy.destroy());
    } else {
      // 非踩踏碰撞會扣除生命，並把玩家送回目前切片的起點。
      this.gameState = damagePlayer(this.gameState);
      player.setPosition(120, 350);
      player.setVelocity(0, -180);
    }

    this.updateHud();
    this.showResultIfFinished();
  }

  bindTouchButton(id, direction) {
    const button = document.querySelector(`#${id}`);
    const setPressed = (pressed) => {
      this.touchState[direction] = pressed;
    };

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      setPressed(true);
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', () => setPressed(false));
    button.addEventListener('pointercancel', () => setPressed(false));
    button.addEventListener('pointerleave', () => setPressed(false));
  }

  tickGameTimer() {
    if (this.gameState.status !== 'playing') {
      return;
    }

    this.gameState = tickTimer(this.gameState);
    this.updateHud();
    this.showResultIfFinished();
  }

  completeLevel() {
    if (this.gameState.status !== 'playing') {
      return;
    }

    this.gameState = completeLevel(this.gameState);
    this.updateHud();
    this.showResultIfFinished();
  }

  showResultIfFinished() {
    if (this.gameState.status === 'complete') {
      this.resultText.setText('過關！\n按 R 重新開始').setVisible(true);
      this.player.setVelocity(0, 0);
    } else if (this.gameState.status === 'game-over') {
      this.resultText.setText('遊戲結束\n按 R 重新開始').setVisible(true);
      this.player.setVelocity(0, 0);
    }
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
