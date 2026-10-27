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
import { careerSeniorityFactor, memberMonthlyCareerIncome, playerSectorMonths } from '../career';
import { currentFateMode } from '../life';
import { ageNow, aliveMembers, householdHead, player, playerHousehold } from '../people';
import { createResolver } from '../resolver';
import {
  buyPrice,
  careerEconomy,
  householdNetWorth,
  incomeOf,
  incomeOfEntries,
  levelYearCost,
  monthlyFoodNeed,
  monthlyMoneyNeed,
  sellPrice,
  spareWorkers,
  workers,
} from './helpers';
import { earnPersonal, monthlyPurse, yearlyPurse } from './purse';
import { yearlyNpcLoans, yearlyVentures } from './ventures';

export * from './helpers';
export * from './purse';
export * from './ventures';

function quality(ctx: SimContext) {
  const { content, state } = ctx;
  return content.index.harvestQuality.get(state.world.harvestQuality) ?? content.balance.economy.harvest_qualities[0];
}

/** Đầu năm: trời định được hay mất mùa (ẩn với người chơi, lộ dần qua thời tiết, giá, tin đồn). */
export function rollHarvestQuality(ctx: SimContext): void {
  const disasterFactor = currentFateMode(ctx).disaster_factor;
  const q = ctx.rng.get(RngStream.World).weighted(ctx.content.balance.economy.harvest_qualities, (x) =>
    x.yield_factor < 1 ? x.weight * disasterFactor : x.weight,
  );
  if (q) {
    ctx.state.world.harvestQuality = q.id;
    if (q.yield_factor < 0.85) {
      ctx.state.badLuckCounter = (ctx.state.badLuckCounter ?? 0) + 1;
    } else if (q.yield_factor > 1.1) {
      ctx.state.badLuckCounter = Math.max(0, (ctx.state.badLuckCounter ?? 0) - 1);
    }
  }
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

/** [1] Các khoản thu đều đặn trong tháng: nghề nhà (kỹ năng theo người giỏi nhất trong hộ, nhân hệ số thâm niên ngành) và Focus chính (kỹ năng người chơi). */
export function regularIncomeParts(ctx: SimContext): { ledger: string; money: number; personal: boolean }[] {
  const { content, state } = ctx;
  const parts: { ledger: string; money: number; personal: boolean }[] = [];
  const ce = careerEconomy(ctx);
  if (ce.income) {
    const skill = ce.income.skill;
    const level = skill ? aliveMembers(ctx).reduce((m, c) => Math.max(m, c.skills[skill]?.level ?? 0), 0) : 0;
    const homeDef = content.index.career.get(state.householdCareer);
    const head = householdHead(ctx);
    const sectorMonths =
      head?.id === state.playerId ? playerSectorMonths(ctx, homeDef) : (head?.careerMonths ?? 0);
    const seniorityFactor = careerSeniorityFactor(ctx, sectorMonths);
    parts.push({ ledger: ce.income.ledger, money: incomeOf(ctx, ce.income, level) * seniorityFactor, personal: false });
  }
  const focus = content.index.focus.get(state.focus.primary);
  if (focus?.income && evaluate(focus.condition, createResolver(ctx))) {
    const skill = focus.income.skill;
    // [1.5] Thu nhập theo trọng tâm là tiền người chơi tự làm ra: chưa làm chủ hộ thì vào túi riêng
    parts.push({ ledger: focus.income.ledger, money: incomeOf(ctx, focus.income, skill ? (player(ctx).skills[skill]?.level ?? 0) : 0), personal: true });
  }
  return parts;
}

function regularIncome(ctx: SimContext): void {
  const h = playerHousehold(ctx);
  for (const part of regularIncomeParts(ctx)) {
    if (part.personal) {
      earnPersonal(ctx, part.ledger, part.money);
      continue;
    }
    h.money += part.money;
    addLedger(h, part.ledger, part.money, 0);
  }
}

function tax(ctx: SimContext): void {
  const { content } = ctx;
  const t = content.balance.economy.tax;
  const h = playerHousehold(ctx);
  const adults = aliveMembers(ctx, h).filter((c) => ageNow(ctx, c) >= content.balance.life.adult_age).length;
  // [1.5] Ruộng phát canh: tá điền gánh một phần thuế điền, chủ ruộng nộp ít hơn
  const perSao = careerEconomy(ctx).self_farm ? t.food_per_sao : t.food_per_sao_tenanted;
  const food = Math.round(farmlandOf(h, content) * perSao);
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
    if (bought < need && !loggedThisYear(ctx, SystemLog.Starving)) {
      ctx.state.badLuckCounter = (ctx.state.badLuckCounter ?? 0) + 1;
      writeTemplate(ctx, SystemLog.Starving);
    }
  }
  // 1b) Hộ không tự cày: có tiền thì đong thóc dự trữ vài tháng (không vay để tích trữ);
  // [1.5] giữ lại tiền tiêu reserve_cash_months tháng, không dốc sạch túi rồi tháng sau lại phải vay
  if (!careerEconomy(ctx).self_farm) {
    const want = monthlyFoodNeed(ctx) * eco.tenancy.food_reserve_months - h.food;
    const price = buyPrice(ctx);
    const spendable = Math.max(0, h.money - monthlyMoneyNeed(ctx) * eco.tenancy.reserve_cash_months);
    const amount = price > 0 ? Math.min(want, spendable / price) : 0;
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
      if (!loggedThisYear(ctx, SystemLog.Borrow)) {
        ctx.state.badLuckCounter = (ctx.state.badLuckCounter ?? 0) + 1;
        writeTemplate(ctx, SystemLog.Borrow, { params: { amount: Math.ceil(loan) } });
      }
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
  ctx.state.badLuckCounter = (ctx.state.badLuckCounter ?? 0) + 1;
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

  // Lao động dư & [5] Nghề của người nhà: người nhà có nghề riêng khác nghề nhà thì đóng góp theo nghề đó;
  // người nhà cùng nghề nhà (hoặc dư sức cày cấy) thì phụ việc nghề nhà / đi làm thuê
  const ce = careerEconomy(ctx);
  const adultAge = content.balance.life.adult_age;
  const distinctCareerMembers = aliveMembers(ctx, h).filter(
    (c) => c.id !== state.playerId && ageNow(ctx, c) >= adultAge && c.careerId && c.careerId !== state.householdCareer,
  );
  const distinctCareerIncome = distinctCareerMembers.reduce((sum, c) => sum + memberMonthlyCareerIncome(ctx, c), 0);
  const spareCount = Math.max(0, Math.floor(spareWorkers(ctx)) - distinctCareerMembers.length);
  const wages = spareCount * (ce.family_wage_month ?? eco.harvest.spare_worker_wage_month);
  if (wages > 0) {
    h.money += wages;
    addLedger(h, ce.self_farm ? Ledger.Wages : Ledger.FamilyWork, wages, 0);
  }
  if (distinctCareerIncome > 0) {
    h.money += distinctCareerIncome;
    addLedger(h, Ledger.FamilyWork, distinctCareerIncome, 0);
  }
  regularIncome(ctx);

  if (eco.harvest.months.includes(state.clock.month)) {
    (ce.self_farm ? harvest : collectRent)(ctx);
    sellSurplus(ctx);
  }
  if (eco.tax.month === state.clock.month) tax(ctx);
  monthlyPurse(ctx);
  settle(ctx);
  monthlyDebt(ctx);
}

/**
 * [1.5] Nợ tính lãi theo tháng (lãi năm / 12, không vượt trần) và có dư là trả ngay trong tháng —
 * không còn cảnh trong rương nhiều tiền mà sổ vẫn treo nợ cả năm.
 */
function monthlyDebt(ctx: SimContext): void {
  const d = ctx.content.balance.economy.debt;
  const h = playerHousehold(ctx);
  if (h.debt <= 0) return;
  const interest = Math.max(0, Math.min((h.debt * d.annual_interest) / 12, d.interest_cap - h.debt));
  h.debt += interest;
  // Lãi cộng thẳng vào nợ (không trừ tiền mặt); vẫn ghi sổ để người chơi thấy nợ phình ra vì đâu
  addLedger(h, Ledger.Interest, -interest, 0);
  if (!autoOn(ctx, 'repayDebt')) return;
  const keep = (levelYearCost(ctx, h.livingStandard) / 12) * d.repay_keep_months;
  const amount = Math.min(h.debt, Math.max(0, h.money - keep));
  if (amount <= 0) return;
  h.money -= amount;
  h.debt -= amount;
  if (h.loans && h.loans.length > 0) {
    let rem = amount;
    for (const l of h.loans) {
      if (l.kind !== 'borrowed' || rem <= 0) continue;
      const cut = Math.min(l.amount, rem);
      l.amount = Math.max(0, Math.round((l.amount - cut) * 10) / 10);
      rem -= cut;
    }
    h.loans = h.loans.filter((l) => l.kind !== 'borrowed' || l.amount > 0.05);
  }
  addLedger(h, Ledger.RepayDebt, -amount, 0);
}

/** [1] Người chơi có đang là chủ hộ (người quyết chi tiêu, mua bán của nhà) không. */
export function isPlayerHead(ctx: SimContext): boolean {
  return householdHead(ctx)?.id === ctx.state.playerId;
}

/** [1.5] Việc này nhà tự lo: chưa làm chủ hộ thì luôn tự lo, làm chủ rồi thì theo công tắc của chủ hộ. */
function autoOn(ctx: SimContext, key: keyof SimContext['state']['autoManage']): boolean {
  return !isPlayerHead(ctx) || ctx.state.autoManage[key];
}

/** [1.5] Sau vụ gặt / thu tô: bán phần thóc vượt mức dự trữ để của cải thành tiền (không ôm thóc vô hạn). */
function sellSurplus(ctx: SimContext): void {
  if (!autoOn(ctx, 'sellSurplus')) return;
  const h = playerHousehold(ctx);
  const amount = Math.floor(h.food - monthlyFoodNeed(ctx) * ctx.content.balance.economy.surplus_keep_months);
  const price = sellPrice(ctx);
  if (amount <= 0 || price <= 0) return;
  h.food -= amount;
  h.money += amount * price;
  addLedger(h, Ledger.SellFood, amount * price, -amount);
  writeTemplate(ctx, SystemLog.SurplusSold, { params: { amount, money: Math.round(amount * price) } });
}

/** [1.5] Đầu năm: có dư thì mua thêm của (luật trong economy.auto_invest, mỗi năm một món). */
function autoInvest(ctx: SimContext): void {
  if (!autoOn(ctx, 'invest')) return;
  const { content } = ctx;
  const h = playerHousehold(ctx);
  const r = createResolver(ctx);
  const monthCost = levelYearCost(ctx, h.livingStandard) / 12;
  for (const rule of content.balance.economy.auto_invest) {
    const p = content.index.property.get(rule.property);
    if (!p?.buyable || !evaluate(rule.condition, r)) continue;
    if (h.money - p.value < monthCost * rule.keep_months) continue;
    h.money -= p.value;
    h.properties[p.id] = (h.properties[p.id] ?? 0) + 1;
    addLedger(h, Ledger.BuyProperty, -p.value, 0);
    writeTemplate(ctx, SystemLog.AutoInvest, { params: { title: p.name, money: Math.round(p.value) } });
    return;
  }
}

/**
 * [1.5] Mức sống theo ngân sách (kiểu 1in8b): bậc cao nhất mà chi phí cả năm không vượt
 * một phần thu nhập năm qua cộng một phần của để dành. Chưa chốt sổ năm nào thì giữ nguyên.
 */
export function autoLivingStandard(ctx: SimContext): string {
  const { content, state } = ctx;
  const ls = content.balance.living_standards;
  const b = ls.auto_budget;
  const h = playerHousehold(ctx);
  const last = state.ledgerHistory[state.ledgerHistory.length - 1];
  if (!last) return h.livingStandard;
  const savings = Math.max(0, h.money) + Math.max(0, h.food) * content.balance.economy.price.base;
  const budget = b.income_share * last.income + b.wealth_share * savings;
  const capIndex = h.debt > 0 ? ls.levels.findIndex((l) => l.id === b.debt_cap_level) : ls.levels.length - 1;
  const options = ls.levels.filter((l, i) => !b.manual_only.includes(l.id) && i <= capIndex);
  let pick = options[0]?.id ?? ls.default;
  for (const l of options) if (levelYearCost(ctx, l.id) <= budget) pick = l.id;
  return pick;
}

/** [1] Đầu năm: nhà tự lo (chủ hộ là NPC, hoặc chủ hộ để tự động) — chọn mức sống theo ngân sách, [1.5] mua thêm của khi có dư (trả nợ nay làm hằng tháng). */
export function yearlyHousehold(ctx: SimContext): void {
  const { state, content } = ctx;
  const h = playerHousehold(ctx);
  const head = isPlayerHead(ctx);
  state.yearOpenNetWorth = householdNetWorth(ctx);
  if (!head || state.autoManage.livingStandard) h.livingStandard = autoLivingStandard(ctx);
  autoInvest(ctx);
}

/** Cuối năm: việc làng, việc họ — phần cố định + theo số người + theo phần của vượt ngưỡng. */
function yearlyObligations(ctx: SimContext): void {
  const ob = ctx.content.balance.economy.obligations;
  const h = playerHousehold(ctx);
  const members = h.memberIds.filter((id) => ctx.state.characters[id]?.alive).length;
  const cost =
    ob.base_money_year + ob.per_member_money_year * members + ob.wealth_rate * Math.max(0, householdNetWorth(ctx) - ob.wealth_threshold);
  if (cost <= 0) return;
  h.money -= cost;
  addLedger(h, Ledger.Obligations, -cost, 0);
}

/** Cuối năm: bảo trì và thu nhập phụ của tài sản, chốt sổ ([1.5] lãi nợ nay tính hằng tháng). */
export function yearlyEconomy(ctx: SimContext): void {
  const { content, state } = ctx;
  const h = playerHousehold(ctx);
  let upkeep = 0;
  let income = 0;
  for (const p of holdingsOf(h, content)) {
    upkeep += p.type.upkeep_money_year * p.count;
    income += p.type.income_money_year * p.count;
  }
  h.money += income - upkeep;
  addLedger(h, Ledger.Upkeep, -upkeep, 0);
  addLedger(h, Ledger.OtherIncome, income, 0);
  yearlyObligations(ctx);
  yearlyVentures(ctx);
  yearlyNpcLoans(ctx);
  settle(ctx);
  seizeForDebt(ctx);

  state.ledgerHistory.push({
    year: state.clock.year,
    entries: h.ledger.map((e) => ({ ...e })),
    closing: { money: h.money, food: h.food, debt: h.debt },
    netWorth: householdNetWorth(ctx),
    openNetWorth: state.yearOpenNetWorth,
    income: incomeOfEntries(ctx, h.ledger),
  });
  const keep = content.balance.economy.ledger_history_years;
  if (state.ledgerHistory.length > keep) state.ledgerHistory.splice(0, state.ledgerHistory.length - keep);
  h.ledger = [];
  yearlyPurse(ctx);
}
