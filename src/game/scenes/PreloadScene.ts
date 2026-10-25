// [0] Tải tài nguyên JSON (bộ cảnh lắp ghép, cấu hình hoạt cảnh) rồi mở cảnh chính và lớp hoạt cảnh
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
    this.scene.launch('CutsceneScene');
  }
}
