// [1] Thẻ cảnh: khung Phaser (cảnh vẽ bằng code) được chuyển vào thẻ, kèm chú thích hộ đang sống ở đâu, với ai
import { useLayoutEffect, useRef } from 'react';
import type { HudView } from '@core/index';
import { useUi } from '../../context';

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
  const h = hud.household;
  const others = h.members.filter((m) => !m.isPlayer);
  const house = h.properties
    .map((p) => store.content.index.property.get(p.id))
    .filter((p) => p?.category === 'house')
    .sort((a, b) => (b?.house_tier ?? 0) - (a?.house_tier ?? 0))[0];
  const withWhom = others.length ? t('scene.with', { list: others.map((m) => m.call).join(', ') }) : t('scene.alone');
  return (
    <section className="card scene-card">
      <div ref={host} className="scene-host" />
      <div className="scene-caption">
        <div>
          {h.settlement.name} · {h.settlement.typeName}
          {house ? ` · ${house.name.toLowerCase()}` : ''} · {withWhom}
        </div>
        <div className="muted small">
          {t('scene.you', { age: hud.player.age })}
          {others.map((m) => ` · ${m.call}, ${t('profile.age', { age: m.age })}`).join('')}
        </div>
      </div>
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
    </section>
  );
}
