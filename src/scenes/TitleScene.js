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
    this.add.tileSprite(0, 0, GAME_WIDTH, 80, 'clouds').setOrigin(0, 0).setAlpha(0.95);

    const groundTop = GAME_HEIGHT - 64;
    this.add
      .tileSprite(0, groundTop, GAME_WIDTH, 64, this.groundTexture())
      .setOrigin(0, 0)
      .setTileScale(2);

    this.add.image(168, groundTop - 24, 'mario', 'mario/stand').setScale(3);
    this.add.image(248, groundTop - 20, 'mario', 'coin/coin1').setScale(2);
    this.add.image(600, groundTop - 20, 'mario', 'powerup/flower1').setScale(2);

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
      .rectangle(GAME_WIDTH / 2, 236, 220, 52, 0xe85d04)
      .setStrokeStyle(4, 0x6b2400)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH / 2, 236, '開始遊戲', {
        color: '#fff8e8',
        fontFamily: 'monospace',
        fontSize: '24px',
        resolution: 2,
      })
      .setOrigin(0.5);
    startButton.on('pointerover', () => startButton.setFillStyle(0xff7a1a));
    startButton.on('pointerout', () => startButton.setFillStyle(0xe85d04));
    startButton.on('pointerdown', () => this.startGame());

    this.musicToggle = this.makeAudioToggle(GAME_WIDTH / 2 - 78, 312, '音樂');
    this.sfxToggle = this.makeAudioToggle(GAME_WIDTH / 2 + 78, 312, '音效');
    this.musicToggle.on('pointerdown', () => this.toggleAudio('music'));
    this.sfxToggle.on('pointerdown', () => this.toggleAudio('sfx'));
    this.refreshAudioToggleLabels();

    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
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

  makeAudioToggle(x, y, label) {
    const button = this.add
      .text(x, y, `${label}: 開`, {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '16px',
        backgroundColor: '#2f7d32',
        padding: { x: 12, y: 8 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.setData('label', label);
    return button;
  }

  refreshAudioToggleLabels() {
    const paint = (button, enabled) => {
      button.setText(`${button.getData('label')}: ${enabled ? '開' : '關'}`);
      button.setBackgroundColor(enabled ? '#2f7d32' : '#6b3a3a');
    };
    paint(this.musicToggle, this.musicEnabled);
    paint(this.sfxToggle, this.sfxEnabled);
  }

  static getAudioState() {
    window.__pixelRunLeapAudio ??= { musicEnabled: true, sfxEnabled: true };
    return window.__pixelRunLeapAudio;
  }
}
