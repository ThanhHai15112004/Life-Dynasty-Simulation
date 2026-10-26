// [1] Hệ thống Bệnh tật cụ thể (GDD 03 §2): mắc bệnh theo điều kiện, tiến triển hàng tháng, tự khỏi hoặc chạy chữa
import type { Character } from '../../entities/Character';
import { addLedger } from '../../entities/Household';
import { evaluate } from '../../engine/RuleEvaluator';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { RngStream, type SimContext } from '../context';
import { monthlyMoneyNeed } from '../economy/helpers';
import { aliveMembers, callOf, householdHead, playerHousehold } from '../people';
import { createResolver } from '../resolver';
import { activeSettlementId } from '../../world/region';
import { currentFateMode } from './mortality';

/** Mã lỗi khi chưa chạy chữa được (khóa lang error.<mã>). */
export type TreatmentBlock = 'not_sick' | 'treated_recently' | 'not_enough_money';

/** Cho nhân vật mắc một bệnh cụ thể (nếu chưa mắc bệnh đó). */
export function infectCharacter(ctx: SimContext, c: Character, diseaseId: string, silent = false): boolean {
  if (!c.alive) return false;
  const def = ctx.content.index.disease.get(diseaseId);
  if (!def) return false;
  if (c.diseases.some((d) => d.id === diseaseId)) return false;

  const rng = ctx.rng.get(RngStream.Life);
  const remainingMonths = rng.range(def.duration_months);
  c.diseases.push({ id: diseaseId, remainingMonths });
  if (c.householdId === ctx.state.householdId) {
    if (def.severity === 'nang' || def.severity === 'nguy_kich') {
      ctx.state.badLuckCounter = (ctx.state.badLuckCounter ?? 0) + 1;
    }
    if (!silent) {
      writeTemplate(ctx, SystemLog.DiseaseCaught, {
        self: c.id,
        params: { call: callOf(ctx, c), title: def.name },
      });
    }
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

/** [1] Người trong nhà có chạy chữa được bệnh này lúc này không (null = được). */
export function treatmentBlock(ctx: SimContext, c: Character, diseaseId: string): TreatmentBlock | null {
  const d = c.alive && c.householdId === ctx.state.householdId ? c.diseases.find((x) => x.id === diseaseId) : undefined;
  const def = ctx.content.index.disease.get(diseaseId);
  if (!d || !def) return 'not_sick';
  if (d.treatedAt !== undefined && ctx.state.clock.monthIndex - d.treatedAt < ctx.content.balance.life.treatment.retry_months) return 'treated_recently';
  if (playerHousehold(ctx).money < def.cure_cost) return 'not_enough_money';
  return null;
}

/** [1] Chạy chữa: lấy tiền thuốc từ quỹ nhà, may thì khỏi ngay; không khỏi thì chờ ít tháng mới chữa lại được. */
export function treatDisease(ctx: SimContext, c: Character, diseaseId: string): boolean {
  if (treatmentBlock(ctx, c, diseaseId)) return false;
  const def = ctx.content.index.disease.get(diseaseId)!;
  const d = c.diseases.find((x) => x.id === diseaseId)!;
  const h = playerHousehold(ctx);
  h.money -= def.cure_cost;
  addLedger(h, Ledger.Medicine, -def.cure_cost, 0);
  d.treatedAt = ctx.state.clock.monthIndex;
  const params = { call: callOf(ctx, c), title: def.name, money: def.cure_cost };
  if (ctx.rng.get(RngStream.Life).chance(def.cure_chance)) {
    cureCharacter(ctx, c, diseaseId, true);
    writeTemplate(ctx, SystemLog.TreatmentCured, { self: c.id, params });
  } else {
    writeTemplate(ctx, SystemLog.TreatmentFailed, { self: c.id, params });
  }
  return true;
}

/** [1] Người chơi chưa làm chủ hộ: nhà tự bỏ tiền chữa bệnh nặng, miễn chữa xong vẫn còn đủ tiêu vài tháng. */
export function autoTreatment(ctx: SimContext): void {
  if (householdHead(ctx)?.id === ctx.state.playerId) return;
  const t = ctx.content.balance.life.treatment;
  const h = playerHousehold(ctx);
  const keep = monthlyMoneyNeed(ctx) * t.auto_keep_months;
  for (const c of aliveMembers(ctx, h)) {
    for (const d of [...c.diseases]) {
      const def = ctx.content.index.disease.get(d.id);
      if (!def || !t.auto_severities.includes(def.severity)) continue;
      if (h.money - def.cure_cost < keep) continue;
      treatDisease(ctx, c, d.id);
    }
  }
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

    // 2) Kiểm tra nguy cơ phát bệnh mới (giới hạn số bệnh cùng lúc để tránh chồng chất quá mức)
    if (c.diseases.length >= ctx.content.balance.life.max_concurrent_diseases) continue;
    const locId = c.id === ctx.state.playerId ? activeSettlementId(ctx) : ctx.state.world.settlementType;
    const epidemic = ctx.state.settlements?.[locId]?.epidemic ?? null;
    const boost = epidemic ? ctx.content.balance.opportunity.region.epidemic_infection_boost : 1;

    // Nếu nơi đang ở có dịch bệnh bùng phát, có nguy cơ lây trực tiếp bệnh dịch đó
    if (epidemic && !c.diseases.some((d) => d.id === epidemic.diseaseId)) {
      const epDef = ctx.content.index.disease.get(epidemic.diseaseId);
      const epChance = (epDef?.monthly_chance ?? 0.012) * boost * currentFateMode(ctx).disease_factor;
      if (rng.chance(epChance)) {
        infectCharacter(ctx, c, epidemic.diseaseId);
        continue;
      }
    }

    const r = createResolver(ctx, { self: c.id });
    for (const def of ctx.content.diseases) {
      if (def.monthly_chance <= 0) continue;
      if (c.diseases.some((d) => d.id === def.id)) continue;
      if (!evaluate(def.condition, r)) continue;
      if (rng.chance(def.monthly_chance * boost * currentFateMode(ctx).disease_factor)) {
        infectCharacter(ctx, c, def.id);
        break;
      }
    }
  }
}

