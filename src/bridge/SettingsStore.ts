// [8] Lưu trữ cấu hình người chơi (UserSettings) qua StorageAdapter (IndexedDB trên trình duyệt, MemoryStorage trên Node)
import type { ContentBundle } from '@content/ContentLoader';
import type { StorageAdapter } from '@core/engine/SaveSystem';

export type NumberDisplayMode = 'hybrid' | 'words' | 'numbers';
export type FontScaleMode = 'sm' | 'md' | 'lg';

export interface UserSettings {
  language: string;
  defaultSpeedIndex: number;
  autoMinor: boolean;
  autoPauseOnImportant: boolean;
  numberDisplay: NumberDisplayMode;
  progressiveUi: boolean;
  onboardingEnabled: boolean;
  dismissedOnboardingStages: string[];
  musicVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  muted: boolean;
  fontScale: FontScaleMode;
}

export const SETTINGS_STORAGE_KEY = 'dongdoi.settings.v1';

export function createDefaultSettings(content: ContentBundle): UserSettings {
  return {
    language: content.balance.display.default_language,
    defaultSpeedIndex: content.balance.time.default_speed_index,
    autoMinor: false,
    autoPauseOnImportant: true,
    numberDisplay: 'hybrid',
    progressiveUi: true,
    onboardingEnabled: true,
    dismissedOnboardingStages: [],
    musicVolume: 60,
    ambientVolume: 50,
    sfxVolume: 70,
    muted: false,
    fontScale: 'md',
  };
}

export function sanitizeSettings(raw: unknown, defaults: UserSettings, content: ContentBundle): UserSettings {
  if (!raw || typeof raw !== 'object') return { ...defaults };
  const r = raw as Partial<UserSettings>;
  const maxSpeed = Math.max(0, content.balance.time.speeds.length - 1);
  const lang = typeof r.language === 'string' && r.language in content.lang ? r.language : defaults.language;
  const speedIdx =
    typeof r.defaultSpeedIndex === 'number' && Number.isFinite(r.defaultSpeedIndex)
      ? Math.max(0, Math.min(maxSpeed, Math.floor(r.defaultSpeedIndex)))
      : defaults.defaultSpeedIndex;
  const clampVol = (v: unknown, def: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : def;
  const numDisp: NumberDisplayMode =
    r.numberDisplay === 'words' || r.numberDisplay === 'numbers' || r.numberDisplay === 'hybrid'
      ? r.numberDisplay
      : defaults.numberDisplay;
  const fontScale: FontScaleMode =
    r.fontScale === 'sm' || r.fontScale === 'md' || r.fontScale === 'lg' ? r.fontScale : defaults.fontScale;

  return {
    language: lang,
    defaultSpeedIndex: speedIdx,
    autoMinor: typeof r.autoMinor === 'boolean' ? r.autoMinor : defaults.autoMinor,
    autoPauseOnImportant:
      typeof r.autoPauseOnImportant === 'boolean' ? r.autoPauseOnImportant : defaults.autoPauseOnImportant,
    numberDisplay: numDisp,
    progressiveUi: typeof r.progressiveUi === 'boolean' ? r.progressiveUi : defaults.progressiveUi,
    onboardingEnabled:
      typeof r.onboardingEnabled === 'boolean' ? r.onboardingEnabled : defaults.onboardingEnabled,
    dismissedOnboardingStages: Array.isArray(r.dismissedOnboardingStages)
      ? r.dismissedOnboardingStages.filter((x): x is string => typeof x === 'string')
      : defaults.dismissedOnboardingStages,
    musicVolume: clampVol(r.musicVolume, defaults.musicVolume),
    ambientVolume: clampVol(r.ambientVolume, defaults.ambientVolume),
    sfxVolume: clampVol(r.sfxVolume, defaults.sfxVolume),
    muted: typeof r.muted === 'boolean' ? r.muted : defaults.muted,
    fontScale,
  };
}

export class SettingsStore {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly content: ContentBundle,
    private readonly key = SETTINGS_STORAGE_KEY,
  ) {}

  async load(): Promise<UserSettings> {
    const defaults = createDefaultSettings(this.content);
    try {
      const text = await this.storage.get(this.key);
      if (!text) return defaults;
      return sanitizeSettings(JSON.parse(text), defaults, this.content);
    } catch {
      return defaults;
    }
  }

  async save(settings: UserSettings): Promise<void> {
    const clean = sanitizeSettings(settings, createDefaultSettings(this.content), this.content);
    await this.storage.set(this.key, JSON.stringify(clean));
  }
}
