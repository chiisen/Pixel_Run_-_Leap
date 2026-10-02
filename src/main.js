import Phaser from 'phaser';

import './styles.css';

import { GAME_HEIGHT, GAME_WIDTH } from './game/constants.js';
import { GameScene } from './scenes/GameScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { exposeGlobalDebugApi } from './systems/playtest.js';

exposeGlobalDebugApi();

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
