// [0] Tải tài nguyên theo hai bước: (1) bố cục + danh mục sprite, (2) toàn bộ sprite sheet trong danh mục
import Phaser from 'phaser';
import { assetManifest } from '../asset-manifest';
import { SPRITE_MANIFEST_KEY, type SpriteManifest } from '../scene-layers/art';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    for (const a of assetManifest.json) this.load.json(a.key, a.url);
  }

  create(): void {
    const manifest = this.cache.json.get(SPRITE_MANIFEST_KEY) as SpriteManifest;
    for (const [key, s] of Object.entries(manifest.sprites)) {
      if (s.frames > 1) this.load.spritesheet(key, s.url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      else this.load.image(key, s.url);
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.start('LifeScene'));
    this.load.start();
  }
}
