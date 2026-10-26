// [1] Màn hình khởi tạo ván mới: chọn 3 Xuất thân (Nông dân, Thương nhân, Quý tộc nhỏ), tuổi bắt đầu, giới tính, seed
// [8] Bổ sung gợi ý ván đầu (xuất thân & tham vọng gợi ý) và bật/tắt hướng dẫn mở dần (GDD 08 §6.5)
import { useState } from 'react';
import { num, useSnapshot, useUi } from '../../context';

export function NewGame() {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const origins = store.content.origins;
  const onboarding = store.content.balance.display.onboarding;
  const fateModes = store.content.balance.fate_modes.modes;
  const playModes = store.content.balance.fate_modes.play_modes;
  const [originId, setOriginId] = useState(onboarding.recommended_origin || (origins[0]?.id ?? ''));
  const origin = origins.find((o) => o.id === originId) ?? origins[0];
  const [startAge, setStartAge] = useState(origin?.default_start_age ?? 0);
  const [sex, setSex] = useState<'any' | 'm' | 'f'>('any');
  const [playMode, setPlayMode] = useState(store.content.balance.fate_modes.default_play_mode);
  const currentPlayMode = playModes.find((m) => m.id === playMode) ?? playModes[0];
  const [fateMode, setFateMode] = useState(store.content.balance.fate_modes.default_mode);
  const currentFate = fateModes.find((m) => m.id === fateMode) ?? fateModes[0];
  const [seed, setSeed] = useState('');

  const handleSelectOrigin = (id: string) => {
    setOriginId(id);
    const nextOrigin = origins.find((o) => o.id === id);
    if (nextOrigin && !nextOrigin.start_age_options.includes(startAge)) {
      setStartAge(nextOrigin.default_start_age);
    }
  };

  const applyFirstGamePreset = () => {
    const recOrigin = origins.find((o) => o.id === onboarding.recommended_origin) ?? origins[0];
    if (recOrigin) {
      setOriginId(recOrigin.id);
      setStartAge(onboarding.recommended_start_age);
    }
    setPlayMode(store.content.balance.fate_modes.default_play_mode);
    setFateMode(store.content.balance.fate_modes.default_mode);
    store.resetOnboarding();
  };

  const defaultCareer = origin ? store.content.index.career.get(origin.default_career) : undefined;
  const settlement = origin ? store.content.index.settlementType.get(origin.settlement) : undefined;
  const recommendedAmbitionId = origin ? onboarding.recommended_ambitions[origin.id] : undefined;
  const recommendedAmbition = recommendedAmbitionId ? store.content.index.ambition.get(recommendedAmbitionId) : undefined;

  return (
    <div className="newgame-form">
      <div className="onboarding-preset-box">
        <div className="card-head" style={{ marginBottom: 4 }}>
          <b>{t('newgame.first_game_title')}</b>
          <button type="button" className="small" onClick={applyFirstGamePreset}>
            {t('newgame.apply_recommended')}
          </button>
        </div>
        <p className="muted small">{t('newgame.first_game_hint')}</p>
        <label className="toggle" style={{ marginTop: 6, marginBottom: 0 }}>
          <input
            type="checkbox"
            checked={snap.settings.onboardingEnabled}
            onChange={(e) =>
              store.updateSettings({
                onboardingEnabled: e.target.checked,
                progressiveUi: e.target.checked ? true : snap.settings.progressiveUi,
              })
            }
          />
          <span>{t('newgame.enable_onboarding')}</span>
        </label>
      </div>

      <h4>{t('menu.origin')}</h4>
      <div className="row">
        {origins.map((o) => (
          <button key={o.id} className={o.id === originId ? 'active' : ''} onClick={() => handleSelectOrigin(o.id)}>
            <span>{o.name}</span>
            {o.id === onboarding.recommended_origin && (
              <span className="tag soft">{t('newgame.recommended_badge')}</span>
            )}
          </button>
        ))}
      </div>
      {origin && (
        <div className="origin-preview">
          <p className="muted small">{origin.description}</p>
          <div className="muted small">
            {t('newgame.starting_wealth', {
              money: `${num(origin.household.money[0])}–${num(origin.household.money[1])}`,
              food: `${num(origin.household.food[0])}–${num(origin.household.food[1])}`,
            })}
            {defaultCareer ? ` · ${t('newgame.default_career', { name: defaultCareer.name })}` : ''}
            {settlement ? ` · ${t('newgame.settlement', { name: settlement.name })}` : ''}
          </div>
          {recommendedAmbition && (
            <div className="muted small" style={{ marginTop: 4 }}>
              <b>{t('newgame.recommended_ambition')}:</b> {recommendedAmbition.name} — {recommendedAmbition.description}
            </div>
          )}
        </div>
      )}

      <h4>{t('menu.start_age')}</h4>
      <div className="row">
        {origin?.start_age_options.map((a) => (
          <button key={a} className={a === startAge ? 'active' : ''} onClick={() => setStartAge(a)}>
            {t('menu.age_option', { age: a })}
          </button>
        ))}
      </div>

      <h4>{t('menu.sex')}</h4>
      <div className="row">
        {(['any', 'm', 'f'] as const).map((s) => (
          <button key={s} className={s === sex ? 'active' : ''} onClick={() => setSex(s)}>
            {t(`menu.sex.${s}`)}
          </button>
        ))}
      </div>

      <h4>{t('menu.play_mode')}</h4>
      <div className="row">
        {playModes.map((m) => (
          <button key={m.id} className={m.id === playMode ? 'active' : ''} onClick={() => setPlayMode(m.id)}>
            {t(m.name_key)}
          </button>
        ))}
      </div>
      {currentPlayMode && <p className="muted small">{t(currentPlayMode.desc_key)}</p>}

      <h4>{t('menu.fate_mode')}</h4>
      <div className="row">
        {fateModes.map((m) => (
          <button key={m.id} className={m.id === fateMode ? 'active' : ''} onClick={() => setFateMode(m.id)}>
            {t(m.name_key)}
          </button>
        ))}
      </div>
      {currentFate && <p className="muted small">{t(currentFate.desc_key)}</p>}

      <h4>{t('menu.seed')}</h4>
      <input value={seed} placeholder={t('menu.seed_placeholder')} onChange={(e) => setSeed(e.target.value)} />

      <button
        className="primary wide"
        onClick={() => store.newGame({ originId, startAge, sex: sex === 'any' ? undefined : sex, fateMode, playMode, seed })}
      >
        {t('menu.new_game')}
      </button>
    </div>
  );
}
