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
import { earnPersonal, isPlayerHead, mergePurse } from '../economy';
import { ageNow, aliveMembers, callOf, player, playerHousehold } from '../people';
import { createResolver } from '../resolver';

/** Nghề hiện tại có phải nghề thật (có bậc, lương, hành động) không — phụ việc nhà, thất nghiệp thì không. */
export function hasRealCareer(ctx: SimContext): boolean {
  return ctx.content.index.career.get(ctx.state.career.id)?.kind === 'nghe';
}

/** Kiểm tra người chơi có tự vào được một nghề không (tìm việc / ra làm riêng); nghề trạng thái chỉ đến qua sự kiện. */
export function careerAvailable(ctx: SimContext, careerId: string): boolean {
  const c = ctx.content.index.career.get(careerId);
  if (!c || c.kind !== 'nghe' || careerId === ctx.state.career.id) return false;
  if (ageNow(ctx, player(ctx)) < ctx.content.balance.life.adult_age) return false;
  return evaluate(c.entry_condition, createResolver(ctx));
}

/** Chuyển sang nghề mới (hoặc đặt bậc trong nghề). */
export function changeCareer(ctx: SimContext, careerId: string, rankIndex = 0, silent = false): boolean {
  const def = ctx.content.index.career.get(careerId);
  if (!def) return false;
  const clampedRank = clamp(rankIndex, 0, def.ranks.length - 1);
  ctx.state.career.id = careerId;
  ctx.state.career.since = ctx.state.clock.monthIndex;
  ctx.state.career.rankIndex = clampedRank;
  ctx.state.career.merit = def.ranks[clampedRank]?.min_merit ?? 0;
  // Chủ hộ theo nghề nào thì nghề nhà là nghề ấy
  if (def.kind === 'nghe' && isPlayerHead(ctx)) ctx.state.householdCareer = careerId;

  if (!silent) {
    writeTemplate(ctx, SystemLog.CareerChanged, {
      params: { title: def.name, stage: def.ranks[clampedRank]?.name ?? def.name },
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
    params: { title: def.name, stage: nextRank.name },
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
    importance: content.balance.opportunity.career_action_log_importance,
    tone: win ? 'vui' : 'buon',
    icon: def.icon,
    rumor: false,
    highlight: false,
    deltas,
  });
  checkPromotion(ctx);
  return true;
}

/** [1] Đến tuổi tự lập: con nhà có nghề thì phụ việc nhà (nhà nho thì đi học), nhà không có nghề thì thất nghiệp. */
function startIndependentLife(ctx: SimContext): void {
  const { state, content } = ctx;
  const start = content.balance.life.career_start;
  const home = content.index.career.get(state.householdCareer);
  const first = home?.youth_career ?? (home?.kind === 'nghe' ? start.helper : start.jobless);
  changeCareer(ctx, first, 0, true);
  const def = content.index.career.get(first);
  writeTemplate(ctx, SystemLog.CareerStarted, { params: { title: def?.name ?? first, stage: home?.name ?? '' } });
}

/** [1] Tạo ván / tải ván: người chơi đã đủ tuổi mà chưa có nghề riêng thì bắt đầu tự lập ngay. */
export function ensureIndependentLife(ctx: SimContext): void {
  const me = player(ctx);
  if (ctx.state.career.id || ageNow(ctx, me) < ctx.content.balance.life.adult_age) return;
  startIndependentLife(ctx);
  ctx.state.wasHead = isPlayerHead(ctx);
}

/** [1] Vừa làm chủ hộ: chưa có nghề riêng thì thừa kế nghề nhà (kinh nghiệm phụ việc được tính); có nghề riêng thì nghề nhà đổi theo. */
function onBecomeHead(ctx: SimContext): void {
  const { state, content } = ctx;
  if (state.dynasty?.guardianId) {
    state.dynasty.guardianId = null;
  }
  mergePurse(ctx);
  // [1.5] Cha mẹ còn sống mà đã giao việc nhà (không phải vì mất) thì ghi một dòng nhật ký
  const me = player(ctx);
  const elder = aliveMembers(ctx).find((c) => c.id === me.fatherId || c.id === me.motherId);
  const justInherited = state.ambientHistory[SystemLog.BecameHead]?.lastMonthIndex === state.clock.monthIndex;
  if (elder && !justInherited) writeTemplate(ctx, SystemLog.HeadHandover, { self: elder.id, params: { call: callOf(ctx, elder) } });
  const cur = content.index.career.get(state.career.id);
  if (cur?.kind === 'nghe') {
    state.householdCareer = cur.id;
    return;
  }
  const home = content.index.career.get(state.householdCareer);
  if (home?.kind !== 'nghe') {
    changeCareer(ctx, content.balance.life.career_start.jobless, 0);
    return;
  }
  const carried = state.career.merit * content.balance.life.career_start.inherit_merit_factor;
  changeCareer(ctx, home.id, 0, true);
  state.career.merit = carried;
  while (checkPromotion(ctx)) {
    /* thăng tới bậc mà kinh nghiệm phụ việc đã đủ */
  }
  writeTemplate(ctx, SystemLog.CareerInherited, { params: { title: home.name, stage: home.ranks[state.career.rankIndex]?.name ?? home.name } });
}

/** Hàng tháng: bắt đầu tự lập, tiếp quản nghề nhà, chi trả lương bổng theo bậc nghề, giảm nhẹ mức truy nã và xét thăng bậc. */
export function monthlyCareer(ctx: SimContext): void {
  const { state, content } = ctx;
  const me = player(ctx);
  if (!me.alive || ageNow(ctx, me) < content.balance.life.adult_age) return;
  if (!state.career.id) startIndependentLife(ctx);
  const head = isPlayerHead(ctx);
  if (head && !state.wasHead) onBecomeHead(ctx);
  state.wasHead = head;
  const def = content.index.career.get(state.career.id);
  if (!def) return;
  if (def.kind === 'trang_thai') {
    state.career.merit += def.merit_month;
    return;
  }
  const rank = def.ranks[state.career.rankIndex] ?? def.ranks[0];
  const h = playerHousehold(ctx);

  // [1.5] Lương bổng nghề riêng là tiền người chơi làm ra: chưa làm chủ hộ thì vào túi riêng (góp một phần cho nhà)
  if (rank.stipend_money_month !== 0) earnPersonal(ctx, Ledger.Career, rank.stipend_money_month);
  if (rank.stipend_food_month !== 0) {
    h.food = Math.max(0, h.food + rank.stipend_food_month);
    addLedger(h, Ledger.Career, 0, rank.stipend_food_month);
  }

  // Mức truy nã giảm chậm nếu không phạm thêm tội
  const decay = content.balance.opportunity.wanted_decay;
  if (state.career.wanted > 0 && state.clock.monthIndex % decay.every_months === 0) {
    state.career.wanted = Math.max(0, state.career.wanted - decay.amount);
  }

  checkPromotion(ctx);
}

