// [0] Sinh dân cư ban đầu từ xuất thân + văn hóa (data/origins, data/cultures) — tất định theo seed
import type { ContentBundle } from '@content/ContentLoader';
import type { Origin } from '@content/schemas';
import { Rng } from '../engine/Rng';
import type { Character, Sex, SkillState } from '../entities/Character';
import type { Household } from '../entities/Household';
import { SAVE_VERSION, type GameState } from '../entities/World';
import { generateVillageClans } from '../systems/ai';
import { RngStream, newId, type SimContext } from '../systems/context';
import { initRegionSettlements } from './region';

export interface NewGameOptions {
  seed: string;
  originId?: string;
  /** Mốc thời đại (id trong data/world/bookmarks/ hoặc 'random_all' để quay xổ số mọi thời đại). */
  bookmarkId?: string;
  /** Quốc gia / Vùng lãnh thổ trên thế giới (id trong data/world/polities/). */
  polityId?: string;
  startAge?: number;
  sex?: Sex;
  fateMode?: string;
  playMode?: string;
  /** Bốc thăm số phận toàn thế giới: rút thăm vùng lãnh thổ theo dân số thật và xuất thân theo phân tầng xã hội. */
  lottery?: boolean;
}

type Range = readonly [number, number];

function pickSex(ctx: SimContext, rng: Rng, s: 'm' | 'f' | 'any'): Sex {
  return s === 'any' ? (rng.chance(ctx.content.balance.life.male_ratio) ? 'm' : 'f') : s;
}

function rollSkills(rng: Rng, spec: Record<string, Range>): Record<string, SkillState> {
  const out: Record<string, SkillState> = {};
  for (const [id, r] of Object.entries(spec)) out[id] = { level: rng.range(r), xp: 0 };
  return out;
}

function pickTraits(ctx: SimContext, rng: Rng, count: number): string[] {
  const chosen: string[] = [];
  for (let i = 0; i < count; i++) {
    const pool = ctx.content.traits.filter((t) => !chosen.includes(t.id) && !chosen.includes(t.opposite));
    const t = rng.weighted(pool, (x) => x.start_weight);
    if (t) chosen.push(t.id);
  }
  return chosen;
}

export function createCharacter(
  ctx: SimContext,
  rng: Rng,
  spec: { sex: Sex; age: number; familyName?: string; health: number; skills?: Record<string, SkillState>; traits?: string[] },
): Character {
  const culture = ctx.content.index.culture.get(ctx.state.cultureId)!;
  const { year, month } = ctx.state.clock;
  const birthMonth = rng.int(1, ctx.content.balance.calendar.months_per_year);
  const birthYear = year - spec.age - (birthMonth > month ? 1 : 0);
  return {
    id: newId(ctx, 'c'),
    familyName: spec.familyName ?? rng.weighted(culture.family_names, (f) => f.weight)!.name,
    givenName: rng.pick(culture.given_names[spec.sex]),
    sex: spec.sex,
    birthYear,
    birthMonth,
    alive: true,
    health: spec.health,
    stress: ctx.content.balance.life.stress.start,
    skills: spec.skills ?? {},
    traits: spec.traits ?? pickTraits(ctx, rng, ctx.content.balance.life.npc_trait_count),
    modifiers: [],
    diseases: [],
    householdId: null,
    opinionOfPlayer: 0,
    opinionModifiers: [],
    favorWithPlayer: 0,
  };
}

export function spawnVillageNpc(ctx: SimContext, npc: Origin['village_npcs'][number]): Character {
  const rng = ctx.rng.get(RngStream.Npc);
  const c = createCharacter(ctx, rng, {
    sex: pickSex(ctx, rng, npc.sex),
    age: rng.range(npc.age),
    health: ctx.content.balance.life.health.npc_default,
  });
  c.villageRole = npc.role;
  c.opinionOfPlayer = rng.range(npc.opinion);
  ctx.state.characters[c.id] = c;
  ctx.state.village[npc.role] = c.id;
  return c;
}

function emptyState(
  content: ContentBundle,
  opts: NewGameOptions,
  origin: Origin,
  bookmarkId: string,
  polityId: string,
  cultureId: string,
  civId: string,
  startYear: number,
): GameState {
  const time = content.balance.time;
  const civ = content.index.civilization.get(civId) ?? content.index.civilization.get('nho_giao') ?? content.civilizations[0];
  if (!civ) throw new Error('Không có khuôn văn minh nào trong src/data/civilizations');
  const defaultFate = content.balance.fate_modes.default_mode;
  const fateMode = opts.fateMode && content.index.fateMode.has(opts.fateMode) ? opts.fateMode : defaultFate;
  const defaultPlayMode = content.balance.fate_modes.default_play_mode;
  const playMode = opts.playMode && content.index.playMode.has(opts.playMode) ? opts.playMode : defaultPlayMode;
  return {
    version: SAVE_VERSION,
    seed: opts.seed,
    originId: origin.id,
    cultureId,
    bookmarkId,
    polityId,
    fateMode,
    playMode,
    generationStartYear: startYear,
    dynasty: {
      familyName: '',
      founderId: '',
      currentGeneration: 1,
      prestige: 0,
      feuds: [],
      unfinishedWishes: [],
      pastLives: [],
      guardianId: null,
    },
    badLuckCounter: 0,
    rng: {},
    nextId: 0,
    clock: { year: startYear, month: time.start_month, monthIndex: 0 },
    world: {
      settlementName: '',
      settlementType: origin.settlement,
      harvestQuality: content.balance.economy.harvest_qualities[0].id,
      foodPrice: content.balance.economy.price.base,
      weather: content.balance.calendar.weathers[0].id,
      lastHarvest: 0,
      tradeIndex: content.balance.opportunity.start_trade_index,
      militaryAlert: content.balance.opportunity.military_alerts[0].id,
      patrolLevel: content.balance.opportunity.start_patrol_level,
      reignName: content.chronicle.startReign,
      reignStartYear: startYear,
      alertLock: null,
    },
    characters: {},
    households: {},
    playerId: '',
    householdId: '',
    village: {},
    villageClans: {},
    settlements: {},
    activeTrip: null,
    focus: { primary: '' },
    autoManage: { ...content.balance.economy.auto_manage_defaults },
    yearOpenNetWorth: 0,
    purse: { money: 0, ledger: [], history: [], openMoney: 0 },
    householdCareer: origin.default_career,
    wasHead: false,
    career: {
      id: '',
      since: 0,
      rankIndex: 0,
      merit: 0,
      wanted: 0,
      actionCooldowns: {},
      sectorMonths: {},
      sideJobId: null,
      history: [],
    },
    ambition: { id: null, achievedMilestones: [] },
    reputation: { dan_lang: 0 },
    happiness: {
      mood: content.balance.life.happiness.start,
      satisfaction: content.balance.life.happiness.start,
      baselineWealth: 0,
      ambitionBonus: 0,
    },
    civilization: {
      id: civ.id,
      filialPiety: origin.start_status.filial_piety ?? civ.start.filial_piety,
      scholarlyPrestige: origin.start_status.scholarly_prestige ?? civ.start.scholarly_prestige,
      examDegree: 'none',
      mourningMonthsLeft: 0,
      statusRank: civ.status_ranks[0].id,
    },
    cutscenes: [],
    chronicle: {},
    lifeMap: [],
    flags: {},
    eventHistory: {},
    ambientHistory: {},
    scheduled: [],
    pending: null,
    minor: null,
    lastResolution: null,
    director: {
      tension: 0,
      decisionsThisYear: 0,
      lastDecisionMonthIndex: -999,
      ambientSlots: [],
      unexpectedDeathsThisYear: 0,
      mourningThisYear: false,
      minorThisYear: 0,
      lastMinorMonthIndex: -999,
    },
    log: [],
    ledgerHistory: [],
    stats: { decisions: 0, minorDecisions: 0, eventsSeen: {} },
    gameOver: null,
    peers: [],
    reflections: [],
    reflectionDue: null,
  };
}

/** Tạo ván mới: người chơi, hộ gia đình theo xuất thân, vùng lãnh thổ & văn hóa thế giới. */
export function generateNewGame(content: ContentBundle, opts: NewGameOptions, makeCtx: (s: GameState) => SimContext): GameState {
  const defaultBm = content.index.bookmark.get(content.defaultBookmarkId) ?? content.bookmarks[0];
  const explicitWorld = Boolean(opts.bookmarkId || opts.polityId || opts.lottery);

  // 1. Chọn Mốc thời đại (Bookmark)
  const bookmark =
    opts.bookmarkId === 'random_all'
      ? (Rng.fromSeed(`${opts.seed}::world_bm`).weighted(content.bookmarks, (b) => b.lottery_weight) ?? defaultBm)
      : opts.bookmarkId && content.index.bookmark.has(opts.bookmarkId)
        ? content.index.bookmark.get(opts.bookmarkId)!
        : opts.polityId && content.index.polity.has(opts.polityId)
          ? (content.index.bookmark.get(content.index.polity.get(opts.polityId)!.bookmarks[0]) ?? defaultBm)
          : defaultBm;

  // 2. Chọn Vùng lãnh thổ / Quốc gia trên Thế giới (Polity)
  const bmPolities = bookmark ? content.polities.filter((p) => p.bookmarks.includes(bookmark.id)) : content.polities;
  const candidatePolities = bmPolities.length > 0 ? bmPolities : content.polities;
  const polity =
    opts.polityId && content.index.polity.has(opts.polityId)
      ? content.index.polity.get(opts.polityId)!
      : opts.lottery
        ? (Rng.fromSeed(`${opts.seed}::world_polity`).weighted(candidatePolities, (p) => p.population_weight) ?? candidatePolities[0])
        : (candidatePolities.find((p) => p.id === 'dai_viet_nha_ly_1000ce' || p.culture === 'viet') ?? candidatePolities[0]);

  // 3. Chọn Xuất thân (Origin) theo phân tầng thực tế của vùng hoặc birth_weight mặc định
  const origin = opts.lottery
    ? Rng.fromSeed(`${opts.seed}::lottery`).weighted(content.origins, (o) => polity?.origin_weights?.[o.id] ?? o.birth_weight)
    : (content.index.origin.get(opts.originId ?? '') ?? content.origins[0]);
  if (!origin) throw new Error('Không có xuất thân nào trong src/data/origins');

  const cultureId = explicitWorld && polity ? polity.culture : origin.culture;
  const civId = explicitWorld && polity ? polity.civilization : 'nho_giao';
  const startYear = explicitWorld && bookmark ? bookmark.year : content.balance.time.start_year;

  const state = emptyState(
    content,
    opts,
    origin,
    bookmark?.id ?? 'trung_co_1000ce',
    polity?.id ?? 'dai_viet_nha_ly_1000ce',
    cultureId,
    civId,
    startYear,
  );
  const ctx = makeCtx(state);
  const rng = ctx.rng.get(RngStream.Generate);
  const culture = content.index.culture.get(state.cultureId) ?? content.index.culture.get(origin.culture);
  if (!culture) throw new Error(`Xuất thân "${origin.id}" dùng văn hóa không tồn tại: ${state.cultureId}`);

  state.world.settlementName = rng.pick(culture.village_names);
  initRegionSettlements(ctx);
  const startAge = opts.startAge ?? origin.default_start_age;

  const hh = origin.household;
  const household: Household = {
    id: newId(ctx, 'h'),
    memberIds: [],
    money: rng.range(hh.money),
    food: rng.range(hh.food),
    debt: rng.range(hh.debt),
    livingStandard: hh.living_standard,
    properties: Object.fromEntries(hh.properties.map((p) => [p.id, rng.range(p.count)])),
    ledger: [],
    ventures: [],
    loans: [],
  };
  state.households[household.id] = household;
  state.householdId = household.id;

  const familyName = rng.weighted(culture.family_names, (f) => f.weight)!.name;
  const join = (c: Character) => {
    c.householdId = household.id;
    household.memberIds.push(c.id);
    state.characters[c.id] = c;
  };

  const me = createCharacter(ctx, rng, {
    sex: opts.sex ?? pickSex(ctx, rng, origin.player.sex),
    age: startAge,
    familyName,
    health: rng.range(origin.player.health),
    skills: rollSkills(rng, origin.player.skills),
    traits: pickTraits(ctx, rng, origin.player.trait_count),
  });
  join(me);
  me.generation = 1;
  state.playerId = me.id;
  state.dynasty.familyName = familyName;
  state.dynasty.founderId = me.id;

  for (const spec of hh.members) {
    const count = rng.range(spec.count);
    for (let i = 0; i < count; i++) {
      const sex = spec.relation === 'father' ? 'm' : spec.relation === 'mother' ? 'f' : pickSex(ctx, rng, spec.sex);
      const age = spec.age ? rng.range(spec.age) : Math.max(0, startAge + rng.range(spec.age_offset ?? [0, 0]));
      const c = createCharacter(ctx, rng, {
        sex,
        age,
        familyName: spec.relation === 'mother' ? undefined : familyName,
        health: rng.range(spec.health),
        skills: rollSkills(rng, spec.skills),
      });
      c.generation = spec.relation === 'father' || spec.relation === 'mother' ? 0 : 1;
      join(c);
      if (spec.relation === 'father') me.fatherId = c.id;
      if (spec.relation === 'mother') me.motherId = c.id;
    }
  }
  // Anh chị em chung cha mẹ với người chơi
  for (const id of household.memberIds) {
    const c = state.characters[id];
    if (c.id === me.id || c.id === me.fatherId || c.id === me.motherId) continue;
    c.fatherId = me.fatherId;
    c.motherId = me.motherId;
  }

  for (const npc of origin.village_npcs) spawnVillageNpc(ctx, npc);
  generateVillageClans(ctx);

  // Khởi tạo kỳ vọng tài sản ban đầu theo giá trị hộ lúc bắt đầu (GDD 01 §7.2)
  const initialPropVal = Object.entries(household.properties).reduce(
    (sum, [id, cnt]) => sum + (content.index.property.get(id)?.value ?? 0) * cnt,
    0,
  );
  state.happiness.baselineWealth = household.money + initialPropVal - household.debt;

  // Tham vọng không gán lúc sinh: chí hướng hình thành qua sự kiện khi trưởng thành (data/events)

  ctx.rng.flush();
  return state;
}
