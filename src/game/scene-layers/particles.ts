// [0] Lớp 7 — Hiệu ứng hạt: khói bếp, lá rơi, đom đóm, mưa (vẽ lại mỗi khung hình, toạ độ khung gốc của bộ cảnh)
import type { SceneDescriptor } from '@core/index';
import type { SceneKit } from '../scene-kit/types';

type ParticleFrame = Pick<SceneKit, 'width' | 'height' | 'particles'>;
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

  sync(L: ParticleFrame, d: SceneDescriptor): void {
    const key = d.particles.join(',');
    if (key === this.kinds) return;
    this.kinds = key;
    this.items = [];
    for (const kind of d.particles) {
      const spec = L.particles[kind];
      if (!spec) continue;
      for (let i = 0; i < spec.count; i++) {
        this.items.push({ kind, x: (i * 37) % L.width, y: (i * 23) % L.height, phase: i / spec.count });
      }
    }
  }

  draw(p: PixelPainter, L: ParticleFrame, chimney: [number, number] | null, timeSec: number): void {
    const { width, height } = L;
    for (const it of this.items) {
      const spec = L.particles[it.kind];
      const t = timeSec * spec.speed + it.phase * 100;
      switch (it.kind) {
        case 'khoi_bep': {
          if (!chimney) break;
          const life = (t % 12) / 12;
          p.rect(chimney[0] + Math.sin(t * 0.7) * 3 * life, chimney[1] - life * 26, 2, 2, spec.color, 0.65 * (1 - life));
          break;
        }
        case 'la_roi':
          p.rect((it.x + Math.sin(t * 0.3) * 6 + width) % width, (it.y + t) % (height * 0.8), 1, 1, spec.color);
          break;
        case 'dom_dom':
          if (Math.sin(t * 3 + it.phase * 20) > 0.3) p.rect(it.x, height * 0.55 + (it.y % (height * 0.4)), 1, 1, spec.color);
          break;
        case 'mua_roi':
          p.rect(it.x, (it.y + t) % height, 1, 3, spec.color, 0.55);
          break;
      }
    }
  }
}
