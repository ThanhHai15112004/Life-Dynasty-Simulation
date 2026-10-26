// [1] Hệ thống Nghề nghiệp lắp ghép (GDD 04) + [5] Nghề nghiệp v2: Ngành → Nghề → Bậc, Thâm niên, Nghề tay trái, Nghề người nhà & Bản đồ chuyển nghề
import type { Career, CareerAction, ChanceSpec } from '@content/schemas';
import { clamp } from '@shared/curve';
import { fillTemplate } from '@shared/template';
import { evaluate } from '../../engine/RuleEvaluator';
import type { Character } from '../../entities/Character';
import { addLedger } from '../../entities/Household';
import { applyEffects } from '../../events/effects';
import { pushLog, writeTemplate } from '../../events/journal';
import { Ledger, LogKind, SystemLog } from '../../events/systemLogKeys';
import { RngStream, type SimContext } from '../context';
import { earnPersonal, isPlayerHead, mergePurse, selfFarms } from '../economy';
import { ageNow, aliveMembers, callOf, householdHead, player, playerHousehold } from '../people';
import { createResolver, seasonOf } from '../resolver';
import { addSkillXp } from '../skills';

/** Nghề hiện tại có phải nghề thật (có bậc, lương, hành động) không — phụ việc nhà, thất nghiệp thì không. */
export function hasRealCareer(ctx: SimContext): boolean {
  return ctx.content.index.career.get(ctx.state.career.id)?.kind === 'nghe';
}

/** [5] Nghề này có mở tại loại khu định cư hiện tại không (danh sách rỗng = ở đâu cũng có). */
export function careerInSettlement(ctx: SimContext, careerId: string): boolean {
  const c = ctx.content.index.career.get(careerId);
  if (!c) return false;
  if (c.settlement_types.length === 0) return true;
  return c.settlement_types.includes(ctx.state.world.settlementType);
}

/** [5] Nghề này có phải là lối ra (exit) đang đủ điều kiện từ nghề hiện tại của người chơi không. */
export function isUnlockedCareerExit(ctx: SimContext, targetCareerId: string): boolean {
  const cur = ctx.content.index.career.get(ctx.state.career.id);
  if (!cur) return false;
  const exit = cur.exits.find((e) => e.to === targetCareerId);
  if (!exit) return false;
  return evaluate(exit.condition, createResolver(ctx));
}

/** Kiểm tra người chơi có tự vào được một nghề không (tìm việc / ra làm riêng / chuyển theo lối ra); nghề trạng thái chỉ đến qua sự kiện. */
export function careerAvailable(ctx: SimContext, careerId: string): boolean {
  const c = ctx.content.index.career.get(careerId);
  if (!c || c.kind !== 'nghe' || careerId === ctx.state.career.id) return false;
  if (ageNow(ctx, player(ctx)) < ctx.content.balance.life.adult_age) return false;
  if (!careerInSettlement(ctx, careerId)) return false;
  if (isUnlockedCareerExit(ctx, careerId)) return true;
  return evaluate(c.entry_condition, createResolver(ctx));
}

/** [5] Hệ số thu nhập tăng theo số tháng thâm niên trong ngành. */
export function careerSeniorityFactor(ctx: SimContext, sectorMonths: number): number {
  const years = Math.max(0, sectorMonths) / ctx.content.balance.calendar.months_per_year;
  const cfg = ctx.content.balance.life.career_v2;
  const bonus = Math.min(cfg.max_seniority_bonus, years * cfg.seniority_bonus_per_year);
  return 1 + bonus;
}

/** [5] Tổng số tháng thâm niên trong ngành của nghề đang truyền vào (đối với người chơi). */
export function playerSectorMonths(ctx: SimContext, careerDef?: Career): number {
  const def = careerDef ?? ctx.content.index.career.get(ctx.state.career.id);
  if (!def || def.kind !== 'nghe') return 0;
  return ctx.state.career.sectorMonths[def.sector] ?? 0;
}

/** [5] Cập nhật bản ghi lý lịch nghề hiện tại của người chơi. */
export function syncCareerHistory(ctx: SimContext): void {
  const { state, content } = ctx;
  const def = content.index.career.get(state.career.id);
  if (!def || def.kind !== 'nghe') return;
  if (!state.career.history) state.career.history = [];
  const months = Math.max(0, state.clock.monthIndex - state.career.since);
  const rankIdx = clamp(state.career.rankIndex, 0, def.ranks.length - 1);
  const rankName = def.ranks[rankIdx]?.name ?? def.name;
  const last = state.career.history[state.career.history.length - 1];
  if (last && last.careerId === def.id && last.endYear === null) {
    last.months = Math.max(last.months, months);
    if (rankIdx >= last.highestRankIndex) {
      last.highestRankIndex = rankIdx;
      last.highestRankName = rankName;
    }
  } else {
    if (last && last.endYear === null) {
      last.endYear = state.clock.year;
    }
    state.career.history.push({
      careerId: def.id,
      careerName: def.name,
      sector: def.sector,
      highestRankIndex: rankIdx,
      highestRankName: rankName,
      startYear: state.clock.year,
      endYear: null,
      months,
    });
  }
}

/** Chuyển sang nghề mới (hoặc đặt bậc trong nghề). */
export function changeCareer(ctx: SimContext, careerId: string, rankIndex = 0, silent = false): boolean {
  const def = ctx.content.index.career.get(careerId);
  if (!def) return false;
  // Chốt số tháng của nghề trước đó vào lý lịch trước khi chuyển
  syncCareerHistory(ctx);

  const clampedRank = clamp(rankIndex, 0, def.ranks.length - 1);
  ctx.state.career.id = careerId;
  ctx.state.career.since = ctx.state.clock.monthIndex;
  ctx.state.career.rankIndex = clampedRank;
  ctx.state.career.merit = def.ranks[clampedRank]?.min_merit ?? 0;
  // Đồng bộ vào thực thể Character của người chơi
  const me = player(ctx);
  if (def.kind === 'nghe') {
    me.careerId = careerId;
    me.careerRankIndex = clampedRank;
    me.careerMonths = 0;
    me.careerMerit = ctx.state.career.merit;
  }
  // Chủ hộ theo nghề nào thì nghề nhà là nghề ấy
  if (def.kind === 'nghe' && isPlayerHead(ctx)) ctx.state.householdCareer = careerId;

  syncCareerHistory(ctx);

  if (!silent) {
    writeTemplate(ctx, SystemLog.CareerChanged, {
      params: { title: def.name, stage: def.ranks[clampedRank]?.name ?? def.name },
    });
  }
  return true;
}

/** [5] Đặt số tháng thâm niên cho nghề hiện tại của người chơi (dùng cho kịch bản thử nghiệm / sự kiện). */
export function setPlayerCareerTenure(ctx: SimContext, months: number): void {
  const { state, content } = ctx;
  const m = Math.max(0, Math.floor(months));
  state.career.since = state.clock.monthIndex - m;
  const def = content.index.career.get(state.career.id);
  if (def && def.kind === 'nghe') {
    state.career.sectorMonths[def.sector] = Math.max(state.career.sectorMonths[def.sector] ?? 0, m);
    const me = player(ctx);
    me.careerMonths = m;
    syncCareerHistory(ctx);
    const last = state.career.history[state.career.history.length - 1];
    if (last && last.careerId === def.id) {
      last.startYear = state.clock.year - Math.floor(m / content.balance.calendar.months_per_year);
      last.months = m;
    }
  }
}

export function addCareerMerit(ctx: SimContext, delta: number): void {
  ctx.state.career.merit = Math.max(0, ctx.state.career.merit + delta);
  checkPromotion(ctx);
}

export function addWanted(ctx: SimContext, delta: number): void {
  ctx.state.career.wanted = clamp(ctx.state.career.wanted + delta, 0, 100);
}

/** Kiểm tra thăng bậc tự động khi đủ công trạng (merit), thâm niên (min_years), kỹ năng, uy tín và điều kiện bậc kế tiếp. */
export function checkPromotion(ctx: SimContext): boolean {
  const { state, content } = ctx;
  const def = content.index.career.get(state.career.id);
  if (!def) return false;
  const nextIdx = state.career.rankIndex + 1;
  const nextRank = def.ranks[nextIdx];
  if (!nextRank) return false;
  if (state.career.merit < nextRank.min_merit) return false;

  const tenureYears = Math.max(0, state.clock.monthIndex - state.career.since) / content.balance.calendar.months_per_year;
  if (tenureYears < (nextRank.min_years ?? 0)) return false;

  if (nextRank.min_skill) {
    const skLvl = player(ctx).skills[nextRank.min_skill.skill]?.level ?? 0;
    if (skLvl < nextRank.min_skill.level) return false;
  }
  if (nextRank.min_reputation !== undefined) {
    const rep = state.reputation.dan_lang ?? 0;
    if (rep < nextRank.min_reputation) return false;
  }
  if (!evaluate(nextRank.condition, createResolver(ctx))) return false;

  state.career.rankIndex = nextIdx;
  const me = player(ctx);
  me.careerRankIndex = nextIdx;
  syncCareerHistory(ctx);
  writeTemplate(ctx, SystemLog.CareerPromoted, {
    params: { title: def.name, stage: nextRank.name },
  });
  return true;
}

/** [5] Kiểm tra nghề tay trái có khả dụng tại nơi ở hiện tại và cho người chơi không. */
export function sideJobAvailable(ctx: SimContext, sideJobId: string): boolean {
  const sj = ctx.content.index.sideJob.get(sideJobId);
  if (!sj) return false;
  if (ageNow(ctx, player(ctx)) < ctx.content.balance.life.adult_age) return false;
  if (sj.settlement_types.length > 0 && !sj.settlement_types.includes(ctx.state.world.settlementType)) return false;
  return evaluate(sj.condition, createResolver(ctx));
}

/** [5] Chọn hoặc bỏ nghề tay trái theo mùa nông nhàn. */
export function setSideJob(ctx: SimContext, sideJobId: string | null, silent = false): boolean {
  if (!sideJobId) {
    ctx.state.career.sideJobId = null;
    return true;
  }
  if (!sideJobAvailable(ctx, sideJobId)) return false;
  ctx.state.career.sideJobId = sideJobId;
  const sj = ctx.content.index.sideJob.get(sideJobId);
  if (sj && !silent) {
    writeTemplate(ctx, SystemLog.SideJobChanged, { params: { title: sj.name } });
  }
  return true;
}

/** [5] Nghề tay trái hiện tại có đang trong mùa hoạt động (nông nhàn) tháng này không. */
export function isSideJobActiveThisMonth(ctx: SimContext): boolean {
  const { state, content } = ctx;
  const sjId = state.career.sideJobId;
  if (!sjId) return false;
  const sj = content.index.sideJob.get(sjId);
  if (!sj) return false;
  const season = seasonOf(ctx);
  if (!sj.seasons.includes(season)) return false;
  // Tháng gặt vụ mùa ở hộ tự cày thì bận gặt hái, không làm nghề tay trái nông nhàn
  if (selfFarms(ctx) && content.balance.economy.harvest.months.includes(state.clock.month)) return false;
  return true;
}

/** [5] Chọn nghề mặc định cho một người lớn trong hộ khi chưa có nghề riêng. */
export function pickDefaultMemberCareer(ctx: SimContext, member: Character): string {
  const { state, content } = ctx;
  const rng = ctx.rng.get(RngStream.Npc);
  const settlement = state.world.settlementType;
  const validInSettlement = (id: string) => {
    const def = content.index.career.get(id);
    if (!def || def.kind !== 'nghe') return false;
    return def.settlement_types.length === 0 || def.settlement_types.includes(settlement);
  };

  // Chủ hộ thì ưu tiên giữ nghề nhà
  if (householdHead(ctx)?.id === member.id && validInSettlement(state.householdCareer)) {
    return state.householdCareer;
  }

  // Nếu có hướng nuôi dạy lúc nhỏ thì chọn theo nhóm nghề tương ứng
  const pools = content.balance.life.career_v2.upbringing_career_pools;
  if (member.upbringing && pools[member.upbringing]) {
    const candidates = pools[member.upbringing].filter((id) => {
      if (!validInSettlement(id)) return false;
      if ((id === 'si_tu' || id === 'nha_lai' || id === 'linh') && member.sex === 'f') return false;
      if (id === 'ba_do' && member.sex === 'm') return false;
      return true;
    });
    if (candidates.length > 0) return rng.pick(candidates);
  }

  // Nếu nghề nhà phù hợp thì theo nghề nhà
  if (validInSettlement(state.householdCareer)) {
    if (!((state.householdCareer === 'si_tu' || state.householdCareer === 'linh') && member.sex === 'f')) {
      return state.householdCareer;
    }
  }

  const fallbackPool = content.careers
    .filter(
      (c) =>
        c.kind === 'nghe' &&
        c.depth !== 'sau' &&
        validInSettlement(c.id) &&
        !(c.id === 'ba_do' && member.sex === 'm') &&
        !(c.id === 'nha_lai' && member.sex === 'f'),
    )
    .map((c) => c.id);

  return fallbackPool.length > 0 ? rng.pick(fallbackPool) : 'nong_dan';
}

/** [5] Đảm bảo mọi thành viên người lớn trong hộ đều có nghề riêng hợp lệ. */
export function ensureFamilyCareers(ctx: SimContext): void {
  const { state, content } = ctx;
  const adultAge = content.balance.life.adult_age;
  for (const m of aliveMembers(ctx)) {
    const age = ageNow(ctx, m);
    if (age < adultAge) continue;
    if (m.id === state.playerId) {
      if (hasRealCareer(ctx)) {
        m.careerId = state.career.id;
        m.careerRankIndex = state.career.rankIndex;
        m.careerMonths = Math.max(0, state.clock.monthIndex - state.career.since);
        m.careerMerit = state.career.merit;
      }
      continue;
    }
    const curDef = m.careerId ? content.index.career.get(m.careerId) : undefined;
    if (!curDef || curDef.kind !== 'nghe') {
      m.careerId = pickDefaultMemberCareer(ctx, m);
      m.careerRankIndex = 0;
      m.careerMonths = Math.max(0, (age - adultAge) * 4);
      m.careerMerit = (m.careerMonths ?? 0) * 0.5;
    }
  }
}

/** [5] Đổi nghề cho một thành viên người lớn trong hộ (do chủ hộ định hướng hoặc kịch bản thiết lập). */
export function setMemberCareer(ctx: SimContext, characterId: string, careerId: string, silent = false): boolean {
  const { state, content } = ctx;
  if (characterId === state.playerId) {
    return changeCareer(ctx, careerId, 0, silent);
  }
  const member = state.characters[characterId];
  if (!member || !member.alive || member.householdId !== state.householdId) return false;
  if (ageNow(ctx, member) < content.balance.life.adult_age) return false;
  const def = content.index.career.get(careerId);
  if (!def || def.kind !== 'nghe') return false;
  if (!careerInSettlement(ctx, careerId) && !silent) return false;

  member.careerId = careerId;
  member.careerRankIndex = 0;
  member.careerMonths = 0;
  member.careerMerit = 0;

  if (!silent) {
    writeTemplate(ctx, SystemLog.FamilyMemberCareerChanged, {
      self: member.id,
      params: { call: callOf(ctx, member), title: def.name },
    });
  }
  return true;
}

/** [5] Tính khoản thu nhập nghề hàng tháng của một thành viên người lớn khác trong hộ (ngoài người chơi). */
export function memberMonthlyCareerIncome(ctx: SimContext, member: Character): number {
  const { state, content } = ctx;
  if (member.id === state.playerId || !member.alive) return 0;
  const age = ageNow(ctx, member);
  const eco = content.balance.economy;
  if (age < content.balance.life.adult_age || age > eco.harvest.worker_max_age) return 0;

  const careerId = member.careerId ?? state.householdCareer;
  const def = content.index.career.get(careerId);
  if (!def || def.kind !== 'nghe') return 0;

  // Nếu thành viên này là chủ hộ đang gánh nghề chính của nhà (đã tính trong regularIncomeParts / thu hoạch) thì không cộng trùng
  if (householdHead(ctx)?.id === member.id && careerId === state.householdCareer && def.economy.income) {
    return 0;
  }

  const rankIdx = clamp(member.careerRankIndex ?? 0, 0, def.ranks.length - 1);
  const rank = def.ranks[rankIdx] ?? def.ranks[0];
  const seniority = careerSeniorityFactor(ctx, member.careerMonths ?? 0);
  const share = content.balance.life.career_v2.family_member_income_share;

  // Nếu có bổng lộc / tiền công bậc nghề rõ ràng
  if (rank && rank.stipend_money_month > 0) {
    return rank.stipend_money_month * seniority * share;
  }
  // Nếu nghề có khoảng thu nhập ước tính (income_range)
  if (rank && (rank.income_range[0] > 0 || rank.income_range[1] > 0)) {
    const mid = (rank.income_range[0] + rank.income_range[1]) / 2;
    return mid * seniority * share;
  }
  if (def.economy.family_wage_month !== undefined) {
    return def.economy.family_wage_month * seniority;
  }
  return eco.harvest.spare_worker_wage_month * seniority;
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

/** [1] Tạo ván / tải ván: người chơi đã đủ tuổi mà chưa có nghề riêng thì bắt đầu tự lập ngay; người lớn trong hộ có nghề riêng. */
export function ensureIndependentLife(ctx: SimContext): void {
  ensureFamilyCareers(ctx);
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
  const helperMonths = Math.max(0, state.clock.monthIndex - state.career.since);
  const carried = state.career.merit * content.balance.life.career_start.inherit_merit_factor;
  changeCareer(ctx, home.id, 0, true);
  state.career.merit = carried;
  if (helperMonths > 0) {
    setPlayerCareerTenure(ctx, helperMonths);
  }
  while (checkPromotion(ctx)) {
    /* thăng tới bậc mà kinh nghiệm phụ việc đã đủ */
  }
  writeTemplate(ctx, SystemLog.CareerInherited, { params: { title: home.name, stage: home.ranks[state.career.rankIndex]?.name ?? home.name } });
}

/** [5] Cập nhật thâm niên & xét thăng bậc hàng tháng cho các thành viên người lớn khác trong hộ. */
function monthlyFamilyMemberCareers(ctx: SimContext): void {
  const { state, content } = ctx;
  ensureFamilyCareers(ctx);
  const adultAge = content.balance.life.adult_age;
  const meritDelta = content.balance.life.career_v2.family_member_merit_month;
  const monthsPerYear = content.balance.calendar.months_per_year;

  for (const m of aliveMembers(ctx)) {
    if (m.id === state.playerId || ageNow(ctx, m) < adultAge) continue;
    const def = m.careerId ? content.index.career.get(m.careerId) : undefined;
    if (!def || def.kind !== 'nghe') continue;
    m.careerMonths = (m.careerMonths ?? 0) + 1;
    m.careerMerit = (m.careerMerit ?? 0) + meritDelta;

    const nextIdx = (m.careerRankIndex ?? 0) + 1;
    const nextRank = def.ranks[nextIdx];
    if (nextRank) {
      const years = (m.careerMonths ?? 0) / monthsPerYear;
      if ((m.careerMerit ?? 0) >= nextRank.min_merit && years >= (nextRank.min_years ?? 0)) {
        m.careerRankIndex = nextIdx;
      }
    }
  }
}

/** Hàng tháng: bắt đầu tự lập, tiếp quản nghề nhà, tích thâm niên ngành, áp tác động nghề, làm nghề tay trái, chi trả lương bổng và xét thăng bậc. */
export function monthlyCareer(ctx: SimContext): void {
  const { state, content } = ctx;
  monthlyFamilyMemberCareers(ctx);

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

  // [5] Tích lũy công trạng hàng tháng, thâm niên ngành và đồng bộ lý lịch nghề
  state.career.merit += def.merit_month;
  state.career.sectorMonths[def.sector] = (state.career.sectorMonths[def.sector] ?? 0) + 1;
  me.careerId = def.id;
  me.careerRankIndex = state.career.rankIndex;
  me.careerMonths = Math.max(0, state.clock.monthIndex - state.career.since);
  me.careerMerit = state.career.merit;
  syncCareerHistory(ctx);

  // [5] Áp dụng tác động hàng tháng của nghề (work_effects)
  const we = def.work_effects;
  if (we) {
    if (we.health_month !== 0) {
      me.health = clamp(me.health + we.health_month, 0, content.balance.life.health.max);
    }
    if (we.stress_month !== 0) {
      me.stress = clamp(me.stress + we.stress_month, 0, content.balance.life.stress.max);
    }
    for (const [sk, xp] of Object.entries(we.skill_xp)) {
      if (xp > 0) addSkillXp(ctx, me, sk, xp);
    }
  }

  const rank = def.ranks[state.career.rankIndex] ?? def.ranks[0];
  const h = playerHousehold(ctx);
  const seniorityFactor = careerSeniorityFactor(ctx, state.career.sectorMonths[def.sector] ?? 0);

  // [1.5 + 5] Lương bổng nghề riêng nhân hệ số thâm niên ngành: chưa làm chủ hộ thì vào túi riêng (góp một phần cho nhà)
  if (rank.stipend_money_month !== 0) {
    earnPersonal(ctx, Ledger.Career, rank.stipend_money_month * seniorityFactor);
  }
  if (rank.stipend_food_month !== 0) {
    h.food = Math.max(0, h.food + rank.stipend_food_month);
    addLedger(h, Ledger.Career, 0, rank.stipend_food_month);
  }

  // [5] Nghề tay trái theo mùa nông nhàn
  if (isSideJobActiveThisMonth(ctx) && state.career.sideJobId) {
    const sj = content.index.sideJob.get(state.career.sideJobId);
    if (sj) {
      if (sj.income_money_month > 0) {
        earnPersonal(ctx, Ledger.SideJob, sj.income_money_month);
      }
      if (sj.stress_month !== 0) {
        me.stress = clamp(me.stress + sj.stress_month, 0, content.balance.life.stress.max);
      }
      for (const [sk, xp] of Object.entries(sj.skill_xp)) {
        if (xp > 0) addSkillXp(ctx, me, sk, xp);
      }
    }
  }

  // Mức truy nã giảm chậm nếu không phạm thêm tội
  const decay = content.balance.opportunity.wanted_decay;
  if (state.career.wanted > 0 && state.clock.monthIndex % decay.every_months === 0) {
    state.career.wanted = Math.max(0, state.career.wanted - decay.amount);
  }

  checkPromotion(ctx);
}
