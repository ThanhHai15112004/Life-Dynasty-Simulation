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

export type PersonVisualInput = Pick<ScenePerson, 'id' | 'sex' | 'ageGroup'> &
  Partial<Pick<ScenePerson, 'age' | 'career' | 'statusRank' | 'examDegree' | 'healthState' | 'isPregnant' | 'isMourning'>>;

/** Xác định nhóm trang phục theo cư tang, khoa cử, địa vị và nghề nghiệp. */
export function resolveOutfitGroup(p: PersonVisualInput): string | null {
  if (p.isMourning) return 'cu_tang';
  if (p.statusRank === 'quan_lai' || p.examDegree === 'tien_si' || p.career === 'nha_lai') return 'quan_lai';
  if (
    p.statusRank === 'si_phu' ||
    p.examDegree === 'huong_cong' ||
    p.examDegree === 'sinh_do' ||
    p.career === 'si_tu' ||
    p.career === 'thay_lang'
  ) {
    return 'si_phu';
  }
  if (p.career === 'linh') return 'linh';
  if (p.career === 'thao_khau') return 'thao_khau';
  if (p.statusRank === 'phu_ho' || p.career === 'thuong_nhan') return 'phu_ho';
  return null;
}

/** Chọn bộ phận cơ thể theo độ tuổi (ẵm ngửa, trẻ nhỏ, thiếu niên, người lớn, mang thai, ốm nặng, tuổi già). */
export function resolvePersonPartId(culture: KitCulture, p: PersonVisualInput): string {
  if (p.age !== undefined && p.age <= 2 && culture.people[`au_tho_${p.sex}`]) {
    return culture.people[`au_tho_${p.sex}`];
  }
  if (p.ageGroup === 'nguoi_lon') {
    if (p.sex === 'f' && p.isPregnant && culture.people.nguoi_mang_thai_f) {
      return culture.people.nguoi_mang_thai_f;
    }
    if (p.healthState === 'benh_nang' && culture.people[`nguoi_om_${p.sex}`]) {
      return culture.people[`nguoi_om_${p.sex}`];
    }
  }
  return culture.people[`${p.ageGroup}_${p.sex}`] ?? culture.people[p.ageGroup] ?? '';
}

/** Chọn loại mũ/khăn theo cư tang, tuổi, giới tính, học vị, địa vị và nghề nghiệp. */
export function resolveHatSpec(
  culture: KitCulture,
  p: PersonVisualInput,
): { part: string; offsetY: number } | null {
  const hats = culture.hats ?? {};
  // Trẻ ẵm ngửa (0-2 tuổi) để chỏm tóc đào, trừ khi cư tang từ 3 tuổi trở lên
  if (p.age !== undefined && p.age <= 2) return null;
  if (p.isMourning && hats.khan_tang) {
    return { part: hats.khan_tang.part, offsetY: hats.khan_tang.offsetY ?? 2 };
  }
  if (p.ageGroup === 'tre_nho') return null;

  if (p.sex === 'm') {
    if (
      (p.statusRank === 'quan_lai' || p.examDegree === 'tien_si' || p.examDegree === 'huong_cong' || p.career === 'nha_lai') &&
      p.ageGroup !== 'thieu_nien' &&
      hats.mao_quan
    ) {
      return { part: hats.mao_quan.part, offsetY: hats.mao_quan.offsetY ?? 2 };
    }
    if (p.career === 'linh' && p.ageGroup !== 'thieu_nien' && hats.non_dau) {
      return { part: hats.non_dau.part, offsetY: hats.non_dau.offsetY ?? 2 };
    }
    if (
      (p.statusRank === 'si_phu' ||
        p.examDegree === 'sinh_do' ||
        p.career === 'si_tu' ||
        p.career === 'thay_lang' ||
        p.statusRank === 'phu_ho' ||
        p.career === 'thuong_nhan') &&
      hats.khan_dong
    ) {
      return { part: hats.khan_dong.part, offsetY: hats.khan_dong.offsetY ?? 2 };
    }
    if (p.ageGroup === 'nguoi_lon' || p.ageGroup === 'nguoi_gia') {
      const roll = hashOf(`${p.id}:hat`) % 100;
      if (roll < 50 && hats.non_la) return { part: hats.non_la.part, offsetY: hats.non_la.offsetY ?? 2 };
      if (roll >= 50 && roll < 72 && hats.khan_dong) return { part: hats.khan_dong.part, offsetY: hats.khan_dong.offsetY ?? 2 };
    }
    return null;
  }

  // Nữ giới
  if (
    (p.statusRank === 'quan_lai' || p.statusRank === 'phu_ho' || p.statusRank === 'si_phu') &&
    p.ageGroup !== 'thieu_nien' &&
    hats.khan_vanh
  ) {
    return { part: hats.khan_vanh.part, offsetY: hats.khan_vanh.offsetY ?? 2 };
  }
  if (p.ageGroup === 'nguoi_lon' || p.ageGroup === 'nguoi_gia') {
    const roll = hashOf(`${p.id}:hat`) % 100;
    if (roll < 48 && hats.non_la) return { part: hats.non_la.part, offsetY: hats.non_la.offsetY ?? 2 };
    if (roll >= 48 && roll < 78 && hats.khan_mo_qua) {
      return { part: hats.khan_mo_qua.part, offsetY: hats.khan_mo_qua.offsetY ?? 2 };
    }
  }
  return null;
}

/** Màu riêng của một người: mỗi ô màu (da, tóc, áo, quần...) chọn trong bảng của văn hóa + tầng lớp/nghề theo id người. */
export function personColors(culture: KitCulture, p: PersonVisualInput | string, base: Resolve): Resolve {
  const person: PersonVisualInput = typeof p === 'string' ? { id: p, sex: 'm', ageGroup: 'nguoi_lon' } : p;
  const picked: Record<string, string> = {};
  for (const [slot, options] of Object.entries(culture.palettes)) {
    if (options.length) picked[slot] = options[hashOf(`${person.id}:${slot}`) % options.length];
  }
  const group = resolveOutfitGroup(person);
  const groupPalettes = group && culture.outfitPalettes ? culture.outfitPalettes[group] : undefined;
  if (groupPalettes) {
    for (const [slot, options] of Object.entries(groupPalettes)) {
      if (options.length) picked[slot] = options[hashOf(`${person.id}:${group}:${slot}`) % options.length];
    }
  }
  if ((person.healthState === 'benh_nang' || person.healthState === 'om_yeu') && culture.palettes.skin_sick?.length) {
    picked.skin = culture.palettes.skin_sick[hashOf(`${person.id}:skin_sick`) % culture.palettes.skin_sick.length];
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
    const part = kit.parts[culture.parts[p.part] ?? p.part];
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

/** Người trong hộ đứng thành nhóm tự nhiên trước sân; khung hình nhấp nhô và xoay hướng nhẹ theo thời gian. */
export function composePeople(kit: SceneKit, d: SceneDescriptor, timeSec: number): { rects: KitRect[]; marker: [number, number] | null } {
  const culture = cultureOf(kit, d.cultureSet);
  const base = sceneColors(culture, d.season);
  const out: KitRect[] = [];
  let marker: [number, number] | null = null;
  const markerPart = kit.parts.dau_nguoi_choi;
  const markerW = markerPart ? partSize(markerPart).w : 3;

  d.people.forEach((p, i) => {
    const x = kit.slots.people.x + i * kit.slots.people.spacing;
    const depthY = (i % 2) * 2;
    const bob = Math.sin(timeSec * 2.2 + i * 1.7) > 0.55 ? 1 : 0;
    const footY = kit.groundY + depthY - bob;
    const flip = (hashOf(p.id) + Math.floor(timeSec * 0.25 + i)) % 4 === 0;
    const { rects, height, width } = personRects(kit, culture, p, x, footY, base, flip);
    out.push(...rects);

    if ((p.healthState === 'benh_nang' || p.healthState === 'om_yeu') && kit.parts.dau_benh) {
      const sickBob = Math.sin(timeSec * 3.5 + i) > 0 ? 1 : 0;
      out.push(...partRects(kit.parts.dau_benh, x + width - 2, footY - height + 2 - sickBob, base));
    }

    if (p.isPlayer) {
      marker = [x + Math.floor((width - markerW) / 2), footY - height - 4];
    }
  });
  return { rects: out, marker };
}

/** Một người (kèm mũ/khăn và trang phục theo tuổi, nghề, địa vị, sức khỏe), đặt theo góc trái và mép dưới. */
export function personRects(
  kit: SceneKit,
  culture: KitCulture,
  p: PersonVisualInput,
  x: number,
  bottom: number,
  base: Resolve,
  flip = false,
) {
  const partId = resolvePersonPartId(culture, p);
  const part = kit.parts[partId];
  const colors = personColors(culture, p, base);
  const rects = partRects(part, x, bottom, colors, flip);
  const size = part ? partSize(part) : { w: 0, h: 0 };
  const height = size.h;
  const width = size.w;

  const hatSpec = resolveHatSpec(culture, p);
  if (part && hatSpec) {
    const hp = kit.parts[hatSpec.part];
    if (hp) {
      const offset = Math.floor((width - partSize(hp).w) / 2);
      rects.push(...partRects(hp, x + offset, bottom - height + hatSpec.offsetY, colors, flip));
    }
  } else if (part && !culture.hats && culture.hat && culture.hat.ageGroups.includes(p.ageGroup)) {
    if ((hashOf(`${p.id}:hat`) % 100) / 100 < culture.hat.chance) {
      const hp = kit.parts[culture.hat.part];
      if (hp) {
        const offset = Math.floor((width - partSize(hp).w) / 2);
        rects.push(...partRects(hp, x + offset, bottom - height + 2, colors, flip));
      }
    }
  }
  return { rects, height, width };
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
