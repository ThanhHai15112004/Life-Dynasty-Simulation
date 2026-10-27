// [1] Thẻ cảnh: khung Phaser (cảnh vẽ bằng code) được chuyển vào thẻ, kèm chú thích hộ đang sống ở đâu, với ai
import { useLayoutEffect, useRef, useState } from 'react';
import type { HudView } from '@core/index';
import { useUi } from '../../context';
import { RegionMapModal } from '../Map/RegionMapModal';

/** id khung chứa canvas Phaser trong index.html. */
const GAME_CONTAINER_ID = 'game-container';

/** Chuyển khung Phaser vào thẻ khi thẻ hiện, trả về chỗ cũ (ẩn) khi rời màn hình chơi. */
function useGameHost() {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const game = document.getElementById(GAME_CONTAINER_ID);
    const el = host.current;
    if (!game || !el) return;
    el.appendChild(game);
    game.classList.add('mounted');
    return () => {
      game.classList.remove('mounted');
      document.body.appendChild(game);
    };
  }, []);
  return host;
}

export function SceneCard({ hud }: { hud: HudView }) {
  const { t, store } = useUi();
  const host = useGameHost();
  const [showMap, setShowMap] = useState(false);
  const h = hud.household;
  const region = hud.region;
  const others = h.members.filter((m) => !m.isPlayer);
  const house = h.properties
    .filter((p) => p.category === 'house')
    .sort((a, b) => (store.content.index.property.get(b.id)?.house_tier ?? 0) - (store.content.index.property.get(a.id)?.house_tier ?? 0))[0];
  const withWhom = others.length ? t('scene.with', { list: others.map((m) => m.call).join(', ') }) : t('scene.alone');
  const epidemicNodes = region.settlements.filter((s) => s.epidemic !== null);

  return (
    <section className="card scene-card">
      <div ref={host} className="scene-host" />
      <div className="scene-caption">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div>
            {region.activeTrip
              ? `${region.currentSettlementName} · ${region.currentSettlementTypeName} (${t('region.away_from_home', { home: h.settlement.name })})`
              : `${h.settlement.name} · ${h.settlement.typeName}${house ? ` · ${house.name.toLowerCase()}` : ''} · ${withWhom}`}
          </div>
          <button type="button" className="btn-small" onClick={() => setShowMap(true)}>
            {t('region.open_map')}
          </button>
        </div>
        <div className="muted small">
          {t('scene.you', { age: hud.player.age })}
          {others.map((m) => ` · ${m.call}, ${t('profile.age', { age: m.age })}`).join('')}
        </div>
      </div>
      {(region.activeTrip || epidemicNodes.length > 0) && (
        <div className="open-loops" style={{ borderTop: '1px dashed var(--border, #d8ccb8)' }}>
          {region.activeTrip && (
            <span className="loop-chip">
              🚶 {t('region.trip_chip', { target: region.activeTrip.targetName, m: region.activeTrip.monthsLeft })}
            </span>
          )}
          {epidemicNodes.map((n) => (
            <span key={n.id} className="loop-chip" style={{ color: '#9e1c1c' }}>
              ☣ {t('region.epidemic_chip', { place: n.name, disease: n.epidemic!.diseaseName })}
            </span>
          ))}
        </div>
      )}
      {hud.openLoops.length > 0 && (
        <div className="open-loops">
          <span className="open-loops-title">{t('loops.title')}</span>
          {hud.openLoops.map((l, i) => (
            <span key={i} className="loop-chip">
              {l.text}
              {l.monthsLeft !== null && l.monthsLeft > 0 && <span className="muted"> · {t('loops.months_left', { n: l.monthsLeft })}</span>}
            </span>
          ))}
        </div>
      )}
      {showMap && <RegionMapModal hud={hud} onClose={() => setShowMap(false)} />}
    </section>
  );
}
