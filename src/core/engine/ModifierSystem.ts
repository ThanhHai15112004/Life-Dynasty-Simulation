// [0] Cộng trừ chỉ số, có ghi rõ nguồn (GDD 02 §4.1)
// Kết quả = (gốc + Σ cộng) × Π nhân. Mọi dòng đều giữ nguồn để UI giải thích "vì sao".

export type ModifierOp = 'add' | 'mul';

export interface Modifier {
  sourceId: string;
  /** Nhãn hiển thị — lấy từ dữ liệu (tên mức sống, tên Focus, nhãn sự kiện...). */
  label: string;
  target: string;
  value: number;
  op: ModifierOp;
}

/** Modifier lưu trên nhân vật, có thời hạn (từ sự kiện). */
export interface StoredModifier extends Modifier {
  remainingMonths: number;
}

export interface ModifierLine {
  sourceId: string;
  label: string;
  op: ModifierOp;
  value: number;
}

export interface ModifierResult {
  value: number;
  base: number;
  lines: ModifierLine[];
}

export function computeTarget(mods: readonly Modifier[], target: string, base: number): ModifierResult {
  let add = 0;
  let mul = 1;
  const lines: ModifierLine[] = [];
  for (const m of mods) {
    if (m.target !== target) continue;
    if (m.op === 'add') add += m.value;
    else mul *= m.value;
    lines.push({ sourceId: m.sourceId, label: m.label, op: m.op, value: m.value });
  }
  return { value: (base + add) * mul, base, lines };
}

/** Giảm thời hạn modifier lưu trữ sau một tháng, bỏ cái đã hết hạn. */
export function tickStoredModifiers(mods: StoredModifier[]): StoredModifier[] {
  return mods
    .map((m) => ({ ...m, remainingMonths: m.remainingMonths - 1 }))
    .filter((m) => m.remainingMonths > 0);
}
