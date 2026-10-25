// Xử lý ảnh nguồn (ảnh AI dạng bảng trình bày) thành sprite pixel art dùng được trong game:
// cắt vùng → tách nền → tìm sprite theo thành phần liên thông → gom thành khung → thu về lưới pixel → giảm bảng màu
import sharp from 'sharp';

export interface Img {
  w: number;
  h: number;
  /** RGBA */
  data: Uint8Array;
}

export type Box = [number, number, number, number]; // x0, y0, x1, y1 (x1, y1 không gồm)

export async function load(path: string): Promise<Img> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data: new Uint8Array(data) };
}

export function crop(img: Img, [x0, y0, x1, y1]: Box): Img {
  x0 = Math.max(0, x0);
  y0 = Math.max(0, y0);
  x1 = Math.min(img.w, x1);
  y1 = Math.min(img.h, y1);
  const w = x1 - x0;
  const h = y1 - y0;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) out.set(img.data.subarray(((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x1) * 4), y * w * 4);
  return { w, h, data: out };
}

const dist = (d: Uint8Array, i: number, c: number[]) =>
  Math.hypot(d[i] - c[0], d[i + 1] - c[1], d[i + 2] - c[2]);

/** Màu nền ước lượng = trung vị các điểm viền. */
function borderMedian(img: Img): number[] {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const push = (x: number, y: number) => {
    const i = (y * img.w + x) * 4;
    rs.push(img.data[i]);
    gs.push(img.data[i + 1]);
    bs.push(img.data[i + 2]);
  };
  for (let x = 0; x < img.w; x++) {
    push(x, 0);
    push(x, img.h - 1);
  }
  for (let y = 0; y < img.h; y++) {
    push(0, y);
    push(img.w - 1, y);
  }
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

/**
 * Mặt nạ tiền cảnh (1 = sprite).
 * - 'alpha': ảnh đã có nền trong suốt, lấy ngưỡng alpha
 * - 'flood': nền là panel màu, loang từ viền các điểm gần màu nền (giữ được phần tối bên trong nét viền)
 * - 'opaque': lấy toàn bộ
 */
export function foreground(img: Img, mode: 'alpha' | 'flood' | 'opaque', tol: number, alphaMin: number): Uint8Array {
  const n = img.w * img.h;
  const m = new Uint8Array(n);
  if (mode === 'opaque') return m.fill(1);
  if (mode === 'alpha') {
    for (let i = 0; i < n; i++) m[i] = img.data[i * 4 + 3] >= alphaMin ? 1 : 0;
    return m;
  }
  const bg = borderMedian(img);
  const isBg = new Uint8Array(n);
  const stack: number[] = [];
  const tryPush = (x: number, y: number) => {
    const k = y * img.w + x;
    if (isBg[k] || (img.data[k * 4 + 3] > 0 && dist(img.data, k * 4, bg) > tol)) return;
    isBg[k] = 1;
    stack.push(k);
  };
  for (let x = 0; x < img.w; x++) {
    tryPush(x, 0);
    tryPush(x, img.h - 1);
  }
  for (let y = 0; y < img.h; y++) {
    tryPush(0, y);
    tryPush(img.w - 1, y);
  }
  while (stack.length) {
    const k = stack.pop()!;
    const x = k % img.w;
    const y = (k / img.w) | 0;
    if (x > 0) tryPush(x - 1, y);
    if (x < img.w - 1) tryPush(x + 1, y);
    if (y > 0) tryPush(x, y - 1);
    if (y < img.h - 1) tryPush(x, y + 1);
  }
  for (let i = 0; i < n; i++) m[i] = isBg[i] || img.data[i * 4 + 3] === 0 ? 0 : 1;
  return m;
}

export interface Component {
  box: Box;
  area: number;
  label: number;
}

/** Gán nhãn thành phần liên thông (4 hướng). */
export function components(mask: Uint8Array, w: number, h: number, minArea: number): { comps: Component[]; labels: Int32Array } {
  const labels = new Int32Array(w * h).fill(-1);
  const comps: Component[] = [];
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || labels[i] >= 0) continue;
    const label = comps.length;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    let area = 0;
    labels[i] = label;
    stack.push(i);
    while (stack.length) {
      const k = stack.pop()!;
      const x = k % w;
      const y = (k / w) | 0;
      area++;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      const nb = [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1];
      for (const q of nb) {
        if (q >= 0 && mask[q] && labels[q] < 0) {
          labels[q] = label;
          stack.push(q);
        }
      }
    }
    comps.push({ box: [x0, y0, x1 + 1, y1 + 1], area, label });
  }
  return { comps: comps.filter((c) => c.area >= minArea), labels };
}

/** Gom thành phần thành n nhóm theo chiều ngang, cắt ở n-1 khoảng trống lớn nhất. */
export function groupByX(comps: Component[], n: number): Component[][] {
  const sorted = [...comps].sort((a, b) => a.box[0] - b.box[0]);
  if (n <= 1 || sorted.length <= n) return n <= 1 ? [sorted] : sorted.map((c) => [c]);
  // Quét để tính mép phải tích lũy, khoảng trống = mép trái kế tiếp - mép phải lớn nhất phía trước
  const gaps: { at: number; size: number }[] = [];
  let right = sorted[0].box[2];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push({ at: i, size: sorted[i].box[0] - right });
    right = Math.max(right, sorted[i].box[2]);
  }
  const cuts = gaps
    .sort((a, b) => b.size - a.size)
    .slice(0, n - 1)
    .map((g) => g.at)
    .sort((a, b) => a - b);
  const groups: Component[][] = [];
  let start = 0;
  for (const c of [...cuts, sorted.length]) {
    groups.push(sorted.slice(start, c));
    start = c;
  }
  return groups;
}

export function unionBox(group: Component[]): Box {
  return group.reduce<Box>(
    (b, c) => [Math.min(b[0], c.box[0]), Math.min(b[1], c.box[1]), Math.max(b[2], c.box[2]), Math.max(b[3], c.box[3])],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

/** Cắt nhóm ra ảnh riêng: chỉ giữ điểm thuộc các thành phần trong nhóm (bỏ rác), alpha = 255 ở tiền cảnh. */
export function extract(img: Img, labels: Int32Array, group: Component[], box: Box): Img {
  const keep = new Set(group.map((c) => c.label));
  const w = box[2] - box[0];
  const h = box[3] - box[1];
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = box[0] + x;
      const sy = box[1] + y;
      const k = sy * img.w + sx;
      if (!keep.has(labels[k])) continue;
      const o = (y * w + x) * 4;
      out[o] = img.data[k * 4];
      out[o + 1] = img.data[k * 4 + 1];
      out[o + 2] = img.data[k * 4 + 2];
      out[o + 3] = 255;
    }
  }
  return { w, h, data: out };
}

/** Đặt ảnh vào khung w×h, căn giữa ngang và căn đáy (để các khung animation đứng cùng một mặt đất). */
export function placeBottom(img: Img, w: number, h: number): Img {
  const out = new Uint8Array(w * h * 4);
  const ox = Math.floor((w - img.w) / 2);
  const oy = h - img.h;
  for (let y = 0; y < img.h; y++) out.set(img.data.subarray(y * img.w * 4, (y + 1) * img.w * 4), ((oy + y) * w + ox) * 4);
  return { w, h, data: out };
}

/** Xóa các điểm thỏa điều kiện trong một vùng (ví dụ khói vẽ dính trên mái nhà). */
export function eraseWhere(img: Img, region: Box, test: (r: number, g: number, b: number) => boolean): void {
  for (let y = Math.max(0, region[1]); y < Math.min(img.h, region[3]); y++) {
    for (let x = Math.max(0, region[0]); x < Math.min(img.w, region[2]); x++) {
      const i = (y * img.w + x) * 4;
      if (img.data[i + 3] && test(img.data[i], img.data[i + 1], img.data[i + 2])) img.data[i + 3] = 0;
    }
  }
}

/** Thu nhỏ về kích thước pixel đích; alpha nhị phân để pixel sắc cạnh. */
export async function downscale(img: Img, width: number, height: number, fit: 'fill' | 'cover' | 'contain'): Promise<Img> {
  const { data, info } = await sharp(Buffer.from(img.data), { raw: { width: img.w, height: img.h, channels: 4 } })
    .resize(width, height, { fit, kernel: 'lanczos3', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = new Uint8Array(data);
  for (let i = 3; i < out.length; i += 4) out[i] = out[i] >= 128 ? 255 : 0;
  return { w: info.width, h: info.height, data: out };
}

/** Ghép các khung thành sprite sheet ngang. */
export function hstack(frames: Img[]): Img {
  const w = frames.reduce((s, f) => s + f.w, 0);
  const h = Math.max(...frames.map((f) => f.h));
  const out = new Uint8Array(w * h * 4);
  let ox = 0;
  for (const f of frames) {
    for (let y = 0; y < f.h; y++) out.set(f.data.subarray(y * f.w * 4, (y + 1) * f.w * 4), (y * w + ox) * 4);
    ox += f.w;
  }
  return { w, h, data: out };
}

/** Ghi PNG; colors > 0 thì giảm bảng màu (không dither) cho đúng chất pixel art. */
export async function save(img: Img, path: string, colors: number): Promise<void> {
  const s = sharp(Buffer.from(img.data), { raw: { width: img.w, height: img.h, channels: 4 } });
  await (colors > 0 ? s.png({ palette: true, colors, dither: 0 }) : s.png()).toFile(path);
}
