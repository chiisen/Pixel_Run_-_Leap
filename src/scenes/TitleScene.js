import Phaser from 'phaser';

import { GAME_WIDTH } from '../game/constants.js';
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
    globalActionLogger.log('input', 'audio_toggle', {
      enabled: kind === 'music' ? this.musicEnabled : this.sfxEnabled,
      type: kind,
    });
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
