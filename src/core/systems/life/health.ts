// [0] Sức khỏe & stress: trôi mỗi tháng theo tổng modifier (mức sống, mùa, Focus, tuổi, nợ...)
import { clamp, interpolate } from '@shared/curve';
import type { Character } from '../../entities/Character';
import { tickStoredModifiers } from '../../engine/ModifierSystem';
import { StatTarget } from '../../engine/statTargets';
import type { SimContext } from '../context';
import { computeFor } from '../modifiers';
import { ageNow, aliveMembers } from '../people';

export function healthCap(ctx: SimContext, c: Character): number {
  const h = ctx.content.balance.life.health;
  return Math.min(h.max, interpolate(h.cap_by_age, 'age', 'cap', ageNow(ctx, c)));
}

export function monthlyHealth(ctx: SimContext): void {
  const stressMax = ctx.content.balance.life.stress.max;
  for (const c of aliveMembers(ctx)) {
    const dh = computeFor(ctx, c.id, StatTarget.HealthMonthly, 0).value;
    const ds = computeFor(ctx, c.id, StatTarget.StressMonthly, 0).value;
    c.health = clamp(c.health + dh, 0, healthCap(ctx, c));
    c.stress = clamp(c.stress + ds, 0, stressMax);
    c.modifiers = tickStoredModifiers(c.modifiers);
  }
}
