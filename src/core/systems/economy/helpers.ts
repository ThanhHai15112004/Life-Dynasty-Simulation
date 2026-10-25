// [0] Hàm tính kinh tế hộ dùng chung (không đọc modifier để tránh vòng lặp khi DSL hỏi household.food_months)
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
