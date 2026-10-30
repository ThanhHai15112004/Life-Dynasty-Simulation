// [1] Bản tổng kết đời 5 trục độc lập (GDD 01 §7.3): Mãn nguyện, Di sản, Dấu ấn, Gia đình, Tham vọng
import { useState } from 'react';
import type { LifeSummaryView } from '@core/index';
import { PlaytestFeedbackModal } from '../../components/PlaytestFeedbackModal';
import { StatBar } from '../../components/StatBar';
import { LifeCardSection } from '../../components/StoryModals';
import { num, useUi } from '../../context';

export function LifeSummary({ summary }: { summary: LifeSummaryView }) {
  const { store, t } = useUi();
  const [showPlaytest, setShowPlaytest] = useState(false);
  return (
    <div className="modal-backdrop">
      <div className="summary panel">
        <div className="event-kicker">{t('summary.kicker')}</div>
        <h2>{summary.name}</h2>
        <p className="event-text">{t('summary.death', { age: summary.age, year: summary.year, cause: summary.causeName })}</p>
        {summary.card && <LifeCardSection card={summary.card} />}
        <div className="summary-grid">
          <div>{t('summary.years', { n: summary.yearsPlayed })}</div>
          <div>{t('summary.decisions', { n: summary.decisions })}</div>
          <div>{t('summary.farmland', { n: summary.closing.farmland })}</div>
          <div>{t('summary.money', { money: num(summary.closing.money), food: num(summary.closing.food) })}</div>
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
        <h4>{t('summary.highlights')}</h4>
        <ul className="highlights">
          {summary.highlights.map((h, i) => (
            <li key={i}>
              <span className="muted">{h.year}</span> {h.text}
            </li>
          ))}
        </ul>
        {summary.careerHistory.length > 0 && (
          <>
            <h4>{t('career.history_title')}</h4>
            <ul className="highlights">
              {summary.careerHistory.map((ch, i) => (
                <li key={i}>
                  {t('career.history_item', {
                    start: ch.startYear,
                    end: ch.endYear ?? summary.year,
                    career: ch.careerName,
                    rank: ch.rankName,
                    months: ch.months,
                  })}
                </li>
              ))}
            </ul>
          </>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="small" onClick={() => setShowPlaytest(true)}>
            {t('playtest.open_btn')}
          </button>
          <button className="primary wide" onClick={() => store.backToMenu()}>
            {t('summary.again')}
          </button>
        </div>
        {showPlaytest && (
          <PlaytestFeedbackModal summary={summary} onClose={() => setShowPlaytest(false)} />
        )}
      </div>
    </div>
  );
}
