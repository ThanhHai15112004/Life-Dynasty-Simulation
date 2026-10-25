// [1] Cảnh pixel chính, vẽ bằng code từ bộ cảnh lắp ghép (scene-kit.json) — chỉ đọc SceneDescriptor từ GameStore.
// Lớp tĩnh (trời, đồi, nhà, tài sản) dựng lại khi mô tả cảnh đổi; mây, người, hạt vẽ lại mỗi khung hình.
import Phaser from 'phaser';
import type { GameStore } from '@bridge/GameStore';
import type { SceneDescriptor } from '@core/index';
import { composeClouds, composePeople, composeStatic, cultureOf, partRects, partSize } from '../scene-kit/compose';
import type { KitRect, SceneKit } from '../scene-kit/types';
import { SCENE_KIT_KEY } from '../scene-layers/art';
import { ParticleLayer } from '../scene-layers/particles';
import { PixelPainter, color } from '../scene-layers/PixelPainter';
import { STORE_REGISTRY_KEY } from '../registryKeys';

/** Bộ phận dấu người chơi trong scene-kit.json. */
const PLAYER_MARKER_PART = 'dau_nguoi_choi';

function drawRects(g: Phaser.GameObjects.Graphics, rects: KitRect[]): void {
  for (const r of rects) {
    g.fillStyle(color(r.color), r.alpha ?? 1);
    g.fillRect(r.x, r.y, r.w, r.h);
  }
}

export class LifeScene extends Phaser.Scene {
  private kit!: SceneKit;
  private store!: GameStore;
  private staticGfx!: Phaser.GameObjects.Graphics;
  private liveGfx!: Phaser.GameObjects.Graphics;
  private overlayGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private particles = new ParticleLayer();
  private descriptor: SceneDescriptor | null = null;
  private descriptorKey = '';
  private chimney: [number, number] | null = null;

  constructor() {
    super('LifeScene');
  }

  create(): void {
    this.kit = this.cache.json.get(SCENE_KIT_KEY) as SceneKit;
    this.store = this.registry.get(STORE_REGISTRY_KEY) as GameStore;
    this.staticGfx = this.add.graphics();
    this.liveGfx = this.add.graphics();
    this.overlayGfx = this.add.graphics();
    this.fxGfx = this.add.graphics();
    const unsubscribe = this.store.subscribe(() => this.sync());
    const onResize = () => this.fit();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => {
      unsubscribe();
      this.scale.off('resize', onResize);
    });
    this.fit();
    this.sync();
  }

  /** Co giãn khung gốc vừa khít khung cảnh trên trang, giữ tỷ lệ. */
  private fit(): void {
    const { width, height } = this.scale;
    const scale = Math.min(width / this.kit.width, height / this.kit.height);
    const x = Math.floor((width - this.kit.width * scale) / 2);
    const y = Math.floor((height - this.kit.height * scale) / 2);
    for (const g of [this.staticGfx, this.liveGfx, this.overlayGfx, this.fxGfx]) g.setPosition(x, y).setScale(scale);
  }

  private sync(): void {
    const d = this.store.getSnapshot().scene;
    const key = d ? JSON.stringify({ ...d, people: d.people.map((p) => `${p.id}:${p.ageGroup}`) }) : '';
    if (key === this.descriptorKey) return;
    this.descriptorKey = key;
    this.descriptor = d;
    this.staticGfx.clear();
    this.overlayGfx.clear();
    if (!d) return;
    const kit = this.kit;
    drawRects(this.staticGfx, composeStatic(kit, d));

    // Lớp phủ: thời tiết, tình trạng (nghèo đói, thịnh vượng, cư tang), nước lũ
    const weather = kit.weather[d.weather];
    if (weather?.alpha) drawRects(this.overlayGfx, [{ x: 0, y: 0, w: kit.width, h: kit.height, color: weather.tint, alpha: weather.alpha }]);
    const cond = kit.conditions[d.condition] ?? {};
    if (cond.flood) drawRects(this.overlayGfx, [{ x: 0, y: kit.groundY - 4, w: kit.width, h: kit.height, color: cond.flood, alpha: cond.alpha ?? 1 }]);
    else if (cond.tint) drawRects(this.overlayGfx, [{ x: 0, y: 0, w: kit.width, h: kit.height, color: cond.tint, alpha: cond.alpha ?? 0.2 }]);

    // Ống khói: góc phải mái nhà chính
    const culture = cultureOf(kit, d.cultureSet);
    const housePart = d.house ? kit.parts[culture.parts[d.house] ?? d.house] : undefined;
    if (housePart) {
      const { w, h } = partSize(housePart);
      this.chimney = [kit.slots.house.x + Math.round(w * 0.7), kit.groundY - h + 2];
    } else this.chimney = null;
    this.particles.sync(kit, d);
  }

  update(time: number): void {
    this.liveGfx.clear();
    this.fxGfx.clear();
    const d = this.descriptor;
    if (!d) return;
    const t = time / 1000;
    drawRects(this.liveGfx, composeClouds(this.kit, d, t));
    const people = composePeople(this.kit, d, t);
    drawRects(this.liveGfx, people.rects);
    if (people.marker) drawRects(this.liveGfx, partRects(this.kit.parts[PLAYER_MARKER_PART], people.marker[0] + 2, people.marker[1] + 2, (s) => s));
    this.particles.draw(new PixelPainter(this.fxGfx, 1, 0, 0), this.kit, this.chimney, t);
  }
}
