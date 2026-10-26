// [0] Giống GameManager: bắt đầu game, qua tháng/năm, nhận lệnh, lưu. Chạy được headless trên Node.
import type { ContentBundle } from '@content/ContentLoader';
import { tickMonth as clockTick } from '../engine/GameClock';
import { deserialize, serialize } from '../engine/SaveSystem';
import type { GameState } from '../entities/World';
import { directorMonthly, directorYearEnd, directorYearStart } from '../events/Director';
import { autoResolveMinor } from '../events/decision';
import { writeTemplate } from '../events/journal';
import { SystemLog } from '../events/systemLogKeys';
import { buildSceneDescriptor, type SceneDescriptor } from '../scene-descriptor';
import { ensureIndependentLife, monthlyCareer } from '../systems/career';
import { yearlyVillageClans } from '../systems/ai';
import { yearlyChronicle } from '../systems/chronicle';
import { createContext, type SimContext } from '../systems/context';
import { monthlyEconomy, monthlyWorld, rollHarvestQuality, yearlyEconomy, yearlyHousehold } from '../systems/economy';
import { ensureFocus } from '../systems/focus';
import { monthlyFamily, yearlyHouseholdSplit } from '../systems/family';
import { monthlyHappiness, recordLifeYear, yearlyHappiness } from '../systems/happiness';
import { monthlyLife, yearlyVillage } from '../systems/life';
import { monthlyOpportunity, yearlyOpportunity } from '../systems/opportunity';
import { monthlySkills } from '../systems/skills';
import { monthlySocial } from '../systems/social';
import { computeStatusRank, monthlyStatus } from '../systems/status';
import { generateNewGame, type NewGameOptions } from '../world/generate';
import { monthlyRegion, yearlyRegion } from '../world/region';
import { applyScenario } from '../world/scenario';
import type { Scenario } from '@content/schemas';
import { migrateState } from '../world/migrate';
import { executeCommand, type Command, type CommandResult } from './commands';

export interface TickReport {
  /** Vừa sang năm mới. */
  newYear: boolean;
  /** Có sự kiện quyết định đang chờ → bridge phải tự dừng thời gian. */
  decision: boolean;
  gameOver: boolean;
  /** Người nhà vừa qua đời trong tháng này. */
  deaths: string[];
  /** Hoạt cảnh (micro-cutscene) phát sinh trong tháng, theo thứ tự. */
  cutscenes: string[];
  /** [1] Có chuyện nhỏ đang chờ chọn → bridge dừng thời gian (trừ khi bật tự quyết). */
  minor: boolean;
}

export class GameSession {
  private constructor(
    readonly content: ContentBundle,
    private _state: GameState,
  ) {}

  static create(content: ContentBundle, opts: NewGameOptions): GameSession {
    const state = generateNewGame(content, opts, (s) => createContext(s, content));
    const session = new GameSession(content, state);
    session.withContext((ctx) => {
      ctx.state.civilization.statusRank = computeStatusRank(ctx).id;
      yearStart(ctx);
      writeTemplate(ctx, content.index.origin.get(ctx.state.originId)?.start_log ?? SystemLog.GameStart);
      ensureIndependentLife(ctx);
      ensureFocus(ctx);
    });
    return session;
  }

  static createFromScenario(
    content: ContentBundle,
    scenario: Scenario,
    overrides?: { seed?: string; extraFastForwardYears?: number },
  ): GameSession {
    const seed = overrides?.seed || scenario.base.seed || scenario.id;
    const opts: NewGameOptions = {
      seed,
      originId: scenario.base.originId,
      startAge: scenario.base.age,
      sex: scenario.base.sex,
      fateMode: scenario.base.fateMode,
      playMode: scenario.base.playMode,
    };
    const state = generateNewGame(content, opts, (s) => createContext(s, content));
    const session = new GameSession(content, state);
    session.withContext((ctx) => {
      ctx.state.civilization.statusRank = computeStatusRank(ctx).id;
      yearStart(ctx);
      writeTemplate(ctx, content.index.origin.get(ctx.state.originId)?.start_log ?? SystemLog.GameStart);
      ensureIndependentLife(ctx);
      ensureFocus(ctx);
      applyScenario(ctx, scenario);
    });

    const ffYears = (scenario.fast_forward_years ?? 0) + (overrides?.extraFastForwardYears ?? 0);
    if (ffYears > 0) {
      const months = ffYears * content.balance.calendar.months_per_year;
      for (let m = 0; m < months; m++) {
        if (session.state.gameOver) break;
        if (session.state.pending) {
          // Tự động chọn phương án đầu tiên để tiếp tục tua
          const optId = session.state.pending.options[0]?.id;
          if (optId) session.dispatch({ type: 'chooseOption', optionId: optId });
        }
        if (session.state.minor) {
          session.autoResolveMinor();
        }
        session.tickMonth();
      }
    }

    return session;
  }

  static load(content: ContentBundle, saveText: string): GameSession {
    return new GameSession(content, migrateState(deserialize(saveText), content));
  }

  get state(): Readonly<GameState> {
    return this._state;
  }

  /** Đang chờ người chơi chọn (sự kiện hoặc chuyện nhỏ) hoặc đã hết đời: không tick được. */
  get blocked(): boolean {
    return this._state.pending !== null || this._state.minor !== null || this._state.gameOver !== null;
  }

  /** [1] Tự quyết chuyện nhỏ đang chờ bằng phương án mặc định. */
  autoResolveMinor(): void {
    this.withContext((ctx) => autoResolveMinor(ctx));
  }

  private withContext<T>(fn: (ctx: SimContext) => T): T {
    const ctx = createContext(this._state, this.content);
    const out = fn(ctx);
    ctx.rng.flush();
    return out;
  }

  /** Chạy một tháng mô phỏng. Không chạy khi đang chờ quyết định hoặc đã hết đời. */
  tickMonth(): TickReport {
    const empty: TickReport = { newYear: false, decision: false, gameOver: !!this._state.gameOver, deaths: [], cutscenes: [], minor: false };
    if (this.blocked) return { ...empty, decision: this._state.pending !== null, minor: this._state.minor !== null };
    const aliveBefore = new Set(Object.values(this._state.characters).filter((c) => c.alive).map((c) => c.id));

    const info = this.withContext((ctx) =>
      clockTick(ctx.state.clock, this.content.balance.calendar.months_per_year, {
        monthly: () => monthly(ctx),
        yearEnd: () => yearEnd(ctx),
        yearStart: () => yearStart(ctx),
        halted: () => ctx.state.gameOver !== null,
      }),
    );

    const deaths = [...aliveBefore].filter(
      (id) => !this._state.characters[id].alive && this._state.characters[id].householdId === this._state.householdId,
    );
    return {
      newYear: info.yearEnded && !this._state.gameOver,
      decision: this._state.pending !== null,
      gameOver: this._state.gameOver !== null,
      deaths,
      cutscenes: this.consumeCutscenes(),
      minor: this._state.minor !== null,
    };
  }

  dispatch(cmd: Command): CommandResult {
    return this.withContext((ctx) => executeCommand(ctx, cmd));
  }

  /** Lấy ra (và xóa) các hoạt cảnh đang chờ phát. */
  consumeCutscenes(): string[] {
    return this._state.cutscenes.splice(0);
  }

  /** Đọc dữ liệu qua ngữ cảnh chỉ đọc (dùng cho queries). */
  read<T>(fn: (ctx: SimContext) => T): T {
    // Không flush RNG: truy vấn không được làm lệch trạng thái tất định
    return fn(createContext(this._state, this.content));
  }

  sceneDescriptor(): SceneDescriptor {
    return this.read(buildSceneDescriptor);
  }

  serialize(): string {
    return serialize(this._state);
  }
}

function monthly(ctx: SimContext): void {
  monthlyWorld(ctx);
  monthlyOpportunity(ctx);
  monthlyRegion(ctx);
  monthlyLife(ctx);
  if (ctx.state.gameOver) return;
  monthlyFamily(ctx);
  ensureFocus(ctx);
  monthlySkills(ctx);
  monthlyCareer(ctx);
  monthlyStatus(ctx);
  monthlyEconomy(ctx);
  monthlySocial(ctx);
  monthlyHappiness(ctx);
  expireFlags(ctx);
  directorMonthly(ctx);
}

function yearEnd(ctx: SimContext): void {
  yearlyHouseholdSplit(ctx);
  yearlyEconomy(ctx);
  yearlyVillage(ctx);
  yearlyVillageClans(ctx);
  yearlyHappiness(ctx);
  directorYearEnd(ctx);
  recordLifeYear(ctx);
  pruneOldData(ctx);
}

/**
 * [9] Cắt tỉa nhật ký thường quá hạn (giữ trọn vẹn dòng dấu mốc highlight & biên niên)
 * và dọn NPC dòng họ ngoại tộc đã mất lâu năm không liên quan tới gia phả/sổ nợ.
 */
function pruneOldData(ctx: SimContext): void {
  const { state, content } = ctx;
  const perf = content.balance.display.performance;
  const hiImp = content.balance.display.highlight_importance;
  const logCutoffYear = state.clock.year - perf.max_routine_log_years;

  for (const y of state.log) {
    if (y.year < logCutoffYear) {
      y.entries = y.entries.filter(
        (e) => e.highlight || e.importance >= hiImp || e.sourceId.startsWith('chronicle.'),
      );
    }
  }
  state.log = state.log.filter((y) => y.entries.length > 0 || y.year >= state.clock.year);

  const npcCutoffYear = state.clock.year - perf.dead_npc_cleanup_years;
  const clanHouseholdIds = new Set(
    Object.values(state.villageClans ?? {}).map((cl) => cl.householdId),
  );
  // Dọn các thành viên NPC đã mất lâu năm khỏi hộ phụ / hộ dòng họ khác và xóa hộ tách riêng trống
  for (const [hId, h] of Object.entries(state.households)) {
    if (hId === state.householdId) continue;
    h.memberIds = h.memberIds.filter((id) => {
      const c = state.characters[id];
      return c && (c.alive || (c.deathYear ?? state.clock.year) > npcCutoffYear);
    });
    if (h.memberIds.length === 0 && !clanHouseholdIds.has(hId)) {
      delete state.households[hId];
    }
  }

  const protectedIds = new Set<string>([state.playerId, ...Object.values(state.village)]);
  for (const cl of Object.values(state.villageClans ?? {})) {
    protectedIds.add(cl.headId);
  }
  const ancestorIds = new Set<string>([state.playerId]);
  if (state.dynasty.guardianId) protectedIds.add(state.dynasty.guardianId);
  for (const p of state.dynasty.pastLives) {
    protectedIds.add(p.characterId);
    ancestorIds.add(p.characterId);
    const pc = state.characters[p.characterId];
    if (pc) {
      if (pc.fatherId) protectedIds.add(pc.fatherId);
      if (pc.motherId) protectedIds.add(pc.motherId);
      if (pc.spouseId) protectedIds.add(pc.spouseId);
    }
  }
  const me = state.characters[state.playerId];
  if (me) {
    if (me.fatherId) protectedIds.add(me.fatherId);
    if (me.motherId) protectedIds.add(me.motherId);
    if (me.spouseId) protectedIds.add(me.spouseId);
  }
  for (const mId of state.households[state.householdId]?.memberIds ?? []) {
    protectedIds.add(mId);
  }
  for (const h of Object.values(state.households)) {
    for (const mId of h.memberIds) protectedIds.add(mId);
  }
  if (state.pending) {
    for (const rId of Object.values(state.pending.roles)) protectedIds.add(rId);
  }
  if (state.minor) {
    for (const rId of Object.values(state.minor.roles)) protectedIds.add(rId);
  }
  for (const s of state.scheduled) {
    for (const rId of Object.values(s.roles)) protectedIds.add(rId);
  }
  for (const c of Object.values(state.characters)) {
    if ((c.fatherId && ancestorIds.has(c.fatherId)) || (c.motherId && ancestorIds.has(c.motherId))) {
      protectedIds.add(c.id);
    }
    if (c.alive) {
      protectedIds.add(c.id);
      if (!c.clanId && !c.villageRole) {
        if (c.fatherId) protectedIds.add(c.fatherId);
        if (c.motherId) protectedIds.add(c.motherId);
        if (c.spouseId) protectedIds.add(c.spouseId);
      }
    }
    if ((c.favorWithPlayer ?? 0) !== 0) protectedIds.add(c.id);
  }

  for (const c of Object.values(state.characters)) {
    if (
      !c.alive &&
      !protectedIds.has(c.id) &&
      (c.deathYear ?? state.clock.year) <= npcCutoffYear
    ) {
      delete state.characters[c.id];
    }
  }
}

function yearStart(ctx: SimContext): void {
  rollHarvestQuality(ctx);
  yearlyOpportunity(ctx);
  yearlyRegion(ctx);
  yearlyChronicle(ctx);
  yearlyHousehold(ctx);
  directorYearStart(ctx);
}

function expireFlags(ctx: SimContext): void {
  const now = ctx.state.clock.monthIndex;
  for (const [k, f] of Object.entries(ctx.state.flags)) {
    if (f.expiresAt !== null && f.expiresAt <= now) delete ctx.state.flags[k];
  }
}
