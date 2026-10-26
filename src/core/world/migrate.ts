// [1] Bù các trường mới cho save cũ bằng giá trị mặc định đọc từ data (SaveSystem không biết content)
import type { ContentBundle } from '@content/ContentLoader';
import { ageOf } from '../entities/Character';
import type { GameState } from '../entities/World';

export function migrateState(raw: Partial<GameState>, content: ContentBundle): GameState {
  const origin = content.index.origin.get(raw.originId ?? '') ?? content.origins[0];
  const civ = content.civilizations[0];
  const opp = content.balance.opportunity;
  const happy = content.balance.life.happiness;

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
  raw.reputation = raw.reputation ?? {};
  raw.happiness = raw.happiness ?? { mood: happy.start, satisfaction: happy.start, baselineWealth: 0, ambitionBonus: 0 };
  raw.career = raw.career ?? { id: origin.default_career, since: 0, rankIndex: 0, merit: 0, wanted: 0, actionCooldowns: {} };
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
  delete (raw as Record<string, unknown>).lastCutsceneId;
  if (raw.world) {
    raw.world.settlementType = raw.world.settlementType ?? origin.settlement;
    raw.world.tradeIndex = raw.world.tradeIndex ?? opp.start_trade_index;
    raw.world.militaryAlert = raw.world.militaryAlert ?? opp.military_alerts[0].id;
    raw.world.patrolLevel = raw.world.patrolLevel ?? opp.start_patrol_level;
    raw.world.reignName = raw.world.reignName ?? content.chronicle.startReign;
    raw.world.reignStartYear = raw.world.reignStartYear ?? content.balance.time.start_year;
    raw.world.alertLock = raw.world.alertLock ?? null;
  }
  return raw as GameState;
}
