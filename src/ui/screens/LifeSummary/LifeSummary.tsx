// [0] Tổng kết đời (bản GĐ0): tuổi, nguyên nhân, của cải để lại, những mốc đáng nhớ. Năm trục đầy đủ để GĐ1.
import type { LifeSummaryView } from '@core/index';
import { num, useUi } from '../../context';

export function LifeSummary({ summary }: { summary: LifeSummaryView }) {
  const { store, t } = useUi();
  return (
    <div className="modal-backdrop">
      <div className="summary panel">
        <div className="event-kicker">{t('summary.kicker')}</div>
        <h2>{summary.name}</h2>
        <p className="event-text">{t('summary.death', { age: summary.age, year: summary.year, cause: summary.causeName })}</p>
        <div className="summary-grid">
          <div>{t('summary.years', { n: summary.yearsPlayed })}</div>
          <div>{t('summary.decisions', { n: summary.decisions })}</div>
          <div>{t('summary.farmland', { n: summary.closing.farmland })}</div>
          <div>{t('summary.money', { money: num(summary.closing.money), food: num(summary.closing.food) })}</div>
          <div>{t('summary.debt', { debt: num(summary.closing.debt) })}</div>
        </div>
        <h4>{t('summary.highlights')}</h4>
        <ul className="highlights">
          {summary.highlights.map((h, i) => (
            <li key={i}>
              <span className="muted">{h.year}</span> {h.text}
            </li>
          ))}
        </ul>
        <button className="primary wide" onClick={() => store.backToMenu()}>
          {t('summary.again')}
        </button>
      </div>
    </div>
  );
}
