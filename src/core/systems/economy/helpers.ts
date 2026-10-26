// [0] Hàm tính kinh tế hộ dùng chung (không đọc modifier để tránh vòng lặp khi DSL hỏi household.food_months)
import type { IncomeSpec } from '@content/schemas';
import type { LedgerEntry } from '../../entities/Household';
import { farmlandOf, holdingsOf } from '../../entities/Property';
import type { SimContext } from '../context';
import { ageGroupOf, ageNow, aliveMembers, playerHousehold } from '../people';

/** Thóc cả hộ ăn trong một tháng theo mức sống hiện tại (hoặc mức chỉ định), chưa tính modifier. */
export function monthlyFoodNeed(ctx: SimContext, levelId?: string): number {
  const { content } = ctx;
  const h = playerHousehold(ctx);
  const level = content.index.livingStandard.get(levelId ?? h.livingStandard);
  if (!level) return 0;
  const byGroup = content.balance.economy.consumption_by_age_group;
  return aliveMembers(ctx, h).reduce((sum, c) => sum + level.food_per_member * (byGroup[ageGroupOf(ctx, ageNow(ctx, c))] ?? 1), 0);
}

/** Tiền sinh hoạt cả hộ trong một tháng theo mức sống (chưa tính modifier). */
export function monthlyMoneyNeed(ctx: SimContext, levelId?: string): number {
  const h = playerHousehold(ctx);
  const level = ctx.content.index.livingStandard.get(levelId ?? h.livingStandard);
  return level ? level.money_per_member * aliveMembers(ctx, h).length : 0;
}

/** [1.5] Chi phí cả năm của một mức sống (thóc quy theo giá gốc + tiền sinh hoạt), chưa tính modifier. */
export function levelYearCost(ctx: SimContext, levelId: string): number {
  const base = ctx.content.balance.economy.price.base;
  return 12 * (monthlyFoodNeed(ctx, levelId) * base + monthlyMoneyNeed(ctx, levelId));
}

export function workers(ctx: SimContext) {
  const hv = ctx.content.balance.economy.harvest;
  return aliveMembers(ctx).filter((c) => {
    const age = ageNow(ctx, c);
    return age >= hv.worker_min_age && age <= hv.worker_max_age;
  });
}

export function workerCount(ctx: SimContext): number {
  return workers(ctx).length;
}

/** [1.5] Người làm dư sức: nhà tự cày thì trừ phần ruộng cần người, nhà không tự cày thì trừ người lo nghề chính. */
export function spareWorkers(ctx: SimContext): number {
  const eco = ctx.content.balance.economy;
  const busy = selfFarms(ctx) ? farmlandOf(playerHousehold(ctx), ctx.content) * eco.harvest.full_workers_per_sao : eco.tenancy.business_runners;
  return Math.max(0, workerCount(ctx) - busy);
}

export function buyPrice(ctx: SimContext): number {
  return ctx.state.world.foodPrice * ctx.content.balance.economy.price.buy_factor;
}

export function sellPrice(ctx: SimContext): number {
  return ctx.state.world.foodPrice * ctx.content.balance.economy.price.sell_factor;
}

/** [1] Hệ số buôn bán của khu định cư nơi hộ sống (thị trấn bến sông buôn bán sầm uất hơn làng). */
export function localTradeFactor(ctx: SimContext): number {
  return ctx.content.index.settlementType.get(ctx.state.world.settlementType)?.trade_factor ?? 1;
}

/** [1] Cách hộ mưu sinh theo nghề của nhà (nghề người chơi, hoặc nghề xuất thân khi còn nhỏ). */
export function careerEconomy(ctx: SimContext) {
  return ctx.content.index.career.get(ctx.state.householdCareer)?.economy ?? { self_farm: true };
}

/** [1] Hộ có tự cày ruộng không (không thì ruộng phát canh thu tô). */
export function selfFarms(ctx: SimContext): boolean {
  return careerEconomy(ctx).self_farm;
}

/** [1] Tiền thu một tháng từ một nguồn thu đều đặn, với bậc kỹ năng cho trước. */
export function incomeOf(ctx: SimContext, spec: IncomeSpec, skillLevel: number): number {
  // [1.5] Lời theo vốn: tiền mặt bỏ vào buôn bán (có trần) sinh lời mỗi tháng
  const capital = spec.capital ? (Math.min(Math.max(0, playerHousehold(ctx).money), spec.capital.max) * spec.capital.rate_year) / 12 : 0;
  const base = spec.money_month + skillLevel * spec.per_level + capital;
  return spec.trade_scaled ? base * ctx.state.world.tradeIndex * localTradeFactor(ctx) : base;
}

/** Giá trị ròng của hộ: tiền mặt + [1.5] thóc trong kho (giá gốc) + giá trị tài sản − nợ. */
export function householdNetWorth(ctx: SimContext): number {
  const h = playerHousehold(ctx);
  const propValue = holdingsOf(h, ctx.content).reduce((s, p) => s + p.type.value * p.count, 0);
  return h.money + Math.max(0, h.food) * ctx.content.balance.economy.price.base + propValue - h.debt;
}

/** [1.5] Giá trị một dòng sổ (tiền + thóc quy theo giá gốc). */
export function ledgerValue(ctx: SimContext, e: LedgerEntry): number {
  return e.money + e.food * ctx.content.balance.economy.price.base;
}

/** [1.5] Thu nhập của một năm sổ: tổng các khoản "làm ra" (balance.economy.income_ledgers). */
export function incomeOfEntries(ctx: SimContext, entries: LedgerEntry[]): number {
  const kinds = ctx.content.balance.economy.income_ledgers;
  return Math.max(0, entries.filter((e) => kinds.includes(e.category)).reduce((s, e) => s + ledgerValue(ctx, e), 0));
}

/** [1.5] Thu nhập năm vừa chốt sổ (chưa chốt năm nào thì tính phần đã làm ra trong năm nay). */
export function lastYearIncome(ctx: SimContext): number {
  const last = ctx.state.ledgerHistory[ctx.state.ledgerHistory.length - 1];
  return last ? last.income : incomeOfEntries(ctx, playerHousehold(ctx).ledger);
}
