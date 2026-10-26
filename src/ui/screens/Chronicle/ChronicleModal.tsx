// [8] Màn hình phụ Biên niên sử & Toàn văn Nhật ký cuộc đời (GDD 08 §6.2)
import { useState } from 'react';
import type { HudView } from '@core/index';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { useUi } from '../../context';

type ChronicleTab = 'world' | 'highlights' | 'journal';

export function ChronicleModal({ hud, onClose }: { hud: HudView; onClose: () => void }) {
  const { t } = useUi();
  const [tab, setTab] = useState<ChronicleTab>('world');
  const [query, setQuery] = useState('');

  const allHighlights = [...hud.log]
    .reverse()
    .flatMap((y) =>
      y.entries
        .filter((e) => e.highlight || e.importance >= 6)
        .map((e) => ({ year: y.year, age: y.age, month: e.month, text: e.text, icon: e.icon })),
    );

  const filteredYears = [...hud.log].reverse().filter((y) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return String(y.year).includes(q) || y.entries.some((e) => e.text.toLowerCase().includes(q));
  });

  return (
    <Modal title={t('chronicle.modal_title')} onClose={onClose}>
      <div className="subscreen-tabs row">
        <button
          type="button"
          className={`chip ${tab === 'world' ? 'active' : ''}`}
          onClick={() => setTab('world')}
        >
          {t('chronicle.tab_world')}
        </button>
        <button
          type="button"
          className={`chip ${tab === 'highlights' ? 'active' : ''}`}
          onClick={() => setTab('highlights')}
        >
          {t('chronicle.tab_highlights', { n: allHighlights.length })}
        </button>
        <button
          type="button"
          className={`chip ${tab === 'journal' ? 'active' : ''}`}
          onClick={() => setTab('journal')}
        >
          {t('chronicle.tab_journal', { n: hud.log.length })}
        </button>
      </div>

      {tab === 'world' && (
        <div>
          <div className="focus" style={{ marginBottom: 12 }}>
            <div>
              <b>
                {hud.reign.name
                  ? t('header.reign', { name: hud.reign.name, n: hud.reign.year })
                  : t('chronicle.title')}
              </b>
            </div>
            <div className="muted small">
              {t('career.opp.trade', { x: hud.career.opportunity.tradeIndex.toFixed(2) })} ·{' '}
              {t('career.opp.alert', { state: t(`alert.${hud.career.opportunity.militaryAlert}`) })} ·{' '}
              {t('career.opp.patrol', { n: hud.career.opportunity.patrolLevel })}
            </div>
          </div>

          {hud.chronicle.length === 0 && <p className="muted small">{t('chronicle.empty')}</p>}
          <ul className="chronicle-list">
            {hud.chronicle.map((c, i) => (
              <li key={i}>
                <span className="muted small">{c.year}</span>
                <span>
                  <Icon id={c.icon} /> {c.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'highlights' && (
        <div>
          <p className="muted small">{t('chronicle.highlights_intro')}</p>
          {allHighlights.length === 0 && <p className="muted small">{t('chronicle.highlights_empty')}</p>}
          <ul className="chronicle-list">
            {allHighlights.map((h, idx) => (
              <li key={idx}>
                <span className="muted small">
                  {h.year} ({t('profile.age', { age: h.age })})
                </span>
                <span>
                  <Icon id={h.icon} /> {h.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'journal' && (
        <div>
          <input
            type="text"
            placeholder={t('chronicle.search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div className="journal-scroll" style={{ maxHeight: 420 }}>
            {filteredYears.map((y) => (
              <div key={y.year} style={{ marginBottom: 12 }}>
                <h4>{t('journal.year', { year: y.year, age: y.age })}</h4>
                {y.entries.map((e) => (
                  <div key={e.id} className={`jline ${e.highlight ? 'highlight' : ''}`}>
                    <span className="jage">
                      <span className="jmonth">{t(`month.short.${e.month}`)}</span>
                    </span>
                    <Icon id={e.icon} />
                    <span className="line-text">{e.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
