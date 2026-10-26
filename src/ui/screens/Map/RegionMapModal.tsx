// [7] Bản đồ vùng 3 điểm (Làng nông – Thị trấn bến sông – Phủ thành):
// Xem trạng thái từng nơi (giá lúa, Thời cơ, dân cư, tuần tra, dịch bệnh), đi buôn chuyến, chuyển nhà hoặc lên phủ nhậm chức.
import { useState } from 'react';
import type { HudView, RegionNodeView } from '@core/index';
import { useUi } from '../../context';

export function RegionMapModal({ hud, onClose }: { hud: HudView; onClose: () => void }) {
  const { t, store } = useUi();
  const region = hud.region;
  const [selectedCargo, setSelectedCargo] = useState<number>(region.cargoOptions[0] ?? 4);
  const [sellOldLand, setSellOldLand] = useState<boolean>(false);

  const handleStartTrip = (node: RegionNodeView) => {
    store.dispatch({
      type: 'startTradeTrip',
      targetSettlementId: node.id,
      cargoMoney: selectedCargo,
    });
  };

  const handleRelocate = (node: RegionNodeView) => {
    store.dispatch({
      type: 'relocateHousehold',
      targetSettlementId: node.id,
      sellOldProperties: sellOldLand,
    });
  };

  const handleCancelTrip = () => {
    store.dispatch({ type: 'cancelTrip' });
  };

  const handleAppointOfficial = () => {
    store.dispatch({ type: 'appointOfficial' });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('region.title')}</h3>
          <button type="button" className="btn-small" onClick={onClose}>
            {t('action.close')}
          </button>
        </div>

        <p className="muted small" style={{ marginBottom: 10 }}>
          {t('region.subtitle', {
            home: `${region.homeSettlementTypeName} ${region.homeSettlementName}`,
            money: Math.round(hud.household.money),
          })}
        </p>

        {/* Thanh sơ đồ tuyến đường 3 điểm: Làng <-> Thị trấn <-> Phủ */}
        <div
          className="subcard"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '10px 14px',
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          {region.settlements.map((node, idx) => (
            <div
              key={node.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, flex: idx < region.settlements.length - 1 ? 1 : undefined }}
            >
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: node.isCurrent ? '2px solid var(--accent, #8b5a2b)' : '1px solid var(--border, #cbb89d)',
                  background: node.epidemic
                    ? 'rgba(180, 40, 40, 0.1)'
                    : node.isHome
                      ? 'rgba(139, 90, 43, 0.12)'
                      : 'rgba(255, 255, 255, 0.5)',
                  minWidth: 110,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {node.typeName} {node.name}
                </div>
                <div className="muted small">
                  {node.isHome ? `🏠 ${t('region.home_badge')}` : `${t('region.route_time', { m: node.travelMonths })}`}
                  {node.isCurrent && !node.isHome ? ` · 📍 ${t('region.current_badge')}` : ''}
                </div>
              </div>
              {idx < region.settlements.length - 1 && (
                <div
                  className="muted small"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    borderBottom: '2px dashed var(--border, #cbb89d)',
                    paddingBottom: 2,
                    minWidth: 40,
                  }}
                >
                  ↔ 1 {t('region.month_unit')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Banner đang đi chuyến xa (nếu có) */}
        {region.activeTrip && (
          <div
            className="subcard"
            style={{
              marginBottom: 12,
              borderLeft: '4px solid #b5651d',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <strong>
                🚶 {t('region.trip_active_title', { target: region.activeTrip.targetName })}
              </strong>
              <div className="muted small">
                {t('region.trip_active_desc', {
                  months: region.activeTrip.monthsLeft,
                  cargo: region.activeTrip.cargoMoney,
                  refund: region.activeTrip.cancelRefund,
                })}
              </div>
            </div>
            <button type="button" className="btn-small" onClick={handleCancelTrip}>
              {t('region.cancel_trip_btn', { refund: region.activeTrip.cancelRefund })}
            </button>
          </div>
        )}

        {/* Tuỳ chọn chung cho chuyến buôn & chuyển nhà */}
        <div
          className="subcard"
          style={{
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="small">
              <strong>{t('region.cargo_label')}:</strong>
            </span>
            {region.cargoOptions.map((amt) => (
              <button
                key={amt}
                type="button"
                className={`btn-small ${selectedCargo === amt ? 'active' : ''}`}
                onClick={() => setSelectedCargo(amt)}
              >
                {amt} {t('unit.money')}
              </button>
            ))}
          </div>

          {region.ruralPropertyRefund > 0 && (
            <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sellOldLand}
                onChange={(e) => setSellOldLand(e.target.checked)}
              />
              <span>
                {t('region.sell_old_land_toggle', { refund: region.ruralPropertyRefund })}
              </span>
            </label>
          )}
        </div>

        {/* Danh sách 3 khu định cư trong vùng */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {region.settlements.map((node) => {
            const totalTripNeed = selectedCargo + node.travelCost;
            const canAffordSelectedTrip =
              node.canStartTrip && hud.household.money >= totalTripNeed;

            return (
              <div
                key={node.id}
                className="subcard"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: node.isHome ? '2px solid var(--accent, #8b5a2b)' : undefined,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div>
                      <h4 style={{ margin: 0 }}>
                        {node.typeName} {node.name}
                      </h4>
                      <div className="muted small">{node.description}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {node.isHome && <span className="tag">{t('region.home_badge')}</span>}
                      {node.isCurrent && !node.isHome && <span className="tag">{t('region.current_badge')}</span>}
                    </div>
                  </div>

                  {node.epidemic && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: 'rgba(190, 40, 40, 0.14)',
                        color: '#9e1c1c',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}
                    >
                      ☣ {t('region.epidemic_badge', {
                        disease: node.epidemic.diseaseName,
                        months: node.epidemic.monthsLeft,
                      })}
                    </div>
                  )}

                  <div
                    className="small"
                    style={{
                      marginTop: 10,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '4px 8px',
                    }}
                  >
                    <div>
                      <span className="muted">{t('region.population')}:</span>{' '}
                      <strong>{node.population}</strong> {t('region.households_unit')}
                    </div>
                    <div>
                      <span className="muted">{t('region.harvest')}:</span>{' '}
                      <strong>{node.harvestQualityName}</strong>
                    </div>
                    <div>
                      <span className="muted">{t('region.food_price')}:</span>{' '}
                      <strong>{node.foodPrice.toFixed(2)}</strong> {t('unit.money')}
                    </div>
                    <div>
                      <span className="muted">{t('region.trade_index')}:</span>{' '}
                      <strong>×{node.effectiveTradeFactor.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="muted">{t('region.patrol_level')}:</span>{' '}
                      <strong>{node.patrolLevel}</strong>/100
                    </div>
                    {!node.isHome && (
                      <div>
                        <span className="muted">{t('region.distance')}:</span>{' '}
                        <strong>
                          {t('region.route_info', { m: node.travelMonths, cost: node.travelCost })}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Các nút hành động tại điểm này */}
                {!node.isHome && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      type="button"
                      className="btn-small"
                      disabled={!canAffordSelectedTrip}
                      onClick={() => handleStartTrip(node)}
                    >
                      {t('region.start_trip_btn', {
                        cargo: selectedCargo,
                        cost: node.travelCost,
                        months: node.travelMonths,
                      })}
                    </button>

                    <button
                      type="button"
                      className="btn-small"
                      disabled={!node.canRelocate}
                      onClick={() => handleRelocate(node)}
                    >
                      {t('region.relocate_btn', { cost: node.relocateCost })}
                    </button>

                    {node.id === 'phu_thanh' && (
                      <button
                        type="button"
                        className="btn-small"
                        disabled={!region.canAppointOfficial}
                        onClick={handleAppointOfficial}
                        title={t('region.appoint_official_hint')}
                      >
                        {t('region.appoint_official_btn', { stipend: region.officialStipend })}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
