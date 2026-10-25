// [0] Thẻ sự kiện quyết định: bối cảnh, phương án, khoảng xác suất (dừng thời gian — auto-pause)
import type { HudView } from '@core/index';
import { useUi } from '../context';
import { Icon } from './Icon';

const pct = (x: number) => Math.round(x * 100);

export function EventCard({ pending }: { pending: NonNullable<HudView['pending']> }) {
  const { store, t } = useUi();
  return (
    <div className="modal-backdrop">
      <div className="event-card panel">
        <div className="event-kicker">{t('event.kicker')}</div>
        <h2 className="event-title">
          <Icon id={store.content.index.event.get(pending.eventId)?.icon ?? ''} size="lg" />
          {pending.title}
        </h2>
        <p className="event-text">{pending.text}</p>
        <div className="options">
          {pending.options.map((o) => (
            <button key={o.id} className="option" onClick={() => store.dispatch({ type: 'chooseOption', optionId: o.id })}>
              <span className="option-text">{o.text}</span>
              {o.hint && <span className="option-hint">{o.hint}</span>}
              {o.chance && (
                <span className="option-chance">
                  {t(o.chanceKey ?? 'chance.mid')} · {t('event.chance_range', { lo: pct(o.chance.shown[0]), hi: pct(o.chance.shown[1]) })}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
