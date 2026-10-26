// Chạy một đời headless với một bot và thu số liệu cân bằng
import type { ContentBundle } from '@content/ContentLoader';
import { GameSession } from '@core/api/GameSession';
import { getHudView } from '@core/api/queries';
import { ageOf } from '@core/entities/Character';
import type { Bot } from './bots';

export interface LifeResult {
  bot: string;
  deathAge: number | null;
  causeId: string | null;
  years: number;
  decisions: number;
  /** Số lần gặp lại sự kiện quyết định (không tính chuyện nhỏ). */
  repeatedEvents: number;
  minorDecisions: number;
  /** Số lần gặp lại chuyện nhỏ. */
  repeatedMinor: number;
  /** Người chơi từng lập gia đình. */
  married: boolean;
  distinctEvents: number;
  ambientLines: number;
  storyLinesPerYear: number;
  openLoopsSum: number;
  farmlandEnd: number;
  moneyEnd: number;
  debtEnd: number;
  familyChildDeaths: number;
  playerDiedYoung: boolean;
  everInDebtOver30: boolean;
  netWorthEnd: number;
  statusRankEnd: string;
  examDegreeEnd: string;
  careerEnd: string;
  /** [1.5] Tuổi người chơi lần đầu làm chủ hộ (null: chưa từng). */
  headAge: number | null;
  /** [1.5] Bậc địa vị cao nhất từng đạt (index trong thang). */
  bestStatusIndex: number;
  /** [2] Đời này có xảy ra tách hộ (người chơi hoặc anh chị em ra ở riêng) không. */
  hasSplit: boolean;
}

export interface DynastySimResult {
  bot: string;
  generations: number;
  years: number;
  extinct100y: boolean;
  bestStatusIndex: number;
  ascendedSocialClass: boolean;
}

export function runLife(
  content: ContentBundle,
  bot: Bot,
  seed: string,
  startAge: number | undefined,
  maxYears: number,
  originId?: string,
  scenarioId?: string,
): LifeResult {
  const sc = scenarioId ? content.index.scenario.get(scenarioId) : undefined;
  const s = sc
    ? GameSession.createFromScenario(content, sc, { seed })
    : GameSession.create(content, { seed, startAge, originId });
  let years = 0;
  let openLoopsSum = 0;
  let deepDebt = false;
  let married = false;
  let headAge: number | null = null;
  let bestStatusIndex = 0;
  const apply = (cmds: ReturnType<Bot['yearly']>) => cmds.forEach((c) => s.dispatch(c));

  apply(bot.yearly(s.read(getHudView)));
  for (let m = 0; m < maxYears * 12 && !s.state.gameOver; m++) {
    const r = s.tickMonth();
    if (r.minor) s.autoResolveMinor();
    if (r.decision) {
      const v = s.read(getHudView);
      s.dispatch({ type: 'chooseOption', optionId: bot.choose(v) });
    }
    if (s.state.gameOver) break;
    const v = s.read(getHudView);
    apply(bot.monthly(v));
    if (v.household.debt > 30) deepDebt = true;
    if (s.state.characters[s.state.playerId].spouseId) married = true;
    if (headAge === null && v.manage.isHead) headAge = v.player.age;
    bestStatusIndex = Math.max(bestStatusIndex, v.player.statusRank.index);
    openLoopsSum += v.openLoops.length / 12;
    if (r.newYear) {
      years += 1;
      apply(bot.yearly(v));
    }
  }

  const st = s.state;
  const isMinor = (id: string) => content.index.event.get(id)?.minor === true;
  const repeats = (minor: boolean) =>
    Object.entries(st.stats.eventsSeen)
      .filter(([id, n]) => isMinor(id) === minor && n > 1)
      .reduce((a, [, n]) => a + n - 1, 0);
  const player = st.characters[st.playerId];
  const story = st.log.flatMap((y) => y.entries).filter((e) => e.kind !== 'he_thong' && e.kind !== 'bao_cao' && e.kind !== 'tong_hop');
  const view = s.read(getHudView);
  const childDeaths = Object.values(st.characters).filter(
    (c) => !c.alive && c.householdId === st.householdId && c.deathYear !== undefined && ageOf(c, c.deathYear, 12) < 6,
  ).length;
  return {
    bot: bot.name,
    deathAge: st.gameOver?.age ?? null,
    causeId: st.gameOver?.causeId ?? null,
    years,
    decisions: st.stats.decisions,
    repeatedEvents: repeats(false),
    minorDecisions: st.stats.minorDecisions,
    repeatedMinor: repeats(true),
    married,
    distinctEvents: Object.keys(st.stats.eventsSeen).length,
    ambientLines: st.log.reduce((a, y) => a + y.entries.length, 0),
    storyLinesPerYear: years > 0 ? story.length / years : 0,
    openLoopsSum,
    farmlandEnd: view.household.properties.filter((p) => p.id === 'ruong').reduce((a, p) => a + p.count, 0),
    moneyEnd: view.household.money,
    debtEnd: view.household.debt,
    familyChildDeaths: childDeaths,
    playerDiedYoung: (st.gameOver?.age ?? 99) < 6 && player.alive === false,
    everInDebtOver30: deepDebt,
    netWorthEnd: view.household.netWorth,
    statusRankEnd: view.player.statusRank.id,
    examDegreeEnd: st.civilization.examDegree,
    careerEnd: st.career.id,
    headAge,
    bestStatusIndex,
    hasSplit: Boolean(st.households[st.householdId]?.parentHouseholdId),
  };
}

/** [2] Chạy nhiều đời liên tiếp ở chế độ Dynasty để đo tỷ lệ tuyệt tự 100 năm và thăng tầng xã hội qua 3–4 đời. */
export function runDynasty(
  content: ContentBundle,
  bot: Bot,
  seed: string,
  originId?: string,
  maxYears = 160,
  maxGenerations = 4,
): DynastySimResult {
  const s = GameSession.create(content, { seed, originId, playMode: 'dynasty' });
  let years = 0;
  let bestStatusIndex = 0;
  let extinct100y = false;
  const apply = (cmds: ReturnType<Bot['yearly']>) => cmds.forEach((c) => s.dispatch(c));

  apply(bot.yearly(s.read(getHudView)));
  for (let m = 0; m < maxYears * 12; m++) {
    const r = s.tickMonth();
    if (r.minor) s.autoResolveMinor();
    if (r.decision) {
      const v = s.read(getHudView);
      s.dispatch({ type: 'chooseOption', optionId: bot.choose(v) });
    }
    if (s.state.gameOver) {
      const v = s.read(getHudView);
      if (v.succession && !v.succession.extinct) {
        if (s.state.dynasty.currentGeneration < maxGenerations) {
          s.dispatch({ type: 'chooseHeir', heirId: v.succession.candidates[0].characterId });
          apply(bot.yearly(s.read(getHudView)));
          continue;
        }
        break;
      } else {
        if (years <= 100) extinct100y = true;
        break;
      }
    }

    const v = s.read(getHudView);
    apply(bot.monthly(v));
    if (v.player.age >= 30 && v.dynasty.canAdoptChild) {
      s.dispatch({ type: 'adoptChild' });
    } else if (v.player.age >= 24 && v.dynasty.canAdoptRelative) {
      s.dispatch({ type: 'adoptRelative' });
    }
    bestStatusIndex = Math.max(bestStatusIndex, v.player.statusRank.index);
    if (r.newYear) {
      years += 1;
      apply(bot.yearly(v));
    }
  }

  const richIndex = Math.max(1, content.civilizations[0].status_ranks.findIndex((x) => x.id === 'phu_ho'));
  return {
    bot: bot.name,
    generations: s.state.dynasty.currentGeneration,
    years,
    extinct100y,
    bestStatusIndex,
    ascendedSocialClass: bestStatusIndex >= richIndex,
  };
}
