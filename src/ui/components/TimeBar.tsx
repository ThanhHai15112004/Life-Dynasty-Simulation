// [0] Thanh thời gian: Can Chi + năm Công nguyên, tháng, mùa, thời tiết, Pause/Play, tốc độ, lưu
import { Pause, Play, Save, SkipForward, Home } from 'lucide-react';
import type { HudView } from '@core/index';
import { useSnapshot, useUi } from '../context';

export function TimeBar({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const speeds = store.content.balance.time.speeds;
  const d = hud.date;
  const blocked = !!hud.pending || !!hud.gameOver;
  return (
    <div className="timebar panel">
      <div className="date">
        <b>{t('date.year', { can: t(`canchi.can.${d.can}`), chi: t(`canchi.chi.${d.chi}`), year: d.year })}</b>
        <span>{t(`month.${d.month}`)}</span>
        <span className="muted">{d.seasonName} · {d.weatherName}</span>
      </div>
      <div className="controls">
        <button className="icon" disabled={blocked} onClick={() => store.toggle()} title={snap.running ? t('time.pause') : t('time.play')}>
          {snap.running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className="icon" disabled={blocked || snap.running} onClick={() => store.step()} title={t('time.step')}>
          <SkipForward size={16} />
        </button>
        {speeds.map((s, i) => (
          <button key={s} className={`speed ${i === snap.speedIndex ? 'active' : ''}`} onClick={() => store.setSpeed(i)}>
            {t('time.speed', { x: s })}
          </button>
        ))}
        <button className="icon" onClick={() => void store.save()} title={t('time.save')}>
          <Save size={16} />
        </button>
        <button className="icon" onClick={() => store.backToMenu()} title={t('menu.back')}>
          <Home size={16} />
        </button>
      </div>
    </div>
  );
}
