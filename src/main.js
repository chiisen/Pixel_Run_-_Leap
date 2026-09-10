import Phaser from 'phaser';

import './styles.css';

import {
  ITEM_LIFETIME_MS,
  QUESTION_BLOCK_INDEX,
  USED_BLOCK_INDEX,
  buildSpawnTable,
  resolveSpawnType,
} from './game/questionBlocks.js';
import {
  collectCoin,
  collectPowerUp,
  completeLevel,
  createGameState,
  damagePlayer,
  defeatEnemy,
  losePower,
  tickTimer,
  togglePause,
} from './game/gameState.js';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
// 受傷縮小後的無敵閃爍時間，避免同一隻怪連續撞兩幀直接致死。
const HURT_COOLDOWN_MS = 2000;

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
    const audioState = TitleScene.getAudioState();
    this.musicEnabled = audioState.musicEnabled;
    this.sfxEnabled = audioState.sfxEnabled;

    this.cameras.main.setBackgroundColor('#101a3a');
    this.add
      .text(GAME_WIDTH / 2, 150, 'Pixel Run & Leap', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '42px',
        resolution: 2,
      })
      .setOrigin(0.5);

    this.musicToggle = this.add
      .text(GAME_WIDTH / 2 - 80, 360, '音樂: 開', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '16px',
        backgroundColor: '#3a4a8c',
        padding: { x: 10, y: 6 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.sfxToggle = this.add
      .text(GAME_WIDTH / 2 + 80, 360, '音效: 開', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '16px',
        backgroundColor: '#3a4a8c',
        padding: { x: 10, y: 6 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.musicToggle.on('pointerdown', () => this.toggleAudio('music'));
    this.sfxToggle.on('pointerdown', () => this.toggleAudio('sfx'));
    this.refreshAudioToggleLabels();

    this.add
      .text(GAME_WIDTH / 2, 260, '開始遊戲', {
        color: '#f7d774',
        backgroundColor: '#284b8f',
        fontFamily: 'sans-serif',
        fontSize: '24px',
        padding: { x: 24, y: 14 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame());

    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
  }

  startGame() {
    if (this.scene.isActive('GameScene')) {
      return;
    }

    this.scene.start('GameScene');
  }

  toggleAudio(kind) {
    const state = TitleScene.getAudioState();
    if (kind === 'music') {
      state.musicEnabled = !state.musicEnabled;
      this.musicEnabled = state.musicEnabled;
    } else {
      state.sfxEnabled = !state.sfxEnabled;
      this.sfxEnabled = state.sfxEnabled;
    }
    this.refreshAudioToggleLabels();
  }

  refreshAudioToggleLabels() {
    this.musicToggle?.setText(`音樂: ${this.musicEnabled ? '開' : '關'}`);
    this.sfxToggle?.setText(`音效: ${this.sfxEnabled ? '開' : '關'}`);
  }

  static getAudioState() {
    window.__pixelRunLeapAudio ??= { musicEnabled: true, sfxEnabled: true };
    return window.__pixelRunLeapAudio;
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
    this.hurtCooldownUntil = 0;
    this.hurtBlinkEvent = null;
    this.physics.world.isPaused = false;
    const audioState = (window.__pixelRunLeapAudio ??= {
      musicEnabled: true,
      sfxEnabled: true,
    });
    this.musicEnabled = audioState.musicEnabled;
    this.sfxEnabled = audioState.sfxEnabled;

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
    this.createFireballs();
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
    this.physics.add.collider(this.fireballs, this.worldLayer);
    this.physics.add.collider(this.spawnedItems, this.worldLayer);
    this.physics.add.collider(this.player, this.enemies, this.handleEnemyContact, null, this);
    this.physics.add.overlap(this.player, this.coins, this.handleCoin, null, this);
    this.physics.add.overlap(this.player, this.powerUps, this.handlePowerUp, null, this);
    this.physics.add.overlap(this.player, this.spawnedItems, this.handlePowerUp, null, this);
    this.physics.add.overlap(this.fireballs, this.enemies, this.handleFireballEnemy, null, this);
    this.physics.add.overlap(this.player, this.goal, () => this.completeLevel());
    this.cameras.main.startFollow(this.player, true, 1, 1);
    // 跟隨不加平滑：平滑會在放開方向鍵後讓鏡頭繼續滑行，看起來像主角有慣性。
    this.cameras.main.roundPixels = true;

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.tickGameTimer,
      callbackScope: this,
    });
    this.pipeCooldown = 0;
    this.fireCooldown = 0;
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
          crouching: this.isCrouching,
          x: this.player.x,
          y: this.player.y,
        }),
        getState: () => ({ ...this.gameState }),
        getItems: () => ({
          coins: this.coins.getChildren().map((c) => ({ x: Math.round(c.x), y: Math.round(c.y) })),
          fireballs: this.fireballs
            .getChildren()
            .map((f) => ({ x: Math.round(f.x), y: Math.round(f.y) })),
          powerUps: this.powerUps
            .getChildren()
            .map((p) => ({ type: p.getData('type'), x: Math.round(p.x), y: Math.round(p.y) })),
          spawned: this.spawnedItems
            .getChildren()
            .map((p) => ({ type: p.getData('type'), x: Math.round(p.x), y: Math.round(p.y) })),
        }),
        getWorldBounds: () => ({
          height: this.physics.world.bounds.height,
          width: this.physics.world.bounds.width,
        }),
        getCamera: () => ({
          scrollX: this.cameras.main.scrollX,
          scrollY: this.cameras.main.scrollY,
        }),
        setPlayerPosition: (x, y) => {
          this.player.setPosition(x, y);
          this.player.setVelocityY(100);
        },
      };
    }
  }

  update() {
    const { a, d, down, fire, left, right, jump } = this.inputState;

    if (this.gameState.status !== 'playing') {
      return;
    }

    if (this.gameState.paused) {
      return;
    }

    if (this.pipeCooldown > 0) {
      this.pipeCooldown -= 1;
    }
    if (this.fireCooldown > 0) {
      this.fireCooldown -= 1;
    }

    if (down.isDown) {
      this.tryEnterPipe();
    }

    const downHeld = down.isDown || this.touchState.down;
    const onGround = this.player.body.blocked.down;

    // 蹲下只在地面成立；走下平台騰空時自動站起，避免空中卡著蹲姿。
    if (this.isCrouching && !onGround) {
      this.setCrouching(false);
    } else if (downHeld && onGround && !this.isCrouching) {
      this.setCrouching(true);
    } else if (this.isCrouching && !downHeld) {
      this.setCrouching(false);
    }

    if (this.player.y > this.levelOffsetY + this.levelMap.heightInPixels + 64) {
      this.handlePlayerDeath();
      return;
    }

    const pitY = this.levelOffsetY + this.levelMap.heightInPixels + 64;
    this.spawnedItems.getChildren().forEach((item) => {
      const age = this.time.now - (item.getData('spawnedAt') ?? this.time.now);

      if (item.y > pitY || age > ITEM_LIFETIME_MS) {
        item.destroy();
      }
    });
    this.updateEnemies();

    if (this.isCrouching) {
      this.player.setVelocityX(0);
    } else if (left.isDown || a.isDown || this.touchState.left) {
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

    // 蹲著跳先站起來再起跳，共用同一套 blocked.down 地面判定。
    if (jumpPressed && this.isCrouching) {
      this.setCrouching(false);
    }

    if (jumpPressed && this.player.body.blocked.down) {
      this.player.setVelocityY(-300);
      this.playSfx('smb_jump-small');
    }

    if (Phaser.Input.Keyboard.JustDown(fire) || this.touchFireQueued) {
      this.touchFireQueued = false;
      this.shootFireball();
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
      key: 'mario-walk-fire',
      frames: ['mario/walkFire1', 'mario/walkFire2', 'mario/walkFire3'].map((frame) => ({
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
    this.isCrouching = false;
    this.updatePlayerBody('small', false);
  }

  // 小型 16x16、超級/火焰 16x32：變身必須同步放大碰撞框，
  // 否則 body 只有上半身高度，腳會陷入地板、blocked.down 永遠對不準。
  // 蹲下縮小高度但腳底對齊（small 12x12、super/fire 12x20），不需移動 y。
  updatePlayerBody(power, crouching = false) {
    if (crouching) {
      if (power === 'super' || power === 'fire') {
        this.player.body.setSize(12, 20).setOffset(2, 12);
      } else {
        this.player.body.setSize(12, 12).setOffset(2, 4);
      }
      return;
    }

    if (power === 'super' || power === 'fire') {
      this.player.body.setSize(12, 30).setOffset(2, 2);
    } else {
      this.player.body.setSize(12, 16).setOffset(2, 0);
    }
  }

  // 蹲下切換統一經此函式，確保動畫與碰撞框一致；不滿足地面條件由 update() 把關。
  setCrouching(on) {
    if (this.isCrouching === on) {
      return;
    }

    this.isCrouching = on;
    this.player.anims.stop();
    this.updatePlayerBody(this.gameState.power, on);

    if (on) {
      this.player.setVelocityX(0);
    }
  }

  updatePlayerAnimation() {
    if (this.isCrouching) {
      this.player.anims.stop();
      const bendFrame = {
        fire: 'mario/bendFire',
        small: 'mario/bend',
        super: 'mario/bendSuper',
      }[this.gameState.power];
      this.player.setFrame(bendFrame);
      return;
    }

    if (!this.player.body.blocked.down) {
      this.player.anims.stop();
      const jumpFrame = {
        fire: 'mario/jumpFire',
        small: 'mario/jump',
        super: 'mario/jumpSuper',
      }[this.gameState.power];
      this.player.setFrame(jumpFrame);
      return;
    }

    if (this.player.body.velocity.x !== 0) {
      this.player.anims.play(
        this.gameState.power === 'fire'
          ? 'mario-walk-fire'
          : this.gameState.power === 'super'
            ? 'mario-walk-super'
            : 'mario-walk',
        true,
      );
      return;
    }

    this.player.anims.stop();
    const standFrame = {
      fire: 'mario/standFire',
      small: 'mario/stand',
      super: 'mario/standSuper',
    }[this.gameState.power];
    this.player.setFrame(standFrame);
  }

  createCollectibles() {
    const modifiers = this.levelMap.getObjectLayer('modifiers')?.objects ?? [];
    this.coins = this.physics.add.staticGroup();
    this.powerUps = this.physics.add.staticGroup();
    this.spawnedItems = this.physics.add.group();
    // 有相鄰問號磚的標記改由頂磚生成，不再靜態擺放；無磚可掛才靜態擺放。
    const { entries, statics } = this.findBlockSpawns(modifiers);
    this.spawnTable = buildSpawnTable(entries);

    statics.forEach(({ name, x, y }) => {
      this.placeStaticPowerUp(name, x, y);
    });

    if (this.coins.countActive(true) === 0) {
      this.coins
        .create(300, 150 + this.levelOffsetY, 'mario', 'coin/coin1')
        .setScale(2)
        .play('coin-spin');
    }

    if (this.powerUps.countActive(true) === 0) {
      // 該種類已有地圖標記（走頂出生成）就不再靜態擺放，避免裸露；
      // 目前只有花朵無標記，保留一朵靜態作為唯一來源。
      const marked = new Set(entries.map(({ name }) => name));
      const fallback = [
        { type: 'flower', frame: 'powerup/flower1', x: 620, y: 150 + this.levelOffsetY },
        { type: 'mushroom', frame: 'powerup/super', x: 420, y: 150 + this.levelOffsetY },
        { type: 'star', frame: 'powerup/star1', x: 820, y: 150 + this.levelOffsetY },
      ].filter(({ type }) => !marked.has(type));
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

  placeStaticPowerUp(name, x, y) {
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
      flower: 'powerup/flower1',
      mushroom: 'powerup/super',
      star: 'powerup/star1',
    }[name];
    const powerUp = this.powerUps.create(position.x, position.y, 'mario', frame);
    powerUp.setScale(2);
    powerUp.setData('type', name);
    if (name === 'star') {
      powerUp.play('star-spin');
    }
  }

  findQuestionBlock(x, y) {
    const tileX = Math.floor(x / 16);
    const tileY = Math.floor(y / 16);

    // 標記座落在磚格邊界上，上下各找一格內的問號磚。
    for (const candidateY of [tileY - 1, tileY, tileY + 1]) {
      const tile = this.levelMap.getTileAt(tileX, candidateY, false, 'world');

      if (tile?.index === QUESTION_BLOCK_INDEX) {
        return { tileX, tileY: candidateY };
      }
    }

    return null;
  }

  findBlockSpawns(modifiers) {
    const markers = modifiers.filter(
      ({ name, type }) =>
        type === 'powerUp' && ['coin', 'flower', 'mushroom', 'star', '1up'].includes(name),
    );
    const entries = [];
    const usedKeys = new Set();
    const statics = [];

    markers.forEach(({ name, x, y }) => {
      const block = this.findQuestionBlock(x, y);

      if (block) {
        entries.push({ name, ...block });
        usedKeys.add(`${block.tileX},${block.tileY}`);
        return;
      }

      // 無相鄰問號磚的標記（如懸空 1UP）藏進最近的空閒問號磚；
      // 沒有空閒磚才回退靜態擺放。
      const spare = this.findSpareQuestionBlock(x, usedKeys);

      if (spare) {
        entries.push({ name, ...spare });
        usedKeys.add(`${spare.tileX},${spare.tileY}`);
      } else {
        statics.push({ name, x, y });
      }
    });

    return { entries, statics };
  }

  findSpareQuestionBlock(markerX, usedKeys) {
    const spares = this.worldLayer.filterTiles(
      (tile) => tile?.index === QUESTION_BLOCK_INDEX && !usedKeys.has(`${tile.x},${tile.y}`),
      this,
      0,
      0,
      this.levelMap.width,
      this.levelMap.height,
    );

    if (spares.length === 0) {
      return null;
    }

    spares.sort((a, b) => Math.abs(a.pixelX + 8 - markerX) - Math.abs(b.pixelX + 8 - markerX));

    return { tileX: spares[0].x, tileY: spares[0].y };
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
    const endTile = this.worldLayer.findByIndex(5);
    const poleCenterX = (endTile?.pixelX ?? 3700) + 8;
    const poleTopY = (endTile?.pixelY ?? 160) + this.levelOffsetY;
    // 旗幟本體只有 16x16，放在杆頂當裝飾；真正觸發過關的是覆蓋整根旗杆的靜態區域，
    // 否則玩家在地面碰到杆身時永遠碰不到杆頂的小圖。
    this.add.image(poleCenterX, poleTopY, 'mario', 'flag').setScale(2);
    const groundTopY = this.levelOffsetY + this.levelMap.heightInPixels - 32;
    const zoneHeight = Math.max(32, groundTopY - poleTopY);
    this.goal = this.add.zone(poleCenterX, poleTopY + zoneHeight / 2, 24, zoneHeight);
    this.physics.add.existing(this.goal, true);
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
          // Tiled y 是物件底部，中心需上移半身高：goomba 16px、烏龜 24px。
          // 烏龜用 -16 會一出生就半埋進地板，物理擠壓後整隻穿過地面。
          x,
          y: y - (name === 'turtle' ? 24 : 16) + this.levelOffsetY,
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
      // 烏龜貼圖 16x24，碰撞框需 14x22 腳底對齊；沿用 goomba 的 14x14 會腳懸空埋進地板。
      if (name === 'turtle') {
        enemy.body.setSize(14, 22).setOffset(1, 2);
      } else {
        enemy.body.setSize(14, 14).setOffset(1, 2);
      }
    });
  }

  updateEnemies() {
    // 懸崖偵測：落地行走時前方無磚就轉向，避免直直走下高台。
    // 地面層全連通不受影響，只改變高台邊緣行為；頂出道具共用同一規則。
    this.applyLedgeTurn(this.enemies);
    this.applyLedgeTurn(this.spawnedItems);
  }

  applyLedgeTurn(group) {
    group.getChildren().forEach((body) => {
      if (!body.active || !body.body.blocked.down) {
        return;
      }

      const direction = Math.sign(body.body.velocity.x);

      if (direction === 0) {
        return;
      }

      const ahead = this.worldLayer.getTileAtWorldXY(
        body.x + direction * (body.body.halfWidth + 3),
        body.body.bottom + 4,
        false,
      );

      if (!ahead?.collides) {
        body.setVelocityX(-body.body.velocity.x);
      }
    });
  }

  createFireballs() {
    this.fireballs = this.physics.add.group();
  }

  createHud() {
    this.hud = this.add
      .text(16, 16, '', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '16px',
        resolution: 2,
        stroke: '#000000',
        strokeThickness: 4,
        wordWrap: { width: GAME_WIDTH - 32 },
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
        resolution: 2,
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
        resolution: 2,
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
        resolution: 2,
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
      fire: Phaser.Input.Keyboard.KeyCodes.Z,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
    });
    this.input.keyboard.on('keydown-R', this.restartGame, this);
    this.input.keyboard.on('keydown-T', this.returnToTitle, this);
    this.input.keyboard.on('keydown-P', this.togglePause, this);

    this.touchState = { down: false, left: false, right: false };
    this.touchJumpQueued = false;
    this.touchFireQueued = false;
    this.domAbortController = new AbortController();
    this.bindTouchButton('touch-left', 'left');
    this.bindTouchButton('touch-right', 'right');
    this.bindTouchButton('touch-down', 'down');
    document.querySelector('#touch-fire').addEventListener(
      'pointerdown',
      (event) => {
        event.preventDefault();
        this.startAudio();
        this.touchFireQueued = true;
      },
      { signal: this.domAbortController.signal },
    );
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
    } else if (this.time.now < this.hurtCooldownUntil) {
      // 受傷無敵閃爍中，直接穿過敵人。
      return;
    } else if (this.gameState.power === 'super' || this.gameState.power === 'fire') {
      this.shrinkPlayerFromHit();
    } else {
      // 非踩踏碰撞使用與掉出地圖相同的死亡流程。
      this.handlePlayerDeath();
    }

    this.updateHud();
    this.showResultIfFinished();
  }

  // 變大狀態受傷只掉能力不扣命，並給 2 秒無敵閃爍，
  // 否則同一隻怪下一幀就會把縮小後的小型主角直接撞死。
  shrinkPlayerFromHit() {
    const wasBig = this.gameState.power === 'super' || this.gameState.power === 'fire';
    this.gameState = losePower(this.gameState);
    this.playSfx('smb_pipe');

    // 縮小後腳底對齊：站立時下移 16px，蹲著時碰撞框本來就貼腳不需移動。
    if (wasBig && !this.isCrouching) {
      this.player.y += 16;
    }
    this.updatePlayerBody(this.gameState.power, this.isCrouching);

    this.hurtCooldownUntil = this.time.now + HURT_COOLDOWN_MS;
    this.hurtBlinkEvent?.remove();
    this.player.setAlpha(1);
    this.hurtBlinkEvent = this.time.addEvent({
      callback: () => this.player.setAlpha(this.player.alpha === 1 ? 0.25 : 1),
      delay: 100,
      loop: true,
    });
    this.time.delayedCall(HURT_COOLDOWN_MS, () => {
      this.hurtBlinkEvent?.remove();
      this.hurtBlinkEvent = null;
      this.player.setAlpha(1);
    });
  }

  handlePlayerTileCollision(player, tile) {
    // 注意：Phaser 磚塊分離只設定 blocked 而不設定 touching，
    // 頭頂磚塊必須用 blocked.up 判斷，touching.up 永遠是 false。
    if (!tile || !player.body.blocked.up) {
      return;
    }

    // 用過的磚再頂只有碰撞音效，不再觸發。
    if (tile.index === USED_BLOCK_INDEX) {
      this.playSfx('smb_bump');
      return;
    }

    if (tile.properties?.callback !== 'questionMark') {
      if (!tile.properties?.callback) {
        return;
      }

      this.worldLayer.removeTileAt(tile.x, tile.y);
      this.playSfx('smb_breakblock');
      return;
    }

    this.hitQuestionBlock(tile);
  }

  hitQuestionBlock(tile) {
    this.worldLayer.putTileAt(USED_BLOCK_INDEX, tile.x, tile.y);
    this.playSfx('smb_bump');

    const type = resolveSpawnType(this.spawnTable, tile.x, tile.y);

    if (type === 'coin') {
      this.spawnCoinPop(tile);
      return;
    }

    this.spawnItemFromBlock(tile, type);
  }

  spawnCoinPop(tile) {
    const x = tile.pixelX + 8;
    const y = tile.pixelY + this.levelOffsetY;

    this.gameState = collectCoin(this.gameState);
    this.playSfx('smb_coin');
    this.updateHud();

    const coin = this.add.image(x, y - 8, 'mario', 'coin/coin1').setScale(2);
    this.tweens.add({
      duration: 180,
      onComplete: () => coin.destroy(),
      targets: coin,
      y: y - 56,
      yoyo: true,
    });
  }

  spawnItemFromBlock(tile, type) {
    const x = tile.pixelX + 8;
    const topY = tile.pixelY + this.levelOffsetY;
    const frame = {
      '1up': 'powerup/1up',
      flower: 'powerup/flower1',
      mushroom: 'powerup/super',
      star: 'powerup/star1',
    }[type];
    const item = this.spawnedItems.create(x, topY - 8, 'mario', frame);

    item.setScale(2);
    item.setData('type', type);
    item.setData('spawnedAt', this.time.now);
    item.body.setSize(14, 14);
    item.body.setAllowGravity(false);
    item.setVelocity(0, 0);
    if (type === 'star') {
      item.play('star-spin');
    }
    this.playSfx('smb_powerup_appears');
    // 先升出磚面再啟用移動，升起過程保持無重力靜止。
    this.tweens.add({
      duration: 260,
      onComplete: () => this.releaseSpawnedItem(item, type),
      targets: item,
      y: topY - 32,
    });
  }

  releaseSpawnedItem(item, type) {
    if (!item.active) {
      return;
    }

    if (type === 'flower') {
      item.body.setImmovable(true);
      return;
    }

    item.body.setAllowGravity(true);
    item.setVelocityX(45 * (item.x < this.player.x ? -1 : 1));
    if (type === 'star') {
      item.setBounce(0.7);
      item.setVelocityY(-120);
    } else {
      item.setBounceX(1);
    }
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
    this.hurtBlinkEvent?.remove();
    this.hurtBlinkEvent = null;
    this.player.setAlpha(1);
    this.playSfx('smb_mariodie');

    if (this.gameState.status === 'game-over') {
      this.player.setFrame('mario/dead');
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
    const wasSmall = this.gameState.power === 'small';
    this.gameState = collectPowerUp(this.gameState, type);
    powerUp.destroy();
    this.playSfx(type === '1up' ? 'smb_1-up' : 'smb_powerup');

    if (type === 'mushroom') {
      player.setFrame('mario/standSuper');
      // 長高 16 紋素（顯示 32px），腳底對齊需上移 16px，
      // 再放大碰撞框，否則下半身陷入地板。
      if (wasSmall) {
        player.y -= 16;
      }
      this.updatePlayerBody('super', this.isCrouching);
    }

    if (type === 'flower') {
      player.setFrame('mario/standFire');
      if (wasSmall) {
        player.y -= 16;
      }
      this.updatePlayerBody('fire', this.isCrouching);
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

  shootFireball() {
    if (this.gameState.power !== 'fire' || this.fireCooldown > 0) {
      return;
    }

    const direction = this.player.flipX ? -1 : 1;
    const fireball = this.fireballs.create(
      this.player.x + direction * 18,
      this.player.y,
      'mario',
      'fire/fly1',
    );
    // 火球往斜下方丟出，靠重力下墜、觸地滿彈性跳起，沿地面上下彈跳前進。
    fireball.setVelocity(direction * 240, 160);
    fireball.setBounce(1, 1);
    fireball.body.setAllowGravity(true);
    fireball.setCollideWorldBounds(true);
    this.fireCooldown = 20;
    this.playSfx('smb_fireball');
    this.time.delayedCall(2500, () => fireball.destroy());
  }

  handleFireballEnemy(fireball, enemy) {
    if (!fireball.active || !enemy.active) {
      return;
    }

    this.gameState = defeatEnemy(this.gameState);
    enemy.setFrame(enemy.getData('type') === 'turtle' ? 'turtle/shell' : 'goomba/flat');
    enemy.body.enable = false;
    fireball.destroy();
    this.playSfx('smb_kick');
    this.updateHud();
    this.time.delayedCall(300, () => enemy.destroy());
  }

  startAudio() {
    if (this.audioStarted) {
      return;
    }

    this.sound.context.resume();
    if (!this.musicEnabled) {
      this.audioStarted = true;
      return;
    }
    this.music = this.sound.add('overworld', { loop: true, volume: 0.35 });
    this.music.play();
    this.audioStarted = true;
  }

  playSfx(key) {
    if (this.audioStarted && this.sfxEnabled) {
      this.sound.playAudioSprite('sfx', key);
    }
  }

  bindTouchButton(id, direction) {
    const button = document.querySelector(`#${id}`);
    const setPressed = (pressed) => {
      this.touchState[direction] = pressed;
      button.dataset.active = String(pressed);
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
    button.dataset.active = 'false';
  }

  cleanupScene() {
    this.domAbortController.abort();
    this.input.keyboard.off('keydown-R', this.restartGame, this);
    this.input.keyboard.off('keydown-T', this.returnToTitle, this);
    this.input.keyboard.off('keydown-P', this.togglePause, this);
    this.music?.stop();
  }

  restartGame() {
    if (this.gameState.status !== 'playing') {
      this.scene.restart();
    }
  }

  returnToTitle() {
    if (this.gameState.status !== 'playing') {
      this.scene.start('TitleScene');
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

    this.gameState = completeLevel(this.gameState, this.gameState.timeRemaining * 10);
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
      this.resultText
        .setText(`過關！\n最終分數 ${this.gameState.score}\n按 R 重來 / T 返回標題`)
        .setVisible(true);
      this.player.setVelocity(0, 0);
    } else if (this.gameState.status === 'game-over') {
      this.resultShown = true;
      this.resultText.setText('遊戲結束\n按 R 重來 / T 返回標題').setVisible(true);
      this.playSfx('smb_gameover');
      this.player.setVelocity(0, 0);
    }
  }

  updateHud() {
    const power = this.gameState.invincible
      ? '無敵'
      : this.gameState.power === 'super'
        ? '超級'
        : this.gameState.power === 'fire'
          ? '火焰'
          : '小型';

    this.hud.setText(
      `分數 ${this.gameState.score} | 金幣 ${this.gameState.coins} | 生命 ${this.gameState.lives} | 能力 ${power} | 時間 ${this.gameState.timeRemaining}`,
    );
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  pixelArt: true,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#5c94fc',
  render: {
    antialias: false,
    roundPixels: true,
  },
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
