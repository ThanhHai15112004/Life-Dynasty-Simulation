// [0] Menu chính: ván mới (xuất thân, tuổi bắt đầu, giới tính, seed) hoặc chơi tiếp bản lưu
import { useState } from 'react';
import { useSnapshot, useUi } from '../../context';

export function MainMenu() {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const origins = store.content.origins;
  const [originId, setOriginId] = useState(origins[0]?.id ?? '');
  const origin = origins.find((o) => o.id === originId) ?? origins[0];
  const [startAge, setStartAge] = useState(origin?.default_start_age ?? 0);
  const [sex, setSex] = useState<'any' | 'm' | 'f'>('any');
  const [seed, setSeed] = useState('');

  return (
    <div className="menu">
      <div className="menu-card panel">
        <h1>{t('app.title')}</h1>
        <p className="tagline">{t('app.tagline')}</p>

        {snap.hasSave && (
          <button className="primary wide" onClick={() => void store.continueGame()}>
            {t('menu.continue')}
          </button>
        )}

        <h4>{t('menu.origin')}</h4>
        <div className="row">
          {origins.map((o) => (
            <button key={o.id} className={o.id === originId ? 'active' : ''} onClick={() => setOriginId(o.id)}>
              {o.name}
            </button>
          ))}
        </div>
        <p className="muted small">{origin?.description}</p>

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

        <h4>{t('menu.seed')}</h4>
        <input value={seed} placeholder={t('menu.seed_placeholder')} onChange={(e) => setSeed(e.target.value)} />

        <button
          className="primary wide"
          onClick={() => store.newGame({ originId, startAge, sex: sex === 'any' ? undefined : sex, seed })}
        >
          {t('menu.new_game')}
        </button>
        <p className="muted small">{t('menu.hint')}</p>
      </div>
    </div>
  );
}
