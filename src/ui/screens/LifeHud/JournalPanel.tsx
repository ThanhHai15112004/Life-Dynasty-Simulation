// [0] Nhật ký dòng đời theo năm (GDD 05 §12.3): dòng thường, dòng nổi bật, nhãn tin đồn, tác động nhỏ cuối dòng
import type { HudView, LogEntry } from '@core/index';
import { Icon } from '../../components/Icon';
import { signed, useUi } from '../../context';

function Deltas({ e }: { e: LogEntry }) {
  const { t } = useUi();
  const items = Object.entries(e.deltas).filter(([, v]) => Math.abs(v) >= 0.05);
  if (!items.length) return null;
  return (
    <span className="deltas">
      {items.map(([k, v]) => {
        const good = k === 'debt' || k === 'stress' ? v < 0 : v > 0;
        return (
          <span key={k} className={good ? 'up' : 'down'}>
            {t(`delta.${k}`)} {signed(v)}
          </span>
        );
      })}
    </span>
  );
}

export function JournalPanel({ hud }: { hud: HudView }) {
  const { t, store } = useUi();
  const years = [...hud.log].reverse().slice(0, store.content.balance.display.journal_years_shown);
  return (
    <section className="panel journal">
      <h3>{t('journal.title')}</h3>
      {hud.lastResolution && (
        <div className="resolution">
          <b>{hud.lastResolution.title}</b> — {hud.lastResolution.resultText}
        </div>
      )}
      <div className="journal-scroll">
        {years.map((y) => (
          <div key={y.year} className="journal-year">
            <div className="journal-year-head">
              {t('journal.year', { year: y.year, age: y.age })}
            </div>
            {y.entries.length === 0 && <div className="muted line">{t('journal.empty')}</div>}
            {[...y.entries].reverse().map((e) => (
              <div key={e.id} className={`line ${e.highlight ? 'highlight' : ''} tone-${e.tone}`}>
                <span className="line-month">{t(`month.short.${e.month}`)}</span>
                <Icon id={e.icon} />
                <span className="line-text">
                  {e.text}
                  {e.rumor && <span className="rumor"> {t('journal.rumor')}</span>}
                  <Deltas e={e} />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
