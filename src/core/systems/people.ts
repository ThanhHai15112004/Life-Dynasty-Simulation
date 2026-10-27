// [0] Tra cứu người: người chơi, hộ, giai đoạn đời, cách gọi tên (R11), văn hóa theo thời đại
import type { Culture } from '@content/schemas';
import { fillTemplate } from '@shared/template';
import { ageOf, fullName, type Character } from '../entities/Character';
import type { Household } from '../entities/Household';
import type { SimContext } from './context';

export type EraStyle = 'prehistoric' | 'ancient' | 'feudal' | 'industrial' | 'modern';

/** Xác định phong cách thời đại (5 kỷ nguyên) từ năm lịch sử và khuôn văn minh. */
export function eraStyleOf(year: number, civId?: string): EraStyle {
  if (year >= 1945 || civId === 'hien_dai') return 'modern';
  if (year >= 1750) return 'industrial';
  if (year < -2500 || civId === 'bo_lac_nguyen_thuy') return 'prehistoric';
  if (year <= 200 || civId === 'co_dai_de_che') return 'ancient';
  return 'feudal';
}

/** Áp dụng biến thể văn hóa theo năm lịch sử (họ tên, địa danh, đơn vị tiền tệ, dân tộc, tôn giáo). */
export function resolveCultureForYear(culture: Culture, year: number): Culture {
  if (!culture.era_variants || culture.era_variants.length === 0) return culture;
  const v = culture.era_variants.find(
    (ev) => (ev.min_year === undefined || year >= ev.min_year) && (ev.max_year === undefined || year <= ev.max_year),
  );
  if (!v) return culture;
  return {
    ...culture,
    ethnicity_name: v.ethnicity_name ?? culture.ethnicity_name,
    default_religion: v.default_religion ?? v.religion ?? culture.default_religion,
    phenotype: v.phenotype ?? culture.phenotype,
    name_order: v.name_order ?? culture.name_order,
    lexicon: v.lexicon ?? culture.lexicon,
    family_names: v.family_names ?? culture.family_names,
    given_names: v.given_names ?? culture.given_names,
    village_names: v.village_names ?? culture.village_names,
    town_names: v.town_names ?? culture.town_names,
    prefecture_names: v.prefecture_names ?? culture.prefecture_names,
    village_roles: v.village_roles ?? culture.village_roles,
  };
}

/** Văn hóa đang hoạt động trong ván chơi, đã tự động áp dụng biến thể theo năm hiện tại. */
export function activeCulture(ctx: SimContext): Culture {
  const base = ctx.content.index.culture.get(ctx.state.cultureId) ?? ctx.content.cultures[0];
  return resolveCultureForYear(base, ctx.state.clock.year);
}

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

/**
 * Chủ hộ ([1.5] — balance.life.headship): cha mẹ còn sức (chưa tới tuổi giao việc nhà) giữ quyền;
 * già rồi thì giao cho lớp con: người chơi đã lập gia đình đứng trước, không thì người lớn nhiều tuổi nhất còn sức.
 * Người chơi đã làm chủ thì không phải giao lại cho con cháu khi về già.
 */
export function householdHead(ctx: SimContext, h: Household = playerHousehold(ctx)): Character | undefined {
  const { life } = ctx.content.balance;
  const byAge = aliveMembers(ctx, h).sort((a, b) => ageNow(ctx, b) - ageNow(ctx, a));
  const adults = byAge.filter((c) => ageNow(ctx, c) >= life.adult_age);
  if (adults.length === 0) return byAge[0];
  const me = player(ctx);
  if (ctx.state.dynasty?.guardianId && ageNow(ctx, me) < life.adult_age) {
    const guardian = ctx.state.characters[ctx.state.dynasty.guardianId];
    if (guardian?.alive && h.memberIds.includes(guardian.id)) return guardian;
  }
  const able = adults.filter((c) => c.id === me.id || ageNow(ctx, c) < life.headship.elder_age);
  if (able.length === 0) return adults[0];
  const parent = able.find((c) => c.id === me.fatherId || c.id === me.motherId);
  if (parent) return parent;
  const meAble = able.find((c) => c.id === me.id);
  if (meAble && ctx.state.dynasty && ctx.state.dynasty.currentGeneration > 1) return meAble;
  const spouse = me.spouseId ? ctx.state.characters[me.spouseId] : undefined;
  const olderBrotherInHouse = able.find(
    (c) =>
      c.id !== me.id &&
      c.sex === 'm' &&
      ((me.fatherId && c.fatherId === me.fatherId) || (me.motherId && c.motherId === me.motherId)) &&
      c.birthYear * 12 + c.birthMonth < me.birthYear * 12 + me.birthMonth,
  );
  if (meAble && !olderBrotherInHouse && (spouse?.alive || able[0].id === me.spouseId)) return meAble;
  return able[0];
}

export type Relation =
  | 'self'
  | 'father'
  | 'mother'
  | 'older_sibling'
  | 'younger_sibling'
  | 'spouse'
  | 'child'
  | 'grandchild'
  | 'nephew'
  | 'uncle'
  | 'village'
  | 'other';

function areSameParents(a: Character, b: Character): boolean {
  return Boolean((a.fatherId && a.fatherId === b.fatherId) || (a.motherId && a.motherId === b.motherId));
}

export function relationToPlayer(ctx: SimContext, c: Character): Relation {
  const p = player(ctx);
  if (c.id === p.id) return 'self';
  if (p.spouseId === c.id || c.spouseId === p.id) return 'spouse';
  if (c.fatherId === p.id || c.motherId === p.id) return 'child';
  if (p.fatherId === c.id) return 'father';
  if (p.motherId === c.id) return 'mother';
  if (areSameParents(c, p)) {
    const older = c.birthYear * 12 + c.birthMonth < p.birthYear * 12 + p.birthMonth;
    return older ? 'older_sibling' : 'younger_sibling';
  }
  const cFather = c.fatherId ? ctx.state.characters[c.fatherId] : undefined;
  const cMother = c.motherId ? ctx.state.characters[c.motherId] : undefined;
  if (
    (cFather && (cFather.fatherId === p.id || cFather.motherId === p.id)) ||
    (cMother && (cMother.fatherId === p.id || cMother.motherId === p.id))
  ) {
    return 'grandchild';
  }
  if (c.collateral || (cFather && areSameParents(cFather, p)) || (cMother && areSameParents(cMother, p))) {
    return 'nephew';
  }
  const pFather = p.fatherId ? ctx.state.characters[p.fatherId] : undefined;
  const pMother = p.motherId ? ctx.state.characters[p.motherId] : undefined;
  if (
    ctx.state.dynasty?.guardianId === c.id ||
    (pFather && areSameParents(c, pFather)) ||
    (pMother && areSameParents(c, pMother))
  ) {
    return 'uncle';
  }
  if (c.villageRole) return 'village';
  return 'other';
}

/** Cách người chơi gọi nhân vật này, theo mẫu trong data/cultures (đã tính biến thể theo thời đại). */
export function callOf(ctx: SimContext, c: Character): string {
  const culture = activeCulture(ctx);
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
      if (c.adopted) {
        return fillTemplate(c.sex === 'm' ? k.adopted_son : k.adopted_daughter, tokens);
      }
      return fillTemplate(c.sex === 'm' ? k.son : k.daughter, tokens);
    case 'grandchild':
      return fillTemplate(k.grandchild, tokens);
    case 'nephew':
      return fillTemplate(k.nephew, tokens);
    case 'uncle':
      return fillTemplate(c.sex === 'm' ? k.uncle : k.aunt, tokens);
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
