// [1] Ghép cảnh từ bộ phận pixel (không phụ thuộc Phaser/DOM): trả về danh sách khối màu để
// Phaser vẽ cảnh và React vẽ chân dung dùng chung một nguồn dữ liệu.
import type { SceneDescriptor, ScenePerson } from '@core/index';
import type { KitCulture, KitPart, KitRect, SceneKit } from './types';

type Resolve = (slot: string) => string | undefined;

/** Băm chuỗi ổn định (chọn màu áo, tóc theo id người — chỉ để hiển thị, không ảnh hưởng mô phỏng). */
export function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function cultureOf(kit: SceneKit, cultureSet: string): KitCulture {
  return kit.cultures[cultureSet] ?? Object.values(kit.cultures)[0];
}

/** Bảng màu cảnh: màu văn hóa, ghi đè bằng màu mùa. */
export function sceneColors(culture: KitCulture, season: string): Resolve {
  const seasonal = culture.seasons[season] ?? Object.values(culture.seasons)[0] ?? {};
  return (slot) => (slot.startsWith('#') ? slot : (seasonal[slot] ?? culture.colors[slot]));
}

/** Màu riêng của một người: mỗi ô màu (da, tóc, áo, quần...) chọn trong bảng của văn hóa theo id người. */
export function personColors(culture: KitCulture, personId: string, base: Resolve): Resolve {
  const picked: Record<string, string> = {};
  for (const [slot, options] of Object.entries(culture.palettes)) {
    if (options.length) picked[slot] = options[hashOf(`${personId}:${slot}`) % options.length];
  }
  return (slot) => picked[slot] ?? base(slot);
}

export function partSize(part: KitPart): { w: number; h: number } {
  return { w: Math.max(0, ...part.rows.map((r) => r.length)), h: part.rows.length };
}

/** Bộ phận → các khối màu (gộp ô liền nhau cùng màu trên một hàng), đặt theo góc trái và mép dưới. */
export function partRects(part: KitPart | undefined, x: number, bottom: number, resolve: Resolve, flip = false): KitRect[] {
  if (!part) return [];
  const out: KitRect[] = [];
  const { w, h } = partSize(part);
  const top = bottom - h;
  part.rows.forEach((row, ry) => {
    const cells = flip ? [...row.padEnd(w, '.')].reverse() : [...row];
    let start = -1;
    let cur = '';
    const flush = (end: number) => {
      if (start < 0 || cur === '.' || cur === ' ') return;
      const slot = part.key[cur];
      const color = slot ? resolve(slot) : undefined;
      if (color) out.push({ x: x + start, y: top + ry, w: end - start, h: 1, color });
    };
    cells.forEach((ch, cx) => {
      if (ch !== cur) {
        flush(cx);
        start = cx;
        cur = ch;
      }
    });
    flush(cells.length);
  });
  return out;
}

/** Lớp tĩnh: trời, đồi, dải nước/ruộng, bộ phận cố định, cây, rào, nhà, tài sản. */
export function composeStatic(kit: SceneKit, d: SceneDescriptor): KitRect[] {
  const culture = cultureOf(kit, d.cultureSet);
  const color = sceneColors(culture, d.season);
  const loc = kit.locations[d.location] ?? Object.values(kit.locations)[0];
  const out: KitRect[] = [];
  const W = kit.width;

  // Trời chia dải: pha màu giữa sky_top và sky_bottom
  const top = color('sky_top') ?? '#9fc9e0';
  const bottom = color('sky_bottom') ?? '#e6f0ea';
  const bandH = Math.ceil(kit.groundY / kit.skyBands);
  for (let i = 0; i < kit.skyBands; i++) out.push({ x: 0, y: i * bandH, w: W, h: bandH, color: mix(top, bottom, i / Math.max(1, kit.skyBands - 1)) });

  for (const hill of loc.hills) {
    const c = color(hill.color);
    if (!c) continue;
    for (let x = 0; x < W; x += 2) {
      const y = Math.round(hill.base - hill.amp * (0.5 + 0.5 * Math.sin(x * hill.freq + hill.phase)) * (0.6 + 0.4 * Math.sin(x * hill.freq * 0.37 + hill.phase * 2)));
      out.push({ x, y, w: 2, h: kit.groundY - y, color: c });
    }
  }
  for (const b of loc.bands) {
    const c = color(b.color);
    if (c) out.push({ x: 0, y: b.y, w: W, h: b.h, color: c });
  }
  // Mặt đất đến hết khung
  out.push({ x: 0, y: kit.groundY, w: W, h: kit.height - kit.groundY, color: color('ground') ?? '#9c7a52' });
  out.push({ x: 0, y: kit.groundY, w: W, h: 1, color: color('grass') ?? '#6f9f58' });

  for (const p of loc.placements) {
    const part = kit.parts[p.part];
    if (!part) continue;
    const step = p.repeatX ?? 0;
    for (let x = p.x; x < W; x += step || W) out.push(...partRects(part, x, p.bottom ?? kit.groundY, color));
  }
  loc.treeXs.forEach((x, i) => {
    const id = culture.trees[i % Math.max(1, culture.trees.length)];
    out.push(...partRects(kit.parts[id], x, kit.groundY, color, i % 2 === 1));
  });
  if (loc.fence) {
    const fence = kit.parts[culture.fence];
    const fw = fence ? partSize(fence).w : 0;
    if (fence && fw > 0) for (let x = loc.fence[0]; x < loc.fence[1]; x += fw) out.push(...partRects(fence, x, kit.groundY, color));
  }
  if (d.house) out.push(...partRects(kit.parts[culture.parts[d.house] ?? d.house], kit.slots.house.x, kit.groundY, color));
  for (const prop of d.props) {
    const spots = kit.slots.props[prop.sprite] ?? [];
    const part = kit.parts[culture.parts[prop.sprite] ?? prop.sprite];
    spots.slice(0, prop.count).forEach((at) => out.push(...partRects(part, at.x, at.bottom ?? kit.groundY, color)));
  }
  return out;
}

/** Người trong hộ đứng thành hàng; khung hình nhấp nhô nhẹ theo thời gian (sống động mà không cần sprite sheet). */
export function composePeople(kit: SceneKit, d: SceneDescriptor, timeSec: number): { rects: KitRect[]; marker: [number, number] | null } {
  const culture = cultureOf(kit, d.cultureSet);
  const base = sceneColors(culture, d.season);
  const out: KitRect[] = [];
  let marker: [number, number] | null = null;
  d.people.forEach((p, i) => {
    const x = kit.slots.people.x + i * kit.slots.people.spacing;
    const bob = Math.sin(timeSec * 2 + i * 1.7) > 0.6 ? 1 : 0;
    const { rects, height } = personRects(kit, culture, p, x, kit.groundY - bob, base);
    out.push(...rects);
    if (p.isPlayer) marker = [x, kit.groundY - bob - height - 3];
  });
  return { rects: out, marker };
}

/** Một người (kèm nón nếu văn hóa có), đặt theo góc trái và mép dưới. */
export function personRects(kit: SceneKit, culture: KitCulture, p: Pick<ScenePerson, 'id' | 'sex' | 'ageGroup'>, x: number, bottom: number, base: Resolve) {
  const part = kit.parts[culture.people[`${p.ageGroup}_${p.sex}`] ?? culture.people[p.ageGroup] ?? ''];
  const colors = personColors(culture, p.id, base);
  const rects = partRects(part, x, bottom, colors);
  const height = part ? partSize(part).h : 0;
  const hat = culture.hat;
  if (part && hat && hat.ageGroups.includes(p.ageGroup) && (hashOf(`${p.id}:hat`) % 100) / 100 < hat.chance) {
    const hp = kit.parts[hat.part];
    if (hp) {
      const offset = Math.floor((partSize(part).w - partSize(hp).w) / 2);
      rects.push(...partRects(hp, x + offset, bottom - height + 2, colors));
    }
  }
  return { rects, height };
}

export function composeClouds(kit: SceneKit, d: SceneDescriptor, timeSec: number): KitRect[] {
  const culture = cultureOf(kit, d.cultureSet);
  const color = sceneColors(culture, d.season);
  const out: KitRect[] = [];
  for (const c of kit.clouds) {
    const part = kit.parts[c.part];
    if (!part) continue;
    const w = partSize(part).w;
    const span = kit.width + w;
    const x = ((((c.x + timeSec * c.speed) % span) + span) % span) - w;
    out.push(...partRects(part, Math.round(x), c.y, color));
  }
  return out;
}

/** Pha hai màu hex theo tỉ lệ t (0..1). */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
