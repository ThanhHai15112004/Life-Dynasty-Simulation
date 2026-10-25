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
import { yearlyChronicle } from '../systems/chronicle';
import { createContext, type SimContext } from '../systems/context';
import { monthlyEconomy, monthlyWorld, rollHarvestQuality, yearlyEconomy, yearlyHousehold } from '../systems/economy';
import { ensureFocus } from '../systems/focus';
import { monthlyFamily } from '../systems/family';
import { monthlyHappiness, recordLifeYear, yearlyHappiness } from '../systems/happiness';
import { monthlyLife, yearlyVillage } from '../systems/life';
import { monthlyOpportunity, yearlyOpportunity } from '../systems/opportunity';
import { monthlySkills } from '../systems/skills';
import { monthlySocial } from '../systems/social';
import { computeStatusRank, monthlyStatus } from '../systems/status';
import { generateNewGame, type NewGameOptions } from '../world/generate';
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
  yearlyEconomy(ctx);
  yearlyVillage(ctx);
  yearlyHappiness(ctx);
  directorYearEnd(ctx);
  recordLifeYear(ctx);
}

function yearStart(ctx: SimContext): void {
  rollHarvestQuality(ctx);
  yearlyOpportunity(ctx);
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
