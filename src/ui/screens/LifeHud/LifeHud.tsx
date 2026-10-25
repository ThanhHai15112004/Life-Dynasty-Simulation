// [1] Màn hình chính (bố cục 3 cột kiểu 1in8b): tiêu đề thời gian · hồ sơ/trạng thái/gia sản | cảnh/trọng tâm/nghề/nhật ký | gia đình/người quanh đời/bản đồ cuộc đời/biên niên
import type { HudView } from '@core/index';
import { EventCard } from '../../components/EventCard';
import { TimeBar } from '../../components/TimeBar';
import { useUi } from '../../context';
import { CareerPanel } from '../Career/CareerPanel';
import { LifeSummary } from '../LifeSummary/LifeSummary';
import { AmbitionCard, FocusCard } from './DecisionPanel';
import { JournalPanel } from './JournalPanel';
import { ProfileCard, SkillsCard, StatusCard, WealthCard } from './ProfilePanel';
import { SceneCard } from './SceneCard';
import { ChronicleCard, FamilyCard, LifeMapCard, RelationsCard } from './SidePanels';

export function LifeHud({ hud }: { hud: HudView }) {
  const { t } = useUi();
  return (
    <div className="hud">
      <TimeBar hud={hud} />
      <main className="hud-grid">
        <div className="col col-left">
          <ProfileCard hud={hud} />
          <StatusCard hud={hud} />
          <WealthCard hud={hud} />
          <SkillsCard hud={hud} />
        </div>
        <div className="col col-center">
          <SceneCard hud={hud} />
          <FocusCard hud={hud} />
          <JournalPanel hud={hud} />
          <section className="card">
            <div className="card-head">
              <h3>{t('tab.career')}</h3>
            </div>
            <CareerPanel hud={hud} />
          </section>
          <AmbitionCard hud={hud} />
        </div>
        <div className="col col-right">
          <FamilyCard hud={hud} />
          <LifeMapCard hud={hud} />
          <ChronicleCard hud={hud} />
          <RelationsCard hud={hud} />
        </div>
      </main>
      {hud.pending ? <EventCard pending={hud.pending} /> : hud.minor && <EventCard pending={hud.minor} minor />}
      {hud.gameOver && <LifeSummary summary={hud.gameOver} />}
    </div>
  );
}
