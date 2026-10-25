// [1] Bảng Nghề nghiệp & Thời cơ (GDD 04): Hợp đồng nghề, bậc nghề, công trạng, hoạt động nghề và chuyển đổi nghề
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { num, useUi } from '../../context';

export function CareerPanel({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const c = hud.career;

  if (!hud.focus.canChoose) {
    return (
      <div className="decisions">
        <h4>{t('career.current')}</h4>
        <div className="muted">{t('career.too_young')}</div>
      </div>
    );
  }

  const costs = (money: number, food: number) => {
    const parts: string[] = [];
    if (money > 0) parts.push(`${num(money)} ${t('unit.money')}`);
    if (food > 0) parts.push(`${num(food)} ${t('unit.food')}`);
    return parts.join(' · ');
  };

  return (
    <div className="decisions">
      <h4>{t('career.current')}</h4>
      <div className="focus primary">
        <div className="focus-name">
          <Icon id={c.icon} />
          <span>{c.name}</span>
          <span className="chip">{c.rankName}</span>
        </div>
        <p className="muted small">{c.description}</p>
        <div className="small">
          <div>{t('career.merit', { merit: num(c.merit) })}</div>
          {c.nextRankName ? (
            <div className="muted">
              {t('career.next_rank', { name: c.nextRankName, merit: c.nextRankMerit ?? 0 })}
            </div>
          ) : (
            <div className="up">{t('career.max_rank')}</div>
          )}
          {(c.stipendMoney > 0 || c.stipendFood > 0) && (
            <div className="up">
              {t('career.stipend', { money: num(c.stipendMoney), food: num(c.stipendFood) })}
            </div>
          )}
          {c.wanted > 0 && (
            <div className="down">
              {t('career.wanted', { n: c.wanted })}
            </div>
          )}
        </div>
        {c.duties.length > 0 && (
          <ul className="milestones small">
            {c.duties.map((d, i) => (
              <li key={i} className="muted">• {d}</li>
            ))}
          </ul>
        )}
      </div>

      <h4>{t('career.opportunity')}</h4>
      <div className="living">
        <div className="living-opt">
          <span>{t('career.opp.trade', { x: c.opportunity.tradeIndex.toFixed(2) })}</span>
        </div>
        <div className="living-opt">
          <span>{t('career.opp.alert', { state: t(`alert.${c.opportunity.militaryAlert}`) })}</span>
        </div>
        <div className="living-opt">
          <span>{t('career.opp.patrol', { n: c.opportunity.patrolLevel })}</span>
        </div>
      </div>

      <h4>{t('career.actions')}</h4>
      <div className="ambition-list">
        {c.actions.map((act) => {
          const costStr = costs(act.costMoney, act.costFood);
          return (
            <div key={act.id} className="focus" title={act.description}>
              <div className="focus-name">
                <span>{act.name}</span>
                {act.chanceKey && (
                  <span className="muted small">
                    ({t(act.chanceKey)})
                  </span>
                )}
              </div>
              <p className="muted small">{act.description}</p>
              {act.hint && <div className="muted small">{act.hint}</div>}
              {costStr && <div className="small">{t('career.action_cost', { cost: costStr })}</div>}
              <div className="focus-actions">
                <button
                  disabled={!act.available}
                  onClick={() => store.dispatch({ type: 'doCareerAction', actionId: act.id })}
                >
                  {act.cooldownLeft > 0 ? t('career.action_cooldown', { n: act.cooldownLeft }) : t('career.action_do')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <h4>{t('career.switch')}</h4>
      <div className="ambition-list">
        {c.availableCareers
          .filter((opt) => opt.id !== c.id && opt.available)
          .map((opt) => (
            <div key={opt.id} className="focus" title={opt.description}>
              <div className="focus-name">
                <Icon id={opt.icon} />
                <span>{opt.name}</span>
              </div>
              <p className="muted small">{opt.description}</p>
              <div className="focus-actions">
                <button onClick={() => store.dispatch({ type: 'joinCareer', careerId: opt.id })}>
                  {t('career.switch_btn')}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
