// [1] Bù các trường mới cho save cũ bằng giá trị mặc định đọc từ data (SaveSystem không biết content)
import type { ContentBundle } from '@content/ContentLoader';
import type { GameState } from '../entities/World';

export function migrateState(raw: Partial<GameState>, content: ContentBundle): GameState {
  const origin = content.index.origin.get(raw.originId ?? '') ?? content.origins[0];
  const civ = content.civilizations[0];
  const opp = content.balance.opportunity;
  const happy = content.balance.life.happiness;

  raw.ambition = raw.ambition ?? { id: null, achievedMilestones: [] };
  raw.reputation = raw.reputation ?? {};
  raw.happiness = raw.happiness ?? { mood: happy.start, satisfaction: happy.start, baselineWealth: 0, ambitionBonus: 0 };
  raw.career = raw.career ?? { id: origin.default_career, rankIndex: 0, merit: 0, wanted: 0, actionCooldowns: {} };
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
  raw.chronicle = raw.chronicle ?? {};
  raw.lifeMap = raw.lifeMap ?? [];
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
