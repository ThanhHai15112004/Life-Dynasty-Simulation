// [1] Cột giữa: Trọng tâm năm nay (Focus chính/phụ + Mức sống) và Tham vọng cả đời — hai công cụ lái cuộc đời
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { num, useUi } from '../../context';

export function FocusCard({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const f = hud.focus;
  const setFocus = (primary: string, secondary: string | null) => store.dispatch({ type: 'setFocus', primary, secondary });
  const primary = f.options.find((o) => o.id === f.primary);
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
          {f.options
            .filter((o) => o.available)
            .map((o) => {
              const isPrimary = f.primary === o.id;
              const isSecondary = f.secondary === o.id;
              return (
                <div key={o.id} className={`focus-chip ${isPrimary ? 'primary' : ''} ${isSecondary ? 'secondary' : ''}`} title={o.description}>
                  <button className="focus-main" onClick={() => setFocus(o.id, f.secondary === o.id ? null : f.secondary)}>
                    <Icon id={o.icon} />
                    <span>{o.name}</span>
                    {isPrimary && <span className="tag">{t('focus.is_primary')}</span>}
                    {isSecondary && <span className="tag soft">{t('focus.is_secondary')}</span>}
                  </button>
                  {f.canSecondary && o.allowSecondary && !isPrimary && (
                    <button className="focus-sub" onClick={() => setFocus(f.primary, isSecondary ? null : o.id)} title={isSecondary ? t('focus.unset_secondary') : t('focus.set_secondary')}>
                      {isSecondary ? '−' : '+'}
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}
      {primary && <p className="muted small">{primary.description}</p>}

      <h4>{t('living.title')}</h4>
      <div className="living">
        {hud.livingStandards.map((l) => (
          <button key={l.id} className={`living-opt ${hud.household.livingStandard === l.id ? 'active' : ''}`} title={l.description} onClick={() => store.dispatch({ type: 'setLivingStandard', id: l.id })}>
            <span>{l.name}</span>
            <span className="small">{t('living.cost', { money: num(l.monthlyMoney) })}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function AmbitionCard({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const options = hud.ambition.options.filter((a) => a.available);
  const current = options.find((a) => a.id === hud.ambition.currentId);
  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('ambition.title')}</h3>
        {current && <span className="muted small">{current.name}</span>}
      </div>
      <div className="ambition-list">
        {options.map((a) => {
          const isCurrent = hud.ambition.currentId === a.id;
          return (
            <div key={a.id} className={`ambition ${isCurrent ? 'primary' : ''}`} title={a.description}>
              <div className="ambition-head">
                <Icon id={a.icon} />
                <b>{a.name}</b>
                {!isCurrent && (
                  <button className="small" onClick={() => store.dispatch({ type: 'setAmbition', id: a.id })}>
                    {t('ambition.select')}
                  </button>
                )}
              </div>
              {isCurrent && (
                <ul className="milestones small">
                  {a.milestones.map((m) => (
                    <li key={m.id} className={m.achieved ? 'up' : 'muted'}>
                      {m.achieved ? '✓ ' : '○ '}
                      {m.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
