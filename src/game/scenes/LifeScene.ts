// [0] Cảnh pixel chính: nhà, ruộng, người trong hộ — chỉ đọc SceneDescriptor từ GameStore
import Phaser from 'phaser';
import type { GameStore } from '@bridge/GameStore';
import type { SceneDescriptor } from '@core/index';
import { SCENE_LAYOUT_KEY, type SceneLayout } from '../scene-layers/art';
import { buildScene } from '../scene-layers/layers';
import { ParticleLayer } from '../scene-layers/particles';
import { PixelPainter, color } from '../scene-layers/PixelPainter';
import { STORE_REGISTRY_KEY } from '../registryKeys';

export class LifeScene extends Phaser.Scene {
  private layout!: SceneLayout;
  private store!: GameStore;
  private root!: Phaser.GameObjects.Container;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private maskGfx!: Phaser.GameObjects.Graphics;
  private particles = new ParticleLayer();
  private descriptor: SceneDescriptor | null = null;
  private descriptorKey = '';
  private chimney: [number, number] | null = null;
  private unsubscribe?: () => void;

  constructor() {
    super('LifeScene');
  }

  create(): void {
    this.layout = this.cache.json.get(SCENE_LAYOUT_KEY) as SceneLayout;
    this.store = this.registry.get(STORE_REGISTRY_KEY) as GameStore;
    this.cameras.main.setBackgroundColor(color(this.layout.background));
    this.root = this.add.container();
    this.fxGfx = this.add.graphics();
    // Cắt mọi thứ trong khung cảnh (lũy tre, hạt mưa không tràn ra ngoài)
    this.maskGfx = this.make.graphics({}, false);
    const mask = this.maskGfx.createGeometryMask();
    this.root.setMask(mask);
    this.fxGfx.setMask(mask);
    this.unsubscribe = this.store.subscribe(() => this.sync());
    this.scale.on('resize', () => this.fit());
    this.events.once('shutdown', () => this.unsubscribe?.());
    this.fit();
    this.sync();
  }

  /** Co giãn khung 320×180 vào vùng cảnh, giữ tỷ lệ. */
  private fit(): void {
    const { width, height } = this.scale;
    const L = this.layout;
    const sceneH = height * L.sceneHeightRatio;
    const scale = Math.max(1, Math.min(width / L.width, sceneH / L.height));
    const x = Math.floor((width - L.width * scale) / 2);
    const y = Math.floor((sceneH - L.height * scale) / 2 + height * L.topOffsetRatio);
    this.root.setPosition(x, y).setScale(scale);
    this.fxGfx.setPosition(x, y).setScale(scale);
    this.maskGfx.clear().fillStyle(0xffffff).fillRect(x, y, L.width * scale, L.height * scale);
  }

  private sync(): void {
    const d = this.store.getSnapshot().scene;
    const key = d ? JSON.stringify(d) : '';
    if (key === this.descriptorKey) return;
    this.descriptorKey = key;
    this.descriptor = d;
    if (!d) {
      this.root.removeAll(true);
      return;
    }
    this.particles.sync(this.layout, d);
    this.chimney = buildScene(this, this.root, this.layout, d).chimney;
  }

  update(time: number): void {
    this.fxGfx.clear();
    if (!this.descriptor) return;
    this.particles.draw(new PixelPainter(this.fxGfx, 1, 0, 0), this.layout, this.chimney, time / 1000);
  }
}
