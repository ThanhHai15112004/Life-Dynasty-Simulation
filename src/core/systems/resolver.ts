// [0] Phân giải biến của DSL điều kiện và token văn bản theo trạng thái game thật (R1: không bịa)
// Danh sách đường dẫn ở đây là API của engine; thêm biến mới thì ghi vào src/data/README.md.
import type { Primitive } from '@content/schemas/condition';
import { UnknownVariableError, type Resolver } from '../engine/RuleEvaluator';
import { fullName, type Character } from '../entities/Character';
import { farmlandOf } from '../entities/Property';
import type { SimContext } from './context';
import { householdNetWorth, localTradeFactor, monthlyFoodNeed, selfFarms, workerCount } from './economy/helpers';
import { aliveChildrenOf } from './family';
import { ageNow, callOf, householdHead, lifeStageOf, player, playerHousehold, villageNpc } from './people';
import { ExamStage, examStage } from './status';

export interface Bindings {
  /** Nhân vật đang xét (ứng viên vai trò, người chịu modifier có điều kiện...). */
  self?: string;
  roles?: Record<string, string>;
  /** Tham số bổ sung cho token văn bản ({amount}, {cause}...). */
  params?: Record<string, string | number>;
}

export interface StateResolver extends Resolver {
  /** Tra token văn bản: như get() nhưng cho phép chuỗi hiển thị và tham số. */
  token(path: string): string | number | undefined;
  character(who: string): Character | undefined;
}

export function createResolver(ctx: SimContext, b: Bindings = {}): StateResolver {
  const { state, content } = ctx;

  const character = (who: string): Character | undefined => {
    if (who === 'player') return player(ctx);
    if (who === 'self') return b.self ? state.characters[b.self] : undefined;
    const id = b.roles?.[who];
    return id ? state.characters[id] : undefined;
  };

  const charField = (c: Character | undefined, field: string, path: string): Primitive | undefined => {
    if (!c) return undefined;
    if (field.startsWith('skill.')) {
      const skillId = field.slice(6);
      if (!content.index.skill.has(skillId)) throw new UnknownVariableError(path);
      return c.skills[skillId]?.level ?? 0;
    }
    switch (field) {
      case 'age':
        return ageNow(ctx, c);
      case 'sex':
        return c.sex;
      case 'health':
        return c.health;
      case 'stress':
        return c.stress;
      case 'alive':
        return c.alive;
      case 'opinion':
        return c.opinionOfPlayer;
      case 'life_stage':
        return lifeStageOf(ctx, ageNow(ctx, c)).id;
      case 'in_household':
        return c.householdId === state.householdId;
      case 'is_head':
        return householdHead(ctx)?.id === c.id;
      case 'trait_count':
        return c.traits.length;
      case 'married':
        return !!(c.spouseId && state.characters[c.spouseId]?.alive);
      case 'children_count':
        return aliveChildrenOf(ctx, c.id).length;
      case 'sick':
        return (c.diseases?.length ?? 0) > 0;
      case 'disease_count':
        return c.diseases?.length ?? 0;
      case 'favor':
        return c.favorWithPlayer ?? 0;
      case 'reputation':
        return state.reputation.dan_lang ?? 0;
      case 'satisfaction':
        return state.happiness.satisfaction;
      case 'mood':
        return state.happiness.mood;
      case 'ambition':
        return state.ambition.id ?? '';
      case 'career':
        return state.career.id;
      case 'career_rank':
        return state.career.rankIndex;
      case 'merit':
        return state.career.merit;
      case 'wanted':
        return state.career.wanted;
      case 'filial_piety':
        return state.civilization.filialPiety;
      case 'scholarly_prestige':
        return state.civilization.scholarlyPrestige;
      case 'exam_degree':
        return state.civilization.examDegree;
      case 'mourning_months':
        return state.civilization.mourningMonthsLeft;
      case 'status_rank':
        return state.civilization.statusRank;
      case 'origin':
        return state.originId;
      case 'best_skill':
        return Object.values(c.skills).reduce((m, sk) => Math.max(m, sk.level), 0);
      case 'favor_total':
        return Object.values(state.characters).reduce((sum, x) => sum + Math.max(0, x.favorWithPlayer ?? 0), 0);
      case 'ambition_progress': {
        const amb = state.ambition.id ? content.index.ambition.get(state.ambition.id) : undefined;
        return amb ? state.ambition.achievedMilestones.length / amb.milestones.length : 0;
      }
      default:
        throw new UnknownVariableError(path);
    }
  };

  const get = (path: string): Primitive | undefined => {
    const parts = path.split('.');
    const [root, ...rest] = parts;
    const h = playerHousehold(ctx);
    switch (root) {
      case 'world': {
        const key = rest.join('.');
        if (key === 'year') return state.clock.year;
        if (key === 'month') return state.clock.month;
        if (key === 'month_index') return state.clock.monthIndex;
        if (key === 'season') return seasonOf(ctx);
        if (key === 'weather') return state.world.weather;
        if (key === 'harvest_quality') return state.world.harvestQuality;
        if (key === 'food_price') return state.world.foodPrice;
        if (key === 'last_harvest') return state.world.lastHarvest;
        if (key === 'months_to_harvest') return monthsToHarvest(ctx);
        if (key === 'trade_index') return state.world.tradeIndex;
        if (key === 'military_alert') return state.world.militaryAlert;
        if (key === 'patrol_level') return state.world.patrolLevel;
        if (key === 'exam_stage') return examStage(ctx);
        if (key === 'is_exam_year') return examStage(ctx) === ExamStage.Huong;
        if (key === 'settlement_type') return state.world.settlementType;
        if (key === 'local_trade_factor') return localTradeFactor(ctx);
        throw new UnknownVariableError(path);
      }
      case 'player':
        return charField(player(ctx), rest.join('.'), path);
      case 'self':
        return charField(character('self'), rest.join('.'), path);
      case 'role': {
        const [roleId, ...field] = rest;
        return charField(character(roleId), field.join('.'), path);
      }
      case 'village': {
        const [role, ...field] = rest;
        if (field.join('.') === 'exists') return villageNpc(ctx, role) !== undefined;
        return charField(villageNpc(ctx, role), field.join('.'), path);
      }
      case 'household': {
        const key = rest.join('.');
        if (key.startsWith('property.')) return h.properties[key.slice(9)] ?? 0;
        switch (key) {
          case 'money':
            return h.money;
          case 'food':
            return h.food;
          case 'debt':
            return h.debt;
          case 'living_standard':
            return h.livingStandard;
          case 'members':
            return h.memberIds.filter((id) => state.characters[id]?.alive).length;
          case 'workers':
            return workerCount(ctx);
          case 'farmland':
            return farmlandOf(h, content);
          case 'net_worth':
            return householdNetWorth(ctx);
          case 'self_farms':
            return selfFarms(ctx);
          case 'food_months': {
            const need = monthlyFoodNeed(ctx);
            return need > 0 ? h.food / need : 99;
          }
          default:
            throw new UnknownVariableError(path);
        }
      }
      case 'focus':
        if (rest[0] === 'primary') return state.focus.primary;
        if (rest[0] === 'secondary') return state.focus.secondary ?? '';
        throw new UnknownVariableError(path);
      case 'flag':
        return hasFlag(rest.join('.'));
      case 'year':
        if (rest[0] === 'decisions') return state.director.decisionsThisYear;
        if (rest[0] === 'mourning') return state.director.mourningThisYear;
        throw new UnknownVariableError(path);
      default:
        throw new UnknownVariableError(path);
    }
  };

  const hasFlag = (flag: string): boolean => {
    const f = state.flags[flag];
    return !!f && (f.expiresAt === null || f.expiresAt > state.clock.monthIndex);
  };

  const token = (path: string): string | number | undefined => {
    if (b.params && path in b.params) {
      const p = b.params[path];
      return typeof p === 'number' ? roundForText(p) : p;
    }
    const parts = path.split('.');
    const last = parts[parts.length - 1];
    if (last === 'name' || last === 'call' || last === 'given') {
      const head = parts.slice(0, -1);
      let c: Character | undefined;
      if (head[0] === 'player') c = player(ctx);
      else if (head[0] === 'self') c = character('self');
      else if (head[0] === 'role') c = character(head[1]);
      else if (head[0] === 'village') c = villageNpc(ctx, head[1]);
      if (!c) return undefined;
      return last === 'name' ? fullName(c) : last === 'given' ? c.givenName : callOf(ctx, c);
    }
    if (path === 'world.settlement') return state.world.settlementName;
    if (path === 'world.reign') return state.world.reignName;
    if (path === 'world.reign_year') return state.clock.year - state.world.reignStartYear + 1;
    if (path === 'world.season_name') return content.balance.calendar.seasons.find((s) => s.id === seasonOf(ctx))?.name;
    if (path === 'world.weather_name') return content.balance.calendar.weathers.find((w) => w.id === state.world.weather)?.name;
    if (path === 'world.harvest_name') return content.index.harvestQuality.get(state.world.harvestQuality)?.name;
    try {
      const v = get(path);
      if (typeof v === 'boolean') return String(v);
      return typeof v === 'number' ? roundForText(v) : v;
    } catch {
      return undefined;
    }
  };

  return {
    get,
    token,
    character,
    hasFlag,
    hasTrait: (who, traitId) => character(who)?.traits.includes(traitId) ?? false,
    propertyCount: (id) => playerHousehold(ctx).properties[id] ?? 0,
    roleExists: (roleId) => {
      const c = character(roleId);
      return !!c && c.alive;
    },
  };
}

/** Số tháng tới vụ gặt kế tiếp (0 = tháng này gặt). */
export function monthsToHarvest(ctx: SimContext): number {
  const n = ctx.content.balance.calendar.months_per_year;
  const m = ctx.state.clock.month;
  const diffs = ctx.content.balance.economy.harvest.months.map((h) => (h - m + n) % n);
  return Math.min(...diffs);
}

/** Số trong lời kể: số nguyên giữ nguyên, số lẻ làm tròn 1 chữ số (kỹ thuật hiển thị, không phải cân bằng). */
function roundForText(v: number): number {
  return Number.isInteger(v) ? v : Math.round(v * 10) / 10;
}

export function seasonOf(ctx: SimContext): string {
  const cal = ctx.content.balance.calendar;
  return cal.months.find((m) => m.month === ctx.state.clock.month)?.season ?? cal.seasons[0].id;
}
