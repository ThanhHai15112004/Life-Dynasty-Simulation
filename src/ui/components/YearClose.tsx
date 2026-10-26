// [1.5] Khối chốt sổ một năm kiểu 1in8b: mức thay đổi tài sản ròng và vài dòng lý do (dùng cho thẻ tài sản và sổ sách)
import type { YearCloseView } from '@core/api/queries';
import { signed, useUi } from '../context';

export function YearClose({ close }: { close: YearCloseView }) {
  const { t } = useUi();
  return (
    <div className="year-close">
      <div className="small">
        <span className="muted">{t('wealth.year_delta', { year: close.year })}</span>{' '}
        <b className={close.delta >= 0 ? 'up' : 'down'}>
          {signed(close.delta)} {t('unit.money')}
        </b>
      </div>
      <ul className="flow-lines">
        {close.lines.map((l) => (
          <li key={l.category}>
            <span>{t(`ledger.${l.category}`)}</span>
            <span className={l.value >= 0 ? 'up' : 'down'}>
              {signed(l.value)} {t('unit.money')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
