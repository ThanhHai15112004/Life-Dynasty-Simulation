// [0] Cầu nối: dữ liệu đang hiển thị trên màn hình + nhịp thời gian thực (Pause / Auto-pause / tốc độ)
// Lõi không có đồng hồ thực; GameStore gọi session.tickMonth() theo tốc độ trong src/data/balance/time.yaml.
import type { ContentBundle } from '@content/ContentLoader';
import {
  DEFAULT_SAVE_SLOTS,
  GameSession,
  SaveError,
  getHudView,
  type Command,
  type HudView,
  type NewGameOptions,
  type SaveSlotInfo,
  type SaveSystem,
  type SceneDescriptor,
} from '@core/index';
import { translate } from '@shared/template';
import { AudioManager } from './AudioManager';
import { Notifications } from './Notifications';
import {
  SettingsStore,
  createDefaultSettings,
  sanitizeSettings,
  type UserSettings,
} from './SettingsStore';

export type Screen = 'menu' | 'life';

export interface StoreSnapshot {
  screen: Screen;
  hud: HudView | null;
  scene: SceneDescriptor | null;
  running: boolean;
  speedIndex: number;
  hasSave: boolean;
  /** [8] Danh sách các ô lưu game (auto, slot_1, slot_2, slot_3) kèm thông tin tóm tắt hoặc cảnh báo lỗi. */
  saveSlots: SaveSlotInfo[];
  /** Ô lưu đang gắn với phiên chơi hiện tại (mặc định: 'auto'). */
  activeSlot: string;
  /** [8] Cấu hình người chơi lưu trong IndexedDB. */
  settings: UserSettings;
  /** [1] Tự quyết chuyện nhỏ (chọn phương án mặc định, không dừng thời gian) — như "Tự động quyết định" của 1in8b. */
  autoMinor: boolean;
  /** Khóa lỗi (error.<mã>) của lệnh hoặc thao tác lưu/nạp vừa thất bại, để UI báo. */
  lastError: string | null;
  /** [1] Bật Dev Tools */
  devEnabled: boolean;
}

const AUTO_SLOT = 'auto';

export class GameStore {
  readonly notifications = new Notifications();
  readonly audio = new AudioManager();
  private readonly settingsStore: SettingsStore;
  private session: GameSession | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private yearsSinceSave = 0;
  /** Thời gian đang chạy thì bị dừng vì sự kiện/chuyện nhỏ: chọn xong tự chạy tiếp. */
  private resumeAfterChoice = false;
  private snapshot: StoreSnapshot;

  constructor(
    readonly content: ContentBundle,
    private readonly saves: SaveSystem,
  ) {
    this.settingsStore = new SettingsStore(saves.storage, content);
    const defaultSettings = createDefaultSettings(content);
    this.snapshot = {
      screen: 'menu',
      hud: null,
      scene: null,
      running: false,
      speedIndex: defaultSettings.defaultSpeedIndex,
      hasSave: false,
      saveSlots: DEFAULT_SAVE_SLOTS.map((slot) => ({ slot, exists: false, corrupted: false })),
      activeSlot: AUTO_SLOT,
      settings: defaultSettings,
      autoMinor: defaultSettings.autoMinor,
      lastError: null,
      devEnabled: Boolean(import.meta.env.DEV || content.balance.display.dev_tools),
    };

    void this.initAsync();
  }

  private async initAsync(): Promise<void> {
    const loadedSettings = await this.settingsStore.load();
    this.audio.applySettings(loadedSettings);
    this.patch({
      settings: loadedSettings,
      speedIndex: loadedSettings.defaultSpeedIndex,
      autoMinor: loadedSettings.autoMinor,
    });
    await this.refreshSaveSlots();
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
    const hud = s ? s.read(getHudView) : null;
    const scene = s ? s.sceneDescriptor() : null;
    this.audio.syncScene(scene, hud?.player.stress ?? 0, hud?.player.mourningMonthsLeft ?? 0);
    this.patch({
      hud,
      scene,
      ...extra,
    });
  }

  clearError(): void {
    if (this.snapshot.lastError !== null) {
      this.patch({ lastError: null });
    }
  }

  // ── Cài đặt người chơi (lưu IndexedDB) ──
  async updateSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
    const next = sanitizeSettings(
      { ...this.snapshot.settings, ...partial },
      createDefaultSettings(this.content),
      this.content,
    );
    this.audio.applySettings(next);
    const extra: Partial<StoreSnapshot> = {
      settings: next,
      autoMinor: next.autoMinor,
    };
    if (partial.defaultSpeedIndex !== undefined && !this.session) {
      extra.speedIndex = next.defaultSpeedIndex;
    }
    this.patch(extra);
    if (next.autoMinor && this.session?.state.minor) {
      this.session.autoResolveMinor();
      this.refresh();
    }
    await this.settingsStore.save(next);
    return next;
  }

  async dismissOnboardingStage(stageId: string): Promise<void> {
    const cur = this.snapshot.settings.dismissedOnboardingStages;
    if (cur.includes(stageId)) return;
    await this.updateSettings({ dismissedOnboardingStages: [...cur, stageId] });
  }

  async resetOnboarding(): Promise<void> {
    await this.updateSettings({ onboardingEnabled: true, dismissedOnboardingStages: [] });
  }

  // ── Quản lý nhiều ô lưu game ──
  async refreshSaveSlots(): Promise<SaveSlotInfo[]> {
    try {
      const slots = await this.saves.listSlots();
      const autoSlot = slots.find((s) => s.slot === AUTO_SLOT);
      const anyValid = slots.some((s) => s.exists && !s.corrupted);
      const corruptedSlot = slots.find((s) => s.exists && s.corrupted);
      const extra: Partial<StoreSnapshot> = {
        saveSlots: slots,
        hasSave: Boolean((autoSlot && autoSlot.exists && !autoSlot.corrupted) || anyValid),
      };
      if (corruptedSlot && !this.snapshot.lastError) {
        extra.lastError = `error.${corruptedSlot.errorCode ?? 'save_corrupted'}`;
      }
      this.patch(extra);
      return slots;
    } catch {
      this.patch({ hasSave: false });
      return this.snapshot.saveSlots;
    }
  }

  // ── Vòng đời ván chơi ──
  newGame(opts: Omit<NewGameOptions, 'seed'> & { seed?: string }): void {
    const seed = opts.seed?.trim() || `${Date.now().toString(36)}`;
    this.session = GameSession.create(this.content, { ...opts, seed });
    this.yearsSinceSave = 0;
    this.audio.startMusicLoop();
    this.refresh({
      screen: 'life',
      activeSlot: AUTO_SLOT,
      speedIndex: this.snapshot.settings.defaultSpeedIndex,
      autoMinor: this.snapshot.settings.autoMinor,
      lastError: null,
    });
    void this.save();
  }

  startScenario(scenarioId: string, options?: { seed?: string; extraFastForwardYears?: number }): void {
    const sc = this.content.index.scenario.get(scenarioId);
    if (!sc) return;
    this.session = GameSession.createFromScenario(this.content, sc, options);
    this.yearsSinceSave = 0;
    this.audio.startMusicLoop();
    this.refresh({ screen: 'life', activeSlot: AUTO_SLOT, lastError: null });
    void this.save();
  }

  async continueGame(slot = AUTO_SLOT): Promise<boolean> {
    const targetInfo =
      this.snapshot.saveSlots.find((s) => s.slot === slot && s.exists && !s.corrupted) ??
      this.snapshot.saveSlots.find((s) => s.exists && !s.corrupted);
    return this.loadSlot(targetInfo?.slot ?? slot);
  }

  async loadSlot(slot: string): Promise<boolean> {
    this.pause();
    try {
      const raw = await this.saves.loadRaw(slot);
      if (!raw) {
        this.patch({ lastError: 'error.save_empty' });
        this.audio.playSfx('error');
        return false;
      }
      this.session = GameSession.load(this.content, raw);
      this.yearsSinceSave = 0;
      this.audio.startMusicLoop();
      this.refresh({ screen: 'life', activeSlot: slot, lastError: null });
      return true;
    } catch (e) {
      const code = e instanceof SaveError ? e.code : 'save_corrupted';
      const errKey = `error.${code}`;
      this.patch({ lastError: errKey });
      this.notifications.emit('saveError', { code, slot });
      this.audio.playSfx('error');
      await this.refreshSaveSlots();
      return false;
    }
  }

  backToMenu(clearAutoSave = false): void {
    this.pause();
    this.audio.stopMusicLoop();
    if (clearAutoSave) {
      void this.saves.remove(AUTO_SLOT).then(() => this.refreshSaveSlots());
    } else {
      void this.save();
    }
    this.session = null;
    this.refresh({ screen: 'menu' });
  }

  async save(slot = AUTO_SLOT): Promise<boolean> {
    if (!this.session) return false;
    if (this.session.state.gameOver && this.session.state.playMode !== 'dynasty') return false;
    await this.saves.save(slot, this.session.state);
    if (slot === AUTO_SLOT) this.yearsSinceSave = 0;
    await this.refreshSaveSlots();
    this.notifications.emit('saved', { slot });
    this.audio.playSfx('saved');
    return true;
  }

  async saveToSlot(slot: string): Promise<boolean> {
    const ok = await this.save(slot);
    if (ok) {
      this.patch({ activeSlot: slot, lastError: null });
    }
    return ok;
  }

  async deleteSlot(slot: string): Promise<void> {
    await this.saves.remove(slot);
    await this.refreshSaveSlots();
  }

  async exportSlot(slot?: string): Promise<string | null> {
    if (!slot || (this.session && slot === this.snapshot.activeSlot)) {
      return this.exportSave();
    }
    return this.saves.loadRaw(slot);
  }

  // ── Thời gian ──
  play(): void {
    if (!this.session || this.session.blocked || this.timer) return;
    const t = this.content.balance.time;
    const interval = t.ms_per_month_at_1x / t.speeds[this.snapshot.speedIndex];
    this.timer = setInterval(() => this.tick(), interval);
    this.audio.startMusicLoop();
    this.patch({ running: true });
  }

  pause(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.snapshot.running) this.patch({ running: false });
  }

  /** [1] Bật/tắt tự quyết chuyện nhỏ; đang có chuyện nhỏ chờ thì quyết luôn. */
  toggleAutoMinor(): void {
    const next = !this.snapshot.autoMinor;
    this.patch({ autoMinor: next });
    void this.updateSettings({ autoMinor: next });
    if (next && this.session?.state.minor) {
      this.session.autoResolveMinor();
      this.refresh();
    }
  }

  toggle(): void {
    if (this.timer) this.pause();
    else this.play();
  }

  setSpeed(index: number): void {
    const max = this.content.balance.time.speeds.length - 1;
    const wasRunning = !!this.timer;
    this.pause();
    const clamped = Math.max(0, Math.min(max, index));
    this.patch({ speedIndex: clamped });
    if (wasRunning) this.play();
  }

  /** Chạy đúng một tháng (nút "qua tháng" — mô hình lai cho mobile). */
  step(): void {
    if (!this.timer) this.tick();
  }

  /** Chuyển các hoạt cảnh mô phỏng vừa sinh ra cho Phaser (chữ tra ở lang: cutscene.<id>.title/subtitle). */
  private emitCutscenes(ids: string[]): void {
    const langCode = this.snapshot.settings.language || this.content.balance.display.default_language;
    const pack = this.content.lang[langCode] ?? this.content.lang[this.content.balance.display.default_language] ?? {};
    for (const id of ids) {
      this.notifications.emit('cutscene', {
        id,
        title: translate(pack, `cutscene.${id}.title`),
        subtitle: translate(pack, `cutscene.${id}.subtitle`),
      });
      this.audio.playSfx('cutscene');
    }
  }

  private tick(): void {
    const s = this.session;
    if (!s) return;
    let r = s.tickMonth();
    if (r.minor && this.snapshot.autoMinor) {
      s.autoResolveMinor();
      r = { ...r, minor: false };
    }
    this.emitCutscenes(r.cutscenes);
    if (r.deaths.length) {
      this.notifications.emit('death', { characterIds: r.deaths });
      this.audio.playSfx('death');
      if (this.snapshot.settings.autoPauseOnImportant) {
        this.pause();
      }
    }
    if (r.newYear) {
      this.notifications.emit('newYear', { year: s.state.clock.year });
      this.audio.playSfx('newYear');
      this.yearsSinceSave += 1;
      const every = this.content.balance.time.autosave_every_years;
      if (every > 0 && this.yearsSinceSave >= every) void this.save(AUTO_SLOT);
    }
    if (r.decision || r.minor || r.gameOver) {
      if (!r.gameOver && this.timer) this.resumeAfterChoice = true;
      this.pause();
    }
    if (r.decision && s.state.pending) {
      this.notifications.emit('decision', { eventId: s.state.pending.eventId });
      this.audio.playSfx('decision');
    }
    if (r.gameOver) {
      this.notifications.emit('gameOver', {});
      this.audio.playSfx('death');
      const nextHud = s.read(getHudView);
      if (s.state.playMode !== 'dynasty' || nextHud.succession?.extinct) {
        void this.saves.remove(AUTO_SLOT).then(() => this.refreshSaveSlots());
      } else {
        void this.save(AUTO_SLOT);
      }
    }
    this.refresh();
  }

  // ── Lệnh người chơi ──
  dispatch(cmd: Command): boolean {
    if (!this.session) return false;
    const res = this.session.dispatch(cmd);
    this.emitCutscenes(this.session.consumeCutscenes());
    // Chọn xong sự kiện / chuyện nhỏ: nếu trước đó thời gian đang chạy thì chạy tiếp
    if (res.ok && (cmd.type === 'chooseOption' || cmd.type === 'chooseMinor') && this.resumeAfterChoice && !this.session.blocked) {
      this.resumeAfterChoice = false;
      queueMicrotask(() => this.play());
    }
    if (res.ok && cmd.type === 'chooseHeir') {
      void this.save(AUTO_SLOT);
    }
    const lastError = res.ok ? null : `error.${res.error}`;
    if (!res.ok) {
      this.notifications.emit('commandFailed', { error: res.error });
      this.audio.playSfx('error');
    } else {
      this.audio.playSfx('click');
    }
    this.refresh({ lastError });
    return res.ok;
  }

  // ── Dev Proxy Helpers ──
  devAdvance(months: number): void {
    if (!this.session || !this.snapshot.devEnabled) return;
    for (let i = 0; i < months; i++) {
      if (this.session.state.gameOver) break;
      if (this.session.state.pending) {
        const optId = this.session.state.pending.options[0]?.id;
        if (optId) this.session.dispatch({ type: 'chooseOption', optionId: optId });
      }
      if (this.session.state.minor) {
        this.session.autoResolveMinor();
      }
      this.tick();
    }
  }

  exportSave(): string | null {
    if (!this.session) return null;
    return this.session.serialize();
  }

  importSave(json: string, slot = AUTO_SLOT): boolean {
    try {
      this.session = GameSession.load(this.content, json);
      this.audio.startMusicLoop();
      this.refresh({ screen: 'life', activeSlot: slot, lastError: null });
      void this.save(slot);
      return true;
    } catch (e) {
      const code = e instanceof SaveError ? e.code : 'save_corrupted';
      this.patch({ lastError: `error.${code}` });
      this.notifications.emit('saveError', { code, slot });
      this.audio.playSfx('error');
      return false;
    }
  }
}
