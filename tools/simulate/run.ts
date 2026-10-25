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
  repeatedEvents: number;
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
}

export function runLife(
  content: ContentBundle,
  bot: Bot,
  seed: string,
  startAge: number | undefined,
  maxYears: number,
  originId?: string,
): LifeResult {
  const s = GameSession.create(content, { seed, startAge, originId });
  let years = 0;
  let openLoopsSum = 0;
  let deepDebt = false;
  const apply = (cmds: ReturnType<Bot['yearly']>) => cmds.forEach((c) => s.dispatch(c));

  apply(bot.yearly(s.read(getHudView)));
  for (let m = 0; m < maxYears * 12 && !s.state.gameOver; m++) {
    const r = s.tickMonth();
    if (r.decision) {
      const v = s.read(getHudView);
      s.dispatch({ type: 'chooseOption', optionId: bot.choose(v) });
    }
    if (s.state.gameOver) break;
    const v = s.read(getHudView);
    apply(bot.monthly(v));
    if (v.household.debt > 30) deepDebt = true;
    openLoopsSum += v.openLoops.length / 12;
    if (r.newYear) {
      years += 1;
      apply(bot.yearly(v));
    }
  }

  const st = s.state;
  const seen = Object.values(st.stats.eventsSeen);
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
    repeatedEvents: seen.filter((n) => n > 1).reduce((a, n) => a + n - 1, 0),
    distinctEvents: seen.length,
    ambientLines: st.log.reduce((a, y) => a + y.entries.length, 0),
    storyLinesPerYear: years > 0 ? story.length / years : 0,
    openLoopsSum,
    farmlandEnd: view.household.properties.filter((p) => p.id === 'ruong').reduce((a, p) => a + p.count, 0),
    moneyEnd: view.household.money,
    debtEnd: view.household.debt,
    familyChildDeaths: childDeaths,
    playerDiedYoung: (st.gameOver?.age ?? 99) < 6 && player.alive === false,
    everInDebtOver30: deepDebt,
    netWorthEnd: view.household.money + view.household.properties.reduce((a, p) => a + p.value * p.count, 0) - view.household.debt,
    statusRankEnd: view.player.statusRank.id,
    examDegreeEnd: st.civilization.examDegree,
    careerEnd: st.career.id,
  };
}
