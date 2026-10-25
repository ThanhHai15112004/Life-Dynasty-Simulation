// [1] Màn hình khởi tạo ván mới: chọn 3 Xuất thân (Nông dân, Thương nhân, Quý tộc nhỏ), tuổi bắt đầu, giới tính, seed
import { useState } from 'react';
import { num, useUi } from '../../context';

export function NewGame() {
  const { store, t } = useUi();
  const origins = store.content.origins;
  const [originId, setOriginId] = useState(origins[0]?.id ?? '');
  const origin = origins.find((o) => o.id === originId) ?? origins[0];
  const [startAge, setStartAge] = useState(origin?.default_start_age ?? 0);
  const [sex, setSex] = useState<'any' | 'm' | 'f'>('any');
  const [seed, setSeed] = useState('');

  const handleSelectOrigin = (id: string) => {
    setOriginId(id);
    const nextOrigin = origins.find((o) => o.id === id);
    if (nextOrigin && !nextOrigin.start_age_options.includes(startAge)) {
      setStartAge(nextOrigin.default_start_age);
    }
  };

  const defaultCareer = origin ? store.content.index.career.get(origin.default_career) : undefined;

  return (
    <div className="newgame-form">
      <h4>{t('menu.origin')}</h4>
      <div className="row">
        {origins.map((o) => (
          <button key={o.id} className={o.id === originId ? 'active' : ''} onClick={() => handleSelectOrigin(o.id)}>
            {o.name}
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
          </div>
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

      <h4>{t('menu.seed')}</h4>
      <input value={seed} placeholder={t('menu.seed_placeholder')} onChange={(e) => setSeed(e.target.value)} />

      <button
        className="primary wide"
        onClick={() => store.newGame({ originId, startAge, sex: sex === 'any' ? undefined : sex, seed })}
      >
        {t('menu.new_game')}
      </button>
    </div>
  );
}
