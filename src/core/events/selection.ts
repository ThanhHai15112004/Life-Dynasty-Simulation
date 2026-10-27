// [0] Lọc sự kiện/mẫu nhật ký đủ điều kiện và gán vai trò từ nhân vật thật (GDD 05 §1–2)
import type { Condition, RoleSpec, WeightModifier } from '@content/schemas';
import type { Character } from '../entities/Character';
import { evaluate } from '../engine/RuleEvaluator';
import { RngStream, type SimContext } from '../systems/context';
import { currentFateMode } from '../systems/life';
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
  const extendedKin =
    spec.relation === 'father' || spec.relation === 'mother' || spec.relation === 'parent' || spec.relation === 'sibling';
  const source = extendedKin ? Object.values(ctx.state.characters).filter((c) => c.alive) : aliveMembers(ctx);
  return source.filter((c) => {
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

/** Bộ phân giải không vai trò, dùng chung trong một lượt tính (đọc trạng thái trực tiếp nên không bị cũ). */
const baseResolverCache = new WeakMap<SimContext, ReturnType<typeof createResolver>>();
function baseResolver(ctx: SimContext): ReturnType<typeof createResolver> {
  let r = baseResolverCache.get(ctx);
  if (!r) {
    r = createResolver(ctx);
    baseResolverCache.set(ctx, r);
  }
  return r;
}

/** Điều kiện có nhắc tới vai trò (role.*) không — không nhắc thì xét được trước khi gán vai trò. */
const roleRefCache = new WeakMap<Condition, boolean>();
function referencesRoles(cond: Condition): boolean {
  const cached = roleRefCache.get(cond);
  if (cached !== undefined) return cached;
  let out: boolean;
  if ('all' in cond) out = cond.all.some(referencesRoles);
  else if ('any' in cond) out = cond.any.some(referencesRoles);
  else if ('not' in cond) out = referencesRoles(cond.not);
  else if ('var' in cond) out = cond.var.startsWith('role.');
  else if ('role' in cond) out = true;
  else if ('has_trait' in cond) out = cond.who !== undefined && cond.who !== 'player';
  else out = false;
  roleRefCache.set(cond, out);
  return out;
}

/** Kiểm tra đủ điều kiện (không tính cooldown) và trả về vai trò đã gán. */
export function eligibleRoles(ctx: SimContext, item: Selectable, preset: Record<string, string> = {}): Record<string, string> | null {
  const { state } = ctx;
  const stage = lifeStageOf(ctx, ageNow(ctx, player(ctx))).id;
  if (item.life_stages && !item.life_stages.includes(stage)) return null;
  if (item.months && !item.months.includes(state.clock.month)) return null;
  // Điều kiện không cần vai trò thì xét trước: tránh gán vai trò cho hàng trăm mẫu không đủ điều kiện
  const early = item.condition !== undefined && !referencesRoles(item.condition);
  if (early && !evaluate(item.condition, baseResolver(ctx))) return null;
  const roles = bindRoles(ctx, item.roles, preset);
  if (!roles) return null;
  if (early) return roles;
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

  // [2] Hệ số Chế độ số phận & Đỡ xui (Bad-luck protection)
  const blp = content.balance.director.bad_luck_protection;
  const isBad = item.tags.some((t) => blp.bad_tags.includes(t));
  const isSalvation = item.tags.some((t) => blp.salvation_tags.includes(t));
  if (isBad) {
    w *= currentFateMode(ctx).bad_event_factor;
  }
  if ((state.badLuckCounter ?? 0) >= blp.consecutive_bad_threshold) {
    if (isSalvation && !isBad) w *= blp.salvation_event_boost;
    if (isBad) w *= blp.bad_event_dampen;
  }
  return w;
}
