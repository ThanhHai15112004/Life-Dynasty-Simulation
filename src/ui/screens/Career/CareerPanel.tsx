// [1] Bảng Nghề nghiệp & Thời cơ (GDD 04) + [2] Nghề nghiệp v2 (Phase 5: ngành, độ sâu, thâm niên, lối ra, nghề tay trái, nghề người nhà, lý lịch nghề)
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { num, useUi } from '../../context';

export function CareerPanel({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const c = hud.career;

  const monthsPerYear = store.content.balance.calendar.months_per_year;
  const formatMonths = (mCount: number) =>
    mCount >= monthsPerYear
      ? t('career.tenure_years', { y: Math.floor(mCount / monthsPerYear), m: mCount % monthsPerYear })
      : t('career.tenure_months', { m: mCount });

  const tenure = formatMonths(c.months);
  const sectorTenure = formatMonths(c.sectorMonths);

  const household = (
    <div className="muted small">
      {t('career.household', { name: c.household.name })}
      {c.household.id !== c.id && c.kind !== ''
        ? ` · ${hud.manage.isHead ? t('career.household_yours') : t('career.household_parents', { who: hud.manage.headCall })}`
        : ''}
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
        <div className="focus-name" style={{ flexWrap: 'wrap', gap: 6 }}>
          <Icon id={c.icon} />
          <span>{c.name}</span>
          <span className="chip">{c.rankName}</span>
          {c.kind === 'nghe' && (
            <>
              <span className="chip">{t(`career.sector.${c.sector}`)}</span>
              <span className="chip">{t(`career.depth.${c.depth}`)}</span>
            </>
          )}
          <span className="muted small">{tenure}</span>
        </div>
        <p className="muted small">{c.description}</p>
        {household}
        <div className="small">
          <div>
            {c.kind === 'trang_thai'
              ? t('career.helper_merit', { merit: num(c.merit) })
              : t('career.merit', { merit: num(c.merit) })}
            {c.sectorMonths > c.months && (
              <span className="muted"> · {t('career.sector_tenure', { time: sectorTenure })}</span>
            )}
            {c.seniorityBonusPercent > 0 && (
              <span className="up"> · {t('career.seniority_bonus', { n: c.seniorityBonusPercent })}</span>
            )}
          </div>
          {c.kind === 'trang_thai' ? null : c.nextRankName ? (
            <div className="muted">
              {t('career.next_rank', { name: c.nextRankName, merit: c.nextRankMerit ?? 0 })}
              {c.nextRankRequirements && (
                <span>
                  {c.nextRankRequirements.minYears > 0 &&
                    ` · ${t('career.req_years', { n: c.nextRankRequirements.minYears })}`}
                  {c.nextRankRequirements.minSkill &&
                    ` · ${t('career.req_skill', {
                      skill: c.nextRankRequirements.minSkill.name,
                      level: c.nextRankRequirements.minSkill.level,
                      cur: c.nextRankRequirements.minSkill.currentLevel,
                    })}`}
                  {c.nextRankRequirements.minReputation !== null &&
                    ` · ${t('career.req_reputation', { n: c.nextRankRequirements.minReputation })}`}
                </span>
              )}
            </div>
          ) : (
            <div className="up">{t('career.max_rank')}</div>
          )}
          {(c.stipendMoney > 0 || c.stipendFood > 0) && (
            <div className="up">
              {t('career.stipend', { money: num(c.stipendMoney), food: num(c.stipendFood) })}
              {c.incomeRange && (
                <span className="muted">
                  {' '}
                  · {t('career.income_range', { min: num(c.incomeRange[0]), max: num(c.incomeRange[1]) })}
                </span>
              )}
            </div>
          )}
          {(c.workEffects.healthMonth !== 0 ||
            c.workEffects.stressMonth !== 0 ||
            c.workEffects.skillXp.length > 0) && (
            <div className="muted">
              {t('career.work_effects')}{' '}
              {c.workEffects.skillXp.map((sk) => `+${num(sk.xp)} XP ${sk.name}`).join(' · ')}
              {c.workEffects.healthMonth !== 0 &&
                ` · ${t('hint.health')} ${c.workEffects.healthMonth > 0 ? '+' : ''}${num(c.workEffects.healthMonth)}`}
              {c.workEffects.stressMonth !== 0 &&
                ` · ${t('hint.stress')} ${c.workEffects.stressMonth > 0 ? '+' : ''}${num(c.workEffects.stressMonth)}`}
            </div>
          )}
          {c.wanted > 0 && <div className="down">{t('career.wanted', { n: c.wanted })}</div>}
        </div>
        {c.duties.length > 0 && (
          <ul className="milestones small">
            {c.duties.map((d, i) => (
              <li key={i} className="muted">
                • {d}
              </li>
            ))}
          </ul>
        )}
      </div>

      {c.exits.length > 0 && (
        <>
          <h4>{t('career.exits_title')}</h4>
          <div className="living">
            {c.exits.map((ex) => (
              <div key={ex.toId} className="living-opt" style={{ justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <Icon id={ex.toIcon} /> <b>{ex.toName}</b>
                  {ex.hint && <div className="muted small">{ex.hint}</div>}
                </div>
                <button
                  className="small"
                  disabled={!ex.unlocked}
                  onClick={() => store.dispatch({ type: 'joinCareer', careerId: ex.toId })}
                >
                  {ex.unlocked ? t('career.switch_btn') : t('career.join_locked')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {c.sideJob.options.length > 0 && (
        <>
          <h4>
            {t('career.side_job_title')}{' '}
            {c.sideJob.currentId && (
              <span className={`chip ${c.sideJob.activeThisMonth ? 'up' : 'muted'}`}>
                {c.sideJob.activeThisMonth ? t('career.side_job_active') : t('career.side_job_offseason')}
              </span>
            )}
          </h4>
          <div className="living">
            <div className="living-opt" style={{ justifyContent: 'space-between' }}>
              <span>{t('career.side_job_none')}</span>
              <button
                className={`small ${c.sideJob.currentId === null ? 'active' : ''}`}
                disabled={c.sideJob.currentId === null}
                onClick={() => store.dispatch({ type: 'setSideJob', sideJobId: null })}
              >
                {c.sideJob.currentId === null ? '✓' : t('career.switch_btn')}
              </button>
            </div>
            {c.sideJob.options.map((sj) => {
              const isChosen = c.sideJob.currentId === sj.id;
              return (
                <div
                  key={sj.id}
                  className={`living-opt ${sj.available ? '' : 'locked'}`}
                  style={{ justifyContent: 'space-between', gap: 8 }}
                >
                  <div>
                    <div>
                      <Icon id={sj.icon} /> <b>{sj.name}</b>{' '}
                      <span className="up small">
                        {t('career.side_job_income', { money: num(sj.incomeMoneyMonth) })}
                      </span>{' '}
                      <span className="muted small">
                        · {t('career.side_job_seasons', { seasons: sj.seasonNames.join(', ') })}
                      </span>
                    </div>
                    <div className="muted small">{sj.description}</div>
                  </div>
                  <button
                    className={`small ${isChosen ? 'active' : ''}`}
                    disabled={!sj.available || isChosen}
                    onClick={() => store.dispatch({ type: 'setSideJob', sideJobId: sj.id })}
                  >
                    {isChosen ? '✓' : t('career.switch_btn')}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {c.familyCareers.length > 1 && (
        <>
          <h4>{t('career.family_careers_title')}</h4>
          <div className="living">
            {c.familyCareers.map((fc) => (
              <div
                key={fc.characterId}
                className="living-opt"
                style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}
              >
                <div>
                  <b>{fc.isPlayer ? t('treat.self') : `${fc.call} (${fc.name})`}</b> ·{' '}
                  <span className="chip">{fc.careerName}</span>{' '}
                  {fc.rankName && <span className="muted small">({fc.rankName})</span>} ·{' '}
                  <span className="muted small">{formatMonths(fc.months)}</span>
                  {fc.monthlyIncome > 0 && (
                    <span className="up small">
                      {' '}
                      · {t('career.family_member_income', { money: num(fc.monthlyIncome) })}
                    </span>
                  )}
                </div>
                {fc.canChange && (
                  <select
                    value={fc.careerId}
                    onChange={(e) =>
                      store.dispatch({
                        type: 'setMemberCareer',
                        characterId: fc.characterId,
                        careerId: e.target.value,
                      })
                    }
                  >
                    {store.content.careers
                      .filter((car) => car.kind === 'nghe' || car.id === 'phu_gia_dinh')
                      .map((car) => (
                        <option key={car.id} value={car.id}>
                          {car.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </>
      )}

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
                {act.chanceKey && <span className="muted small">({t(act.chanceKey)})</span>}
              </div>
              <p className="muted small">{act.description}</p>
              {act.hint && <div className="muted small">{act.hint}</div>}
              {costStr && <div className="small">{t('career.action_cost', { cost: costStr })}</div>}
              <div className="focus-actions">
                <button
                  disabled={!act.available}
                  onClick={() => store.dispatch({ type: 'doCareerAction', actionId: act.id })}
                >
                  {act.cooldownLeft > 0
                    ? t('career.action_cooldown', { n: act.cooldownLeft })
                    : t('career.action_do')}
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
            <div className="focus-name" style={{ flexWrap: 'wrap', gap: 6 }}>
              <Icon id={opt.icon} />
              <span>{opt.name}</span>
              <span className="chip">{t(`career.sector.${opt.sector}`)}</span>
              <span className="chip">{t(`career.depth.${opt.depth}`)}</span>
              {opt.isExit && <span className="chip up">{t('career.exit_tag')}</span>}
              {opt.inSettlement && <span className="muted small">· {t('career.in_settlement_tag')}</span>}
              <span className="muted small">
                · {t('career.income_range', { min: num(opt.incomeRange[0]), max: num(opt.incomeRange[1]) })}
              </span>
              {opt.costMoney > 0 && (
                <span className="muted small">· {t('career.join_cost', { money: num(opt.costMoney) })}</span>
              )}
            </div>
            <p className="muted small">{opt.description}</p>
            {opt.hint && <p className="small">{opt.hint}</p>}
            <div className="focus-actions">
              <button
                disabled={!opt.available}
                onClick={() => store.dispatch({ type: 'joinCareer', careerId: opt.id })}
              >
                {opt.available ? t('career.switch_btn') : t('career.join_locked')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {c.history.length > 0 && (
        <>
          <h4>{t('career.history_title')}</h4>
          <ul className="milestones small">
            {c.history.map((hEntry, idx) => (
              <li key={idx} className="muted">
                •{' '}
                {t('career.history_item', {
                  start: hEntry.startYear,
                  end: hEntry.endYear ?? t('career.history_now'),
                  career: hEntry.careerName,
                  rank: hEntry.rankName,
                  months: hEntry.months,
                })}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
