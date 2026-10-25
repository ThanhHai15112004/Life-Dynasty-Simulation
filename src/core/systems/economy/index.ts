// [0] Kinh tế hộ: thu chi, thu hoạch, thuế, nợ, giá lúa trôi theo mùa (GDD 03 §5, §9)
import { interpolate } from '@shared/curve';
import { addLedger } from '../../entities/Household';
import { farmlandOf, holdingsOf } from '../../entities/Property';
import { StatTarget } from '../../engine/statTargets';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { writeTemplate } from '../../events/journal';
import { RngStream, type SimContext } from '../context';
import { computeHousehold } from '../modifiers';
import { ageNow, aliveMembers, playerHousehold } from '../people';
import { buyPrice, monthlyFoodNeed, monthlyMoneyNeed, sellPrice, workers } from './helpers';

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
  writeTemplate(ctx, q.harvest_log, { params: { amount, sao } });
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

  // Lao động dư (ít ruộng, đông người) đi làm thuê — mất ruộng vẫn còn đường sống
  const spareWorkers = Math.max(0, workers(ctx).length - farmlandOf(h, content) * eco.harvest.full_workers_per_sao);
  const wages = Math.floor(spareWorkers) * eco.harvest.spare_worker_wage_month;
  h.money += wages;
  addLedger(h, Ledger.Wages, wages, 0);

  if (eco.harvest.months.includes(state.clock.month)) harvest(ctx);
  if (eco.tax.month === state.clock.month) tax(ctx);
  settle(ctx);
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
