// [0] Kinh tế hộ: thu chi, thu hoạch, thuế, nợ, giá lúa trôi theo mùa (GDD 03 §5, §9)
// [1] Nguồn sống theo nghề nhà: tự cày hay phát canh thu tô, người nhà làm thuê hay phụ việc nghề, lời buôn bán
import { interpolate } from '@shared/curve';
import { evaluate } from '../../engine/RuleEvaluator';
import { addLedger } from '../../entities/Household';
import { farmlandOf, holdingsOf } from '../../entities/Property';
import { StatTarget } from '../../engine/statTargets';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { queueCutscene } from '../../events/cutscene';
import { writeTemplate } from '../../events/journal';
import { RngStream, type SimContext } from '../context';
import { computeHousehold } from '../modifiers';
import { ageNow, aliveMembers, householdHead, player, playerHousehold } from '../people';
import { createResolver } from '../resolver';
import { buyPrice, careerEconomy, incomeOf, monthlyFoodNeed, monthlyMoneyNeed, sellPrice, workers } from './helpers';

export * from './helpers';

function quality(ctx: SimContext) {
  const { content, state } = ctx;
  return content.index.harvestQuality.get(state.world.harvestQuality) ?? content.balance.economy.harvest_qualities[0];
}

/** Đầu năm: trời định được hay mất mùa (ẩn với người chơi, lộ dần qua thời tiết, giá, tin đồn). */
export function rollHarvestQuality(ctx: SimContext): void {
  const q = ctx.rng.get(RngStream.World).weighted(ctx.content.balance.economy.harvest_qualities, (x) => x.weight);
  if (q) ctx.state.world.harvestQuality = q.id;
}

/** Mỗi tháng: giá lúa và thời tiết. */
export function monthlyWorld(ctx: SimContext): void {
  const { content, state } = ctx;
  const rng = ctx.rng.get(RngStream.World);
  const p = content.balance.economy.price;
  const q = quality(ctx);
  const factor = p.monthly_factor[(state.clock.month - 1) % p.monthly_factor.length];
  state.world.foodPrice = p.base * factor * q.price_factor * (1 + p.noise * (rng.next() * 2 - 1));

  const month = content.balance.calendar.months.find((m) => m.month === state.clock.month);
  if (month) {
    const w = rng.weighted(month.weather, (x) => x.weight * (q.weather_bias[x.id] ?? 1));
    if (w) state.world.weather = w.id;
  }
}

function harvest(ctx: SimContext): void {
  const { content, state } = ctx;
  const hv = content.balance.economy.harvest;
  const h = playerHousehold(ctx);
  const sao = farmlandOf(h, content);
  if (sao <= 0) return;
  const crew = workers(ctx);
  const labor = interpolate(hv.labor_factor, 'workers_per_sao', 'factor', crew.length / sao);
  const bestSkill = crew.reduce((m, c) => Math.max(m, c.skills[hv.skill]?.level ?? 0), 0);
  const yieldMod = computeHousehold(ctx, StatTarget.HarvestYield, 1).value;
  const q = quality(ctx);
  const amount = Math.round(sao * hv.yield_per_sao * q.yield_factor * labor * (1 + bestSkill * hv.skill_bonus_per_level) * yieldMod);
  h.food += amount;
  addLedger(h, Ledger.Harvest, 0, amount);
  state.world.lastHarvest = amount;
  queueCutscene(ctx, q.cutscene);
  writeTemplate(ctx, q.harvest_log, { params: { amount, sao } });
}

/** [1] Hộ không tự cày: tá điền gặt ruộng phát canh, chủ ruộng thu tô theo phần chia (không cần nhân lực nhà mình). */
function collectRent(ctx: SimContext): void {
  const { content, state } = ctx;
  const h = playerHousehold(ctx);
  const sao = farmlandOf(h, content);
  if (sao <= 0) return;
  const q = quality(ctx);
  const t = content.balance.economy.tenancy;
  const tenants = interpolate(t.rent_factor_by_sao, 'sao', 'factor', sao);
  const amount = Math.round(sao * content.balance.economy.harvest.yield_per_sao * q.yield_factor * t.rent_share * tenants);
  h.food += amount;
  addLedger(h, Ledger.Rent, 0, amount);
  state.world.lastHarvest = amount;
  queueCutscene(ctx, q.cutscene);
  writeTemplate(ctx, SystemLog.RentCollected, { params: { amount, sao } });
}

/** [1] Các khoản thu đều đặn trong tháng: nghề nhà (kỹ năng theo người giỏi nhất trong hộ) và Focus chính (kỹ năng người chơi). */
export function regularIncomeParts(ctx: SimContext): { ledger: string; money: number }[] {
  const { content, state } = ctx;
  const parts: { ledger: string; money: number }[] = [];
  const ce = careerEconomy(ctx);
  if (ce.income) {
    const skill = ce.income.skill;
    const level = skill ? aliveMembers(ctx).reduce((m, c) => Math.max(m, c.skills[skill]?.level ?? 0), 0) : 0;
    parts.push({ ledger: ce.income.ledger, money: incomeOf(ctx, ce.income, level) });
  }
  const focus = content.index.focus.get(state.focus.primary);
  if (focus?.income && evaluate(focus.condition, createResolver(ctx))) {
    const skill = focus.income.skill;
    parts.push({ ledger: focus.income.ledger, money: incomeOf(ctx, focus.income, skill ? (player(ctx).skills[skill]?.level ?? 0) : 0) });
  }
  return parts;
}

function regularIncome(ctx: SimContext): void {
  const h = playerHousehold(ctx);
  for (const part of regularIncomeParts(ctx)) {
    h.money += part.money;
    addLedger(h, part.ledger, part.money, 0);
  }
}

function tax(ctx: SimContext): void {
  const { content } = ctx;
  const t = content.balance.economy.tax;
  const h = playerHousehold(ctx);
  const adults = aliveMembers(ctx, h).filter((c) => ageNow(ctx, c) >= content.balance.life.adult_age).length;
  const food = Math.round(farmlandOf(h, content) * t.food_per_sao);
  const money = adults * t.money_per_adult;
  h.food -= food;
  h.money -= money;
  addLedger(h, Ledger.Tax, -money, -food);
  writeTemplate(ctx, SystemLog.Tax, { params: { food, money: Math.round(money) } });
}

/** Thiếu thóc thì mua, thiếu tiền thì vay nặng lãi (nếu bật trong data). */
/** Đã ghi mẫu này vào nhật ký trong năm nay chưa (tránh lặp dòng báo cáo mỗi tháng). */
function loggedThisYear(ctx: SimContext, templateId: string): boolean {
  const { state } = ctx;
  const last = state.ambientHistory[templateId]?.lastMonthIndex ?? -Infinity;
  return last >= state.clock.monthIndex - (state.clock.month - 1);
}

function settle(ctx: SimContext): void {
  const { content } = ctx;
  const eco = content.balance.economy;
  const h = playerHousehold(ctx);
  const headroom = () => (eco.debt.auto_borrow ? Math.max(0, eco.debt.borrow_limit - h.debt) : 0);

  // 1) Thiếu thóc: mua trong khả năng (tiền mặt + còn vay được); không mua nổi thì kho trống — nhà đói
  if (h.food < 0) {
    const need = -h.food;
    const price = buyPrice(ctx);
    const bought = Math.min(need, (Math.max(0, h.money) + headroom()) / price);
    h.food = 0;
    h.money -= bought * price;
    addLedger(h, Ledger.BuyFood, -bought * price, bought);
    if (bought < need && !loggedThisYear(ctx, SystemLog.Starving)) writeTemplate(ctx, SystemLog.Starving);
  }
  // 1b) Hộ không tự cày: có tiền thì đong thóc dự trữ vài tháng (không vay để tích trữ)
  if (!careerEconomy(ctx).self_farm) {
    const want = monthlyFoodNeed(ctx) * eco.tenancy.food_reserve_months - h.food;
    const price = buyPrice(ctx);
    const amount = price > 0 ? Math.min(want, Math.max(0, h.money) / price) : 0;
    if (amount > 0) {
      h.food += amount;
      h.money -= amount * price;
      addLedger(h, Ledger.BuyFood, -amount * price, amount);
    }
  }
  // 2) Thiếu tiền: bán thóc dư trước, chỉ giữ đủ ăn auto_sell_keep_months tháng
  if (h.money < 0) {
    const spare = Math.floor(h.food - monthlyFoodNeed(ctx) * eco.auto_sell_keep_months);
    const price = sellPrice(ctx);
    if (spare > 0 && price > 0) {
      const amount = Math.min(spare, Math.ceil(-h.money / price));
      h.food -= amount;
      h.money += amount * price;
      addLedger(h, Ledger.SellFood, amount * price, -amount);
      if (!loggedThisYear(ctx, SystemLog.AutoSellFood)) writeTemplate(ctx, SystemLog.AutoSellFood, { params: { amount } });
    }
  }
  // 3) Còn thiếu: vay nặng lãi trong hạn mức; quá hạn mức thì đành nhịn (khoản chi không thực hiện)
  if (h.money < 0) {
    const loan = Math.min(-h.money, headroom());
    if (loan > 0) {
      h.debt += loan;
      addLedger(h, Ledger.Borrow, loan, 0);
      if (!loggedThisYear(ctx, SystemLog.Borrow)) writeTemplate(ctx, SystemLog.Borrow, { params: { amount: Math.round(loan) } });
    }
    h.money = 0;
  }
}

/** Nợ quá ngưỡng: chủ nợ xiết tài sản (nhân quả "vay nặng lãi → mất ruộng"). */
function seizeForDebt(ctx: SimContext): void {
  const { content } = ctx;
  const sz = content.balance.economy.debt.seize;
  const h = playerHousehold(ctx);
  const prop = content.index.property.get(sz.property);
  const owned = h.properties[sz.property] ?? 0;
  if (!prop || h.debt <= sz.threshold || owned <= sz.keep_min) return;
  const relief = Math.min(h.debt, prop.value * sz.value_factor);
  h.properties[sz.property] = owned - 1;
  h.debt -= relief;
  writeTemplate(ctx, SystemLog.Seized, { params: { amount: Math.round(relief), title: prop.name } });
}

export function monthlyEconomy(ctx: SimContext): void {
  const { content, state } = ctx;
  const h = playerHousehold(ctx);
  const eco = content.balance.economy;

  const food = monthlyFoodNeed(ctx) * computeHousehold(ctx, StatTarget.FoodConsumption, 1).value;
  const money = monthlyMoneyNeed(ctx) * computeHousehold(ctx, StatTarget.LivingCost, 1).value;
  const livestock = holdingsOf(h, content).reduce((s, p) => s + p.type.upkeep_food_month * p.count, 0);
  h.food -= food + livestock;
  h.money -= money;
  addLedger(h, Ledger.Food, 0, -food);
  addLedger(h, Ledger.Livestock, 0, -livestock);
  addLedger(h, Ledger.Living, -money, 0);

  // Lao động dư: nhà nông (ít ruộng, đông người) đi làm thuê — mất ruộng vẫn còn đường sống;
  // nhà không tự cày thì mọi người trừ người lo việc chính đều phụ việc nghề nhà
  const ce = careerEconomy(ctx);
  const busy = ce.self_farm ? farmlandOf(h, content) * eco.harvest.full_workers_per_sao : eco.tenancy.business_runners;
  const spareWorkers = Math.max(0, workers(ctx).length - busy);
  const wages = Math.floor(spareWorkers) * (ce.family_wage_month ?? eco.harvest.spare_worker_wage_month);
  h.money += wages;
  addLedger(h, ce.self_farm ? Ledger.Wages : Ledger.FamilyWork, wages, 0);
  regularIncome(ctx);

  if (eco.harvest.months.includes(state.clock.month)) (ce.self_farm ? harvest : collectRent)(ctx);
  if (eco.tax.month === state.clock.month) tax(ctx);
  settle(ctx);
}

/** [1] Người chơi có đang là chủ hộ (người quyết chi tiêu, mua bán của nhà) không. */
export function isPlayerHead(ctx: SimContext): boolean {
  return householdHead(ctx)?.id === ctx.state.playerId;
}

/** [1] Mức sống hợp gia cảnh theo luật trong data (luật đầu tiên đúng thắng). */
export function autoLivingStandard(ctx: SimContext): string {
  const ls = ctx.content.balance.living_standards;
  const r = createResolver(ctx);
  return ls.auto_rules.find((rule) => evaluate(rule.condition, r))?.level ?? ls.default;
}

/** [1] Đầu năm: nhà tự lo (chủ hộ là NPC, hoặc chủ hộ để tự động) — chọn mức sống theo gia cảnh, trả nợ khi có dư. */
export function yearlyHousehold(ctx: SimContext): void {
  const { state, content } = ctx;
  const h = playerHousehold(ctx);
  const head = isPlayerHead(ctx);
  if (!head || state.autoManage.livingStandard) h.livingStandard = autoLivingStandard(ctx);
  if ((!head || state.autoManage.repayDebt) && h.debt > 0) {
    const keep = monthlyMoneyNeed(ctx) * content.balance.living_standards.auto_repay_keep_months;
    const amount = Math.min(h.debt, Math.max(0, h.money - keep));
    if (amount > 0) {
      h.money -= amount;
      h.debt -= amount;
      addLedger(h, Ledger.RepayDebt, -amount, 0);
    }
  }
}

/** Cuối năm: lãi nợ, bảo trì và thu nhập phụ của tài sản, chốt sổ. */
export function yearlyEconomy(ctx: SimContext): void {
  const { content, state } = ctx;
  const h = playerHousehold(ctx);
  const d = content.balance.economy.debt;
  // Lãi không đẩy nợ vượt trần: quá mức đó chủ nợ biết con nợ không trả nổi
  const interest = Math.max(0, Math.min(h.debt * d.annual_interest, d.interest_cap - h.debt));
  h.debt += interest;
  // Lãi cộng thẳng vào nợ (không trừ tiền mặt); vẫn ghi sổ để người chơi thấy nợ phình ra vì đâu
  addLedger(h, Ledger.Interest, -interest, 0);

  let upkeep = 0;
  let income = 0;
  for (const p of holdingsOf(h, content)) {
    upkeep += p.type.upkeep_money_year * p.count;
    income += p.type.income_money_year * p.count;
  }
  h.money += income - upkeep;
  addLedger(h, Ledger.Upkeep, -upkeep, 0);
  addLedger(h, Ledger.OtherIncome, income, 0);
  settle(ctx);
  seizeForDebt(ctx);

  state.ledgerHistory.push({
    year: state.clock.year,
    entries: h.ledger.map((e) => ({ ...e })),
    closing: { money: h.money, food: h.food, debt: h.debt },
  });
  const keep = content.balance.economy.ledger_history_years;
  if (state.ledgerHistory.length > keep) state.ledgerHistory.splice(0, state.ledgerHistory.length - keep);
  h.ledger = [];
}
