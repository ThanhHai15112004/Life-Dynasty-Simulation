// [0] Cảnh pixel chính: nhà, ruộng, người trong hộ — chỉ đọc SceneDescriptor từ GameStore
import Phaser from 'phaser';
import type { GameStore } from '@bridge/GameStore';
import type { SceneDescriptor } from '@core/index';
import { SCENE_ART_KEY, type SceneArt } from '../scene-layers/art';
import { drawBuildings, drawCharacters, drawCondition, drawProps, drawTerrain, drawWeather } from '../scene-layers/layers';
import { ParticleLayer } from '../scene-layers/particles';
import { PixelPainter, color } from '../scene-layers/PixelPainter';
import { STORE_REGISTRY_KEY } from '../registryKeys';

export class LifeScene extends Phaser.Scene {
  private art!: SceneArt;
  private store!: GameStore;
  private staticGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private particles = new ParticleLayer();
  private descriptor: SceneDescriptor | null = null;
  private descriptorKey = '';
  private unsubscribe?: () => void;

  constructor() {
    super('LifeScene');
  }

  create(): void {
    this.art = this.cache.json.get(SCENE_ART_KEY) as SceneArt;
    this.store = this.registry.get(STORE_REGISTRY_KEY) as GameStore;
    this.cameras.main.setBackgroundColor(color(this.art.background));
    this.staticGfx = this.add.graphics();
    this.fxGfx = this.add.graphics();
    this.unsubscribe = this.store.subscribe(() => this.sync());
    this.scale.on('resize', () => this.redraw());
    this.events.once('shutdown', () => this.unsubscribe?.());
    this.sync();
  }

  private painter(g: Phaser.GameObjects.Graphics): PixelPainter {
    const { width, height } = this.scale;
    const grid = this.art.grid;
    const sceneH = height * this.art.layout.sceneHeightRatio;
    const unit = Math.max(1, Math.floor(Math.min(width / grid.width, sceneH / grid.height)));
    const originX = Math.floor((width - grid.width * unit) / 2);
    const originY = Math.floor((sceneH - grid.height * unit) / 2) + Math.floor(height * this.art.layout.topOffsetRatio);
    return new PixelPainter(g, unit, originX, originY);
  }

  private sync(): void {
    const d = this.store.getSnapshot().scene;
    const key = d ? JSON.stringify(d) : '';
    if (key === this.descriptorKey) return;
    this.descriptorKey = key;
    this.descriptor = d;
    if (d) this.particles.sync(this.art, d);
    this.redraw();
  }

  private redraw(): void {
    this.staticGfx.clear();
    const d = this.descriptor;
    if (!d) return;
    const p = this.painter(this.staticGfx);
    drawTerrain(p, this.art, d);
    drawBuildings(p, this.art, d);
    drawProps(p, this.art, d);
    drawCharacters(p, this.art, d);
    drawCondition(p, this.art, d);
    drawWeather(p, this.art, d);
  }

  update(time: number): void {
    this.fxGfx.clear();
    if (!this.descriptor) return;
    this.particles.draw(this.painter(this.fxGfx), this.art, this.descriptor, time / 1000);
  }
}
