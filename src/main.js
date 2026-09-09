import Phaser from 'phaser';

import './styles.css';

import {
  collectCoin,
  collectPowerUp,
  completeLevel,
  createGameState,
  damagePlayer,
  defeatEnemy,
  tickTimer,
  togglePause,
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
    this.load.image('tiles', '/assets/images/super-mario.png');
    this.load.tilemapTiledJSON('level', '/assets/maps/super-mario.json');
    this.load.audio('overworld', '/assets/music/overworld.mp3');
    this.load.audioSprite('sfx', '/assets/audio/sfx.json', ['/assets/audio/sfx.mp3']);
  }

  create() {
    this.scene.start('TitleScene');
  }
}

class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const startButton = document.querySelector('#start-game');
    startButton.hidden = false;

    this.cameras.main.setBackgroundColor('#101a3a');
    this.add
      .text(GAME_WIDTH / 2, 150, 'Pixel Run & Leap', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '42px',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 260, '開始遊戲', {
        color: '#f7d774',
        backgroundColor: '#284b8f',
        fontFamily: 'sans-serif',
        fontSize: '24px',
        padding: { x: 24, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame());

    startButton.addEventListener('click', () => this.startGame(), { once: true });
    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
  }

  startGame() {
    if (this.scene.isActive('GameScene')) {
      return;
    }

    document.querySelector('#start-game').hidden = true;
    this.scene.start('GameScene');
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.gameState = createGameState();
    this.resultShown = false;
  }

  create() {
    // 目前先以單一場景驗證素材、物理與遊戲狀態可以正常串接。
    // Phaser scene.restart() 會重用場景實例，因此必須在每次 create() 重設執行狀態。
    this.gameState = createGameState();
    this.resultShown = false;
    this.audioStarted = false;
    this.physics.world.isPaused = false;

    const query = new URLSearchParams(window.location.search);
    this.debugMode = query.has('debug');
    this.testMode = query.has('test');
    this.createAnimations();
    this.createBackground();
    this.createLevel();
    this.createPipeData();
    this.createPlayer();
    this.createCollectibles();
    this.createEnemies();
    this.createGoal();
    this.createHud();
    this.createDebugHud();
    this.createInput();
    this.events.once('shutdown', () => this.cleanupScene());

    this.physics.add.collider(
      this.player,
      this.worldLayer,
      this.handlePlayerTileCollision,
      null,
      this,
    );
    this.physics.add.collider(this.enemies, this.worldLayer);
    this.physics.add.collider(this.player, this.enemies, this.handleEnemyContact, null, this);
    this.physics.add.overlap(this.player, this.coins, this.handleCoin, null, this);
    this.physics.add.overlap(this.player, this.powerUps, this.handlePowerUp, null, this);
    this.physics.add.overlap(this.player, this.goal, () => this.completeLevel());
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.roundPixels = true;

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.tickGameTimer,
      callbackScope: this,
    });
    this.pipeCooldown = 0;
    this.input.once('pointerdown', this.startAudio, this);
    this.input.keyboard.once('keydown', this.startAudio, this);

    // 供 Playwright 與 AI 測試確認資產載入及場景初始化已完成。
    window.__pixelRunLeapReady = true;
    if (this.debugMode || this.testMode) {
      window.__pixelRunLeap = {
        getEnemies: () =>
          this.enemies.getChildren().map((enemy) => ({
            active: enemy.active,
            body: {
              bottom: enemy.body.bottom,
              top: enemy.body.top,
              touching: { ...enemy.body.touching },
              velocityY: enemy.body.velocity.y,
            },
            x: enemy.x,
            y: enemy.y,
            type: enemy.getData('type'),
          })),
        getPlayer: () => ({
          body: {
            bottom: this.player.body.bottom,
            top: this.player.body.top,
            touching: { ...this.player.body.touching },
            velocityY: this.player.body.velocity.y,
          },
          x: this.player.x,
          y: this.player.y,
        }),
        getState: () => ({ ...this.gameState }),
        getWorldBounds: () => ({
          height: this.physics.world.bounds.height,
          width: this.physics.world.bounds.width,
        }),
        setPlayerPosition: (x, y) => {
          this.player.setPosition(x, y);
          this.player.setVelocityY(100);
        },
      };
    }
  }

  update() {
    const { a, d, down, left, right, jump } = this.inputState;

    if (this.gameState.status !== 'playing') {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputState.pause)) {
      this.togglePause();
      return;
    }

    if (this.gameState.paused) {
      return;
    }

    if (this.pipeCooldown > 0) {
      this.pipeCooldown -= 1;
    }

    if (down.isDown) {
      this.tryEnterPipe();
    }

    if (this.player.y > this.levelOffsetY + this.levelMap.heightInPixels + 64) {
      this.handlePlayerDeath();
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

    this.updatePlayerAnimation();
    this.updateDebugHud();

    const jumpPressed = Phaser.Input.Keyboard.JustDown(jump) || this.touchJumpQueued;
    this.touchJumpQueued = false;

    if (jumpPressed && this.player.body.blocked.down) {
      this.player.setVelocityY(-300);
      this.playSfx('smb_jump-small');
    }
  }

  createBackground() {
    this.cameras.main.setBackgroundColor('#5c94fc');
    this.add
      .tileSprite(0, 0, 4000, GAME_HEIGHT, 'clouds')
      .setOrigin(0)
      .setScale(2)
      .setAlpha(0.9)
      .setDepth(-1);
  }

  createLevel() {
    this.levelMap = this.make.tilemap({ key: 'level' });
    const tileset = this.levelMap.addTilesetImage('SuperMarioBros-World1-1', 'tiles');

    // Tiled 的 collide 屬性直接轉成 Phaser 的世界碰撞層。
    this.worldLayer = this.levelMap
      .createLayer('world', tileset, 0, 0)
      .setCollisionByProperty({ collide: true });
    // 參考地圖高度小於遊戲視窗，將整張關卡貼齊底部，避免地板出現在畫面中央。
    this.levelOffsetY = Math.max(0, GAME_HEIGHT - this.levelMap.heightInPixels);
    this.worldLayer.y = this.levelOffsetY;
    this.spawnPosition = { x: 96, y: 100 + this.levelOffsetY };
    this.physics.world.setBounds(0, 0, this.levelMap.widthInPixels, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.levelMap.widthInPixels, GAME_HEIGHT);
  }

  createPipeData() {
    const modifiers = this.levelMap.getObjectLayer('modifiers')?.objects ?? [];
    this.pipes = modifiers
      .filter(({ type }) => type === 'pipe')
      .map(({ name, x, y, width, height, properties = [] }) => ({
        direction: properties.find((property) => property.name === 'direction')?.value,
        height,
        name,
        width,
        x,
        y: y + this.levelOffsetY,
      }));
    this.destinations = Object.fromEntries(
      modifiers
        .filter(({ type }) => type === 'dest')
        .map(({ name, x, y }) => [name, { x, y: y + this.levelOffsetY }]),
    );
  }

  createAnimations() {
    this.anims.create({
      key: 'mario-walk',
      frames: ['mario/walk1', 'mario/walk2', 'mario/walk3'].map((frame) => ({
        key: 'mario',
        frame,
      })),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'mario-walk-super',
      frames: ['mario/walkSuper1', 'mario/walkSuper2', 'mario/walkSuper3'].map((frame) => ({
        key: 'mario',
        frame,
      })),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'goomba-walk',
      frames: ['goomba/walk1', 'goomba/walk2'].map((frame) => ({ key: 'mario', frame })),
      frameRate: 5,
      repeat: -1,
    });
    this.anims.create({
      key: 'turtle-walk',
      frames: ['turtle/turtle0', 'turtle/turtle1'].map((frame) => ({ key: 'mario', frame })),
      frameRate: 5,
      repeat: -1,
    });
    this.anims.create({
      key: 'coin-spin',
      frames: ['coin/coin1', 'coin/coin2', 'coin/coin3'].map((frame) => ({
        key: 'mario',
        frame,
      })),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'star-spin',
      frames: ['powerup/star1', 'powerup/star2', 'powerup/star3', 'powerup/star4'].map((frame) => ({
        key: 'mario',
        frame,
      })),
      frameRate: 10,
      repeat: -1,
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(
      this.spawnPosition.x,
      this.spawnPosition.y,
      'mario',
      'mario/stand',
    );
    this.player.setScale(2);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(12, 16).setOffset(2, 0);
  }

  updatePlayerAnimation() {
    if (!this.player.body.blocked.down) {
      this.player.anims.stop();
      this.player.setFrame(this.gameState.power === 'super' ? 'mario/jumpSuper' : 'mario/jump');
      return;
    }

    if (this.player.body.velocity.x !== 0) {
      this.player.anims.play(
        this.gameState.power === 'super' ? 'mario-walk-super' : 'mario-walk',
        true,
      );
      return;
    }

    this.player.anims.stop();
    this.player.setFrame(this.gameState.power === 'super' ? 'mario/standSuper' : 'mario/stand');
  }

  createCollectibles() {
    const modifiers = this.levelMap.getObjectLayer('modifiers')?.objects ?? [];
    this.coins = this.physics.add.staticGroup();
    this.powerUps = this.physics.add.staticGroup();

    modifiers
      .filter(
        ({ name, type }) =>
          type === 'powerUp' && ['coin', 'mushroom', 'star', '1up'].includes(name),
      )
      .forEach(({ name, x, y }) => {
        const position = { x: x + 8, y: y - 8 + this.levelOffsetY };

        if (name === 'coin') {
          this.coins
            .create(position.x, position.y, 'mario', 'coin/coin1')
            .setScale(2)
            .play('coin-spin');
          return;
        }

        const frame = {
          '1up': 'powerup/1up',
          mushroom: 'powerup/super',
          star: 'powerup/star1',
        }[name];
        const powerUp = this.powerUps.create(position.x, position.y, 'mario', frame);
        powerUp.setScale(2);
        powerUp.setData('type', name);
        if (name === 'star') {
          powerUp.play('star-spin');
        }
      });

    if (this.coins.countActive(true) === 0) {
      this.coins
        .create(300, 150 + this.levelOffsetY, 'mario', 'coin/coin1')
        .setScale(2)
        .play('coin-spin');
    }

    if (this.powerUps.countActive(true) === 0) {
      const fallback = [
        { type: 'mushroom', frame: 'powerup/super', x: 420, y: 150 + this.levelOffsetY },
        { type: 'star', frame: 'powerup/star1', x: 820, y: 150 + this.levelOffsetY },
      ];
      fallback.forEach(({ type, frame, x, y }) => {
        const powerUp = this.powerUps.create(x, y, 'mario', frame);
        powerUp.setScale(2);
        powerUp.setData('type', type);
        if (type === 'star') {
          powerUp.play('star-spin');
        }
      });
    }
  }

  handleCoin(player, coin) {
    if (!coin.active) {
      return;
    }

    this.gameState = collectCoin(this.gameState);
    coin.destroy();
    this.playSfx('smb_coin');
    this.updateHud();
  }

  createGoal() {
    const endPoint = this.worldLayer.findByIndex(5);
    const x = endPoint?.pixelX ?? 3700;
    const y = (endPoint?.pixelY ?? 160) + this.levelOffsetY;

    this.goal = this.physics.add.staticSprite(x, y, 'mario', 'flag');
    this.goal.setScale(2);
  }

  createEnemies() {
    this.enemies = this.physics.add.group();

    const mapEnemies = this.levelMap
      .getObjectLayer('enemies')
      .objects.filter(({ name }) => ['goomba', 'turtle'].includes(name))
      .slice(0, 16);
    const enemyData = mapEnemies.length
      ? mapEnemies.map(({ name, x, y }) => ({
          frame: name === 'turtle' ? 'turtle/turtle0' : 'goomba/walk1',
          name,
          speed: name === 'turtle' ? -25 : -35,
          x,
          y: y - 16 + this.levelOffsetY,
        }))
      : [{ frame: 'goomba/walk1', name: 'goomba', speed: -35, x: 470, y: 180 + this.levelOffsetY }];

    enemyData.forEach(({ frame, name, speed, x, y }) => {
      const enemy = this.enemies.create(x, y, 'mario', frame);
      enemy.setScale(2);
      enemy.setData('type', name);
      enemy.play(name === 'turtle' ? 'turtle-walk' : 'goomba-walk');
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
    this.pauseText = this.add
      .text(400, 180, '已暫停\n按 P 繼續', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '24px',
        align: 'center',
        backgroundColor: '#101a3acc',
        padding: { x: 18, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
    this.updateHud();
  }

  createDebugHud() {
    if (!this.debugMode) {
      return;
    }

    this.debugHud = this.add
      .text(16, 48, '', {
        color: '#9ff7c8',
        fontFamily: 'monospace',
        fontSize: '12px',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setScrollFactor(0);
  }

  updateDebugHud() {
    if (!this.debugHud) {
      return;
    }

    this.debugHud.setText(
      [
        `FPS ${Math.floor(this.game.loop.actualFps)}`,
        `座標 x:${Math.round(this.player.x)} y:${Math.round(this.player.y)}`,
        `狀態 ${this.gameState.status} 能力 ${this.gameState.power}`,
      ].join('\n'),
    );
  }

  createInput() {
    // 鍵盤輸入先集中成狀態，之後可與手機觸控按鈕共用 update() 規則。
    this.inputState = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
    });
    this.input.keyboard.on('keydown-R', this.restartGame, this);

    this.touchState = { left: false, right: false };
    this.touchJumpQueued = false;
    this.domAbortController = new AbortController();
    this.bindTouchButton('touch-left', 'left');
    this.bindTouchButton('touch-right', 'right');
    document.querySelector('#touch-jump').addEventListener(
      'pointerdown',
      (event) => {
        event.preventDefault();
        this.startAudio();
        this.touchJumpQueued = true;
      },
      { signal: this.domAbortController.signal },
    );
  }

  handleEnemyContact(player, enemy) {
    if (!enemy.active || this.gameState.status !== 'playing') {
      return;
    }

    const stomping = player.body.touching.down && enemy.body.touching.up;

    if (stomping || this.gameState.invincible) {
      // 踩踏會反彈玩家、停用敵人碰撞，再延遲移除其 Sprite。
      this.gameState = defeatEnemy(this.gameState);
      enemy.setFrame(enemy.getData('type') === 'turtle' ? 'turtle/shell' : 'goomba/flat');
      enemy.setVelocity(0, 0);
      enemy.body.enable = false;
      player.setVelocityY(-220);
      this.playSfx('smb_stomp');
      this.time.delayedCall(300, () => enemy.destroy());
    } else {
      // 非踩踏碰撞使用與掉出地圖相同的死亡流程。
      this.handlePlayerDeath();
    }

    this.updateHud();
    this.showResultIfFinished();
  }

  handlePlayerTileCollision(player, tile) {
    if (!tile?.properties?.callback || !player.body.touching.up) {
      return;
    }

    this.worldLayer.removeTileAt(tile.x, tile.y);
    this.playSfx('smb_breakblock');
  }

  tryEnterPipe() {
    if (this.pipeCooldown > 0) {
      return;
    }

    const pipe = this.pipes.find(
      ({ direction, height, width, x, y }) =>
        direction === 'down' &&
        Math.abs(this.player.x - (x + width / 2)) < 18 &&
        Math.abs(this.player.y - (y + height / 2)) < 24,
    );
    const destination = pipe && this.destinations[pipe.name];

    if (!destination) {
      return;
    }

    this.player.setPosition(destination.x + 8, destination.y - 16);
    this.pipeCooldown = 30;
    this.playSfx('smb_pipe');
  }

  handlePlayerDeath() {
    if (this.gameState.status !== 'playing') {
      return;
    }

    this.gameState = damagePlayer(this.gameState);
    this.playSfx('smb_mariodie');

    if (this.gameState.status === 'game-over') {
      this.player.setVelocity(0, 0);
    } else {
      this.player.setPosition(this.spawnPosition.x, this.spawnPosition.y);
      this.player.setVelocity(0, -180);
    }

    this.updateHud();
    this.showResultIfFinished();
  }

  handlePowerUp(player, powerUp) {
    if (!powerUp.active) {
      return;
    }

    const type = powerUp.getData('type');
    this.gameState = collectPowerUp(this.gameState, type);
    powerUp.destroy();
    this.playSfx(type === '1up' ? 'smb_1-up' : 'smb_powerup');

    if (type === 'mushroom') {
      player.setFrame('mario/standSuper');
    }

    if (type === 'star') {
      player.setTint(0xffff66);
      this.time.delayedCall(8000, () => {
        this.gameState = { ...this.gameState, invincible: false };
        player.clearTint();
        this.updateHud();
      });
    }

    this.updateHud();
  }

  startAudio() {
    if (this.audioStarted) {
      return;
    }

    this.sound.context.resume();
    this.music = this.sound.add('overworld', { loop: true, volume: 0.35 });
    this.music.play();
    this.audioStarted = true;
  }

  playSfx(key) {
    if (this.audioStarted) {
      this.sound.playAudioSprite('sfx', key);
    }
  }

  bindTouchButton(id, direction) {
    const button = document.querySelector(`#${id}`);
    const setPressed = (pressed) => {
      this.touchState[direction] = pressed;
    };

    button.addEventListener(
      'pointerdown',
      (event) => {
        event.preventDefault();
        this.startAudio();
        setPressed(true);
        button.setPointerCapture(event.pointerId);
      },
      { signal: this.domAbortController.signal },
    );
    button.addEventListener('pointerup', () => setPressed(false), {
      signal: this.domAbortController.signal,
    });
    button.addEventListener('pointercancel', () => setPressed(false), {
      signal: this.domAbortController.signal,
    });
    button.addEventListener('pointerleave', () => setPressed(false), {
      signal: this.domAbortController.signal,
    });
  }

  cleanupScene() {
    this.domAbortController.abort();
    this.input.keyboard.off('keydown-R', this.restartGame, this);
    this.music?.stop();
  }

  restartGame() {
    if (this.gameState.status !== 'playing') {
      this.scene.restart();
    }
  }

  tickGameTimer() {
    if (this.gameState.status !== 'playing' || this.gameState.paused) {
      return;
    }

    this.gameState = tickTimer(this.gameState);
    this.updateHud();
    this.showResultIfFinished();
  }

  togglePause() {
    this.gameState = togglePause(this.gameState);
    this.physics.world.isPaused = this.gameState.paused;
    this.pauseText.setVisible(this.gameState.paused);

    if (this.gameState.paused) {
      this.sound.pauseAll();
    } else {
      this.sound.resumeAll();
    }
  }

  completeLevel() {
    if (this.gameState.status !== 'playing') {
      return;
    }

    this.gameState = completeLevel(this.gameState);
    this.updateHud();
    this.playSfx('smb_flagpole');
    this.showResultIfFinished();
  }

  showResultIfFinished() {
    if (this.resultShown) {
      return;
    }

    if (this.gameState.status === 'complete') {
      this.resultShown = true;
      this.resultText.setText('過關！\n按 R 重新開始').setVisible(true);
      this.player.setVelocity(0, 0);
    } else if (this.gameState.status === 'game-over') {
      this.resultShown = true;
      this.resultText.setText('遊戲結束\n按 R 重新開始').setVisible(true);
      this.playSfx('smb_gameover');
      this.player.setVelocity(0, 0);
    }
  }

  updateHud() {
    const power = this.gameState.invincible
      ? '無敵'
      : this.gameState.power === 'super'
        ? '超級'
        : '小型';

    this.hud.setText(
      `分數 ${this.gameState.score} | 金幣 ${this.gameState.coins} | 生命 ${this.gameState.lives} | 能力 ${power} | 時間 ${this.gameState.timeRemaining}`,
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
  scene: [PreloadScene, TitleScene, GameScene],
});
