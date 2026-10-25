// [0] Màn hình chính (GDD 08 §6.1): thanh thời gian · cảnh pixel (Phaser phía sau) · hồ sơ · nhật ký · quyết định/sổ sách/chợ
import { useState } from 'react';
import type { HudView } from '@core/index';
import { EventCard } from '../../components/EventCard';
import { TimeBar } from '../../components/TimeBar';
import { useUi } from '../../context';
import { LifeSummary } from '../LifeSummary/LifeSummary';
import { DecisionPanel } from './DecisionPanel';
import { JournalPanel } from './JournalPanel';
import { LedgerPanel } from './LedgerPanel';
import { MarketPanel } from './MarketPanel';
import { ProfilePanel } from './ProfilePanel';

const TABS = ['decisions', 'ledger', 'market'] as const;
type Tab = (typeof TABS)[number];

export function LifeHud({ hud }: { hud: HudView }) {
  const { t } = useUi();
  const [tab, setTab] = useState<Tab>('decisions');
  return (
    <div className="hud">
      <TimeBar hud={hud} />
      <div className="scene-spacer">
        {hud.openLoops.length > 0 && (
          <div className="open-loops panel">
            <div className="open-loops-title">{t('loops.title')}</div>
            {hud.openLoops.map((l, i) => (
              <div key={i} className="loop">
                • {l.text}
                {l.monthsLeft !== null && l.monthsLeft > 0 && <span className="muted small"> {t('loops.months_left', { n: l.monthsLeft })}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="hud-bottom">
        <ProfilePanel hud={hud} />
        <JournalPanel hud={hud} />
        <section className="panel side">
          <div className="tabs">
            {TABS.map((k) => (
              <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
                {t(`tab.${k}`)}
              </button>
            ))}
          </div>
          <div className="tab-body">
            {tab === 'decisions' && <DecisionPanel hud={hud} />}
            {tab === 'ledger' && <LedgerPanel hud={hud} />}
            {tab === 'market' && <MarketPanel hud={hud} />}
          </div>
        </section>
      </div>
      {hud.pending && <EventCard pending={hud.pending} />}
      {hud.gameOver && <LifeSummary summary={hud.gameOver} />}
    </div>
  );
}
