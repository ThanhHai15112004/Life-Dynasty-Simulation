// [0] Sổ sách hộ (GDD 03 §2 — Ledger): thu chi năm nay theo danh mục, chốt sổ các năm trước
import type { HudView } from '@core/index';
import { ModifierList } from '../../components/ModifierList';
import { Tooltip } from '../../components/Tooltip';
import { num, signed, useUi } from '../../context';

export function LedgerPanel({ hud }: { hud: HudView }) {
  const { t } = useUi();
  const h = hud.household;
  const rows = hud.ledger.current.filter((e) => Math.abs(e.money) >= 0.05 || Math.abs(e.food) >= 0.05);
  const last = hud.ledger.history[hud.ledger.history.length - 1];
  return (
    <div className="ledger">
      <div className="ledger-summary">
        <div>
          <span className="muted">{t('ledger.money')}</span> <b>{num(h.money)}</b> {t('unit.money')}
        </div>
        <div>
          <span className="muted">{t('ledger.food')}</span> <b className={h.foodWarning ? 'down' : ''}>{num(h.food)}</b> {t('unit.food')}
          <span className="muted small"> {t('ledger.food_months', { months: Number.isFinite(h.foodMonths) ? num(h.foodMonths) : '∞' })}</span>
        </div>
        <div>
          <span className="muted">{t('ledger.debt')}</span> <b className={h.debt > 0 ? 'down' : ''}>{num(h.debt)}</b> {t('unit.money')}
        </div>
        <div className="muted small">
          {t('ledger.monthly_need', { food: num(h.monthlyFood), money: num(h.monthlyMoney) })}
        </div>
        {h.selfFarm ? (
          <Tooltip content={<ModifierList result={h.harvestYield} title={t('mods.harvest')} />}>
            <div className="muted small underline">{t('ledger.harvest_factor', { x: h.harvestYield.value.toFixed(2) })}</div>
          </Tooltip>
        ) : (
          <div className="muted small">{t('ledger.tenancy_note')}</div>
        )}
        {h.regularIncome > 0 && <div className="muted small">{t('ledger.regular_income', { money: num(h.regularIncome) })}</div>}
      </div>
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
      {last && (
        <div className="muted small">
          {t('ledger.closing', { year: last.year, money: num(last.closing.money), food: num(last.closing.food), debt: num(last.closing.debt) })}
        </div>
      )}
    </div>
  );
}
