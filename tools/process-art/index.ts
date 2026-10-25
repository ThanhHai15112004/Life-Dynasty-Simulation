// Xử lý ảnh nguồn (art-source/, không commit) → sprite trong public/assets/ theo tools/process-art/manifest.json
// npm run process-art            (ghi thêm --preview <thư mục> để xuất bản phóng to xem thử)
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { projectRoot } from '../shared/nodeContent';
import {
  components,
  crop,
  downscale,
  eraseWhere,
  extract,
  foreground,
  groupByX,
  hstack,
  load,
  placeBottom,
  save,
  unionBox,
  type Box,
  type Img,
} from './image';

interface Common {
  id: string;
  file: string;
  out: string;
  colors?: number;
}
interface SpriteItem extends Common {
  type: 'sprite';
  box: Box;
  bg: 'alpha' | 'flood' | 'opaque';
  tol?: number;
  alphaMin?: number;
  minArea?: number;
  /** Số khung tự tách theo chiều ngang; hoặc frameBoxes khai báo tay. */
  frames?: number;
  frameBoxes?: Box[];
  pick?: 'largest' | 'all';
  /** Kích thước đích một khung (theo pixel game); thiếu một chiều thì giữ tỷ lệ. */
  width?: number;
  height?: number;
  /** Cắt phủ kín khung đích (nền trời, ruộng). */
  cover?: [number, number];
  /** Tỷ lệ pixel đích / pixel nguồn — dùng chung cho mọi tư thế của một nhân vật để không méo tỷ lệ. */
  scale?: number;
  erase?: { box: Box; rule: keyof typeof eraseRules }[];
}
interface IconRow extends Omit<Common, 'id' | 'out'> {
  type: 'icons';
  box: Box;
  bg: 'flood';
  tol?: number;
  minArea?: number;
  ids: string[];
  size: number;
  outDir: string;
}
interface CopyItem extends Common {
  type: 'copy';
}
interface Manifest {
  source: string;
  out: string;
  defaults: { tol: number; alphaMin: number; minArea: number; colors: number };
  items: (SpriteItem | IconRow | CopyItem)[];
}

export interface SpriteInfo {
  url: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
}

const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8')) as Manifest;
const src = (f: string) => join(projectRoot, manifest.source, f);
const dst = (p: string) => {
  const full = join(projectRoot, manifest.out, p);
  mkdirSync(dirname(full), { recursive: true });
  return full;
};
const previewArg = process.argv.indexOf('--preview');
const previewDir = previewArg >= 0 ? process.argv[previewArg + 1] : null;
const D = manifest.defaults;

const cache = new Map<string, Img>();
async function source(file: string): Promise<Img> {
  if (!cache.has(file)) cache.set(file, await load(src(file)));
  return cache.get(file)!;
}

/** Luật xóa điểm trước khi tách sprite: khói vẽ dính trên mái, cỏ vẽ dính dưới chân. */
const eraseRules = {
  smoke: (r: number, g: number, b: number) => Math.max(r, g, b) - Math.min(r, g, b) < 32 && r + g + b > 230,
  green: (r: number, g: number, b: number) => g > b + 12 && g >= r - 6,
};

/** Tách các nhóm sprite trong một vùng đã cắt. */
function groups(img: Img, item: SpriteItem | IconRow, n: number, pick: 'largest' | 'all') {
  const mode = item.bg;
  const mask = foreground(img, mode, item.tol ?? D.tol, 'alphaMin' in item && item.alphaMin ? item.alphaMin : D.alphaMin);
  const { comps, labels } = components(mask, img.w, img.h, item.minArea ?? D.minArea);
  if (comps.length === 0) throw new Error(`${'id' in item ? item.id : item.ids[0]}: không tìm thấy sprite`);
  if (n === 1 && pick === 'largest') {
    const biggest = comps.reduce((a, b) => (b.area > a.area ? b : a));
    return { labels, list: [[biggest]] };
  }
  return { labels, list: groupByX(comps, n) };
}

async function processSprite(item: SpriteItem): Promise<SpriteInfo> {
  const base = crop(await source(item.file), item.box);
  for (const e of item.erase ?? []) eraseWhere(base, e.box, eraseRules[e.rule]);
  const boxes = item.frameBoxes ?? null;
  let frames: Img[] = [];
  if (boxes) {
    for (const fb of boxes) {
      const sub = crop(base, fb);
      const { labels, list } = groups(sub, item, 1, item.pick ?? 'all');
      frames.push(extract(sub, labels, list[0], unionBox(list[0])));
    }
  } else {
    const n = item.frames ?? 1;
    const { labels, list } = groups(base, item, n, item.pick ?? (n === 1 ? 'largest' : 'all'));
    frames = list.map((g) => extract(base, labels, g, unionBox(g)));
  }

  // Mọi khung chung một kích thước, căn đáy để animation không nhảy
  const cw = Math.max(...frames.map((f) => f.w));
  const ch = Math.max(...frames.map((f) => f.h));
  frames = frames.map((f) => placeBottom(f, cw, ch));

  let out: Img[];
  if (item.cover) {
    out = await Promise.all(frames.map((f) => downscale(f, item.cover![0], item.cover![1], 'cover')));
  } else if (item.scale) {
    const w = Math.max(1, Math.round(cw * item.scale));
    const h = Math.max(1, Math.round(ch * item.scale));
    out = await Promise.all(frames.map((f) => downscale(f, w, h, 'fill')));
  } else {
    const h = item.height ?? Math.round((ch * item.width!) / cw);
    const w = item.width ?? Math.round((cw * h) / ch);
    out = await Promise.all(frames.map((f) => downscale(f, w, h, 'fill')));
  }
  const sheet = hstack(out);
  await save(sheet, dst(item.out), item.colors ?? D.colors);
  await preview(item.id, sheet);
  return { url: `assets/${item.out}`, frameWidth: out[0].w, frameHeight: out[0].h, frames: out.length };
}

async function processIcons(row: IconRow): Promise<Record<string, SpriteInfo>> {
  const base = crop(await source(row.file), row.box);
  const { labels, list } = groups(base, row, row.ids.length, 'all');
  if (list.length !== row.ids.length) throw new Error(`Hàng icon ${row.ids[0]}…: tách được ${list.length}/${row.ids.length}`);
  const result: Record<string, SpriteInfo> = {};
  const all: Img[] = [];
  for (let i = 0; i < list.length; i++) {
    const g = list[i];
    const icon = await downscale(extract(base, labels, g, unionBox(g)), row.size, row.size, 'contain');
    const rel = `${row.outDir}/${row.ids[i]}.png`;
    await save(icon, dst(rel), row.colors ?? D.colors);
    result[row.ids[i]] = { url: `assets/${rel}`, frameWidth: icon.w, frameHeight: icon.h, frames: 1 };
    all.push(icon);
  }
  await preview(`icons_${row.ids[0]}`, hstack(all));
  return result;
}

async function preview(id: string, img: Img): Promise<void> {
  if (!previewDir) return;
  mkdirSync(previewDir, { recursive: true });
  await sharp(Buffer.from(img.data), { raw: { width: img.w, height: img.h, channels: 4 } })
    .resize(img.w * 4, img.h * 4, { kernel: 'nearest' })
    .flatten({ background: '#ff00ff' })
    .png()
    .toFile(join(previewDir, `${id}.png`));
}

const sprites: Record<string, SpriteInfo> = {};
const icons: Record<string, SpriteInfo> = {};
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;

for (const item of manifest.items) {
  const ids = item.type === 'icons' ? item.ids : [item.id];
  if (only && !ids.some((id) => only.includes(id))) continue;
  if (item.type === 'copy') {
    copyFileSync(src(item.file), dst(item.out));
    const meta = await sharp(src(item.file)).metadata();
    sprites[item.id] = { url: `assets/${item.out}`, frameWidth: meta.width!, frameHeight: meta.height!, frames: 1 };
  } else if (item.type === 'icons') {
    Object.assign(icons, await processIcons(item));
  } else {
    sprites[item.id] = await processSprite(item);
  }
  console.log(`✔ ${ids.length > 1 ? `${ids.length} icon (${ids[0]}…)` : ids[0]}`);
}

if (!only) {
  writeFileSync(dst('sprites.json'), JSON.stringify({ $comment: 'Sinh tự động bởi npm run process-art — đừng sửa tay', sprites, icons }, null, 1) + '\n');
  console.log(`\nĐã ghi ${Object.keys(sprites).length} sprite, ${Object.keys(icons).length} icon → ${manifest.out}/sprites.json`);
}
