// [6] Cơ nghiệp kinh doanh (mở, mở rộng, sa sút, phá sản, truyền đời), Nâng cấp nhà ở & Vay/cho vay NPC
import { clamp } from '@shared/curve';
import { evaluate } from '../../engine/RuleEvaluator';
import { fullName, type Character } from '../../entities/Character';
import { addLedger, type Household, type NpcLoan, type VentureHolding } from '../../entities/Household';
import { mainHouse, nextHouseUpgrade } from '../../entities/Property';
import { fireDecision } from '../../events/decision';
import { writeTemplate } from '../../events/journal';
import { bindRoles, eligibleRoles } from '../../events/selection';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { changeClanRelation, syncClanFeuds } from '../ai';
import { newId, RngStream, type SimContext } from '../context';
import { aliveMembers, callOf, player, playerHousehold, villageNpc } from '../people';
import { createResolver } from '../resolver';
import { localTradeFactor, spareWorkers } from './helpers';

/** Giá trị tài sản quy đổi của một cơ nghiệp đang hoạt động (tính theo vốn đầu tư + bậc mở rộng × tình trạng). */
export function ventureAssetValue(ctx: SimContext, v: VentureHolding): number {
  const def = ctx.content.index.venture.get(v.id);
  if (!def) return 0;
  const stageCapital = def.capital_cost * (1 + (v.stage - 1) * def.expand_cost_factor);
  const healthFactor = clamp(0.35 + (v.health / 100) * 0.65, 0.25, 1.1);
  return Math.round(stageCapital * healthFactor);
}

/** Tổng giá trị các cơ nghiệp và khoản cho vay của một hộ (dùng khi tính tài sản ròng). */
export function householdVentureAndLoanValue(ctx: SimContext, h: Household = playerHousehold(ctx)): number {
  const ventureVal = (h.ventures ?? []).reduce((sum, v) => sum + ventureAssetValue(ctx, v), 0);
  const lentVal = (h.loans ?? [])
    .filter((l) => l.kind === 'lent')
    .reduce((sum, l) => sum + l.amount, 0);
  return ventureVal + lentVal;
}

/** Số nhân công cần thiết cho một cơ nghiệp ở quy mô hiện tại. */
export function ventureWorkersNeeded(ctx: SimContext, v: VentureHolding): number {
  const def = ctx.content.index.venture.get(v.id);
  if (!def) return 1;
  return def.workers_needed + (v.stage - 1);
}

/** Trạng thái chữ của cơ nghiệp theo điểm health. */
export function ventureStatusKey(ctx: SimContext, health: number): 'thriving' | 'normal' | 'declining' | 'critical' {
  const cfg = ctx.content.balance.economy.ventures;
  if (health >= cfg.thriving_threshold) return 'thriving';
  if (health >= cfg.decline_threshold) return 'normal';
  if (health >= cfg.critical_threshold) return 'declining';
  return 'critical';
}

/** Ước tính doanh thu, chi phí và lợi nhuận cả năm của một cơ nghiệp theo tình hình hiện tại. */
export function estimateVentureYear(
  ctx: SimContext,
  v: VentureHolding,
): { revenue: number; upkeep: number; profit: number; workersNeeded: number; familyWorkersUsed: number } {
  const { content, state } = ctx;
  const def = content.index.venture.get(v.id);
  if (!def) return { revenue: 0, upkeep: 0, profit: 0, workersNeeded: 1, familyWorkersUsed: 0 };

  const cfg = content.balance.economy.ventures;
  const stageIdx = clamp(v.stage - 1, 0, 2);
  const stageRevFactor = cfg.stage_revenue_factor[stageIdx] ?? 1;
  const stageUpkeepFactor = cfg.stage_upkeep_factor[stageIdx] ?? 1;

  // Bậc kỹ năng cao nhất trong hộ đối với kỹ năng của cơ nghiệp
  const bestSkill = aliveMembers(ctx).reduce((m, c) => Math.max(m, c.skills[def.skill]?.level ?? 0), 0);
  const skillFactor = 1 + bestSkill * def.skill_bonus_per_level;

  // Ảnh hưởng của Thời cơ buôn bán
  const marketIndex = state.world.tradeIndex * localTradeFactor(ctx);
  const tradeFactor = 1 + (marketIndex - 1) * def.trade_sensitivity;

  // Ảnh hưởng của danh tiếng làng
  const rep = state.reputation.dan_lang ?? 0;
  const repFactor = clamp(1 + (rep / 10) * def.reputation_bonus_per_10, 0.7, 1.5);

  // Ảnh hưởng của nhân công và tình trạng cơ nghiệp
  const needed = ventureWorkersNeeded(ctx, v);
  const familyAvail = Math.max(0, Math.min(needed, Math.floor(spareWorkers(ctx)) + 1));
  const totalStaff = Math.min(needed, familyAvail + v.hiredWorkers);
  const staffRatio = needed > 0 ? clamp(totalStaff / needed, 0.4, 1) : 1;
  const healthFactor = clamp(0.45 + (v.health / 100) * 0.65, 0.4, 1.15);

  const revenue = Math.round(
    def.base_revenue_year * stageRevFactor * skillFactor * tradeFactor * repFactor * staffRatio * healthFactor * 10,
  ) / 10;
  const upkeep = Math.round((def.upkeep_year * stageUpkeepFactor + v.hiredWorkers * def.hire_wage_year) * 10) / 10;
  const profit = Math.round((revenue - upkeep) * 10) / 10;

  return {
    revenue,
    upkeep,
    profit,
    workersNeeded: needed,
    familyWorkersUsed: familyAvail,
  };
}

/** Kiểm tra một cơ nghiệp có phải bậc nâng cấp của cơ nghiệp khác không (không mở trực tiếp từ đầu trừ khi qua kịch bản/sự kiện). */
export function isUpgradeTargetVenture(ctx: SimContext, ventureId: string): boolean {
  return ctx.content.ventures.some((v) => v.upgrade_to === ventureId);
}

/** Kiểm tra hộ có thể mở mới một cơ nghiệp không. */
export function canOpenVenture(ctx: SimContext, ventureId: string): boolean {
  const { content, state } = ctx;
  const def = content.index.venture.get(ventureId);
  if (!def) return false;
  if (isUpgradeTargetVenture(ctx, ventureId)) return false;
  if (def.settlement_types.length > 0 && !def.settlement_types.includes(state.world.settlementType)) {
    return false;
  }
  const h = playerHousehold(ctx);
  const owned = h.ventures ?? [];
  // Không mở trùng loại cơ nghiệp (hoặc chuỗi sạp -> cửa hiệu -> hiệu buôn đã có)
  if (owned.some((v) => v.id === ventureId)) return false;
  let cur: string | undefined = def.upgrade_to;
  while (cur) {
    if (owned.some((v) => v.id === cur)) return false;
    cur = content.index.venture.get(cur)?.upgrade_to;
  }
  if (def.condition && !evaluate(def.condition, createResolver(ctx))) return false;
  return true;
}

/** Mở mới một cơ nghiệp cho hộ gia đình. */
export function openVenture(
  ctx: SimContext,
  ventureId: string,
  options: { free?: boolean; stage?: number; health?: number; silent?: boolean } = {},
): boolean {
  const { content, state } = ctx;
  const def = content.index.venture.get(ventureId);
  if (!def) return false;
  const h = playerHousehold(ctx);
  if (!h.ventures) h.ventures = [];
  if (h.ventures.some((v) => v.id === ventureId)) return false;

  if (!options.free) {
    if (!canOpenVenture(ctx, ventureId)) return false;
    if (h.money < def.capital_cost) return false;
    h.money -= def.capital_cost;
    addLedger(h, Ledger.BuyProperty, -def.capital_cost, 0);
  }

  const holding: VentureHolding = {
    id: ventureId,
    stage: clamp(options.stage ?? 1, 1, def.max_stage),
    health: clamp(options.health ?? content.balance.economy.ventures.start_health, 1, 100),
    hiredWorkers: 0,
    lastRevenueYear: 0,
    lastUpkeepYear: 0,
    lastProfitYear: 0,
    yearsLoss: 0,
    foundedYear: state.clock.year,
  };
  const est = estimateVentureYear(ctx, holding);
  holding.lastRevenueYear = est.revenue;
  holding.lastUpkeepYear = est.upkeep;
  holding.lastProfitYear = est.profit;
  h.ventures.push(holding);

  if (!options.silent) {
    writeTemplate(ctx, SystemLog.VentureOpened, {
      params: { title: def.name, money: Math.round(def.capital_cost) },
    });
  }
  return true;
}

/** Chi phí để mở rộng hoặc nâng cấp một cơ nghiệp đang có. */
export function ventureExpandCost(ctx: SimContext, v: VentureHolding): { cost: number; nextName: string } | null {
  const def = ctx.content.index.venture.get(v.id);
  if (!def) return null;
  if (def.upgrade_to) {
    const nextDef = ctx.content.index.venture.get(def.upgrade_to);
    if (!nextDef) return null;
    const cost = def.upgrade_cost ?? Math.max(10, nextDef.capital_cost - def.capital_cost);
    return { cost, nextName: nextDef.name };
  }
  if (v.stage < def.max_stage) {
    const cost = Math.round(def.capital_cost * def.expand_cost_factor * v.stage);
    return { cost, nextName: def.name };
  }
  return null;
}

/** Mở rộng quy mô hoặc nâng cấp bậc cơ nghiệp (ví dụ: Sạp nhỏ -> Cửa hiệu -> Hiệu buôn). */
export function expandVenture(ctx: SimContext, ventureId: string): boolean {
  const { content } = ctx;
  const h = playerHousehold(ctx);
  const v = (h.ventures ?? []).find((x) => x.id === ventureId);
  if (!v) return false;
  const def = content.index.venture.get(v.id);
  if (!def) return false;
  const exp = ventureExpandCost(ctx, v);
  if (!exp || h.money < exp.cost) return false;

  h.money -= exp.cost;
  addLedger(h, Ledger.BuyProperty, -exp.cost, 0);

  if (def.upgrade_to) {
    const nextDef = content.index.venture.get(def.upgrade_to);
    if (!nextDef) return false;
    v.id = nextDef.id;
    v.stage = 1;
  } else {
    v.stage = Math.min(def.max_stage, v.stage + 1);
  }
  v.health = clamp(v.health + 15, 50, 100);
  v.yearsLoss = 0;

  const est = estimateVentureYear(ctx, v);
  v.lastRevenueYear = est.revenue;
  v.lastUpkeepYear = est.upkeep;
  v.lastProfitYear = est.profit;

  writeTemplate(ctx, SystemLog.VentureExpanded, {
    params: { title: exp.nextName, money: Math.round(exp.cost) },
  });
  return true;
}

/** Điều chỉnh số thợ thuê ngoài cho một cơ nghiệp. */
export function setVentureWorkers(ctx: SimContext, ventureId: string, hiredWorkers: number): boolean {
  const h = playerHousehold(ctx);
  const v = (h.ventures ?? []).find((x) => x.id === ventureId);
  if (!v) return false;
  const needed = ventureWorkersNeeded(ctx, v);
  v.hiredWorkers = clamp(Math.round(hiredWorkers), 0, needed);
  const est = estimateVentureYear(ctx, v);
  v.lastRevenueYear = est.revenue;
  v.lastUpkeepYear = est.upkeep;
  v.lastProfitYear = est.profit;
  return true;
}

/** Sang nhượng / đóng cửa cơ nghiệp để thu hồi vốn. */
export function closeVenture(ctx: SimContext, ventureId: string): boolean {
  const h = playerHousehold(ctx);
  if (!h.ventures) return false;
  const idx = h.ventures.findIndex((x) => x.id === ventureId);
  if (idx < 0) return false;
  const v = h.ventures[idx];
  const def = ctx.content.index.venture.get(v.id);
  const payout = Math.round(ventureAssetValue(ctx, v) * ctx.content.balance.economy.property_sell_factor);
  h.ventures.splice(idx, 1);
  h.money += payout;
  addLedger(h, Ledger.SellProperty, payout, 0);
  if (def) {
    writeTemplate(ctx, SystemLog.VentureClosed, {
      params: { title: def.name, money: payout },
    });
  }
  return true;
}

/** Cuối năm: quyết toán doanh thu, chi phí, rủi ro, suy thoái và phá sản của mọi cơ nghiệp trong hộ. */
export function yearlyVentures(ctx: SimContext): void {
  const { content } = ctx;
  const h = playerHousehold(ctx);
  if (!h.ventures || h.ventures.length === 0) return;

  const rng = ctx.rng.get(RngStream.World);
  const cfg = content.balance.economy.ventures;
  const bankruptIds: string[] = [];

  for (const v of h.ventures) {
    const def = content.index.venture.get(v.id);
    if (!def) continue;

    const est = estimateVentureYear(ctx, v);
    const noise = 0.92 + rng.next() * 0.16;
    const revenue = Math.round(est.revenue * noise * 10) / 10;

    let riskLoss = 0;
    if (rng.chance(def.risk.chance_year)) {
      riskLoss = Math.round((def.risk.loss_min + rng.next() * (def.risk.loss_max - def.risk.loss_min)) * 10) / 10;
    }

    const upkeep = Math.round((est.upkeep + riskLoss) * 10) / 10;
    const profit = Math.round((revenue - upkeep) * 10) / 10;

    v.lastRevenueYear = revenue;
    v.lastUpkeepYear = upkeep;
    v.lastProfitYear = profit;

    h.money += profit;
    if (revenue > 0) addLedger(h, Ledger.VentureRevenue, revenue, 0);
    if (upkeep > 0) addLedger(h, Ledger.Upkeep, -upkeep, 0);

    const prevStatus = ventureStatusKey(ctx, v.health);
    const totalStaff = est.familyWorkersUsed + v.hiredWorkers;
    const understaffed = totalStaff < est.workersNeeded;

    if (profit > 0 && !understaffed) {
      v.health = clamp(v.health + cfg.profit_health_gain, 0, 100);
      v.yearsLoss = 0;
    } else {
      const drop = (profit < 0 ? cfg.loss_health_drop : 0) + (understaffed ? cfg.understaffed_health_drop : 0);
      v.health = clamp(v.health - Math.max(4, drop), 0, 100);
      if (profit < 0) v.yearsLoss += 1;
    }

    const newStatus = ventureStatusKey(ctx, v.health);
    if (
      (newStatus === 'declining' || newStatus === 'critical') &&
      prevStatus !== newStatus &&
      v.health > 0
    ) {
      writeTemplate(ctx, SystemLog.VentureDeclined, {
        params: { title: def.name },
      });
    }

    // Phá sản khi tình trạng kiệt quệ hoặc thua lỗ liên tiếp mà hộ không còn tiền cầm cự
    if (v.health <= 0 || (v.yearsLoss >= cfg.max_loss_years_before_bankrupt && h.money <= 0)) {
      bankruptIds.push(v.id);
      writeTemplate(ctx, SystemLog.VentureBankrupt, {
        params: { title: def.name },
      });
    }
  }

  if (bankruptIds.length > 0) {
    h.ventures = h.ventures.filter((v) => !bankruptIds.includes(v.id));
  }
}

/** Chi phí nâng cấp lên bậc nhà kế tiếp. */
export function houseUpgradeInfo(
  ctx: SimContext,
  h: Household = playerHousehold(ctx),
): { current: NonNullable<ReturnType<typeof mainHouse>>; next: NonNullable<ReturnType<typeof nextHouseUpgrade>>; cost: number } | null {
  const cur = mainHouse(h, ctx.content);
  const next = nextHouseUpgrade(h, ctx.content);
  if (!cur || !next) return null;
  const cost = next.upgrade_cost ?? Math.max(10, next.value - cur.value);
  return { current: cur, next, cost };
}

/** Nâng cấp nhà ở lên bậc cao hơn kế tiếp (nhà tranh -> nhà gỗ 3 gian -> phủ đệ). */
export function upgradeHouse(ctx: SimContext, options: { targetId?: string; free?: boolean } = {}): boolean {
  const { content } = ctx;
  const h = playerHousehold(ctx);
  const cur = mainHouse(h, content);
  const next = options.targetId ? content.index.property.get(options.targetId) : nextHouseUpgrade(h, content);
  if (!next || next.category !== 'house') return false;
  if (cur && (next.house_tier ?? 0) <= (cur.house_tier ?? 0)) return false;

  const cost = options.free ? 0 : (next.upgrade_cost ?? Math.max(10, next.value - (cur?.value ?? 0)));
  if (!options.free && h.money < cost) return false;

  if (cost > 0) {
    h.money -= cost;
    addLedger(h, Ledger.BuyProperty, -cost, 0);
  }

  // Xóa nhà bậc thấp cũ, đặt nhà bậc mới = 1
  for (const p of content.properties) {
    if (p.category === 'house' && (h.properties[p.id] ?? 0) > 0) {
      delete h.properties[p.id];
    }
  }
  h.properties[next.id] = 1;

  if (!options.free) {
    writeTemplate(ctx, SystemLog.HouseUpgraded, {
      params: { title: next.name, money: Math.round(cost) },
    });
  }
  return true;
}

/** Danh sách NPC trong làng có thể cho người chơi vay tiền (bá hộ, tộc trưởng giàu). */
export function availableCreditors(ctx: SimContext): Character[] {
  const { state } = ctx;
  const list: Character[] = [];
  const baHo = villageNpc(ctx, 'ba_ho');
  if (baHo?.alive) list.push(baHo);
  for (const clan of Object.values(state.villageClans ?? {})) {
    if (clan.statusRankId === 'phu_ho' || clan.statusRankId === 'si_phu') {
      const head = state.characters[clan.headId];
      if (head?.alive && !list.some((x) => x.id === head.id)) list.push(head);
    }
  }
  return list;
}

/** Danh sách NPC trong làng có thể hỏi vay tiền từ người chơi. */
export function availableBorrowers(ctx: SimContext): Character[] {
  const { state } = ctx;
  const list: Character[] = [];
  for (const role of ['hang_xom', 'thay_do', 'thay_lang']) {
    const npc = villageNpc(ctx, role);
    if (npc?.alive && !list.some((x) => x.id === npc.id)) list.push(npc);
  }
  for (const clan of Object.values(state.villageClans ?? {})) {
    const head = state.characters[clan.headId];
    if (head?.alive && !list.some((x) => x.id === head.id)) list.push(head);
  }
  return list.slice(0, 5);
}

/** Vay tiền từ một chủ nợ NPC cụ thể. */
export function borrowFromNpc(
  ctx: SimContext,
  npcId: string,
  amount: number,
  options: { overdueYears?: number; silent?: boolean } = {},
): boolean {
  const { state, content } = ctx;
  const npc = state.characters[npcId];
  if (!npc?.alive || amount <= 0) return false;
  const h = playerHousehold(ctx);
  const eco = content.balance.economy;
  if (!options.silent && h.debt + amount > eco.debt.borrow_limit) return false;

  if (!h.loans) h.loans = [];
  const cfg = eco.npc_loans;
  const rate =
    (npc.opinionOfPlayer ?? 0) >= 20 || (npc.favorWithPlayer ?? 0) >= 10
      ? cfg.friendly_annual_interest
      : cfg.creditor_annual_interest;

  const existing = h.loans.find((l) => l.kind === 'borrowed' && l.npcId === npcId);
  if (existing) {
    existing.principal += amount;
    existing.amount += amount;
    if (options.overdueYears !== undefined) {
      existing.overdueYears = options.overdueYears;
      existing.dueYear = state.clock.year - options.overdueYears;
    }
  } else {
    const overdue = options.overdueYears ?? 0;
    h.loans.push({
      id: newId(ctx, 'loan'),
      kind: 'borrowed',
      npcId,
      principal: amount,
      amount,
      interestRate: rate,
      startYear: state.clock.year - overdue,
      dueYear: state.clock.year + cfg.default_term_years - overdue,
      overdueYears: overdue,
    });
  }

  h.money += amount;
  h.debt += amount;
  addLedger(h, Ledger.Borrow, amount, 0);

  if (!options.silent) {
    writeTemplate(ctx, SystemLog.NpcBorrowed, {
      self: npc.id,
      params: { call: callOf(ctx, npc), money: Math.round(amount) },
    });
  }
  return true;
}

/** Trả nợ cho một khoản vay NPC cụ thể. */
export function repayNpcLoan(ctx: SimContext, loanId: string, amount: number): boolean {
  const { state, content } = ctx;
  const h = playerHousehold(ctx);
  if (!h.loans) return false;
  const idx = h.loans.findIndex((l) => l.id === loanId && l.kind === 'borrowed');
  if (idx < 0) return false;
  const loan = h.loans[idx];
  const pay = Math.min(amount, loan.amount, h.money);
  if (pay <= 0) return false;

  h.money -= pay;
  h.debt = Math.max(0, h.debt - pay);
  loan.amount = Math.max(0, Math.round((loan.amount - pay) * 10) / 10);
  addLedger(h, Ledger.RepayDebt, -pay, 0);

  const npc = state.characters[loan.npcId];
  const cfg = content.balance.economy.npc_loans;
  if (npc) {
    npc.opinionOfPlayer = clamp((npc.opinionOfPlayer ?? 0) + cfg.repay_opinion_gain, -100, 100);
    npc.favorWithPlayer = (npc.favorWithPlayer ?? 0) + cfg.repay_favor_gain;
  }

  if (loan.amount <= 0.05) {
    h.loans.splice(idx, 1);
    state.reputation.dan_lang = clamp((state.reputation.dan_lang ?? 0) + 2, -100, 100);
  }

  if (npc) {
    writeTemplate(ctx, SystemLog.NpcRepaid, {
      self: npc.id,
      params: { call: callOf(ctx, npc), money: Math.round(pay) },
    });
  }
  return true;
}

/** Cho một NPC trong làng vay tiền (tích ân tình và thu lãi). */
export function lendToNpc(ctx: SimContext, npcId: string, amount: number, options: { silent?: boolean } = {}): boolean {
  const { state, content } = ctx;
  const npc = state.characters[npcId];
  const h = playerHousehold(ctx);
  if (!npc?.alive || amount <= 0 || h.money < amount) return false;

  if (!h.loans) h.loans = [];
  const cfg = content.balance.economy.npc_loans;
  const existing = h.loans.find((l) => l.kind === 'lent' && l.npcId === npcId);
  if (existing) {
    existing.principal += amount;
    existing.amount += amount;
  } else {
    h.loans.push({
      id: newId(ctx, 'loan'),
      kind: 'lent',
      npcId,
      principal: amount,
      amount,
      interestRate: cfg.lend_annual_interest,
      startYear: state.clock.year,
      dueYear: state.clock.year + cfg.default_term_years,
      overdueYears: 0,
    });
  }

  h.money -= amount;
  addLedger(h, Ledger.LoanLent, -amount, 0);

  npc.opinionOfPlayer = clamp((npc.opinionOfPlayer ?? 0) + cfg.lend_opinion_gain, -100, 100);
  npc.favorWithPlayer = (npc.favorWithPlayer ?? 0) + cfg.lend_favor_gain;

  if (!options.silent) {
    writeTemplate(ctx, SystemLog.NpcLent, {
      self: npc.id,
      params: { call: callOf(ctx, npc), money: Math.round(amount) },
    });
  }
  return true;
}

/** Đòi lại khoản tiền đã cho NPC vay. */
export function collectNpcLoan(ctx: SimContext, loanId: string): boolean {
  const { state } = ctx;
  const h = playerHousehold(ctx);
  if (!h.loans) return false;
  const idx = h.loans.findIndex((l) => l.id === loanId && l.kind === 'lent');
  if (idx < 0) return false;
  const loan = h.loans[idx];
  const collected = Math.round(loan.amount * 10) / 10;
  h.loans.splice(idx, 1);

  h.money += collected;
  addLedger(h, Ledger.LoanCollected, collected, 0);

  const npc = state.characters[loan.npcId];
  if (npc) {
    // Đòi nợ trước hạn làm giảm nhẹ thiện cảm
    if (state.clock.year < loan.dueYear) {
      npc.opinionOfPlayer = clamp((npc.opinionOfPlayer ?? 0) - 4, -100, 100);
    }
    writeTemplate(ctx, SystemLog.NpcLoanCollected, {
      self: npc.id,
      params: { call: callOf(ctx, npc), money: Math.round(collected) },
    });
  }
  return true;
}

/** Xóa nợ cho NPC để đổi lấy đại ân tình và tiếng thơm trong làng. */
export function forgiveNpcLoan(ctx: SimContext, loanId: string): boolean {
  const { state, content } = ctx;
  const h = playerHousehold(ctx);
  if (!h.loans) return false;
  const idx = h.loans.findIndex((l) => l.id === loanId && l.kind === 'lent');
  if (idx < 0) return false;
  const loan = h.loans[idx];
  h.loans.splice(idx, 1);

  const cfg = content.balance.economy.npc_loans;
  const npc = state.characters[loan.npcId];
  if (npc) {
    npc.opinionOfPlayer = clamp((npc.opinionOfPlayer ?? 0) + cfg.forgive_opinion_gain, -100, 100);
    npc.favorWithPlayer = (npc.favorWithPlayer ?? 0) + cfg.forgive_favor_gain;
    if (npc.clanId && state.villageClans?.[npc.clanId]) {
      changeClanRelation(ctx, npc.clanId, 15, 'ally');
    }
    writeTemplate(ctx, SystemLog.NpcLoanForgiven, {
      self: npc.id,
      params: { call: callOf(ctx, npc), money: Math.round(loan.amount) },
    });
  }
  state.reputation.dan_lang = clamp((state.reputation.dan_lang ?? 0) + cfg.forgive_reputation_gain, -100, 100);
  return true;
}

/** Cuối năm: tính lãi các khoản vay/cho vay NPC, xét quá hạn, thù oán và kích hoạt sự kiện đòi nợ. */
export function yearlyNpcLoans(ctx: SimContext): void {
  const { state, content } = ctx;
  const h = playerHousehold(ctx);
  if (!h.loans || h.loans.length === 0) return;

  const cfg = content.balance.economy.npc_loans;
  // Đồng bộ nếu h.debt đã được trả hết qua trả nợ chung
  if (h.debt <= 0) {
    h.loans = h.loans.filter((l) => l.kind !== 'borrowed');
  }

  for (const loan of [...h.loans]) {
    const npc = state.characters[loan.npcId];
    if (!npc || !npc.alive) continue;

    if (loan.kind === 'lent') {
      const interest = Math.round(loan.amount * loan.interestRate * 10) / 10;
      loan.amount = Math.round((loan.amount + interest) * 10) / 10;
      if (state.clock.year >= loan.dueYear) {
        loan.overdueYears += 1;
      }
    } else {
      // Khoản vay của NPC: lãi đã tính chung vào h.debt hằng tháng, cập nhật dư nợ tương ứng
      const interest = Math.round(loan.amount * loan.interestRate * 10) / 10;
      loan.amount = Math.min(h.debt, Math.round((loan.amount + interest) * 10) / 10);

      if (state.clock.year >= loan.dueYear) {
        loan.overdueYears += 1;
        npc.opinionOfPlayer = clamp((npc.opinionOfPlayer ?? 0) - cfg.overdue_opinion_drop, -100, 100);
        if (loan.overdueYears >= cfg.overdue_feud_years && npc.clanId && state.villageClans?.[npc.clanId]) {
          changeClanRelation(ctx, npc.clanId, -25, 'feud', fullName(player(ctx)));
          syncClanFeuds(ctx);
        }
        // Chủ nợ đến đòi khi quá hạn và chưa có sự kiện đang chờ
        if (!state.pending) {
          const ev = content.index.event.get('kt_chu_no_den_doi');
          if (ev) {
            const roles = eligibleRoles(ctx, ev) ?? bindRoles(ctx, ev.roles);
            if (roles) fireDecision(ctx, ev, roles);
          }
        }
      }
    }
  }
}
