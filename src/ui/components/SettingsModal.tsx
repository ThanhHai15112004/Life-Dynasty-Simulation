// [8] Hộp thoại Cài đặt (Settings lưu trong IndexedDB): ngôn ngữ, tốc độ, quy tắc tự dừng, hiển thị số/lời, âm lượng, cỡ chữ
import type { FontScaleMode, NumberDisplayMode } from '@bridge/SettingsStore';
import { useSnapshot, useUi } from '../context';
import { Modal } from './Modal';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const s = snap.settings;
  const speeds = store.content.balance.time.speeds;
  const languages = Object.keys(store.content.lang);

  return (
    <Modal title={t('settings.title')} onClose={onClose}>
      <div className="settings-panel">
        <h4>{t('settings.section_general')}</h4>
        <div className="settings-row">
          <span>{t('settings.language')}</span>
          <div className="row">
            {languages.map((code) => (
              <button
                key={code}
                type="button"
                className={s.language === code ? 'active' : ''}
                onClick={() => void store.updateSettings({ language: code })}
              >
                {t(`settings.lang.${code}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span>{t('settings.font_scale')}</span>
          <div className="row">
            {(['sm', 'md', 'lg'] as FontScaleMode[]).map((scale) => (
              <button
                key={scale}
                type="button"
                className={s.fontScale === scale ? 'active' : ''}
                onClick={() => void store.updateSettings({ fontScale: scale })}
              >
                {t(`settings.font.${scale}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span>{t('settings.number_display')}</span>
          <div className="row">
            {(['hybrid', 'words', 'numbers'] as NumberDisplayMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={s.numberDisplay === mode ? 'active' : ''}
                onClick={() => void store.updateSettings({ numberDisplay: mode })}
              >
                {t(`settings.num_mode.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        <h4>{t('settings.section_gameplay')}</h4>
        <div className="settings-row">
          <span>{t('settings.default_speed')}</span>
          <div className="row">
            {speeds.map((sp, idx) => (
              <button
                key={sp}
                type="button"
                className={s.defaultSpeedIndex === idx ? 'active' : ''}
                onClick={() => void store.updateSettings({ defaultSpeedIndex: idx })}
              >
                {t('time.speed', { x: sp })}
              </button>
            ))}
          </div>
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={s.autoMinor}
            onChange={(e) => void store.updateSettings({ autoMinor: e.target.checked })}
          />
          {t('settings.auto_minor')}
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={s.autoPauseOnImportant}
            onChange={(e) => void store.updateSettings({ autoPauseOnImportant: e.target.checked })}
          />
          {t('settings.auto_pause_important')}
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={s.progressiveUi}
            onChange={(e) => void store.updateSettings({ progressiveUi: e.target.checked })}
          />
          {t('settings.progressive_ui')}
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={s.onboardingEnabled}
            onChange={(e) => void store.updateSettings({ onboardingEnabled: e.target.checked })}
          />
          {t('settings.onboarding_enabled')}
        </label>

        {s.dismissedOnboardingStages.length > 0 && (
          <div className="row">
            <button type="button" className="small" onClick={() => void store.resetOnboarding()}>
              {t('settings.reset_onboarding')}
            </button>
          </div>
        )}

        <h4>{t('settings.section_audio')}</h4>
        <label className="toggle">
          <input
            type="checkbox"
            checked={s.muted}
            onChange={(e) => void store.updateSettings({ muted: e.target.checked })}
          />
          {t('settings.mute_all')}
        </label>

        <div className="settings-slider">
          <div className="settings-slider-head">
            <span>{t('settings.music_volume')}</span>
            <b>{s.musicVolume}%</b>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            disabled={s.muted}
            value={s.musicVolume}
            onChange={(e) => void store.updateSettings({ musicVolume: Number(e.target.value) })}
          />
        </div>

        <div className="settings-slider">
          <div className="settings-slider-head">
            <span>{t('settings.ambient_volume')}</span>
            <b>{s.ambientVolume}%</b>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            disabled={s.muted}
            value={s.ambientVolume}
            onChange={(e) => void store.updateSettings({ ambientVolume: Number(e.target.value) })}
          />
        </div>

        <div className="settings-slider">
          <div className="settings-slider-head">
            <span>{t('settings.sfx_volume')}</span>
            <b>{s.sfxVolume}%</b>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            disabled={s.muted}
            value={s.sfxVolume}
            onChange={(e) => {
              void store.updateSettings({ sfxVolume: Number(e.target.value) });
              store.audio.playSfx('click');
            }}
          />
        </div>

        <h4>{t('settings.hotkeys_title')}</h4>
        <p className="muted small">{t('settings.hotkeys_desc')}</p>
      </div>
    </Modal>
  );
}
