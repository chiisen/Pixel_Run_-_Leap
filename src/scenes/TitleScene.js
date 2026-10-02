import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from '../game/constants.js';
import { globalActionLogger } from '../systems/actionLog.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    globalActionLogger.log('system', 'scene_start', { sceneName: 'TitleScene' });
    const audioState = TitleScene.getAudioState();
    this.musicEnabled = audioState.musicEnabled;
    this.sfxEnabled = audioState.sfxEnabled;

    this.cameras.main.setBackgroundColor('#5c94fc');
    this.clouds = this.add
      .tileSprite(0, 0, GAME_WIDTH, 80, 'clouds')
      .setOrigin(0, 0)
      .setAlpha(0.95);

    const groundTop = GAME_HEIGHT - 64;
    this.add
      .tileSprite(0, groundTop, GAME_WIDTH, 64, this.groundTexture())
      .setOrigin(0, 0)
      .setTileScale(2);

    this.ensureTitleAnims();
    const runner = this.add.sprite(168, groundTop - 24, 'mario', 'mario/walk1').setScale(3);
    runner.play('title-mario-walk');
    this.tweens.add({
      targets: runner,
      y: groundTop - 56,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeOut',
    });

    const coin = this.add.sprite(248, groundTop - 20, 'mario', 'coin/coin1').setScale(2);
    coin.play('title-coin-spin');
    this.tweens.add({
      targets: coin,
      y: groundTop - 36,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    const flower = this.add.image(600, groundTop - 20, 'mario', 'powerup/flower1').setScale(2);
    this.tweens.add({
      targets: flower,
      y: groundTop - 32,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(GAME_WIDTH / 2, 118, 'Pixel Run & Leap', {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '40px',
        resolution: 2,
        stroke: '#1b2f8a',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 168, '空白鍵或按鈕開始', {
        color: '#fff4c2',
        fontFamily: 'monospace',
        fontSize: '16px',
        resolution: 2,
        stroke: '#1b2f8a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const startButton = this.add
      .rectangle(0, 0, 220, 52, 0xe85d04)
      .setStrokeStyle(4, 0x6b2400)
      .setInteractive({ useHandCursor: true });
    const startLabel = this.add
      .text(0, 0, '開始遊戲', {
        color: '#fff8e8',
        fontFamily: 'monospace',
        fontSize: '24px',
        resolution: 2,
      })
      .setOrigin(0.5);
    const startGroup = this.add.container(GAME_WIDTH / 2, 236, [startButton, startLabel]);
    this.tweens.add({
      targets: startGroup,
      y: 230,
      duration: 640,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    startButton.on('pointerover', () => startButton.setFillStyle(0xff7a1a));
    startButton.on('pointerout', () => startButton.setFillStyle(0xe85d04));
    startButton.on('pointerdown', () => this.startGame());

    this.musicToggle = this.makeAudioToggle(GAME_WIDTH / 2 - 86, 318, '音樂', 'music');
    this.sfxToggle = this.makeAudioToggle(GAME_WIDTH / 2 + 86, 318, '音效', 'sfx');
    this.refreshAudioToggleLabels();

    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
  }

  update() {
    if (this.clouds) {
      this.clouds.tilePositionX += 0.35;
    }
  }

  ensureTitleAnims() {
    if (!this.anims.exists('title-mario-walk')) {
      this.anims.create({
        key: 'title-mario-walk',
        frames: ['mario/walk1', 'mario/walk2', 'mario/walk3'].map((frame) => ({
          key: 'mario',
          frame,
        })),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.anims.exists('title-coin-spin')) {
      this.anims.create({
        key: 'title-coin-spin',
        frames: ['coin/coin1', 'coin/coin2', 'coin/coin3'].map((frame) => ({
          key: 'mario',
          frame,
        })),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  groundTexture() {
    const key = 'title-ground';
    if (this.textures.exists(key)) {
      return key;
    }

    // 地圖磚 40：tileset margin 1、spacing 2、每列 11 格。
    const canvas = this.textures.createCanvas(key, 16, 16);
    canvas
      .getContext()
      .drawImage(this.textures.get('tiles').getSourceImage(), 109, 55, 16, 16, 0, 0, 16, 16);
    canvas.refresh();
    return key;
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
    globalActionLogger.log('input', 'audio_toggle', {
      enabled: kind === 'music' ? this.musicEnabled : this.sfxEnabled,
      type: kind,
    });
  }

  makeAudioToggle(x, y, label, kind) {
    const plate = this.add
      .rectangle(0, 0, 128, 40, 0x2f7d32)
      .setStrokeStyle(4, 0x143d16)
      .setInteractive({ useHandCursor: true });
    const caption = this.add
      .text(0, 0, label, {
        color: '#f4ffe8',
        fontFamily: 'monospace',
        fontSize: '16px',
        resolution: 2,
      })
      .setOrigin(0.5);
    const group = this.add.container(x, y, [plate, caption]);
    group.setData('label', label);
    group.setData('plate', plate);
    group.setData('caption', caption);
    plate.on('pointerover', () => {
      const enabled = group.getData('enabled') !== false;
      plate.setFillStyle(enabled ? 0x46a24a : 0x8a4e48);
    });
    plate.on('pointerout', () => this.paintAudioToggle(group, group.getData('enabled') !== false));
    plate.on('pointerdown', () => this.toggleAudio(kind));
    return group;
  }

  refreshAudioToggleLabels() {
    this.paintAudioToggle(this.musicToggle, this.musicEnabled);
    this.paintAudioToggle(this.sfxToggle, this.sfxEnabled);
  }

  paintAudioToggle(group, enabled) {
    group.setData('enabled', enabled);
    const plate = group.getData('plate');
    const caption = group.getData('caption');
    caption.setText(`${group.getData('label')}  ${enabled ? '開' : '關'}`);
    caption.setColor(enabled ? '#f4ffe8' : '#f3d2cc');
    plate.setFillStyle(enabled ? 0x2f7d32 : 0x6b3a3a);
    plate.setStrokeStyle(4, enabled ? 0x143d16 : 0x3d1e1e);
  }

  static getAudioState() {
    window.__pixelRunLeapAudio ??= { musicEnabled: true, sfxEnabled: true };
    return window.__pixelRunLeapAudio;
  }
}
