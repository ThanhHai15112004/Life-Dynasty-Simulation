// [0] Rủi ro tử vong theo tháng (GDD 01 §8): tuổi × sức khỏe × modifier (mức sống, mùa...). Cái chết luôn có nguyên nhân.
import { clamp, interpolate } from '@shared/curve';
import type { Character } from '../../entities/Character';
import { evaluate } from '../../engine/RuleEvaluator';
import { StatTarget } from '../../engine/statTargets';
import { SystemLog } from '../../events/systemLogKeys';
import { writeTemplate } from '../../events/journal';
import { RngStream, type SimContext } from '../context';
import { computeFor } from '../modifiers';
import { ageNow, aliveMembers, callOf, householdHead, player, playerHousehold } from '../people';
import { createResolver } from '../resolver';
import { startMourning } from '../status';

/** Xác suất chết trong một tháng của một nhân vật trong hộ người chơi. */
export function monthlyDeathRisk(ctx: SimContext, c: Character): number {
  const m = ctx.content.balance.life.mortality;
  const months = ctx.content.balance.calendar.months_per_year;
  const annual = interpolate(m.annual_by_age, 'age', 'rate', ageNow(ctx, c));
  const monthly = 1 - Math.pow(1 - clamp(annual, 0, 1), 1 / months);
  const healthFactor = interpolate(m.health_factor, 'health', 'factor', c.health);
  const mod = computeFor(ctx, c.id, StatTarget.DeathRisk, 1).value;
  return clamp(monthly * healthFactor * mod, 0, m.max_monthly);
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
  return clamp(annual * interpolate(m.health_factor, 'health', 'factor', c.health), 0, 1);
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
  if (c.householdId === state.householdId) {
    state.director.mourningThisYear = true;
    writeTemplate(ctx, SystemLog.FamilyDeath, { self: c.id, params: { call, age, cause: causeName } });
    const me = player(ctx);
    if (c.id === me.fatherId || c.id === me.motherId) {
      startMourning(ctx, call);
    }
    const newHead = householdHead(ctx);
    if (wasHead === c.id && newHead?.id === state.playerId) writeTemplate(ctx, SystemLog.BecameHead, {});
  }
}

export function monthlyMortality(ctx: SimContext): void {
  const m = ctx.content.balance.life.mortality;
  const rng = ctx.rng.get(RngStream.Life);
  for (const c of aliveMembers(ctx, playerHousehold(ctx))) {
    if (ctx.state.gameOver) return;
    if (!rng.chance(monthlyDeathRisk(ctx, c))) continue;
    const cause = pickCause(ctx, c);
    if (!cause) continue;
    // Bad-luck protection (GDD 05 §6): chặn chuỗi cái chết bất ngờ trong cùng một năm
    if (cause.unexpected) {
      if (ctx.state.director.unexpectedDeathsThisYear >= m.max_unexpected_household_deaths_per_year) continue;
      ctx.state.director.unexpectedDeathsThisYear += 1;
    }
    kill(ctx, c, cause.id);
  }
}
