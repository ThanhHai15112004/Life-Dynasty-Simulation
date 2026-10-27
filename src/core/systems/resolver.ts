// [0] Phân giải biến của DSL điều kiện và token văn bản theo trạng thái game thật (R1: không bịa)
// Danh sách đường dẫn ở đây là API của engine; thêm biến mới thì ghi vào src/data/README.md.
import type { Primitive } from '@content/schemas/condition';
import { UnknownVariableError, type Resolver } from '../engine/RuleEvaluator';
import { fullName, type Character } from '../entities/Character';
import { farmlandOf, mainHouse } from '../entities/Property';
import type { SimContext } from './context';
import { householdNetWorth, lastYearIncome, localTradeFactor, monthlyFoodNeed, selfFarms, spareWorkers, workerCount } from './economy/helpers';
import { purseActive } from './economy/purse';
import { aliveChildrenOf, canPlayerSplitHousehold, getHeirCandidates, getMarriageableMembers, isEldestChild } from './family';
import { ageNow, callOf, householdHead, lifeStageOf, player, playerHousehold, villageNpc } from './people';
import { ExamStage, examStage } from './status';
import { activeSettlementId, currentSettlement, homeSettlement } from '../world/region';

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
      // [1.5] Tiền của riêng người chơi: chưa làm chủ hộ là túi riêng, làm chủ rồi là tiền nhà
      case 'own_money':
        if (c.id !== state.playerId) return 0;
        return purseActive(ctx) ? state.purse.money : playerHousehold(ctx).money;
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
      case 'is_eldest':
        return isEldestChild(ctx, c);
      case 'can_split_household':
        return c.id === state.playerId ? canPlayerSplitHousehold(ctx) : false;
      case 'trait_count':
        return c.traits.length;
      case 'married':
        return !!(c.spouseId && state.characters[c.spouseId]?.alive);
      case 'children_count':
        return aliveChildrenOf(ctx, c.id).length;
      case 'has_heir':
        return c.id === state.playerId ? getHeirCandidates(ctx, c).length > 0 : false;
      case 'has_marriageable_child':
        return c.id === state.playerId
          ? getMarriageableMembers(ctx).some((m) => m.id !== state.playerId)
          : false;
      case 'has_scholar_son':
        return c.id === state.playerId
          ? aliveChildrenOf(ctx, c.id).some(
              (ch) => ch.sex === 'm' && (ch.upbringing === 'di_hoc' || (ch.skills.hoc_van?.level ?? 0) >= 3) && ageNow(ctx, ch) >= 14,
            )
          : false;
      case 'generation':
        return c.generation ?? state.dynasty?.currentGeneration ?? 1;
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
        return c.id === state.playerId ? state.career.id : (c.careerId ?? state.householdCareer);
      case 'career_sector': {
        const cid = c.id === state.playerId ? state.career.id : (c.careerId ?? state.householdCareer);
        return content.index.career.get(cid)?.sector ?? '';
      }
      case 'career_depth': {
        const cid = c.id === state.playerId ? state.career.id : (c.careerId ?? state.householdCareer);
        return content.index.career.get(cid)?.depth ?? '';
      }
      case 'career_months':
        return c.id === state.playerId ? Math.max(0, state.clock.monthIndex - state.career.since) : (c.careerMonths ?? 0);
      case 'career_years': {
        const m = c.id === state.playerId ? Math.max(0, state.clock.monthIndex - state.career.since) : (c.careerMonths ?? 0);
        return Math.floor(m / content.balance.calendar.months_per_year);
      }
      case 'sector_months': {
        const cid = c.id === state.playerId ? state.career.id : (c.careerId ?? state.householdCareer);
        const sec = content.index.career.get(cid)?.sector ?? '';
        return c.id === state.playerId ? (state.career.sectorMonths?.[sec] ?? 0) : (c.careerMonths ?? 0);
      }
      case 'sector_years': {
        const cid = c.id === state.playerId ? state.career.id : (c.careerId ?? state.householdCareer);
        const sec = content.index.career.get(cid)?.sector ?? '';
        const sm = c.id === state.playerId ? (state.career.sectorMonths?.[sec] ?? 0) : (c.careerMonths ?? 0);
        return Math.floor(sm / content.balance.calendar.months_per_year);
      }
      case 'side_job':
        return c.id === state.playerId ? (state.career.sideJobId ?? '') : '';
      case 'is_traveling':
        return c.id === state.playerId ? state.activeTrip !== null : false;
      case 'trip_months_left':
        return c.id === state.playerId ? (state.activeTrip?.monthsLeft ?? 0) : 0;
      case 'current_settlement':
        return c.id === state.playerId ? activeSettlementId(ctx) : state.world.settlementType;
      case 'career_rank':
        return c.id === state.playerId ? state.career.rankIndex : (c.careerRankIndex ?? 0);
      case 'merit':
        return c.id === state.playerId ? state.career.merit : (c.careerMerit ?? 0);
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
        if (key === 'school_tier') {
          const st = content.index.settlementType.get(activeSettlementId(ctx));
          return st?.school_tier ?? 1;
        }
        if (key === 'medical_tier') {
          const st = content.index.settlementType.get(activeSettlementId(ctx));
          return st?.medical_tier ?? 1;
        }
        if (key === 'remoteness') {
          const st = content.index.settlementType.get(activeSettlementId(ctx));
          return st?.remoteness ?? 0.5;
        }
        if (key === 'is_urban') {
          const stId = activeSettlementId(ctx);
          return stId === 'thi_tran_ben_song' || stId === 'phu_thanh' || stId === 'huyen_ly' || stId === 'kinh_thanh';
        }
        if (key === 'is_remote') {
          const st = content.index.settlementType.get(activeSettlementId(ctx));
          return (st?.remoteness ?? 0.5) >= 0.5;
        }
        if (key === 'era_id') return state.bookmarkId ?? '';
        if (key === 'polity_id') return state.polityId ?? '';
        if (key === 'civilization_id') return state.civilization.id;
        if (key === 'culture_id') return state.cultureId;
        if (key === 'local_trade_factor') return localTradeFactor(ctx);
        if (key === 'has_epidemic') return Boolean(currentSettlement(ctx)?.epidemic || homeSettlement(ctx)?.epidemic);
        if (key === 'home_epidemic') return Boolean(homeSettlement(ctx)?.epidemic);
        if (key === 'any_epidemic') return Object.values(state.settlements ?? {}).some((s) => s.epidemic !== null);
        if (key === 'epidemic_settlement') return Object.values(state.settlements ?? {}).find((s) => s.epidemic !== null)?.typeId ?? '';
        if (key === 'fate_mode') return state.fateMode;
        if (key === 'play_mode') return state.playMode;
        if (key === 'bad_luck') return state.badLuckCounter ?? 0;
        throw new UnknownVariableError(path);
      }
      case 'dynasty': {
        const key = rest.join('.');
        if (key === 'prestige') return state.dynasty?.prestige ?? 0;
        if (key === 'generation') return state.dynasty?.currentGeneration ?? 1;
        if (key === 'has_unfulfilled_wish') return state.dynasty?.unfinishedWishes?.some((w) => !w.fulfilled) ?? false;
        if (key === 'has_feud') return (state.dynasty?.feuds?.length ?? 0) > 0 || Object.values(state.villageClans ?? {}).some((cl) => cl.tie === 'feud');
        if (key === 'in_laws_count') return Object.values(state.villageClans ?? {}).filter((cl) => cl.tie === 'in_law').length;
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
        if (key.startsWith('venture.')) {
          const vId = key.slice(8);
          return (h.ventures ?? []).some((v) => v.id === vId) ? 1 : 0;
        }
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
          case 'career':
            return state.householdCareer;
          case 'self_farms':
            return selfFarms(ctx);
          case 'spare_workers':
            return spareWorkers(ctx);
          case 'income_year':
            return lastYearIncome(ctx);
          case 'food_months': {
            const need = monthlyFoodNeed(ctx);
            return need > 0 ? h.food / need : 99;
          }
          case 'is_split':
            return Boolean(h.parentHouseholdId);
          case 'ventures_count':
            return (h.ventures ?? []).length;
          case 'has_declining_venture':
            return (h.ventures ?? []).some((v) => v.health < content.balance.economy.ventures.decline_threshold);
          case 'has_npc_debt':
            return (h.loans ?? []).some((l) => l.kind === 'borrowed' && l.amount > 0);
          case 'has_overdue_loan':
            return (h.loans ?? []).some((l) => l.kind === 'borrowed' && l.overdueYears > 0);
          case 'lent_loans_count':
            return (h.loans ?? []).filter((l) => l.kind === 'lent').length;
          case 'house_tier':
            return mainHouse(h, content)?.house_tier ?? 1;
          case 'distinct_careers': {
            const adultAge = content.balance.life.adult_age;
            const set = new Set<string>();
            for (const id of h.memberIds) {
              const m = state.characters[id];
              if (!m?.alive || ageNow(ctx, m) < adultAge) continue;
              const cid = m.id === state.playerId ? state.career.id : (m.careerId ?? state.householdCareer);
              if (content.index.career.get(cid)?.kind === 'nghe') set.add(cid);
            }
            return set.size;
          }
          default:
            throw new UnknownVariableError(path);
        }
      }
      case 'focus':
        if (rest[0] === 'primary') return state.focus.primary;
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
    if (path === 'world.current_settlement_name') return currentSettlement(ctx)?.name ?? state.world.settlementName;
    if (path === 'world.town_name') return state.settlements?.thi_tran_ben_song?.name ?? state.world.settlementName;
    if (path === 'world.prefecture_name') return state.settlements?.phu_thanh?.name ?? state.world.settlementName;
    if (path === 'world.village_name') return state.settlements?.lang_nong?.name ?? state.world.settlementName;
    if (path === 'world.epidemic_disease') {
      const ep =
        currentSettlement(ctx)?.epidemic ??
        Object.values(state.settlements ?? {}).find((s) => s.epidemic !== null)?.epidemic;
      return ep ? (content.index.disease.get(ep.diseaseId)?.name ?? ep.diseaseId) : '';
    }
    if (path === 'dynasty.family_name') return state.dynasty?.familyName ?? player(ctx).familyName;
    if (path === 'dynasty.wish_text') return state.dynasty?.unfinishedWishes?.find((w) => !w.fulfilled)?.text ?? '';
    if (path === 'dynasty.wish_from') return state.dynasty?.unfinishedWishes?.find((w) => !w.fulfilled)?.fromName ?? '';
    if (path === 'dynasty.feud_clan') {
      const fClan = Object.values(state.villageClans ?? {}).find((cl) => cl.tie === 'feud');
      return fClan?.familyName ?? state.dynasty?.feuds?.[0]?.targetName ?? '';
    }
    if (path === 'child.marriageable_name') {
      const mc = getMarriageableMembers(ctx).find((m) => m.id !== state.playerId);
      return mc ? callOf(ctx, mc) : 'con';
    }
    if (path === 'child.scholar_name') {
      const sc = aliveChildrenOf(ctx, state.playerId).find(
        (ch) => ch.sex === 'm' && (ch.upbringing === 'di_hoc' || (ch.skills.hoc_van?.level ?? 0) >= 2),
      );
      return sc ? callOf(ctx, sc) : 'con trai';
    }
    if (path === 'world.reign') return state.world.reignName;
    if (path === 'world.reign_year') return state.clock.year - state.world.reignStartYear + 1;
    if (path === 'world.season_name') return content.balance.calendar.seasons.find((s) => s.id === seasonOf(ctx))?.name;
    if (path === 'world.weather_name') return content.balance.calendar.weathers.find((w) => w.id === state.world.weather)?.name;
    if (path === 'world.harvest_name') return content.index.harvestQuality.get(state.world.harvestQuality)?.name;
    if (path.startsWith('lex.')) {
      const culture = content.index.culture.get(state.cultureId) ?? content.cultures[0];
      const lex = culture?.lexicon;
      if (path === 'lex.currency') return lex?.currency ?? '';
      if (path === 'lex.food') return lex?.food ?? '';
      if (path === 'lex.land') return lex?.land ?? '';
      if (path === 'lex.crop') return lex?.staple_crop ?? '';
    }
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
