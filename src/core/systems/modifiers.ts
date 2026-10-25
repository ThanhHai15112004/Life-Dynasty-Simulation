// [0] Gom mọi modifier đang tác động lên một nhân vật — một nơi duy nhất để UI giải thích "vì sao"
import type { ModifierDef } from '@content/schemas';
import { computeTarget, type Modifier, type ModifierResult } from '../engine/ModifierSystem';
import { evaluate } from '../engine/RuleEvaluator';
import { holdingsOf } from '../entities/Property';
import type { SimContext } from './context';
import { playerHousehold } from './people';
import { createResolver } from './resolver';

function fromDef(def: ModifierDef, sourceId: string, label: string, count = 1, scale = 1): Modifier {
  let value = def.value;
  const n = def.per_unit ? count : 1;
  if (def.op === 'add') value = value * n * scale;
  else value = 1 + (value - 1) * n * scale;
  return { sourceId, label, target: def.target, value, op: def.op };
}

export function gatherModifiers(ctx: SimContext, characterId: string): Modifier[] {
  const { state, content } = ctx;
  const c = state.characters[characterId];
  if (!c) return [];
  const out: Modifier[] = [...c.modifiers];

  for (const tId of c.traits) {
    const t = content.index.trait.get(tId);
    t?.modifiers.forEach((m) => out.push(fromDef(m, `trait:${t.id}`, t.name)));
  }

  for (const d of c.diseases ?? []) {
    const def = content.index.disease.get(d.id);
    def?.modifiers.forEach((m) => out.push(fromDef(m, `disease:${def.id}`, def.name)));
  }

  const inPlayerHousehold = c.householdId === state.householdId;
  const isPlayer = c.id === state.playerId;

  if (inPlayerHousehold) {
    const h = playerHousehold(ctx);
    const level = content.index.livingStandard.get(h.livingStandard);
    level?.modifiers.forEach((m) => out.push(fromDef(m, `living:${level.id}`, level.name)));
    for (const hold of holdingsOf(h, content)) {
      hold.type.modifiers.forEach((m) => out.push(fromDef(m, `property:${hold.type.id}`, hold.type.name, hold.count)));
    }
  }

  if (isPlayer) {
    const primary = content.index.focus.get(state.focus.primary);
    primary?.modifiers.forEach((m) => out.push(fromDef(m, `focus:${primary.id}`, primary.name)));
    const secondary = state.focus.secondary ? content.index.focus.get(state.focus.secondary) : undefined;
    const f = content.balance.skills.secondary_focus_factor;
    secondary?.modifiers.forEach((m) => out.push(fromDef(m, `focus2:${secondary.id}`, secondary.name, 1, f)));

    const career = content.index.career.get(state.career.id);
    const rank = career?.ranks[state.career.rankIndex];
    rank?.modifiers.forEach((m) => out.push(fromDef(m, `career:${career!.id}:${rank.id}`, `${career!.name} (${rank.name})`)));

    const civ = content.index.civilization.get(state.civilization.id) ?? content.civilizations[0];
    const deg = civ?.exam_degrees.find((d) => d.id === state.civilization.examDegree);
    deg?.modifiers.forEach((m) => out.push(fromDef(m, `degree:${deg.id}`, deg.name)));
  }

  if (inPlayerHousehold) {
    const r = createResolver(ctx, { self: c.id });
    for (const cm of content.balance.modifiers.conditional) {
      if (cm.applies_to === 'player' && !isPlayer) continue;
      if (!evaluate(cm.condition, r)) continue;
      out.push({ sourceId: `cond:${cm.id}`, label: cm.label, target: cm.target, value: cm.value, op: cm.op });
    }
  }
  return out;
}

export function computeFor(ctx: SimContext, characterId: string, target: string, base: number): ModifierResult {
  return computeTarget(gatherModifiers(ctx, characterId), target, base);
}

/** Chỉ số cấp hộ (sản lượng, chi tiêu) tính qua modifier của người chơi — người chơi là "ý chí của hộ". */
export function computeHousehold(ctx: SimContext, target: string, base: number): ModifierResult {
  return computeFor(ctx, ctx.state.playerId, target, base);
}
