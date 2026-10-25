// [0] Danh sách modifier giải thích "vì sao" một chỉ số tăng/giảm (GDD 02 §4.1)
import type { ModifierResult } from '@core/index';
import { signed, useUi } from '../context';

export function ModifierList({ result, title, perYear }: { result: ModifierResult; title: string; perYear?: number }) {
  const { t } = useUi();
  const scale = perYear ?? 1;
  return (
    <div className="mods">
      <div className="mods-title">
        {title}: <b className={result.value >= result.base ? 'up' : 'down'}>{result.lines.some((l) => l.op === 'mul') && result.base !== 0 ? `×${(result.value / (result.base || 1)).toFixed(2)}` : signed(result.value * scale)}</b>
      </div>
      {result.lines.length === 0 && <div className="mods-line muted">{t('mods.none')}</div>}
      {result.lines.map((l, i) => (
        <div key={i} className="mods-line">
          <span className={l.op === 'mul' ? (l.value >= 1 ? 'up' : 'down') : l.value >= 0 ? 'up' : 'down'}>
            {l.op === 'mul' ? `×${l.value.toFixed(2)}` : signed(l.value * scale)}
          </span>{' '}
          {l.label}
        </div>
      ))}
    </div>
  );
}
