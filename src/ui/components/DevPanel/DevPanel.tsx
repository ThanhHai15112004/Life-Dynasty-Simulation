// [1] Bảng công cụ Dev trong ván (Phím ~ để mở)
import { useState, useEffect } from 'react';
import { useSnapshot, useUi } from '../../context';
import './DevPanel.css';

export function DevPanel() {
  const { store, t, content } = useUi();
  const snap = useSnapshot();
  const [open, setOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(content.events[0]?.id ?? '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Backquote' || e.key === '`' || e.key === '~') {
        if (!snap.devEnabled) return;
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snap.devEnabled]);

  if (!snap.devEnabled || !open) {
    if (snap.devEnabled) {
      return (
        <button className="dev-toggle-pill" onClick={() => setOpen(true)} title="Dev Tools (~)">
          DEV
        </button>
      );
    }
    return null;
  }

  const handleCopySeed = () => {
    const seed = snap.hud?.date?.year ?? '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(String(seed));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportSave = () => {
    const json = store.exportSave();
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dong_doi_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dev-panel panel">
      <div className="dev-header">
        <h4>{t('dev.title')}</h4>
        <button className="close-btn" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <div className="dev-section">
        <div className="dev-label">Tua thời gian</div>
        <div className="dev-buttons">
          <button onClick={() => store.devAdvance(1)}>{t('dev.advance_month')}</button>
          <button onClick={() => store.devAdvance(12)}>{t('dev.advance_1y')}</button>
          <button onClick={() => store.devAdvance(60)}>{t('dev.advance_5y')}</button>
          <button onClick={() => store.devAdvance(120)}>{t('dev.advance_10y')}</button>
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-label">{t('dev.trigger_event')}</div>
        <div className="dev-row">
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            {content.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.id} - {t(ev.title)}
              </option>
            ))}
          </select>
          <button
            className="primary"
            onClick={() => store.dispatch({ type: 'devTriggerEvent', eventId: selectedEventId })}
          >
            {t('dev.trigger_btn')}
          </button>
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-label">Can thiệp Chỉ số</div>
        <div className="dev-buttons">
          <button onClick={() => store.dispatch({ type: 'devModifyStat', stat: 'money', delta: 50 })}>
            {t('dev.stat_money')}
          </button>
          <button onClick={() => store.dispatch({ type: 'devModifyStat', stat: 'food', delta: 50 })}>
            {t('dev.stat_food')}
          </button>
          <button onClick={() => store.dispatch({ type: 'devModifyStat', stat: 'debt', delta: -999 })}>
            {t('dev.stat_debt_clear')}
          </button>
          <button onClick={() => store.dispatch({ type: 'devModifyStat', stat: 'health', delta: 40 })}>
            {t('dev.stat_heal')}
          </button>
          <button onClick={() => store.dispatch({ type: 'devModifyStat', stat: 'stress', delta: -40 })}>
            {t('dev.stat_stress_down')}
          </button>
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-label">Bệnh tật & Sinh tử</div>
        <div className="dev-buttons">
          <button onClick={() => store.dispatch({ type: 'devAddDisease', diseaseId: 'sot_ret' })}>
            Sốt rét
          </button>
          <button onClick={() => store.dispatch({ type: 'devAddDisease', diseaseId: 'dich_ta' })}>
            Dịch tả
          </button>
          <button className="danger" onClick={() => store.dispatch({ type: 'devKill' })}>
            {t('dev.kill_player')}
          </button>
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-label">Lưu & Hạt giống</div>
        <div className="dev-buttons">
          <button onClick={handleCopySeed}>{copied ? t('dev.seed_copied') : t('dev.copy_seed')}</button>
          <button onClick={handleExportSave}>{t('dev.export_save')}</button>
        </div>
      </div>
    </div>
  );
}
