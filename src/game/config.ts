// [0] Cấu hình Phaser: kích thước, chế độ pixel art
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { LifeScene } from './scenes/LifeScene';
import { PreloadScene } from './scenes/PreloadScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, PreloadScene, LifeScene],
};
