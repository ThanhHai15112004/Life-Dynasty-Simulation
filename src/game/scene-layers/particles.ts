// [0] Lớp 7 — Hiệu ứng hạt: khói bếp, lá rơi, đom đóm, mưa (vẽ lại mỗi khung hình)
import type { SceneDescriptor } from '@core/index';
import type { SceneArt } from './art';
import type { PixelPainter } from './PixelPainter';

interface Particle {
  kind: string;
  x: number;
  y: number;
  phase: number;
}

export class ParticleLayer {
  private items: Particle[] = [];
  private kinds = '';

  sync(art: SceneArt, d: SceneDescriptor): void {
    const key = d.particles.join(',') + '|' + (d.house ?? '');
    if (key === this.kinds) return;
    this.kinds = key;
    this.items = [];
    for (const kind of d.particles) {
      const spec = art.particles[kind];
      if (!spec) continue;
      for (let i = 0; i < spec.count; i++) {
        this.items.push({ kind, x: (i * 37) % art.grid.width, y: (i * 23) % art.grid.height, phase: i / spec.count });
      }
    }
  }

  draw(p: PixelPainter, art: SceneArt, d: SceneDescriptor, timeSec: number): void {
    const { width, height } = art.grid;
    const L = art.layout;
    const house = d.house ? art.houses[d.house] : undefined;
    for (const it of this.items) {
      const spec = art.particles[it.kind];
      const t = timeSec * spec.speed + it.phase * 100;
      switch (it.kind) {
        case 'khoi_bep': {
          if (!house) break;
          const life = (t % 12) / 12;
          const x = L.houseX + house.chimneyX + Math.sin(t * 0.7) * 2 * life;
          const y = L.groundY - house.wallHeight - house.roofHeight - life * 14;
          p.rect(x, y, 2, 2, spec.color, 0.7 * (1 - life));
          break;
        }
        case 'la_roi':
          p.rect((it.x + Math.sin(t * 0.3) * 6 + width) % width, (it.y + t) % L.groundY, 1, 1, spec.color);
          break;
        case 'dom_dom':
          if (Math.sin(t * 3 + it.phase * 20) > 0.3) p.rect(it.x, L.horizonY + (it.y % (height - L.horizonY)), 1, 1, spec.color);
          break;
        case 'mua_roi':
          p.rect(it.x, (it.y + t) % height, 1, 3, spec.color, 0.6);
          break;
      }
    }
  }
}
