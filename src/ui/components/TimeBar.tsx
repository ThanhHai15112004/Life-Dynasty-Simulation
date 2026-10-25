// [1] Thanh tiêu đề: tuổi làm trung tâm, năm Can Chi · niên hiệu · tháng · mùa, "1 năm ≈ N giây",
// thanh tiến độ năm trượt liên tục giữa các tick tháng, và hàng nút điều khiển thời gian
import { useEffect, useState } from 'react';
import { Home, Pause, Play, Save, SkipForward } from 'lucide-react';
import type { HudView } from '@core/index';
import { useSnapshot, useUi } from '../context';

/** Thanh năm: mỗi tick tháng trượt mượt tới cuối tháng đó trong đúng thời lượng một tháng. */
function YearProgress({ month, monthsPerYear, msPerMonth, running }: { month: number; monthsPerYear: number; msPerMonth: number; running: boolean }) {
  const start = (month - 1) / monthsPerYear;
  const end = month / monthsPerYear;
  const [width, setWidth] = useState(start);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    // Đặt về đầu tháng (không chuyển động) rồi khung hình sau mới trượt tới cuối tháng
    setAnimate(false);
    setWidth(start);
    if (!running) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnimate(true);
        setWidth(end);
      }),
    );
    return () => cancelAnimationFrame(id);
  }, [month, running, start, end]);
  return (
    <div className="year-track">
      <div className="year-fill" style={{ width: `${width * 100}%`, transition: animate ? `width ${msPerMonth}ms linear` : 'none' }} />
    </div>
  );
}

export function TimeBar({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const time = store.content.balance.time;
  const speed = time.speeds[snap.speedIndex] ?? 1;
  const msPerMonth = time.ms_per_month_at_1x / speed;
  const secondsPerYear = Math.round((msPerMonth * hud.date.monthsPerYear) / 1000);
  const d = hud.date;
  const blocked = !!hud.pending || !!hud.minor || !!hud.gameOver;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="headline">
          <span className="brand">{t('app.title')}</span>
          <span className="age-big">{hud.player.age}</span>
          <span className="age-unit">{t('header.age_unit')}</span>
          <div className="headline-meta">
            <div>
              {t('date.year', { can: t(`canchi.can.${d.can}`), chi: t(`canchi.chi.${d.chi}`), year: d.year })} · {t(`month.${d.month}`)} · {d.seasonName}, {d.weatherName}
            </div>
            <div className="muted">
              {hud.reign.name ? `${t('header.reign', { name: hud.reign.name, n: hud.reign.year })} · ` : ''}
              {hud.player.name} · {t('header.seconds_per_year', { n: secondsPerYear })}
            </div>
          </div>
        </div>
        <YearProgress month={d.month} monthsPerYear={d.monthsPerYear} msPerMonth={msPerMonth} running={snap.running} />
        <div className="controls">
          <button className="primary play" disabled={blocked} onClick={() => store.toggle()}>
            {snap.running ? <Pause size={15} /> : <Play size={15} />}
            {snap.running ? t('time.pause') : t('time.play')}
          </button>
          <button disabled={blocked || snap.running} onClick={() => store.step()} title={t('time.step')}>
            <SkipForward size={15} /> {t('time.step')}
          </button>
          {time.speeds.map((s, i) => (
            <button key={s} className={`speed ${i === snap.speedIndex ? 'active' : ''}`} onClick={() => store.setSpeed(i)}>
              {t('time.speed', { x: s })}
            </button>
          ))}
          <button className={snap.autoMinor ? 'active' : ''} onClick={() => store.toggleAutoMinor()} title={t('time.auto_minor_hint')}>
            {t('time.auto_minor')}
          </button>
          <span className="spacer" />
          <button onClick={() => void store.save()} title={t('time.save')}>
            <Save size={15} /> {t('time.save')}
          </button>
          <button onClick={() => store.backToMenu()} title={t('menu.back')}>
            <Home size={15} /> {t('menu.back')}
          </button>
        </div>
      </div>
    </header>
  );
}
