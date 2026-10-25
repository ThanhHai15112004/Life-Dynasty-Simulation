// [0] Thẻ sự kiện quyết định: bối cảnh, phương án, khoảng xác suất (dừng thời gian — auto-pause)
// [1] Dùng chung cho chuyện nhỏ (minor): cùng cửa sổ, nhãn "Chuyện nhỏ", gửi lệnh chooseMinor
import type { HudView } from '@core/index';
import { useUi } from '../context';
import { Icon } from './Icon';

const pct = (x: number) => Math.round(x * 100);

export function EventCard({ pending, minor = false }: { pending: NonNullable<HudView['pending']>; minor?: boolean }) {
  const { store, t } = useUi();
  const choose = (optionId: string) => store.dispatch(minor ? { type: 'chooseMinor', optionId } : { type: 'chooseOption', optionId });
  return (
    <div className="modal-backdrop">
      <div className={`event-card panel ${minor ? 'minor' : ''}`}>
        <div className="event-kicker">{t(minor ? 'minor.kicker' : 'event.kicker')}</div>
        <h2 className="event-title">
          <Icon id={store.content.index.event.get(pending.eventId)?.icon ?? ''} size="lg" />
          {pending.title}
        </h2>
        <p className="event-text">{pending.text}</p>
        <div className="options">
          {pending.options.map((o) => (
            <button key={o.id} className="option" onClick={() => choose(o.id)}>
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
