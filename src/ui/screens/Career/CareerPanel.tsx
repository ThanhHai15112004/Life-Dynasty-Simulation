// [1] Bảng Nghề nghiệp & Thời cơ (GDD 04): Hợp đồng nghề, bậc nghề, công trạng, hoạt động nghề và chuyển đổi nghề
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { num, useUi } from '../../context';

export function CareerPanel({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const c = hud.career;

  // Thâm niên: "3 năm 2 tháng"
  const months = store.content.balance.calendar.months_per_year;
  const tenure = c.months >= months ? t('career.tenure_years', { y: Math.floor(c.months / months), m: c.months % months }) : t('career.tenure_months', { m: c.months });
  const household = (
    <div className="muted small">
      {t('career.household', { name: c.household.name })}
      {c.household.id !== c.id && c.kind !== '' ? ` · ${hud.manage.isHead ? t('career.household_yours') : t('career.household_parents', { who: hud.manage.headCall })}` : ''}
    </div>
  );

  if (c.kind === '') {
    return (
      <div className="decisions">
        <h4>{t('career.current')}</h4>
        <div className="muted">{t('career.too_young')}</div>
        {household}
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
          <span className="muted small">{tenure}</span>
        </div>
        <p className="muted small">{c.description}</p>
        {household}
        <div className="small">
          <div>{c.kind === 'trang_thai' ? t('career.helper_merit', { merit: num(c.merit) }) : t('career.merit', { merit: num(c.merit) })}</div>
          {c.kind === 'trang_thai' ? null : c.nextRankName ? (
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

      {c.actions.length > 0 && <h4>{t('career.actions')}</h4>}
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
        {c.availableCareers.map((opt) => (
          <div key={opt.id} className={`focus ${opt.available ? '' : 'locked'}`} title={opt.description}>
            <div className="focus-name">
              <Icon id={opt.icon} />
              <span>{opt.name}</span>
              {opt.costMoney > 0 && <span className="muted small">· {t('career.join_cost', { money: num(opt.costMoney) })}</span>}
            </div>
            <p className="muted small">{opt.description}</p>
            {opt.hint && <p className="small">{opt.hint}</p>}
            <div className="focus-actions">
              <button disabled={!opt.available} onClick={() => store.dispatch({ type: 'joinCareer', careerId: opt.id })}>
                {opt.available ? t('career.switch_btn') : t('career.join_locked')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
