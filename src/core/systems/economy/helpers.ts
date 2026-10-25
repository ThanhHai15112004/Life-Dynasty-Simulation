// [0] Hàm tính kinh tế hộ dùng chung (không đọc modifier để tránh vòng lặp khi DSL hỏi household.food_months)
import type { IncomeSpec } from '@content/schemas';
import { holdingsOf } from '../../entities/Property';
import type { SimContext } from '../context';
import { ageGroupOf, ageNow, aliveMembers, playerHousehold } from '../people';

/** Thóc cả hộ ăn trong một tháng theo mức sống hiện tại (chưa tính modifier). */
export function monthlyFoodNeed(ctx: SimContext): number {
  const { content } = ctx;
  const h = playerHousehold(ctx);
  const level = content.index.livingStandard.get(h.livingStandard);
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
  return ctx.content.index.career.get(ctx.state.career.id)?.economy ?? { self_farm: true };
}

/** [1] Hộ có tự cày ruộng không (không thì ruộng phát canh thu tô). */
export function selfFarms(ctx: SimContext): boolean {
  return careerEconomy(ctx).self_farm;
}

/** [1] Tiền thu một tháng từ một nguồn thu đều đặn, với bậc kỹ năng cho trước. */
export function incomeOf(ctx: SimContext, spec: IncomeSpec, skillLevel: number): number {
  const base = spec.money_month + skillLevel * spec.per_level;
  return spec.trade_scaled ? base * ctx.state.world.tradeIndex * localTradeFactor(ctx) : base;
}

/** Giá trị ròng của hộ (tiền mặt + giá trị tài sản − nợ). */
export function householdNetWorth(ctx: SimContext): number {
  const h = playerHousehold(ctx);
  const propValue = holdingsOf(h, ctx.content).reduce((s, p) => s + p.type.value * p.count, 0);
  return h.money + propValue - h.debt;
}
