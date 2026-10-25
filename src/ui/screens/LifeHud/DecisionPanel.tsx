// [0] Bảng quyết định đầu năm: Trọng tâm (Focus) chính/phụ và Mức sống — hai công cụ lái cuộc đời
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { num, useUi } from '../../context';

export function DecisionPanel({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const f = hud.focus;
  const setFocus = (primary: string, secondary: string | null) => store.dispatch({ type: 'setFocus', primary, secondary });
  return (
    <div className="decisions">
      <h4>{t('focus.title')}</h4>
      {!f.canChoose && <div className="muted">{t('focus.too_young')}</div>}
      {f.canChoose && (
        <div className="focus-grid">
          {f.options
            .filter((o) => o.available)
            .map((o) => {
              const isPrimary = f.primary === o.id;
              const isSecondary = f.secondary === o.id;
              return (
                <div key={o.id} className={`focus ${isPrimary ? 'primary' : ''} ${isSecondary ? 'secondary' : ''}`} title={o.description}>
                  <div className="focus-name">
                    <Icon id={o.icon} />
                    {o.name}
                  </div>
                  <div className="focus-actions">
                    <button disabled={isPrimary} onClick={() => setFocus(o.id, f.secondary === o.id ? null : f.secondary)}>
                      {isPrimary ? t('focus.is_primary') : t('focus.set_primary')}
                    </button>
                    {f.canSecondary && o.allowSecondary && !isPrimary && (
                      <button onClick={() => setFocus(f.primary, isSecondary ? null : o.id)}>
                        {isSecondary ? t('focus.unset_secondary') : t('focus.set_secondary')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      <p className="muted small">{f.options.find((o) => o.id === f.primary)?.description}</p>

      <h4>{t('living.title')}</h4>
      <div className="living">
        {hud.livingStandards.map((l) => (
          <button
            key={l.id}
            className={`living-opt ${hud.household.livingStandard === l.id ? 'active' : ''}`}
            title={l.description}
            onClick={() => store.dispatch({ type: 'setLivingStandard', id: l.id })}
          >
            <span>{l.name}</span>
            <span className="muted small">{t('living.cost', { money: num(l.monthlyMoney) })}</span>
          </button>
        ))}
      </div>
      <p className="muted small">{hud.livingStandards.find((l) => l.id === hud.household.livingStandard)?.description}</p>
    </div>
  );
}
