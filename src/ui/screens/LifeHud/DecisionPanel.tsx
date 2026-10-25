// [1] Cột giữa: Trọng tâm năm nay (một lựa chọn, theo giai đoạn đời) và Chí hướng (hình thành qua sự kiện)
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { useUi } from '../../context';

export function FocusCard({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const f = hud.focus;
  const current = f.options.find((o) => o.id === f.primary);
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('focus.title')}</h3>
        <span className="muted small">{f.canChoose ? t('focus.can_change') : ''}</span>
      </div>
      <div className="focus-stage">
        <b>{hud.player.lifeStage}</b> · {hud.household.settlement.name}
      </div>
      {!f.canChoose && <p className="muted">{t('focus.too_young')}</p>}
      {f.canChoose && (
        <div className="focus-chips">
          {f.options.map((o) => (
            <button key={o.id} className={`focus-pill ${f.primary === o.id ? 'primary' : ''}`} title={o.description} onClick={() => store.dispatch({ type: 'setFocus', focusId: o.id })}>
              <span className="focus-pill-name">
                <Icon id={o.icon} />
                {o.name}
              </span>
              <span className="focus-pill-hints">
                {o.hints.map((h, i) => (
                  <span key={i} className={h.good ? 'up' : 'down'}>
                    {h.label}
                    {h.up ? '↑' : '↓'}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}
      {current && <p className="muted small">{current.description}</p>}
    </section>
  );
}

export function AmbitionCard({ hud }: { hud: HudView }) {
  const { t } = useUi();
  const current = hud.ambition.options.find((a) => a.id === hud.ambition.currentId);
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('ambition.title')}</h3>
      </div>
      {!current && <p className="muted">{t('ambition.none_yet')}</p>}
      {current && (
        <div className="ambition primary" title={current.description}>
          <div className="ambition-head">
            <Icon id={current.icon} />
            <b>{current.name}</b>
          </div>
          <p className="muted small">{current.description}</p>
          <ul className="milestones small">
            {current.milestones.map((m) => (
              <li key={m.id} className={m.achieved ? 'up' : 'muted'}>
                {m.achieved ? '✓ ' : '○ '}
                {m.name}
              </li>
            ))}
          </ul>
          <p className="muted small">{t('ambition.change_hint')}</p>
        </div>
      )}
    </section>
  );
}
