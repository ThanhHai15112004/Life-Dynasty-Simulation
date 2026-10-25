// [1] Ghi chép cuộc đời (GDD 05 §12.3): mới nhất trước, cột tuổi bên trái, dòng nổi bật in đậm, tin đồn in nghiêng
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

/** [1] Chuyện nhỏ: chọn ngay trong nhật ký, thời gian vẫn trôi; bỏ qua thì quá hạn tự chọn. */
function MinorCard({ minor }: { minor: NonNullable<HudView['minor']> }) {
  const { store, t } = useUi();
  return (
    <div className="minor-card">
      <div className="minor-head">
        <span className="event-kicker">{t('minor.kicker')}</span>
        <span className="muted small">{t('minor.expires', { n: minor.monthsLeft })}</span>
      </div>
      <b>{minor.title}</b>
      <p>{minor.text}</p>
      <div className="minor-options">
        {minor.options.map((o) => (
          <button key={o.id} onClick={() => store.dispatch({ type: 'chooseMinor', optionId: o.id })} title={o.hint}>
            {o.text}
            {o.chance && <span className="muted small"> · {t(o.chanceKey ?? 'chance.mid')}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function JournalPanel({ hud }: { hud: HudView }) {
  const { t, store } = useUi();
  const years = [...hud.log].reverse().slice(0, store.content.balance.display.journal_years_shown);
  return (
    <section className="card journal">
      <div className="card-head">
        <h3>{t('journal.title')}</h3>
        <span className="muted small">{t('journal.newest_first')}</span>
      </div>
      {hud.minor && <MinorCard minor={hud.minor} />}
      {hud.lastResolution && (
        <div className="resolution">
          <b>{hud.lastResolution.title}</b> — {hud.lastResolution.resultText}
        </div>
      )}
      <div className="journal-scroll">
        {years.map((y) =>
          y.entries.length === 0 ? (
            <div key={y.year} className="jline muted">
              <span className="jage">{t('journal.age', { age: y.age })}</span>
              <span>{t('journal.empty')}</span>
            </div>
          ) : (
            [...y.entries].reverse().map((e) => (
              <div key={e.id} className={`jline ${e.highlight ? 'highlight' : ''} tone-${e.tone} kind-${e.kind}`}>
                <span className="jage">
                  {t('journal.age', { age: y.age })}
                  <span className="jmonth">{t(`month.short.${e.month}`)}</span>
                </span>
                <Icon id={e.icon} />
                <span className="line-text">
                  {e.text}
                  {e.rumor && <span className="rumor"> {t('journal.rumor')}</span>}
                  <Deltas e={e} />
                </span>
              </div>
            ))
          ),
        )}
      </div>
    </section>
  );
}
