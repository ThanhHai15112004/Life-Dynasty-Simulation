// [6] Màn hình Tài sản, Cơ nghiệp & Đầu tư (Phase 6):
// - Nâng cấp nhà ở (nhà tranh -> nhà gỗ ba gian -> phủ đệ năm gian), mua bán ruộng/trâu/thóc
// - Thẻ cơ nghiệp (doanh thu năm, chi phí, lợi nhuận ròng, thuê thợ, mở rộng sạp -> cửa hiệu -> hiệu buôn, sang nhượng)
// - Vay & cho vay gắn với chủ nợ / con nợ NPC (ân tình, thiện cảm, đòi nợ, xóa nợ lấy đại ân tình)
import { useState } from 'react';
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { num, useSnapshot, useUi } from '../../context';
import { MarketPanel } from '../LifeHud/MarketPanel';

export function PropertiesPanel({
  hud,
  initialTab = 'ventures',
}: {
  hud: HudView;
  initialTab?: 'overview' | 'ventures' | 'loans';
}) {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const [tab, setTab] = useState<'overview' | 'ventures' | 'loans'>(initialTab);
  const h = hud.household;
  const up = hud.houseUpgrade;
  const vt = hud.ventures;
  const ln = hud.npcLoans;
  const home = h.properties.find((p) => p.category === 'house');

  return (
    <div className="properties-screen">
      <div className="row" style={{ marginBottom: 12, gap: 6, flexWrap: 'wrap' }}>
        <button
          className={`small ${tab === 'ventures' ? 'active' : ''}`}
          onClick={() => setTab('ventures')}
        >
          {t('properties.tab_ventures', { n: vt.owned.length })}
        </button>
        <button
          className={`small ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          {t('properties.tab_overview')}
        </button>
        <button
          className={`small ${tab === 'loans' ? 'active' : ''}`}
          onClick={() => setTab('loans')}
        >
          {t('properties.tab_loans')}
        </button>
      </div>

      {tab === 'overview' && (
        <div>
          <h4>{t('properties.house_section')}</h4>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-head">
              <div>
                <b>{home?.name ?? '—'}</b>
                {home?.description && <div className="muted small">{home.description}</div>}
              </div>
              {up ? (
                <button
                  className="small"
                  disabled={!up.canAfford}
                  title={up.nextDescription}
                  onClick={() => store.dispatch({ type: 'upgradeHouse' })}
                >
                  {t('properties.upgrade_house_btn', { name: up.nextName, cost: num(up.cost) })}
                </button>
              ) : (
                <span className="chip">{t('properties.max_house_note')}</span>
              )}
            </div>
          </div>
          <MarketPanel hud={hud} />
        </div>
      )}

      {tab === 'ventures' && (
        <div>
          <h4>{t('properties.ventures_owned_title')}</h4>
          {vt.owned.length === 0 ? (
            <p className="muted small">{t('properties.ventures_empty')}</p>
          ) : (
            <ul className="people-list" style={{ marginBottom: 14 }}>
              {vt.owned.map((v) => (
                <li key={v.id} className="card" style={{ padding: 10, marginBottom: 8 }}>
                  <div style={{ width: '100%' }}>
                    <div className="card-head">
                      <div>
                        <Icon id={v.icon} /> <b>{v.name}</b>{' '}
                        <span className="muted small">
                          ({t('properties.venture_stage', { stage: v.stage, max: v.maxStage })})
                        </span>
                      </div>
                      <span
                        className={`chip ${
                          v.statusKey === 'declining' || v.statusKey === 'critical' ? 'disease-chip' : ''
                        }`}
                      >
                        {t(`properties.venture_status.${v.statusKey}`)} ({v.health}%)
                      </span>
                    </div>
                    <div className="muted small" style={{ marginBottom: 6 }}>
                      {v.description}
                    </div>
                    <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span>{t('properties.venture_revenue', { n: num(v.revenueYear) })}</span>
                      <span className="muted">{t('properties.venture_upkeep', { n: num(v.upkeepYear) })}</span>
                      <b className={v.profitYear < 0 ? 'down' : ''}>
                        {t('properties.venture_profit', {
                          n: v.profitYear >= 0 ? `+${num(v.profitYear)}` : num(v.profitYear),
                        })}
                      </b>
                    </div>
                    <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                      <span className="small">
                        {t('properties.venture_workers', {
                          family: v.familyWorkersUsed,
                          hired: v.hiredWorkers,
                          needed: v.workersNeeded,
                        })}
                      </span>
                      <button
                        className="small"
                        disabled={v.hiredWorkers >= v.workersNeeded}
                        onClick={() =>
                          store.dispatch({
                            type: 'setVentureWorkers',
                            ventureId: v.id,
                            hiredWorkers: v.hiredWorkers + 1,
                          })
                        }
                      >
                        {t('properties.venture_hire_btn', { wage: num(v.hireWageYear) })}
                      </button>
                      {v.hiredWorkers > 0 && (
                        <button
                          className="small"
                          onClick={() =>
                            store.dispatch({
                              type: 'setVentureWorkers',
                              ventureId: v.id,
                              hiredWorkers: v.hiredWorkers - 1,
                            })
                          }
                        >
                          {t('properties.venture_fire_btn')}
                        </button>
                      )}
                    </div>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      {v.expandCost !== null && v.expandName && (
                        <button
                          className="small"
                          disabled={!v.canExpand}
                          onClick={() => store.dispatch({ type: 'expandVenture', ventureId: v.id })}
                        >
                          {t('properties.venture_expand_btn', { name: v.expandName, cost: num(v.expandCost) })}
                        </button>
                      )}
                      <button
                        className="small"
                        onClick={() => store.dispatch({ type: 'closeVenture', ventureId: v.id })}
                      >
                        {t('properties.venture_close_btn', { price: num(v.sellPrice) })}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h4>{t('properties.ventures_open_title')}</h4>
          <ul className="people-list">
            {vt.openable.map((v) => (
              <li key={v.id} style={{ padding: '8px 0' }}>
                <div style={{ width: '100%' }}>
                  <div className="card-head">
                    <div>
                      <Icon id={v.icon} /> <b>{v.name}</b>
                    </div>
                    <button
                      className="small"
                      disabled={!v.canOpen || !v.canAfford}
                      onClick={() => store.dispatch({ type: 'openVenture', ventureId: v.id })}
                    >
                      {t('properties.venture_open_btn', { cost: num(v.capitalCost) })}
                    </button>
                  </div>
                  <div className="muted small">{v.description}</div>
                  <div className="small">
                    {t('properties.venture_open_meta', {
                      cost: num(v.capitalCost),
                      rev: num(v.baseRevenueYear),
                      upkeep: num(v.upkeepYear),
                      workers: v.workersNeeded,
                      skill: v.skillName,
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'loans' && (
        <div>
          <h4>{t('properties.loans_borrowed_title')}</h4>
          {ln.borrowed.length === 0 ? (
            <p className="muted small">{t('properties.loans_borrowed_empty')}</p>
          ) : (
            <ul className="people-list" style={{ marginBottom: 12 }}>
              {ln.borrowed.map((l) => (
                <li key={l.id}>
                  <div style={{ width: '100%' }}>
                    <div className="card-head">
                      <span>
                        {t('properties.loan_item_borrowed', {
                          who: l.npcCall,
                          amount: num(l.amount),
                          rate: Math.round(l.interestRate * 100),
                          due: l.dueYear,
                        })}
                      </span>
                      {l.overdueYears > 0 && (
                        <span className="chip disease-chip">
                          {t('properties.loan_overdue_tag', { n: l.overdueYears })}
                        </span>
                      )}
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 4 }}>
                      {ln.borrowAmounts
                        .filter((a) => a < l.amount)
                        .map((a) => (
                          <button
                            key={a}
                            className="small"
                            disabled={h.money < a}
                            onClick={() => store.dispatch({ type: 'repayNpcLoan', loanId: l.id, amount: a })}
                          >
                            {t('properties.loan_repay_btn', { amount: a })}
                          </button>
                        ))}
                      <button
                        className="small"
                        disabled={h.money < l.amount}
                        onClick={() => store.dispatch({ type: 'repayNpcLoan', loanId: l.id, amount: l.amount })}
                      >
                        {t('properties.loan_repay_all_btn', { amount: num(l.amount) })}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {ln.creditors.length > 0 && (
            <>
              <h4>{t('properties.loans_borrow_new_title')}</h4>
              <ul className="people-list" style={{ marginBottom: 14 }}>
                {ln.creditors.map((c) => (
                  <li key={c.id}>
                    <div className="row" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <span>
                        {t('properties.loan_creditor_line', {
                          who: c.call,
                          rate: Math.round(c.interestRate * 100),
                        })}
                      </span>
                      <div className="row" style={{ gap: 6 }}>
                        {ln.borrowAmounts.map((amt) => (
                          <button
                            key={amt}
                            className="small"
                            onClick={() => store.dispatch({ type: 'borrowFromNpc', npcId: c.id, amount: amt })}
                          >
                            {t('properties.loan_borrow_btn', { amount: amt })}
                          </button>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h4>{t('properties.loans_lent_title')}</h4>
          {ln.lent.length === 0 ? (
            <p className="muted small">{t('properties.loans_lent_empty')}</p>
          ) : (
            <ul className="people-list" style={{ marginBottom: 12 }}>
              {ln.lent.map((l) => (
                <li key={l.id}>
                  <div style={{ width: '100%' }}>
                    <div className="card-head">
                      <span>
                        {t('properties.loan_item_lent', {
                          who: l.npcCall,
                          amount: num(l.amount),
                          rate: Math.round(l.interestRate * 100),
                          due: l.dueYear,
                        })}
                      </span>
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 4 }}>
                      <button
                        className="small"
                        onClick={() => store.dispatch({ type: 'collectNpcLoan', loanId: l.id })}
                      >
                        {t('properties.loan_collect_btn', { amount: num(l.amount) })}
                      </button>
                      <button
                        className="small"
                        onClick={() => store.dispatch({ type: 'forgiveNpcLoan', loanId: l.id })}
                      >
                        {t('properties.loan_forgive_btn')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {ln.borrowers.length > 0 && (
            <>
              <h4>{t('properties.loans_lend_new_title')}</h4>
              <ul className="people-list">
                {ln.borrowers.map((b) => (
                  <li key={b.id}>
                    <div className="row" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <span>
                        {t('properties.loan_borrower_line', {
                          who: b.call,
                          opinion: b.opinion >= 0 ? `+${b.opinion}` : b.opinion,
                          favor: b.favor,
                        })}
                      </span>
                      <div className="row" style={{ gap: 6 }}>
                        {ln.lendAmounts.map((amt) => (
                          <button
                            key={amt}
                            className="small"
                            disabled={h.money < amt}
                            onClick={() => store.dispatch({ type: 'lendToNpc', npcId: b.id, amount: amt })}
                          >
                            {t('properties.loan_lend_btn', { amount: amt })}
                          </button>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {snap.lastError && <div className="error">{t(snap.lastError)}</div>}
    </div>
  );
}
