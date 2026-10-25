// [0] Ghép 7 lớp cảnh (GDD 08 §2) từ SceneDescriptor — chỉ vẽ, không có luật chơi
import type { SceneDescriptor } from '@core/index';
import type { SceneArt } from './art';
import type { PixelPainter } from './PixelPainter';

/** Lớp 1 — Địa hình: trời, đồi xa, lũy tre, đồng lúa. */
export function drawTerrain(p: PixelPainter, art: SceneArt, d: SceneDescriptor): void {
  const { width, height } = art.grid;
  const L = art.layout;
  const cond = art.conditions[d.condition] ?? {};
  for (let y = 0; y < L.horizonY; y++) {
    p.rect(0, y, width, 1, y < L.horizonY / 3 ? art.skyTop[d.season] : art.sky[d.season]);
  }
  for (let x = 0; x < width; x += 8) {
    const h = 4 + ((x * 7) % 5);
    p.rect(x, L.horizonY - h, 9, h, art.hills[d.season]);
  }
  p.rect(0, L.horizonY, width, L.groundY - L.horizonY, art.hills[d.season]);
  for (const bx of L.bambooX) {
    for (let i = 0; i < 4; i++) p.rect(bx + i * 2, L.groundY - 22 + (i % 2) * 3, 2, 22 - (i % 2) * 3, i % 2 ? art.bambooLight : art.bamboo);
    p.rect(bx - 2, L.groundY - 24, 12, 4, art.bamboo);
  }
  const ground = cond.ground ?? art.ground[d.season];
  const stripe = cond.stripe ?? art.groundStripe[d.season];
  for (let y = L.groundY; y < height; y++) p.rect(0, y, width, 1, (y - L.groundY) % 3 === 0 ? stripe : ground);
  p.rect(L.houseX - 4, L.groundY, width - (L.houseX - 4), 2, art.path);
}

/** Lớp 2 — Công trình chính của hộ. */
export function drawBuildings(p: PixelPainter, art: SceneArt, d: SceneDescriptor): void {
  const h = d.house ? art.houses[d.house] : undefined;
  if (!h) return;
  const L = art.layout;
  const top = L.groundY - h.wallHeight;
  p.rect(L.houseX, top, h.width, h.wallHeight, h.wall);
  p.rect(L.houseX, L.groundY - 2, h.width, 2, h.wallShade);
  const bay = h.width / h.bays;
  for (let i = 0; i < h.bays; i++) {
    p.rect(L.houseX + i * bay + bay / 2 - 2, L.groundY - 7, 4, 7, h.door);
    if (i > 0) p.rect(L.houseX + i * bay, top, 1, h.wallHeight, h.wallShade);
  }
  p.roof(L.houseX, top - h.roofHeight, h.width, h.roofHeight, h.roof, h.roofShade);
}

/** Lớp 3 — Thời tiết, mùa, ánh sáng (lớp phủ màu toàn cảnh). */
export function drawWeather(p: PixelPainter, art: SceneArt, d: SceneDescriptor): void {
  const w = art.weather[d.weather];
  if (w) p.rect(0, 0, art.grid.width, art.grid.height, w.tint, w.alpha);
}

/** Lớp 4 — Người trong hộ, chiều cao theo nhóm tuổi, đánh dấu người chơi. */
export function drawCharacters(p: PixelPainter, art: SceneArt, d: SceneDescriptor): void {
  const L = art.layout;
  const P = art.people;
  d.people.forEach((person, i) => {
    const h = P.heights[person.ageGroup] ?? P.heights.nguoi_lon;
    const x = L.peopleX + i * L.peopleSpacing;
    const y = L.groundY + 1 - h;
    p.rect(x, y + 2, 3, h - 2, P.clothes[person.sex]);
    p.rect(x, y, 3, 2, P.skin);
    p.rect(x, y, 3, 1, person.ageGroup === 'nguoi_gia' ? P.elderHair : P.hair);
    if (person.isPlayer) p.rect(x + 1, y - 2, 1, 1, P.playerMarker);
  });
}

/** Lớp 5 — Đồ vật, tài sản. */
export function drawProps(p: PixelPainter, art: SceneArt, d: SceneDescriptor): void {
  const L = art.layout;
  let slot = 0;
  for (const prop of d.props) {
    const a = art.props[prop.sprite];
    if (!a) continue;
    for (let n = 0; n < prop.count && slot < L.propsX.length; n++, slot++) {
      const x = L.propsX[slot];
      const base = L.groundY + 2;
      switch (a.shape) {
        case 'buffalo':
          p.rect(x, base - a.h, a.w - 3, a.h - 2, a.color);
          p.rect(x + a.w - 4, base - a.h - 1, 4, 3, a.color);
          p.rect(x + a.w - 4, base - a.h - 2, 1, 1, a.accent);
          p.rect(x + a.w - 1, base - a.h - 2, 1, 1, a.accent);
          for (const lx of [x + 1, x + a.w - 5]) p.rect(lx, base - 2, 1, 2, a.color);
          break;
        case 'flock':
          for (let i = 0; i < (a.count ?? 3); i++) {
            p.rect(x + i * 3, base - 2 - (i % 2), 2, 2, a.color);
            p.rect(x + i * 3 + 1, base - 3 - (i % 2), 1, 1, a.accent);
          }
          break;
        case 'pond':
          p.rect(x, base + 2, a.w, a.h, a.color);
          p.rect(x + 3, base + 3, a.w - 8, 1, a.accent);
          break;
        case 'granary':
          p.rect(x, base - a.h + 3, a.w, a.h - 3, a.color);
          p.roof(x, base - a.h, a.w, 3, a.accent, a.color);
          break;
        default:
          p.rect(x, base - a.h, a.w, a.h, a.color);
      }
    }
  }
}

/** Lớp 6 — Tình trạng: ngập lụt, nghèo đói, thịnh vượng (mất mùa đã đổi màu ruộng ở lớp 1). */
export function drawCondition(p: PixelPainter, art: SceneArt, d: SceneDescriptor): void {
  const c = art.conditions[d.condition];
  if (!c) return;
  const { width, height } = art.grid;
  if (c.water && c.level) {
    const top = height - c.level;
    p.rect(0, top, width, c.level, c.water, c.alpha ?? 1);
    for (let x = 2; x < width; x += 9) p.rect(x, top, 4, 1, c.waterLight ?? c.water, c.alpha ?? 1);
  }
  if (c.lantern) {
    const h = d.house ? art.houses[d.house] : undefined;
    if (h) p.rect(art.layout.houseX + 2, art.layout.groundY - h.wallHeight, 2, 2, c.lantern);
  }
  if (c.tint) p.rect(0, 0, width, height, c.tint, c.alpha ?? 0.2);
}
