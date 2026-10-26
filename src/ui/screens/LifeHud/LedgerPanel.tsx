// [0] Sổ sách hộ (GDD 03 §2 — Ledger): thu chi năm nay theo danh mục, chốt sổ các năm trước
// [1.5] Chốt sổ kiểu 1in8b: mỗi năm một mức thay đổi tài sản ròng và vài dòng lý do; bảng chi tiết để sau cùng
import type { HudView } from '@core/index';
import { ModifierList } from '../../components/ModifierList';
import { Tooltip } from '../../components/Tooltip';
import { YearClose } from '../../components/YearClose';
import { modernMoney, num, signed, useUi } from '../../context';

export function LedgerPanel({ hud }: { hud: HudView }) {
  const { t } = useUi();
  const h = hud.household;
  const u = hud.wealthUnits;
  const rows = hud.ledger.current.filter((e) => Math.abs(e.money) >= 0.05 || Math.abs(e.food) >= 0.05);
  const closes = [...hud.ledger.closes].reverse();
  return (
    <div className="ledger">
      <div className="ledger-summary">
        <div>
          <span className="muted">{t('wealth.net_worth')}</span> <b>{num(h.netWorth)}</b> {t('unit.money')}
          <span className="muted small"> {t('wealth.modern', { value: modernMoney(t, h.netWorth, u.modernPerQuan) })}</span>
        </div>
        <div>
          <span className="muted">{t('wealth.income_year')}</span> <b>{h.incomeYear > 0 ? num(h.incomeYear) : '—'}</b> {h.incomeYear > 0 && t('wealth.per_year')}
        </div>
        <div className="muted small">
          {t('ledger.cash_line', { money: num(h.money), food: num(h.food), debt: num(h.debt) })}
        </div>
        <div className="muted small">{t('ledger.monthly_need', { food: num(h.monthlyFood), money: num(h.monthlyMoney) })}</div>
        {h.selfFarm ? (
          <Tooltip content={<ModifierList result={h.harvestYield} title={t('mods.harvest')} />}>
            <div className="muted small underline">{t('ledger.harvest_factor', { x: h.harvestYield.value.toFixed(2) })}</div>
          </Tooltip>
        ) : (
          <div className="muted small">{t('ledger.tenancy_note')}</div>
        )}
      </div>
      {/* [1.5] Chưa làm chủ hộ: sổ riêng của bạn trước, sổ nhà sau */}
      {hud.personal.active && hud.personal.closes.length > 0 && <h4>{t('ledger.personal_title')}</h4>}
      {hud.personal.active && [...hud.personal.closes].reverse().map((c) => <YearClose key={`p${c.year}`} close={c} />)}
      {closes.length > 0 && <h4>{t('ledger.year_closes')}</h4>}
      {closes.map((c) => (
        <YearClose key={c.year} close={c} />
      ))}
      <h4>{t('ledger.this_year')}</h4>
      <table>
        <thead>
          <tr>
            <th />
            <th>{t('unit.money')}</th>
            <th>{t('unit.food')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.category}>
              <td>{t(`ledger.${e.category}`)}</td>
              <td className={e.money >= 0 ? 'up' : 'down'}>{Math.abs(e.money) >= 0.05 ? signed(e.money) : ''}</td>
              <td className={e.food >= 0 ? 'up' : 'down'}>{Math.abs(e.food) >= 0.05 ? signed(e.food) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
