// [0] Cầu nối: dữ liệu đang hiển thị trên màn hình + nhịp thời gian thực (Pause / Auto-pause / tốc độ)
// Lõi không có đồng hồ thực; GameStore gọi session.tickMonth() theo tốc độ trong src/data/balance/time.yaml.
import type { ContentBundle } from '@content/ContentLoader';
import { GameSession, getHudView, type Command, type HudView, type NewGameOptions, type SaveSystem, type SceneDescriptor } from '@core/index';
import { Notifications } from './Notifications';
import { translate } from '@shared/template';

export type Screen = 'menu' | 'life';

export interface StoreSnapshot {
  screen: Screen;
  hud: HudView | null;
  scene: SceneDescriptor | null;
  running: boolean;
  speedIndex: number;
  hasSave: boolean;
  /** Khóa lỗi (error.<mã>) của lệnh vừa thất bại, để UI báo. */
  lastError: string | null;
}

const SLOT = 'auto';

export class GameStore {
  readonly notifications = new Notifications();
  private session: GameSession | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private yearsSinceSave = 0;
  private snapshot: StoreSnapshot;

  constructor(
    readonly content: ContentBundle,
    private readonly saves: SaveSystem,
  ) {
    this.snapshot = {
      screen: 'menu',
      hud: null,
      scene: null,
      running: false,
      speedIndex: content.balance.time.default_speed_index,
      hasSave: false,
      lastError: null,
    };
    void this.saves.load(SLOT).then(
      (s) => this.patch({ hasSave: s !== null }),
      () => this.patch({ hasSave: false }),
    );
  }

  // ── Đăng ký cho React (useSyncExternalStore) và Phaser ──
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): StoreSnapshot => this.snapshot;

  private patch(p: Partial<StoreSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...p };
    this.listeners.forEach((fn) => fn());
  }

  private refresh(extra: Partial<StoreSnapshot> = {}): void {
    const s = this.session;
    this.patch({
      hud: s ? s.read(getHudView) : null,
      scene: s ? s.sceneDescriptor() : null,
      ...extra,
    });
  }

  // ── Vòng đời ván chơi ──
  newGame(opts: Omit<NewGameOptions, 'seed'> & { seed?: string }): void {
    const seed = opts.seed?.trim() || `${Date.now().toString(36)}`;
    this.session = GameSession.create(this.content, { ...opts, seed });
    this.yearsSinceSave = 0;
    this.refresh({ screen: 'life', lastError: null });
    void this.save();
  }

  async continueGame(): Promise<void> {
    const state = await this.saves.load(SLOT);
    if (!state) return;
    this.session = GameSession.load(this.content, JSON.stringify(state));
    this.refresh({ screen: 'life', lastError: null });
  }

  backToMenu(): void {
    this.pause();
    void this.save();
    this.session = null;
    this.refresh({ screen: 'menu' });
  }

  async save(): Promise<void> {
    if (!this.session || this.session.state.gameOver) return;
    await this.saves.save(SLOT, this.session.state);
    this.yearsSinceSave = 0;
    this.patch({ hasSave: true });
    this.notifications.emit('saved', {});
  }

  // ── Thời gian ──
  play(): void {
    if (!this.session || this.session.blocked || this.timer) return;
    const t = this.content.balance.time;
    const interval = t.ms_per_month_at_1x / t.speeds[this.snapshot.speedIndex];
    this.timer = setInterval(() => this.tick(), interval);
    this.patch({ running: true });
  }

  pause(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.snapshot.running) this.patch({ running: false });
  }

  toggle(): void {
    if (this.timer) this.pause();
    else this.play();
  }

  setSpeed(index: number): void {
    const max = this.content.balance.time.speeds.length - 1;
    const wasRunning = !!this.timer;
    this.pause();
    this.patch({ speedIndex: Math.max(0, Math.min(max, index)) });
    if (wasRunning) this.play();
  }

  /** Chạy đúng một tháng (nút "qua tháng" — mô hình lai cho mobile). */
  step(): void {
    if (!this.timer) this.tick();
  }

  /** Chuyển các hoạt cảnh mô phỏng vừa sinh ra cho Phaser (chữ tra ở lang: cutscene.<id>.title/subtitle). */
  private emitCutscenes(ids: string[]): void {
    const pack = this.content.lang[this.content.balance.display.default_language] ?? {};
    for (const id of ids) {
      this.notifications.emit('cutscene', {
        id,
        title: translate(pack, `cutscene.${id}.title`),
        subtitle: translate(pack, `cutscene.${id}.subtitle`),
      });
    }
  }

  private tick(): void {
    const s = this.session;
    if (!s) return;
    const r = s.tickMonth();
    this.emitCutscenes(r.cutscenes);
    if (r.deaths.length) this.notifications.emit('death', { characterIds: r.deaths });
    if (r.newYear) {
      this.notifications.emit('newYear', { year: s.state.clock.year });
      this.yearsSinceSave += 1;
      const every = this.content.balance.time.autosave_every_years;
      if (every > 0 && this.yearsSinceSave >= every) void this.save();
    }
    if (r.decision || r.gameOver) this.pause();
    if (r.decision && s.state.pending) this.notifications.emit('decision', { eventId: s.state.pending.eventId });
    if (r.gameOver) {
      this.notifications.emit('gameOver', {});
      void this.saves.remove(SLOT).then(() => this.patch({ hasSave: false }));
    }
    this.refresh();
  }

  // ── Lệnh người chơi ──
  dispatch(cmd: Command): boolean {
    if (!this.session) return false;
    const res = this.session.dispatch(cmd);
    this.emitCutscenes(this.session.consumeCutscenes());
    const lastError = res.ok ? null : `error.${res.error}`;
    if (!res.ok) this.notifications.emit('commandFailed', { error: res.error });
    this.refresh({ lastError });
    return res.ok;
  }
}
