// [2] Màn hình Truyền đời (Succession) & Bảng Tổng kết dòng họ khi tuyệt tự hoặc dừng chơi (Phase 3)
import { useState } from 'react';
import type { DynastyView, LifeSummaryView, SuccessionView } from '@core/index';
import { StatBar } from '../../components/StatBar';
import { LifeCardSection } from '../../components/StoryModals';
import { num, useUi } from '../../context';

export function SuccessionModal({
  summary,
  succession,
  dynasty,
}: {
  summary: LifeSummaryView;
  succession: SuccessionView;
  dynasty: DynastyView;
}) {
  const { store, t } = useUi();
  const [showDynastySummary, setShowDynastySummary] = useState(false);

  const isExtinctOrEnded = succession.extinct || showDynastySummary;
  const ds = succession.dynastySummary;

  if (isExtinctOrEnded) {
    return (
      <div className="modal-backdrop">
        <div className="summary panel">
          <div className="event-kicker">
            {succession.extinct ? t('succession.extinct_kicker') : t('succession.kicker')}
          </div>
          <h2>{t('succession.summary_title', { family: ds.familyName })}</h2>
          {succession.extinct && (
            <p className="event-text">
              {t('succession.extinct_note', { n: ds.generationsCount })}
            </p>
          )}
          <div className="summary-grid">
            <div>{t('succession.stat_generations', { n: ds.generationsCount })}</div>
            <div>{t('succession.stat_years', { n: ds.totalYears })}</div>
            <div>{t('succession.stat_prestige', { n: num(ds.prestige) })}</div>
            <div>{t('succession.stat_highest_rank', { rank: ds.highestStatusRankName })}</div>
            <div>
              {t('succession.stat_wishes', {
                done: ds.wishesFulfilled,
                total: ds.wishesTotal,
              })}
            </div>
          </div>

          <h4>{t('succession.chronicle_heading')}</h4>
          <ul className="people-list">
            {ds.lives.map((life) => (
              <li key={`${life.generation}:${life.characterId}`} className="card" style={{ marginBottom: 8 }}>
                <div className="person-main" style={{ width: '100%' }}>
                  <div className="card-head">
                    <b>
                      {t('dynasty.gen_label', { n: life.generation })} · {life.name}
                    </b>
                    <span className="muted small">
                      {t('dynasty.years_lived', {
                        birth: life.birthYear,
                        death: life.deathYear,
                        age: life.deathAge,
                      })}{' '}
                      · {life.causeName}
                    </span>
                  </div>
                  <div className="muted small" style={{ marginTop: 4 }}>
                    {life.axes
                      .map((ax) => `${t(`axis.${ax.id}`)}: ${ax.score}/100 (${t(ax.bandKey)})`)
                      .join(' · ')}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button className="primary wide" onClick={() => store.backToMenu(true)}>
            {t('summary.again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="summary panel">
        <div className="event-kicker">{t('succession.kicker')}</div>
        <h2>
          {t('dynasty.gen_label', { n: dynasty.currentGeneration })} · {summary.name}
        </h2>
        <p className="event-text">
          {t('summary.death', { age: summary.age, year: summary.year, cause: summary.causeName })}
        </p>
        {summary.card && <LifeCardSection card={summary.card} />}

        <div className="summary-grid">
          <div>{t('summary.years', { n: summary.yearsPlayed })}</div>
          <div>{t('summary.decisions', { n: summary.decisions })}</div>
          <div>{t('summary.farmland', { n: summary.closing.farmland })}</div>
          <div>
            {t('summary.money', {
              money: num(summary.closing.money),
              food: num(summary.closing.food),
            })}
          </div>
          <div>{t('summary.debt', { debt: num(summary.closing.debt) })}</div>
        </div>

        <h4>{t('summary.axes_title')}</h4>
        <div className="summary-axes">
          {summary.axes.map((ax) => (
            <StatBar
              key={ax.id}
              label={t(`axis.${ax.id}`)}
              value={ax.score}
              max={100}
              word={t(ax.bandKey)}
              tone="good"
            />
          ))}
        </div>

        <h4>{t('succession.choose_title', { gen: dynasty.currentGeneration + 1 })}</h4>
        <p className="muted small">{t('succession.choose_subtitle')}</p>

        <ul className="people-list">
          {succession.candidates.map((cand) => (
            <li key={cand.characterId} className="card" style={{ marginBottom: 8 }}>
              <div className="person-main" style={{ width: '100%' }}>
                <div className="card-head">
                  <div>
                    <b>{cand.name}</b> ({t('profile.age', { age: cand.age })}) ·{' '}
                    <span className="muted small">{t(`succession.group.${cand.priorityGroup}`)}</span>
                  </div>
                  <span className="chip">
                    {cand.isMainHeir ? t('succession.main_heir_badge') : t('succession.branch_heir_badge')}
                  </span>
                </div>

                {cand.traits.length > 0 && (
                  <div className="chips" style={{ marginTop: 4 }}>
                    {cand.traits.map((tr) => (
                      <span key={tr.id} className="chip" title={tr.description}>
                        {tr.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="muted small" style={{ marginTop: 4 }}>
                  {t('succession.share_line', {
                    percent: cand.sharePercent,
                    sao: cand.expectedSao,
                    money: num(cand.expectedMoney),
                    debt: num(cand.expectedDebt),
                  })}
                </div>

                {cand.needsGuardian && (
                  <div className="muted small" style={{ marginTop: 2 }}>
                    {t('succession.guardian_tag', {
                      who: cand.guardianName ?? t('relation.other'),
                    })}
                  </div>
                )}

                <div style={{ marginTop: 8 }}>
                  <button
                    className="primary"
                    onClick={() => store.dispatch({ type: 'chooseHeir', heirId: cand.characterId })}
                  >
                    {t('succession.continue_btn', { name: cand.name })}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <button className="wide" style={{ marginTop: 8 }} onClick={() => setShowDynastySummary(true)}>
          {t('succession.end_dynasty_btn')}
        </button>
      </div>
    </div>
  );
}
