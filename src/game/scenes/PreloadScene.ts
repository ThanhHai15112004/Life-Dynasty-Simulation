// [0] Tải hình ảnh, âm thanh, dữ liệu vẽ theo asset-manifest
import Phaser from 'phaser';
import { assetManifest } from '../asset-manifest';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    for (const a of assetManifest.json) this.load.json(a.key, a.url);
  }

  create(): void {
    this.scene.start('LifeScene');
  }
}
