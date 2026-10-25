// [0] Lọc sự kiện/mẫu nhật ký đủ điều kiện và gán vai trò từ nhân vật thật (GDD 05 §1–2)
import type { Condition, RoleSpec, WeightModifier } from '@content/schemas';
import type { Character } from '../entities/Character';
import { evaluate } from '../engine/RuleEvaluator';
import { RngStream, type SimContext } from '../systems/context';
import { ageNow, aliveMembers, lifeStageOf, player, relationToPlayer, villageNpc } from '../systems/people';
import { createResolver } from '../systems/resolver';

/** Phần chung giữa sự kiện quyết định và mẫu nhật ký thường. */
export interface Selectable {
  id: string;
  tags: string[];
  life_stages?: string[];
  months?: number[];
  condition?: Condition;
  roles: RoleSpec[];
  weight: number;
  weight_modifiers: WeightModifier[];
  cooldown_years: number;
  once_per_life: boolean;
}

type History = Record<string, { lastMonthIndex: number; count: number }>;

function candidates(ctx: SimContext, spec: RoleSpec): Character[] {
  const me = player(ctx);
  if (spec.from === 'village') {
    const c = spec.village_role ? villageNpc(ctx, spec.village_role) : undefined;
    return c ? [c] : [];
  }
  return aliveMembers(ctx).filter((c) => {
    if (c.id === me.id) return false;
    const rel = relationToPlayer(ctx, c);
    switch (spec.relation) {
      case 'father':
        return rel === 'father';
      case 'mother':
        return rel === 'mother';
      case 'parent':
        return rel === 'father' || rel === 'mother';
      case 'sibling':
        return rel === 'older_sibling' || rel === 'younger_sibling';
      case 'spouse':
        return rel === 'spouse';
      case 'child':
        return rel === 'child';
      default:
        return true;
    }
  });
}

/** Gán vai trò; trả null nếu thiếu vai trò bắt buộc. */
export function bindRoles(ctx: SimContext, specs: readonly RoleSpec[], preset: Record<string, string> = {}): Record<string, string> | null {
  const roles: Record<string, string> = {};
  const rng = ctx.rng.get(RngStream.Director);
  for (const spec of specs) {
    const presetId = preset[spec.id];
    if (presetId && ctx.state.characters[presetId]?.alive) {
      roles[spec.id] = presetId;
      continue;
    }
    const used = new Set(Object.values(roles));
    const pool = candidates(ctx, spec).filter(
      (c) => !used.has(c.id) && evaluate(spec.condition, createResolver(ctx, { self: c.id, roles })),
    );
    if (pool.length === 0) {
      if (spec.optional) continue;
      return null;
    }
    const byAge = [...pool].sort((a, b) => ageNow(ctx, b) - ageNow(ctx, a));
    const chosen = spec.pick === 'oldest' ? byAge[0] : spec.pick === 'youngest' ? byAge[byAge.length - 1] : rng.pick(pool);
    roles[spec.id] = chosen.id;
  }
  return roles;
}

export function onCooldown(ctx: SimContext, item: Selectable, history: History): boolean {
  const h = history[item.id];
  if (!h) return false;
  if (item.once_per_life) return true;
  const months = item.cooldown_years * ctx.content.balance.calendar.months_per_year;
  return ctx.state.clock.monthIndex - h.lastMonthIndex < months;
}

/** Kiểm tra đủ điều kiện (không tính cooldown) và trả về vai trò đã gán. */
export function eligibleRoles(ctx: SimContext, item: Selectable, preset: Record<string, string> = {}): Record<string, string> | null {
  const { state } = ctx;
  const stage = lifeStageOf(ctx, ageNow(ctx, player(ctx))).id;
  if (item.life_stages && !item.life_stages.includes(stage)) return null;
  if (item.months && !item.months.includes(state.clock.month)) return null;
  const roles = bindRoles(ctx, item.roles, preset);
  if (!roles) return null;
  return evaluate(item.condition, createResolver(ctx, { roles })) ? roles : null;
}

/** Trọng số = cơ bản × modifier hoàn cảnh × bộ lọc sự kiện của Focus (GDD 01 §5), nghề nhà và nơi ở. */
export function weightOf(ctx: SimContext, item: Selectable, roles: Record<string, string>): number {
  const { state, content } = ctx;
  const r = createResolver(ctx, { roles });
  let w = item.weight;
  for (const wm of item.weight_modifiers) if (evaluate(wm.condition, r)) w *= wm.factor;
  const scaleFocus = (focusId: string | null, scale: number) => {
    const f = focusId ? content.index.focus.get(focusId) : undefined;
    if (!f) return;
    for (const tag of item.tags) {
      const fw = f.event_weights[tag];
      if (fw !== undefined) w *= 1 + (fw - 1) * scale;
    }
  };
  scaleFocus(state.focus.primary, 1);
  const scaleTags = (weights: Record<string, number> | undefined) => {
    if (weights) for (const tag of item.tags) w *= weights[tag] ?? 1;
  };
  scaleTags(content.index.career.get(state.career.id)?.event_weights);
  scaleTags(content.index.settlementType.get(state.world.settlementType)?.event_weights);
  return w;
}
