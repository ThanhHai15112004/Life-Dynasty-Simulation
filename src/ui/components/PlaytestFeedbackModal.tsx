// [5] Cửa sổ Khảo sát Playtest thực tế (10 câu hỏi Litmus Test) & Xuất Telemetry JSON
import { useState } from 'react';
import type { LifeSummaryView } from '@core/index';
import { useUi } from '../context';
import { Modal } from './Modal';

const QUESTION_KEYS = [
  'playtest.q1',
  'playtest.q2',
  'playtest.q3',
  'playtest.q4',
  'playtest.q5',
  'playtest.q6',
  'playtest.q7',
  'playtest.q8',
  'playtest.q9',
  'playtest.q10',
] as const;

export function PlaytestFeedbackModal({
  summary,
  onClose,
}: {
  summary: LifeSummaryView;
  onClose: () => void;
}) {
  const { t } = useUi();
  const [scores, setScores] = useState<number[]>(() => QUESTION_KEYS.map(() => 5));
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const exportReport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      litmusScores: QUESTION_KEYS.map((k, idx) => ({
        questionKey: k,
        score: scores[idx] ?? 5,
      })),
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      notes,
      telemetry: {
        name: summary.name,
        age: summary.age,
        year: summary.year,
        causeName: summary.causeName,
        yearsPlayed: summary.yearsPlayed,
        decisions: summary.decisions,
        closing: summary.closing,
        axes: summary.axes,
        careerHistory: summary.careerHistory,
      },
    };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('dong_doi_last_playtest', JSON.stringify(payload));
      }
      if (typeof document !== 'undefined') {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dong-doi-playtest-${summary.year}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Bỏ qua nếu môi trường không có DOM/localStorage
    }
    setSaved(true);
  };

  return (
    <Modal title={t('playtest.modal_title')} onClose={onClose}>
      <p className="small muted">{t('playtest.modal_subtitle')}</p>
      <div className="modal-section">
        {QUESTION_KEYS.map((qk, idx) => (
          <div
            key={qk}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              padding: '6px 0',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span className="small" style={{ flex: 1 }}>
              {t(qk)}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  className={`small ${scores[idx] === val ? 'active' : ''}`}
                  onClick={() =>
                    setScores((prev) => prev.map((s, i) => (i === idx ? val : s)))
                  }
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 10 }}>
          <label className="small">{t('playtest.notes_label')}</label>
          <textarea
            rows={3}
            style={{ width: '100%', marginTop: 4 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {saved && <p className="small" style={{ marginTop: 6 }}>{t('playtest.saved_msg')}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="primary" onClick={exportReport}>
            {t('playtest.export_btn')}
          </button>
          <button className="small" onClick={onClose}>
            {t('settings.close')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
