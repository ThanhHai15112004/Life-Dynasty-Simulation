// [0] Rủi ro tử vong theo tháng (GDD 01 §8): tuổi × sức khỏe × modifier (mức sống, mùa...) × hệ số số phận. Cái chết luôn có nguyên nhân.
import { clamp, interpolate } from '@shared/curve';
import type { FateMode } from '@content/schemas';
import type { Character } from '../../entities/Character';
import { evaluate } from '../../engine/RuleEvaluator';
import { StatTarget } from '../../engine/statTargets';
import { SystemLog } from '../../events/systemLogKeys';
import { writeTemplate } from '../../events/journal';
import { RngStream, type SimContext } from '../context';
import { checkParentInheritance } from '../family/inheritance';
import { computeFor } from '../modifiers';
import { ageNow, aliveMembers, callOf, householdHead, player, playerHousehold } from '../people';
import { createResolver } from '../resolver';
import { startMourning } from '../status';

/** Lấy cấu hình Chế độ số phận hiện tại của ván chơi. */
export function currentFateMode(ctx: SimContext): FateMode {
  const fm = ctx.content.balance.fate_modes;
  return (
    ctx.content.index.fateMode.get(ctx.state.fateMode) ??
    ctx.content.index.fateMode.get(fm.default_mode) ??
    fm.modes[0]
  );
}

/** Xác suất chết trong một tháng của một nhân vật. */
export function monthlyDeathRisk(ctx: SimContext, c: Character): number {
  const m = ctx.content.balance.life.mortality;
  const months = ctx.content.balance.calendar.months_per_year;
  const annual = interpolate(m.annual_by_age, 'age', 'rate', ageNow(ctx, c));
  const monthly = 1 - Math.pow(1 - clamp(annual, 0, 1), 1 / months);
  const healthFactor = interpolate(m.health_factor, 'health', 'factor', c.health);
  const mod = computeFor(ctx, c.id, StatTarget.DeathRisk, 1).value;
  const fateFactor = currentFateMode(ctx).mortality_factor;
  return clamp(monthly * healthFactor * mod * fateFactor, 0, m.max_monthly);
}

/** [1] Tuổi thọ kỳ vọng lúc sinh theo bảng tử vong của thời này (chưa tính sức khỏe, modifier). */
export function lifeExpectancyAtBirth(ctx: SimContext): number {
  const curve = ctx.content.balance.life.mortality.annual_by_age;
  const maxAge = curve[curve.length - 1].age;
  let alive = 1;
  let years = 0;
  for (let age = 0; age <= maxAge && alive > 0; age++) {
    const q = clamp(interpolate(curve, 'age', 'rate', age), 0, 1);
    years += alive * (1 - q / 2);
    alive *= 1 - q;
  }
  return years;
}

/** Xác suất chết trong một năm của NPC làng (mô phỏng thưa — T2). */
export function annualNpcDeathRisk(ctx: SimContext, c: Character): number {
  const m = ctx.content.balance.life.mortality;
  const annual = interpolate(m.annual_by_age, 'age', 'rate', ageNow(ctx, c));
  const fateFactor = currentFateMode(ctx).mortality_factor;
  return clamp(annual * interpolate(m.health_factor, 'health', 'factor', c.health) * fateFactor, 0, 1);
}

export function pickCause(ctx: SimContext, c: Character) {
  // Nếu nhân vật đang mắc bệnh cụ thể có liên kết nguyên nhân chết thì ưu tiên nguyên nhân đó
  for (const d of c.diseases ?? []) {
    const def = ctx.content.index.disease.get(d.id);
    if (def?.mortality_cause) {
      const matched = ctx.content.balance.life.mortality.causes.find((x) => x.id === def.mortality_cause);
      if (matched) return matched;
    }
  }
  const r = createResolver(ctx, { self: c.id });
  const causes = ctx.content.balance.life.mortality.causes.filter((cause) => evaluate(cause.condition, r));
  return ctx.rng.get(RngStream.Life).weighted(causes, (cause) =>
    cause.weight_modifiers.reduce((w, wm) => (evaluate(wm.condition, r) ? w * wm.factor : w), cause.weight),
  );
}

export function kill(ctx: SimContext, c: Character, causeId: string): void {
  const { state } = ctx;
  const age = ageNow(ctx, c);
  const causeName = ctx.content.balance.life.mortality.causes.find((x) => x.id === causeId)?.name ?? causeId;
  const call = callOf(ctx, c);
  const wasHead = householdHead(ctx)?.id;
  c.alive = false;
  c.deathYear = state.clock.year;
  c.deathCauseId = causeId;

  if (c.id === state.playerId) {
    state.gameOver = { year: state.clock.year, age, causeId };
    return;
  }

  const me = player(ctx);
  const isParent = c.id === me.fatherId || c.id === me.motherId;
  const isSibling =
    Boolean(me.fatherId && c.fatherId === me.fatherId) ||
    Boolean(me.motherId && c.motherId === me.motherId);

  if (c.householdId === state.householdId || isParent || isSibling) {
    state.director.mourningThisYear = true;
    state.badLuckCounter = (state.badLuckCounter ?? 0) + 1;
    writeTemplate(ctx, SystemLog.FamilyDeath, { self: c.id, params: { call, age, cause: causeName } });
    if (isParent) {
      startMourning(ctx, call);
      checkParentInheritance(ctx, c);
    }
    const newHead = householdHead(ctx);
    if (wasHead === c.id && newHead?.id === state.playerId) writeTemplate(ctx, SystemLog.BecameHead, {});
  }
}

/** [2] Phát điềm báo trước cái chết khi sức khỏe suy kiệt (< ngưỡng) hoặc bệnh nặng kéo dài (tối đa 1 lần/năm). */
function checkDeathOmen(ctx: SimContext, candidates: Character[]): void {
  const { state, content } = ctx;
  const m = content.balance.life.mortality;
  const last = state.ambientHistory[SystemLog.DeathOmen]?.lastMonthIndex ?? -Infinity;
  if (last >= state.clock.monthIndex - (state.clock.month - 1)) return;

  for (const c of candidates) {
    if (!c.alive) continue;
    const criticalHealth = c.health <= m.omen_health_threshold;
    const criticalDisease = (c.diseases ?? []).some((d) => {
      const def = content.index.disease.get(d.id);
      return (def?.severity === 'nang' || def?.severity === 'nguy_kich') && d.remainingMonths >= m.omen_severe_disease_months;
    });
    if (criticalHealth || criticalDisease) {
      writeTemplate(ctx, SystemLog.DeathOmen, {
        self: c.id,
        params: { call: callOf(ctx, c), age: ageNow(ctx, c) },
      });
      return;
    }
  }
}

export function monthlyMortality(ctx: SimContext): void {
  const m = ctx.content.balance.life.mortality;
  const rng = ctx.rng.get(RngStream.Life);

  // Bao gồm cả thành viên hộ hiện tại và cha mẹ / anh chị em ở các hộ đã tách
  const relatedMembers = Object.values(ctx.state.households)
    .filter((h) => h.id !== ctx.state.householdId)
    .flatMap((h) => aliveMembers(ctx, h));
  const allWatched = [...aliveMembers(ctx, playerHousehold(ctx)), ...relatedMembers];

  checkDeathOmen(ctx, allWatched);

  for (const c of allWatched) {
    if (ctx.state.gameOver) return;
    if (!c.alive) continue;
    if (!rng.chance(monthlyDeathRisk(ctx, c))) continue;
    const cause = pickCause(ctx, c);
    if (!cause) continue;
    // Bad-luck protection (GDD 05 §6): chặn chuỗi cái chết bất ngờ trong cùng một năm
    if (cause.unexpected && c.householdId === ctx.state.householdId) {
      if (ctx.state.director.unexpectedDeathsThisYear >= m.max_unexpected_household_deaths_per_year) continue;
      ctx.state.director.unexpectedDeathsThisYear += 1;
    }
    kill(ctx, c, cause.id);
  }
}
