// [1] Bù các trường mới cho save cũ bằng giá trị mặc định đọc từ data (SaveSystem không biết content)
import type { ContentBundle } from '@content/ContentLoader';
import { ageOf } from '../entities/Character';
import { SAVE_VERSION, type GameState } from '../entities/World';
import { ensurePoliticsState } from '../systems/politics';
import { ensureRebellionState } from '../systems/rebellion';
import { ensureSocialState } from '../systems/social';

export function migrateState(raw: Partial<GameState>, content: ContentBundle): GameState {
  const origin = content.index.origin.get(raw.originId ?? '') ?? content.origins[0];
  const defaultBm = content.defaultBookmarkId || content.bookmarks[0]?.id || 'trung_co_1000ce';
  raw.bookmarkId = raw.bookmarkId && content.index.bookmark.has(raw.bookmarkId) ? raw.bookmarkId : defaultBm;
  const defaultPolity =
    content.index.polity.get('dai_viet_nha_ly_1000ce') ??
    content.polities.find((p) => p.bookmarks.includes(raw.bookmarkId!)) ??
    content.polities[0];
  raw.polityId = raw.polityId && content.index.polity.has(raw.polityId) ? raw.polityId : (defaultPolity?.id ?? '');
  const polity = content.index.polity.get(raw.polityId);
  const civ =
    (raw.civilization?.id ? content.index.civilization.get(raw.civilization.id) : undefined) ??
    (polity ? content.index.civilization.get(polity.civilization) : undefined) ??
    content.index.civilization.get('nho_giao') ??
    content.civilizations[0];
  const opp = content.balance.opportunity;
  const happy = content.balance.life.happiness;

  raw.version = SAVE_VERSION;

  raw.fateMode = raw.fateMode && content.index.fateMode.has(raw.fateMode) ? raw.fateMode : content.balance.fate_modes.default_mode;
  raw.playMode = raw.playMode && content.index.playMode.has(raw.playMode) ? raw.playMode : content.balance.fate_modes.default_play_mode;
  raw.generationStartYear = raw.generationStartYear ?? raw.clock?.year ?? content.balance.time.start_year;
  raw.badLuckCounter = raw.badLuckCounter ?? 0;
  const playerChar = raw.characters?.[raw.playerId ?? ''];
  raw.dynasty = {
    familyName: playerChar?.familyName ?? '',
    founderId: raw.playerId ?? '',
    currentGeneration: 1,
    prestige: 0,
    feuds: [],
    unfinishedWishes: [],
    pastLives: [],
    guardianId: null,
    ...raw.dynasty,
  };

  raw.ambition = raw.ambition ?? { id: null, achievedMilestones: [] };
  raw.peers = raw.peers ?? [];
  raw.reflections = raw.reflections ?? [];
  raw.reflectionDue = raw.reflectionDue ?? null;
  raw.reputation = raw.reputation ?? {};
  raw.happiness = raw.happiness ?? { mood: happy.start, satisfaction: happy.start, baselineWealth: 0, ambitionBonus: 0 };
  raw.mentalBreakCooldown = raw.mentalBreakCooldown ?? 0;
  ensureSocialState(raw as GameState);
  ensurePoliticsState(raw as GameState);
  ensureRebellionState(raw as GameState);
  raw.organizations = raw.organizations ?? {};
  for (const def of content.organizations ?? []) {
    if (!raw.organizations[def.id]) {
      raw.organizations[def.id] = {
        id: def.id,
        name: def.name,
        kind: def.kind,
        settlementId: def.settlement_id,
        leaderId: 'npc',
        playerRank: -1,
        playerContribution: 0,
        factors: { ...def.initial_factors },
        delegation: {
          deputyId: null,
          policy: 'balanced',
          deputyLoyalty: 75,
          monthsDelegated: 0,
        },
      };
    }
  }
  raw.career = {
    id: origin.default_career,
    since: 0,
    rankIndex: 0,
    merit: 0,
    wanted: 0,
    actionCooldowns: {},
    sectorMonths: {},
    sideJobId: null,
    history: [],
    ...raw.career,
  };
  raw.career.sectorMonths = raw.career.sectorMonths ?? {};
  raw.career.sideJobId = raw.career.sideJobId ?? null;
  raw.career.history = raw.career.history ?? [];
  if (raw.career.history.length === 0 && raw.career.id) {
    const cDef = content.index.career.get(raw.career.id);
    if (cDef?.kind === 'nghe') {
      const rIdx = raw.career.rankIndex ?? 0;
      raw.career.history.push({
        careerId: cDef.id,
        careerName: cDef.name,
        sector: cDef.sector,
        highestRankIndex: rIdx,
        highestRankName: cDef.ranks[rIdx]?.name ?? cDef.name,
        startYear: raw.clock?.year ?? content.balance.time.start_year,
        endYear: null,
        months: Math.max(0, (raw.clock?.monthIndex ?? 0) - (raw.career.since ?? 0)),
      });
    }
  }
  raw.civilization = {
    id: civ.id,
    filialPiety: origin.start_status.filial_piety ?? civ.start.filial_piety,
    scholarlyPrestige: origin.start_status.scholarly_prestige ?? civ.start.scholarly_prestige,
    examDegree: 'none',
    mourningMonthsLeft: 0,
    statusRank: civ.status_ranks[0].id,
    ...raw.civilization,
  };
  raw.cutscenes = raw.cutscenes ?? [];
  // Save trước khi tách nghề riêng / nghề nhà: career.id là nghề nhà. Nếu người chơi còn nhỏ thì chưa có nghề riêng.
  const legacyCareer = raw.householdCareer === undefined;
  raw.householdCareer = raw.householdCareer ?? raw.career?.id ?? origin.default_career;
  raw.wasHead = raw.wasHead ?? false;
  if (raw.career) raw.career.since = raw.career.since ?? 0;
  const me = raw.characters?.[raw.playerId ?? ''];
  if (legacyCareer && raw.career && me && raw.clock && ageOf(me, raw.clock.year, raw.clock.month) < content.balance.life.adult_age) {
    raw.career = { ...raw.career, id: '', rankIndex: 0, merit: 0 };
  }
  raw.focus = { primary: raw.focus?.primary ?? '' };
  raw.autoManage = { livingStandard: true, repayDebt: true, sellSurplus: true, invest: true, ...raw.autoManage };
  raw.yearOpenNetWorth = raw.yearOpenNetWorth ?? 0;
  raw.purse = raw.purse ?? { money: 0, ledger: [], history: [], openMoney: 0 };
  // Sổ năm của save cũ chưa có tài sản ròng / thu nhập: để 0, chốt sổ năm sau sẽ có số thật
  for (const y of raw.ledgerHistory ?? []) {
    y.netWorth = y.netWorth ?? 0;
    y.openNetWorth = y.openNetWorth ?? y.netWorth;
    y.income = y.income ?? 0;
  }
  // Chuyện nhỏ của save cũ có hạn tự chọn (expiresAt); nay chờ người chơi chọn như sự kiện thường
  if (raw.minor) delete (raw.minor as { expiresAt?: number }).expiresAt;
  raw.minor = raw.minor ?? null;
  if (raw.director) {
    raw.director.minorThisYear = raw.director.minorThisYear ?? 0;
    raw.director.lastMinorMonthIndex = raw.director.lastMinorMonthIndex ?? -999;
  }
  if (raw.stats) raw.stats.minorDecisions = raw.stats.minorDecisions ?? 0;
  raw.chronicle = raw.chronicle ?? {};
  raw.lifeMap = raw.lifeMap ?? [];
  raw.villageClans = raw.villageClans ?? {};
  raw.settlements = raw.settlements ?? {};
  raw.activeTrip = raw.activeTrip ?? null;
  // [6] Bù danh sách cơ nghiệp (ventures) và khoản vay NPC (loans) cho hộ gia đình của save cũ
  if (raw.households) {
    for (const h of Object.values(raw.households)) {
      h.ventures = h.ventures ?? [];
      h.loans = h.loans ?? [];
    }
  }
  // [5] Bù nghề riêng mặc định cho người lớn trong hộ của save cũ
  if (raw.characters && raw.clock) {
    const adultAge = content.balance.life.adult_age;
    for (const c of Object.values(raw.characters)) {
      if (!c.alive || c.villageRole || c.clanId || c.id === raw.playerId) continue;
      if (ageOf(c, raw.clock.year, raw.clock.month) >= adultAge) {
        c.careerId = c.careerId ?? raw.householdCareer;
        c.careerRankIndex = c.careerRankIndex ?? 0;
        c.careerMonths = c.careerMonths ?? 0;
        c.careerMerit = c.careerMerit ?? 0;
      }
    }
  }
  delete (raw as Record<string, unknown>).lastCutsceneId;
  if (raw.world) {
    raw.world.settlementType = raw.world.settlementType ?? origin.settlement;
    raw.world.tradeIndex = raw.world.tradeIndex ?? opp.start_trade_index;
    raw.world.militaryAlert = raw.world.militaryAlert ?? opp.military_alerts[0].id;
    raw.world.patrolLevel = raw.world.patrolLevel ?? opp.start_patrol_level;
    raw.world.reignName = raw.world.reignName ?? content.chronicle.startReign;
    raw.world.reignStartYear = raw.world.reignStartYear ?? content.balance.time.start_year;
    raw.world.alertLock = raw.world.alertLock ?? null;

    const culture = content.index.culture.get(raw.cultureId ?? '') ?? content.cultures[0];
    for (const st of content.settlementTypes.filter((t) => t.region_node)) {
      if (!raw.settlements[st.id]) {
        const isHome = st.id === raw.world.settlementType;
        const name = isHome && raw.world.settlementName
          ? raw.world.settlementName
          : st.id === 'thi_tran_ben_song'
            ? (culture?.town_names?.[0] ?? st.name)
            : st.id === 'phu_thanh'
              ? (culture?.prefecture_names?.[0] ?? st.name)
              : (culture?.village_names?.[0] ?? st.name);
        raw.settlements[st.id] = {
          id: st.id,
          name,
          typeId: st.id,
          civilizationId: raw.civilization.id,
          population: Math.round((st.population_band[0] + st.population_band[1]) / 2),
          harvestQuality: raw.world.harvestQuality,
          foodPrice: raw.world.foodPrice,
          tradeIndex: raw.world.tradeIndex,
          patrolLevel: raw.world.patrolLevel,
          disaster: 'none',
          epidemic: null,
        };
      }
    }
  }
  return raw as GameState;
}
