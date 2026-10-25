// [1] Hệ thống Bệnh tật cụ thể (GDD 03 §2): mắc bệnh theo điều kiện, tiến triển hàng tháng, tự khỏi hoặc chạy chữa
import type { Character } from '../../entities/Character';
import { evaluate } from '../../engine/RuleEvaluator';
import { writeTemplate } from '../../events/journal';
import { SystemLog } from '../../events/systemLogKeys';
import { RngStream, type SimContext } from '../context';
import { aliveMembers, callOf } from '../people';
import { createResolver } from '../resolver';

/** Cho nhân vật mắc một bệnh cụ thể (nếu chưa mắc bệnh đó). */
export function infectCharacter(ctx: SimContext, c: Character, diseaseId: string, silent = false): boolean {
  if (!c.alive) return false;
  const def = ctx.content.index.disease.get(diseaseId);
  if (!def) return false;
  if (c.diseases.some((d) => d.id === diseaseId)) return false;

  const rng = ctx.rng.get(RngStream.Life);
  const remainingMonths = rng.range(def.duration_months);
  c.diseases.push({ id: diseaseId, remainingMonths });
  if (!silent && c.householdId === ctx.state.householdId) {
    writeTemplate(ctx, SystemLog.DiseaseCaught, {
      self: c.id,
      params: { call: callOf(ctx, c), title: def.name },
    });
  }
  return true;
}

/** Chữa khỏi một bệnh cụ thể (hoặc mọi bệnh đang mắc nếu không truyền diseaseId). */
export function cureCharacter(ctx: SimContext, c: Character, diseaseId?: string, silent = false): boolean {
  if (!c.alive || c.diseases.length === 0) return false;
  const removed = diseaseId ? c.diseases.filter((d) => d.id === diseaseId) : [...c.diseases];
  if (removed.length === 0) return false;

  c.diseases = diseaseId ? c.diseases.filter((d) => d.id !== diseaseId) : [];
  if (!silent && c.householdId === ctx.state.householdId) {
    const firstDef = ctx.content.index.disease.get(removed[0].id);
    writeTemplate(ctx, SystemLog.DiseaseRecovered, {
      self: c.id,
      params: { call: callOf(ctx, c), title: firstDef?.name ?? removed[0].id },
    });
  }
  return true;
}

/** Hàng tháng: tiến triển bệnh hiện có, tự khỏi hoặc phát bệnh mới theo mùa/sức khỏe. */
export function monthlyDiseases(ctx: SimContext): void {
  const rng = ctx.rng.get(RngStream.Life);
  for (const c of aliveMembers(ctx)) {
    // 1) Đếm ngược hoặc tự khỏi bệnh đang mắc
    for (const d of [...c.diseases]) {
      const def = ctx.content.index.disease.get(d.id);
      d.remainingMonths -= 1;
      const healed = d.remainingMonths <= 0 || (def ? rng.chance(def.self_heal_chance_month) : false);
      if (healed) {
        cureCharacter(ctx, c, d.id);
      }
    }

    // 2) Kiểm tra nguy cơ phát bệnh mới (mỗi người tối đa 2 bệnh cùng lúc để tránh chồng chất quá mức)
    if (c.diseases.length >= 2) continue;
    const r = createResolver(ctx, { self: c.id });
    for (const def of ctx.content.diseases) {
      if (def.monthly_chance <= 0) continue;
      if (c.diseases.some((d) => d.id === def.id)) continue;
      if (!evaluate(def.condition, r)) continue;
      if (rng.chance(def.monthly_chance)) {
        infectCharacter(ctx, c, def.id);
        break;
      }
    }
  }
}

