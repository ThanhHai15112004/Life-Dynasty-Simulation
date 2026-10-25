// Kiểm thử các module nền tảng của lõi: RNG tất định, DSL điều kiện, modifier có nguồn
import { describe, expect, it } from 'vitest';
import { Rng, RngStreams } from '../engine/Rng';
import { evaluate, UnknownVariableError, type Resolver } from '../engine/RuleEvaluator';
import { computeTarget, tickStoredModifiers } from '../engine/ModifierSystem';
import { canChi } from '../engine/GameClock';

describe('Rng', () => {
  it('cùng seed ra cùng chuỗi số', () => {
    const a = Rng.fromSeed('x');
    const b = Rng.fromSeed('x');
    expect(Array.from({ length: 50 }, () => a.next())).toEqual(Array.from({ length: 50 }, () => b.next()));
  });

  it('khôi phục từ trạng thái đã lưu', () => {
    const a = Rng.fromSeed('y');
    a.next();
    const b = new Rng(a.state);
    expect(b.next()).toBe(a.next());
  });

  it('các luồng độc lập: thêm lời gọi ở luồng này không làm lệch luồng khác', () => {
    const s1 = new RngStreams('w', {});
    const s2 = new RngStreams('w', {});
    s1.get('life').next();
    s1.get('life').next();
    expect(s1.get('world').next()).toBe(s2.get('world').next());
  });

  it('int nằm trong khoảng và weighted bỏ qua trọng số 0', () => {
    const r = Rng.fromSeed('z');
    for (let i = 0; i < 500; i++) {
      const v = r.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      expect(r.weighted(['a', 'b'], (x) => (x === 'a' ? 0 : 1))).toBe('b');
    }
  });
});

describe('RuleEvaluator', () => {
  const vars: Record<string, number | string | boolean> = { 'character.age': 30, 'world.season': 'dong', 'household.debt': 60 };
  const r: Resolver = {
    get: (p) => {
      if (!(p in vars)) throw new UnknownVariableError(p);
      return vars[p];
    },
    hasTrait: (_w, t) => t === 'can_dam',
    hasFlag: (f) => f === 'no_ba_ho',
    propertyCount: (id) => (id === 'trau' ? 1 : 0),
    roleExists: (id) => id === 'chu_no',
  };

  it('all / any / not / so sánh', () => {
    expect(
      evaluate(
        {
          all: [
            { var: 'household.debt', op: '>', value: 50 },
            { var: 'world.season', op: 'in', value: ['dong', 'thu'] },
            { not: { has_trait: 'than_trong' } },
            { any: [{ has_flag: 'khac' }, { has_property: 'trau' }] },
            { var: 'character.age', op: 'between', value: [16, 40] },
            { role: 'chu_no', exists: true },
          ],
        },
        r,
      ),
    ).toBe(true);
    expect(evaluate({ var: 'character.age', op: '<', value: 18 }, r)).toBe(false);
  });

  it('biến lạ ném lỗi để công cụ kiểm tra nội dung bắt được', () => {
    expect(() => evaluate({ var: 'household.mony', op: '>', value: 1 }, r)).toThrow(UnknownVariableError);
  });
});

describe('ModifierSystem', () => {
  it('(gốc + Σ cộng) × Π nhân, giữ nguồn từng dòng', () => {
    const res = computeTarget(
      [
        { sourceId: 'a', label: 'Mức sống', target: 'health.monthly', value: -0.5, op: 'add' },
        { sourceId: 'b', label: 'Mùa đông', target: 'health.monthly', value: -0.25, op: 'add' },
        { sourceId: 'c', label: 'Trâu', target: 'harvest.yield', value: 1.15, op: 'mul' },
      ],
      'health.monthly',
      1,
    );
    expect(res.value).toBeCloseTo(0.25);
    expect(res.lines.map((l) => l.label)).toEqual(['Mức sống', 'Mùa đông']);
  });

  it('modifier hết hạn thì bị bỏ', () => {
    const m = { sourceId: 'e', label: 'x', target: 't', value: 1, op: 'add' as const, remainingMonths: 1 };
    expect(tickStoredModifiers([m])).toHaveLength(0);
  });
});

describe('GameClock', () => {
  it('Can Chi: năm 1042 là Nhâm Ngọ', () => {
    expect(canChi(1042)).toEqual({ can: 8, chi: 6 });
  });
});
