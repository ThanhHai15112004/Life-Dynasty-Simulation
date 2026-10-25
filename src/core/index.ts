// [0] Cửa ngõ công khai của lõi mô phỏng cho @bridge, @game, @ui và tools/
export { GameSession, type TickReport } from './api/GameSession';
export type { Command, CommandResult, CommandError } from './api/commands';
export { getHudView, getLifeSummary, type HudView, type LifeSummaryView } from './api/queries';
export type { SceneDescriptor, ScenePerson } from './scene-descriptor';
export type { ModifierResult, ModifierLine } from './engine/ModifierSystem';
export { SaveSystem, MemoryStorage, type StorageAdapter } from './engine/SaveSystem';
export type { NewGameOptions } from './world/generate';
export type { GameState, LogEntry, LogYear, PendingEvent } from './entities/World';
