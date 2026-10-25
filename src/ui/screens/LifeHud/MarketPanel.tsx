// [0] Chợ & tài sản: bán/mua thóc theo giá đang trôi (Thời cơ), trả nợ, mua bán ruộng, trâu, ao...
import type { HudView } from '@core/index';
import { num, useSnapshot, useUi } from '../../context';

export function MarketPanel({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const m = hud.market;
  const h = hud.household;
  return (
    <div className="market">
      <div className="price-line">
        {t('market.price', { buy: num(m.buyPrice), sell: num(m.sellPrice) })}
      </div>
      <div className="trade-row">
        <span>{t('market.sell_food')}</span>
        {m.tradeAmounts.map((a) => (
          <button key={`s${a}`} disabled={h.food < a} onClick={() => store.dispatch({ type: 'sellFood', amount: a })}>
            {a}
          </button>
        ))}
      </div>
      <div className="trade-row">
        <span>{t('market.buy_food')}</span>
        {m.tradeAmounts.map((a) => (
          <button key={`b${a}`} disabled={h.money < a * m.buyPrice} onClick={() => store.dispatch({ type: 'buyFood', amount: a })}>
            {a}
          </button>
        ))}
      </div>
      {h.debt > 0 && (
        <div className="trade-row">
          <span>{t('market.repay')}</span>
          {[...new Set([...m.tradeAmounts, Math.floor(Math.min(h.debt, h.money))])]
            .filter((a) => a > 0)
            .map((a) => (
              <button key={`r${a}`} disabled={h.money < a} onClick={() => store.dispatch({ type: 'repayDebt', amount: a })}>
                {a}
              </button>
            ))}
        </div>
      )}
      <h4>{t('market.properties')}</h4>
      <ul className="props">
        {h.properties.map((p) => (
          <li key={p.id}>
            <span>
              {p.name}: <b>{p.count}</b> {p.unit}
            </span>
            {p.sellable && (
              <button className="small" onClick={() => store.dispatch({ type: 'sellProperty', id: p.id })}>
                {t('market.sell_one', { price: num(p.value * m.propertySellFactor) })}
              </button>
            )}
          </li>
        ))}
      </ul>
      <h4>{t('market.buy')}</h4>
      <ul className="props">
        {m.buyable.map((p) => (
          <li key={p.id} title={p.description}>
            <span>
              {p.name} <span className="muted small">({p.unit})</span>
            </span>
            <button className="small" disabled={h.money < p.value} onClick={() => store.dispatch({ type: 'buyProperty', id: p.id })}>
              {t('market.buy_one', { price: num(p.value) })}
            </button>
          </li>
        ))}
      </ul>
      {snap.lastError && <div className="error">{t(snap.lastError)}</div>}
    </div>
  );
}
