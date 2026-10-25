// [0] Số ngẫu nhiên có seed (cùng seed thì ra cùng kết quả)
// Mulberry32: nhanh, trạng thái 32-bit nên lưu game dễ. Mỗi hệ thống dùng một luồng riêng (stream)
// để thêm/bớt lời gọi ở hệ thống này không làm lệch kết quả hệ thống khác.

/** Băm chuỗi thành số 32-bit (cyrb53 rút gọn) — dùng để sinh seed con: thế giới → vùng → hộ → nhân vật. */
export function hashSeed(input: string): number {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

export class Rng {
  private s: number;

  constructor(state: number) {
    this.s = state >>> 0;
  }

  static fromSeed(seed: string): Rng {
    return new Rng(hashSeed(seed));
  }

  /** Trạng thái hiện tại để lưu game. */
  get state(): number {
    return this.s;
  }

  /** Số thực trong [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  float(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Số nguyên trong [min, max] (gồm cả hai đầu). */
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  range(r: readonly [number, number]): number {
    return this.int(Math.min(r[0], r[1]), Math.max(r[0], r[1]));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: danh sách rỗng');
    return items[Math.floor(this.next() * items.length)];
  }

  /** Chọn theo trọng số; trả undefined nếu tổng trọng số = 0. */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T | undefined {
    let total = 0;
    for (const it of items) total += Math.max(0, weightOf(it));
    if (total <= 0) return undefined;
    let roll = this.next() * total;
    for (const it of items) {
      roll -= Math.max(0, weightOf(it));
      if (roll < 0) return it;
    }
    return items[items.length - 1];
  }

  /** Xáo trộn và lấy n phần tử khác nhau. */
  sample<T>(items: readonly T[], n: number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.max(0, n));
  }
}

/**
 * Tập luồng RNG có tên, sinh từ seed thế giới. Trạng thái của mọi luồng nằm trong GameState
 * nên lưu/tải game tái lập chính xác.
 */
export class RngStreams {
  private cache = new Map<string, Rng>();

  constructor(
    private readonly worldSeed: string,
    private readonly states: Record<string, number>,
  ) {}

  get(name: string): Rng {
    let rng = this.cache.get(name);
    if (!rng) {
      rng = new Rng(this.states[name] ?? hashSeed(`${this.worldSeed}::${name}`));
      this.cache.set(name, rng);
    }
    return rng;
  }

  /** Ghi trạng thái các luồng đã dùng trở lại GameState. */
  flush(): void {
    for (const [name, rng] of this.cache) this.states[name] = rng.state;
  }
}
