// [0] Nội suy tuyến tính trên bảng điểm dữ liệu (tử vong theo tuổi, hệ số học theo tuổi...)
export function interpolate<K extends string, V extends string>(
  points: ReadonlyArray<Record<K | V, number>>,
  xKey: K,
  yKey: V,
  x: number,
): number {
  if (points.length === 0) return 0;
  if (x <= points[0][xKey]) return points[0][yKey];
  const last = points[points.length - 1];
  if (x >= last[xKey]) return last[yKey];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (x <= b[xKey]) {
      const span = b[xKey] - a[xKey];
      const t = span === 0 ? 1 : (x - a[xKey]) / span;
      return a[yKey] + (b[yKey] - a[yKey]) * t;
    }
  }
  return last[yKey];
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Chọn dải đầu tiên có min <= v (danh sách sắp giảm dần theo min). */
export function pickBand<T extends { min: number }>(bands: readonly T[], v: number): T {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => v >= b.min) ?? sorted[sorted.length - 1];
}
