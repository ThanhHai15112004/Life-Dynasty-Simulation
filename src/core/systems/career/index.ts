// [1] Hệ thống Nghề nghiệp lắp ghép (GDD 04): Hợp đồng nghề, Thang bậc, Bổn phận, Hành động nghề & Truy nã
import type { CareerAction, ChanceSpec } from '@content/schemas';
import { clamp } from '@shared/curve';
import { fillTemplate } from '@shared/template';
import { evaluate } from '../../engine/RuleEvaluator';
import { addLedger } from '../../entities/Household';
import { applyEffects } from '../../events/effects';
import { pushLog, writeTemplate } from '../../events/journal';
import { Ledger, LogKind, SystemLog } from '../../events/systemLogKeys';
import { RngStream, type SimContext } from '../context';
import { ageNow, player, playerHousehold } from '../people';
import { createResolver } from '../resolver';

/** Kiểm tra xem người chơi có đủ điều kiện chuyển sang một nghề không. */
export function careerAvailable(ctx: SimContext, careerId: string): boolean {
  const c = ctx.content.index.career.get(careerId);
  if (!c) return false;
  if (ageNow(ctx, player(ctx)) < ctx.content.balance.life.adult_age) return false;
  return evaluate(c.entry_condition, createResolver(ctx));
}

/** Chuyển sang nghề mới (hoặc đặt bậc trong nghề). */
export function changeCareer(ctx: SimContext, careerId: string, rankIndex = 0, silent = false): boolean {
  const def = ctx.content.index.career.get(careerId);
  if (!def) return false;
  const clampedRank = clamp(rankIndex, 0, def.ranks.length - 1);
  ctx.state.career.id = careerId;
  ctx.state.career.rankIndex = clampedRank;
  ctx.state.career.merit = def.ranks[clampedRank]?.min_merit ?? 0;

  if (!silent) {
    const rankName = def.ranks[clampedRank]?.name ?? def.name;
    writeTemplate(ctx, SystemLog.CareerChanged, {
      params: { title: `${def.name} (${rankName})` },
    });
  }
  return true;
}

export function addCareerMerit(ctx: SimContext, delta: number): void {
  ctx.state.career.merit = Math.max(0, ctx.state.career.merit + delta);
  checkPromotion(ctx);
}

export function addWanted(ctx: SimContext, delta: number): void {
  ctx.state.career.wanted = clamp(ctx.state.career.wanted + delta, 0, 100);
}

/** Kiểm tra thăng bậc tự động khi đủ công trạng (merit) và điều kiện bậc kế tiếp. */
export function checkPromotion(ctx: SimContext): boolean {
  const { state, content } = ctx;
  const def = content.index.career.get(state.career.id);
  if (!def) return false;
  const nextIdx = state.career.rankIndex + 1;
  const nextRank = def.ranks[nextIdx];
  if (!nextRank) return false;
  if (state.career.merit < nextRank.min_merit) return false;
  if (!evaluate(nextRank.condition, createResolver(ctx))) return false;

  state.career.rankIndex = nextIdx;
  writeTemplate(ctx, SystemLog.CareerPromoted, {
    params: { title: `${def.name} — ${nextRank.name}` },
  });
  return true;
}

/** Tính xác suất thực của một hành động nghề theo Kỹ năng + Thời cơ. */
export function actionChance(ctx: SimContext, chance: ChanceSpec): number {
  const r = createResolver(ctx);
  const level = chance.skill ? player(ctx).skills[chance.skill]?.level ?? 0 : 0;
  let p = chance.base + chance.per_level * level;
  for (const m of chance.modifiers) if (evaluate(m.condition, r)) p += m.add;
  return clamp(p, chance.min, chance.max);
}

/** Kiểm tra hành động nghề có đang khả dụng không (điều kiện, thời gian hồi, chi phí). */
export function canExecuteCareerAction(ctx: SimContext, action: CareerAction): { ok: boolean; cooldownLeft: number } {
  const { state } = ctx;
  const due = state.career.actionCooldowns[action.id] ?? 0;
  const cooldownLeft = Math.max(0, due - state.clock.monthIndex);
  if (cooldownLeft > 0) return { ok: false, cooldownLeft };
  const h = playerHousehold(ctx);
  if (h.money < action.cost_money || h.food < action.cost_food) return { ok: false, cooldownLeft: 0 };
  if (!evaluate(action.condition, createResolver(ctx))) return { ok: false, cooldownLeft: 0 };
  return { ok: true, cooldownLeft: 0 };
}

/** Thực thi một hành động nghề chủ động của người chơi. */
export function executeCareerAction(ctx: SimContext, actionId: string): boolean {
  const { state, content } = ctx;
  const def = content.index.career.get(state.career.id);
  const action = def?.actions.find((a) => a.id === actionId);
  if (!def || !action) return false;
  const check = canExecuteCareerAction(ctx, action);
  if (!check.ok) return false;

  const h = playerHousehold(ctx);
  if (action.cost_money > 0) {
    h.money -= action.cost_money;
    addLedger(h, Ledger.Career, -action.cost_money, 0);
  }
  if (action.cost_food > 0) {
    h.food -= action.cost_food;
    addLedger(h, Ledger.Career, 0, -action.cost_food);
  }

  state.career.actionCooldowns[action.id] = state.clock.monthIndex + action.cooldown_months;
  const rng = ctx.rng.get(RngStream.Events);
  const p = actionChance(ctx, action.chance);
  const win = rng.chance(p);
  const deltas = applyEffects(ctx, win ? action.success : action.failure);
  const r = createResolver(ctx);
  const text = fillTemplate(rng.pick(win ? action.success_log : action.failure_log), r.token);

  pushLog(ctx, {
    sourceId: `career.${action.id}`,
    kind: LogKind.Decision,
    text: `${action.name}: ${text}`,
    importance: 5,
    tone: win ? 'vui' : 'buon',
    icon: def.icon,
    rumor: false,
    highlight: false,
    deltas,
  });
  checkPromotion(ctx);
  return true;
}

/** Hàng tháng: chi trả lương bổng theo bậc nghề, giảm nhẹ mức truy nã và xét thăng bậc. */
export function monthlyCareer(ctx: SimContext): void {
  const { state, content } = ctx;
  const me = player(ctx);
  if (!me.alive || ageNow(ctx, me) < content.balance.life.adult_age) return;
  const def = content.index.career.get(state.career.id);
  if (!def) return;
  const rank = def.ranks[state.career.rankIndex] ?? def.ranks[0];
  const h = playerHousehold(ctx);

  if (rank.stipend_money_month !== 0 || rank.stipend_food_month !== 0) {
    h.money += rank.stipend_money_month;
    h.food = Math.max(0, h.food + rank.stipend_food_month);
    addLedger(h, Ledger.Career, rank.stipend_money_month, rank.stipend_food_month);
  }

  // Mức truy nã giảm chậm nếu không phạm thêm tội
  if (state.career.wanted > 0 && state.clock.month % 3 === 0) {
    state.career.wanted = Math.max(0, state.career.wanted - 1);
  }

  checkPromotion(ctx);
}

