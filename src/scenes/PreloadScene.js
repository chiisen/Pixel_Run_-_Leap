import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
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
