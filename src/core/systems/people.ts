// [0] Tra cứu người: người chơi, hộ, giai đoạn đời, cách gọi tên (R11)
import { fillTemplate } from '@shared/template';
import { ageOf, fullName, type Character } from '../entities/Character';
import type { Household } from '../entities/Household';
import type { SimContext } from './context';

export function player(ctx: SimContext): Character {
  return ctx.state.characters[ctx.state.playerId];
}

export function playerHousehold(ctx: SimContext): Household {
  return ctx.state.households[ctx.state.householdId];
}

export function ageNow(ctx: SimContext, c: Character): number {
  return ageOf(c, ctx.state.clock.year, ctx.state.clock.month);
}

export function aliveMembers(ctx: SimContext, h: Household = playerHousehold(ctx)): Character[] {
  return h.memberIds.map((id) => ctx.state.characters[id]).filter((c) => c?.alive);
}

export function lifeStageOf(ctx: SimContext, age: number) {
  const stages = [...ctx.content.balance.life.life_stages].sort((a, b) => a.min_age - b.min_age);
  let current = stages[0];
  for (const s of stages) if (age >= s.min_age) current = s;
  return current;
}

export function ageGroupOf(ctx: SimContext, age: number): string {
  const groups = [...ctx.content.balance.life.age_groups].sort((a, b) => a.max_age - b.max_age);
  return (groups.find((g) => age <= g.max_age) ?? groups[groups.length - 1]).id;
}

/** Chủ hộ: người lớn nhiều tuổi nhất còn sống trong hộ. */
export function householdHead(ctx: SimContext, h: Household = playerHousehold(ctx)): Character | undefined {
  const members = aliveMembers(ctx, h);
  const adults = members.filter((c) => ageNow(ctx, c) >= ctx.content.balance.life.adult_age);
  const pool = adults.length > 0 ? adults : members;
  return pool.sort((a, b) => ageNow(ctx, b) - ageNow(ctx, a))[0];
}

export type Relation =
  | 'self'
  | 'father'
  | 'mother'
  | 'older_sibling'
  | 'younger_sibling'
  | 'spouse'
  | 'child'
  | 'village'
  | 'other';

export function relationToPlayer(ctx: SimContext, c: Character): Relation {
  const p = player(ctx);
  if (c.id === p.id) return 'self';
  if (p.spouseId === c.id || c.spouseId === p.id) return 'spouse';
  if (c.fatherId === p.id || c.motherId === p.id) return 'child';
  if (p.fatherId === c.id) return 'father';
  if (p.motherId === c.id) return 'mother';
  const sameParents = (c.fatherId && c.fatherId === p.fatherId) || (c.motherId && c.motherId === p.motherId);
  if (sameParents) {
    const older = c.birthYear * 12 + c.birthMonth < p.birthYear * 12 + p.birthMonth;
    return older ? 'older_sibling' : 'younger_sibling';
  }
  if (c.villageRole) return 'village';
  return 'other';
}

/** Cách người chơi gọi nhân vật này, theo mẫu trong data/cultures. */
export function callOf(ctx: SimContext, c: Character): string {
  const culture = ctx.content.index.culture.get(ctx.state.cultureId);
  if (!culture) return c.givenName;
  const tokens = (path: string) => (path === 'given' ? c.givenName : path === 'family' ? c.familyName : undefined);
  const rel = relationToPlayer(ctx, c);
  const k = culture.kin_calls;
  switch (rel) {
    case 'self':
      return fullName(c);
    case 'father':
      return fillTemplate(k.father, tokens);
    case 'mother':
      return fillTemplate(k.mother, tokens);
    case 'older_sibling':
      return fillTemplate(c.sex === 'm' ? k.older_m : k.older_f, tokens);
    case 'younger_sibling':
      return fillTemplate(k.younger, tokens);
    case 'spouse':
      return fillTemplate(c.sex === 'm' ? k.husband : k.wife, tokens);
    case 'child':
      return fillTemplate(c.sex === 'm' ? k.son : k.daughter, tokens);
    case 'village': {
      const role = culture.village_roles[c.villageRole ?? ''];
      return role ? fillTemplate(role.call, tokens) : fullName(c);
    }
    default:
      return fillTemplate(k.other, tokens);
  }
}

export function villageNpc(ctx: SimContext, role: string): Character | undefined {
  const id = ctx.state.village[role];
  const c = id ? ctx.state.characters[id] : undefined;
  return c?.alive ? c : undefined;
}
