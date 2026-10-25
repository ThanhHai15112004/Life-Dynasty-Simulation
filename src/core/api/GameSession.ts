// [0] Giống GameManager: bắt đầu game, qua tháng/năm, nhận lệnh, lưu. Chạy được headless trên Node.
import type { ContentBundle } from '@content/ContentLoader';
import { tickMonth as clockTick } from '../engine/GameClock';
import { deserialize, serialize } from '../engine/SaveSystem';
import type { GameState } from '../entities/World';
import { directorMonthly, directorYearEnd, directorYearStart } from '../events/Director';
import { writeTemplate } from '../events/journal';
import { SystemLog } from '../events/systemLogKeys';
import { buildSceneDescriptor, type SceneDescriptor } from '../scene-descriptor';
import { createContext, type SimContext } from '../systems/context';
import { monthlyEconomy, monthlyWorld, rollHarvestQuality, yearlyEconomy } from '../systems/economy';
import { monthlyLife, yearlyVillage } from '../systems/life';
import { monthlySkills } from '../systems/skills';
import { generateNewGame, type NewGameOptions } from '../world/generate';
import { executeCommand, type Command, type CommandResult } from './commands';

export interface TickReport {
  /** Vừa sang năm mới. */
  newYear: boolean;
  /** Có sự kiện quyết định đang chờ → bridge phải tự dừng thời gian. */
  decision: boolean;
  gameOver: boolean;
  /** Người nhà vừa qua đời trong tháng này. */
  deaths: string[];
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
      yearStart(ctx);
      writeTemplate(ctx, SystemLog.GameStart);
    });
    return session;
  }

  static load(content: ContentBundle, saveText: string): GameSession {
    return new GameSession(content, deserialize(saveText));
  }

  get state(): Readonly<GameState> {
    return this._state;
  }

  get blocked(): boolean {
    return this._state.pending !== null || this._state.gameOver !== null;
  }

  private withContext<T>(fn: (ctx: SimContext) => T): T {
    const ctx = createContext(this._state, this.content);
    const out = fn(ctx);
    ctx.rng.flush();
    return out;
  }

  /** Chạy một tháng mô phỏng. Không chạy khi đang chờ quyết định hoặc đã hết đời. */
  tickMonth(): TickReport {
    const empty: TickReport = { newYear: false, decision: false, gameOver: !!this._state.gameOver, deaths: [] };
    if (this.blocked) return { ...empty, decision: this._state.pending !== null };
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
    };
  }

  dispatch(cmd: Command): CommandResult {
    return this.withContext((ctx) => executeCommand(ctx, cmd));
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
  monthlyLife(ctx);
  if (ctx.state.gameOver) return;
  monthlySkills(ctx);
  monthlyEconomy(ctx);
  expireFlags(ctx);
  directorMonthly(ctx);
}

function yearEnd(ctx: SimContext): void {
  yearlyEconomy(ctx);
  yearlyVillage(ctx);
  directorYearEnd(ctx);
}

function yearStart(ctx: SimContext): void {
  rollHarvestQuality(ctx);
  directorYearStart(ctx);
}

function expireFlags(ctx: SimContext): void {
  const now = ctx.state.clock.monthIndex;
  for (const [k, f] of Object.entries(ctx.state.flags)) {
    if (f.expiresAt !== null && f.expiresAt <= now) delete ctx.state.flags[k];
  }
}
