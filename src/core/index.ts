// [0] Cửa ngõ công khai của lõi mô phỏng cho @bridge, @game, @ui và tools/
export { GameSession, type TickReport } from './api/GameSession';
export type { Command, CommandResult, CommandError } from './api/commands';
export {
  getHudView,
  getLifeSummary,
  getDynastyView,
  getDynastySummary,
  getSuccessionView,
  getVillageClansView,
  getMatchmakingView,
  type HudView,
  type LifeSummaryView,
  type DynastyView,
  type DynastySummaryView,
  type SuccessionView,
  type FamilyTreeNodeView,
  type VillageClanView,
  type MatchmakingView,
  type MatchmakingTargetView,
} from './api/queries';
export type { PastLifeRecord, UnfinishedWish, DynastyFeud, DynastyState, NpcClan, ClanTie } from './entities/Dynasty';
export type { HeirCandidate, MatchmakingCandidate } from './systems/family';
export type { SceneDescriptor, ScenePerson } from './scene-descriptor';
export type { ModifierResult, ModifierLine } from './engine/ModifierSystem';
export { SaveSystem, MemoryStorage, type StorageAdapter } from './engine/SaveSystem';
export type { NewGameOptions } from './world/generate';
export type { GameState, LogEntry, LogYear, PendingEvent } from './entities/World';
