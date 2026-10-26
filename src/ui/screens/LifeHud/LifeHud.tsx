// [1] Màn hình chính (bố cục 3 cột kiểu 1in8b): tiêu đề thời gian · hồ sơ/trạng thái/gia sản | cảnh/trọng tâm/nghề/nhật ký | gia đình/người quanh đời/bản đồ cuộc đời/biên niên
// [8] Tích hợp Hướng dẫn mở dần (GDD 08 §6.5), Màn hình phụ (§6.2), Phím tắt, Menu tạm dừng, Mobile nav và ErrorBoundary
import { useEffect, useState } from 'react';
import type { HudView } from '@core/index';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { EventCard } from '../../components/EventCard';
import { Modal } from '../../components/Modal';
import { PauseMenuModal } from '../../components/PauseMenuModal';
import { SaveLoadModal } from '../../components/SaveLoadModal';
import { SettingsModal } from '../../components/SettingsModal';
import { TimeBar } from '../../components/TimeBar';
import { DevPanel } from '../../components/DevPanel/DevPanel';
import { useSnapshot, useUi } from '../../context';
import { CareerPanel } from '../Career/CareerPanel';
import { CharacterModal } from '../Character/CharacterModal';
import { ChronicleModal } from '../Chronicle/ChronicleModal';
import { FamilyTreeModal } from '../Family/FamilyTreeModal';
import { LifeSummary } from '../LifeSummary/LifeSummary';
import { RegionMapModal } from '../Map/RegionMapModal';
import { PropertiesPanel } from '../Properties/PropertiesPanel';
import { RelationsModal } from '../Relations/RelationsModal';
import { SuccessionModal } from '../Succession/SuccessionModal';
import { AmbitionCard, FocusCard } from './DecisionPanel';
import { JournalPanel } from './JournalPanel';
import { ProfileCard, SkillsCard, StatusCard, WealthCard } from './ProfilePanel';
import { SceneCard } from './SceneCard';
import { ChronicleCard, FamilyCard, LifeMapCard, RelationsCard, VillageClansCard } from './SidePanels';

type ActiveModal =
  | null
  | 'pause'
  | 'settings'
  | 'saves'
  | 'character'
  | 'family_tree'
  | 'properties'
  | 'relations'
  | 'map'
  | 'chronicle';

type MobileColumn = 'all' | 'left' | 'center' | 'right';

export function LifeHud({ hud }: { hud: HudView }) {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const [modal, setModal] = useState<ActiveModal>(null);
  const [mobileCol, setMobileCol] = useState<MobileColumn>('all');

  const age = hud.player.age;
  const stageId = hud.player.lifeStageId;
  const unlocks = store.content.balance.display.onboarding.stage_unlocks;
  const progressive = snap.settings.progressiveUi;

  // Mở dần các bảng nâng cao theo giai đoạn đời, địa vị & nghề (GDD 08 §6.2 & §6.5)
  const showFocus = !progressive || age >= unlocks.relations_min_age || hud.focus.canChoose;
  const showRelations = !progressive || age >= unlocks.relations_min_age || hud.relations.length > 0;
  const showCareer = !progressive || age >= unlocks.career_min_age || hud.career.kind !== '';
  const showAmbition = !progressive || age >= unlocks.ambition_min_age || hud.ambition.currentId !== null;
  const showClans = !progressive || age >= unlocks.clans_min_age || hud.player.isHead;
  const showMapBtn = !progressive || age >= unlocks.region_min_age || hud.region.activeTrip !== null || hud.career.kind !== '';
  const showPropertiesBtn = hud.manage.isHead || !progressive || age >= unlocks.career_min_age;
  const hasHiddenPanels = progressive && (!showFocus || !showCareer || !showClans || !showMapBtn);

  const showOnboardingBanner =
    snap.settings.onboardingEnabled &&
    !snap.settings.dismissedOnboardingStages.includes(stageId);

  // Phím tắt: Space (Chạy/Tạm dừng), 1–4 (Tốc độ), 5 (+1 tháng khi đang dừng), Esc (Đóng modal / Menu tạm dừng)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setModal((prev) => (prev === null ? 'pause' : null));
        return;
      }

      const blocked = !!hud.pending || !!hud.minor || !!hud.gameOver || modal !== null;
      if (blocked) return;

      if (e.code === 'Space') {
        e.preventDefault();
        store.toggle();
      } else if (e.key >= '1' && e.key <= '4') {
        const idx = Number(e.key) - 1;
        if (idx < store.content.balance.time.speeds.length) {
          e.preventDefault();
          store.setSpeed(idx);
        }
      } else if (e.key === '5') {
        e.preventDefault();
        if (!snap.running) {
          store.step();
        } else {
          store.setSpeed(store.content.balance.time.speeds.length - 1);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.pending, hud.minor, hud.gameOver, modal, snap.running, store]);

  return (
    <div className="hud">
      <TimeBar
        hud={hud}
        onOpenPauseMenu={() => {
          if (snap.running) store.pause();
          setModal('pause');
        }}
        onOpenSaves={() => {
          if (snap.running) store.pause();
          setModal('saves');
        }}
        onOpenSettings={() => {
          if (snap.running) store.pause();
          setModal('settings');
        }}
      />

      {snap.lastError && (
        <div className="hud-banner error-banner">
          <span>{t(`error.${snap.lastError}`)}</span>
          <button className="small" onClick={() => store.clearError()}>
            {t('onboarding.dismiss')}
          </button>
        </div>
      )}

      {showOnboardingBanner && (
        <div className="hud-banner onboarding-banner">
          <div className="onboarding-body">
            <b>{t(`onboarding.stage.${stageId}.title`)}</b>
            <p className="small">{t(`onboarding.stage.${stageId}.body`)}</p>
          </div>
          <div className="onboarding-actions">
            <button className="small" onClick={() => store.dismissOnboardingStage(stageId)}>
              {t('onboarding.got_it')}
            </button>
            <button
              className="small"
              onClick={() => store.updateSettings({ onboardingEnabled: false })}
            >
              {t('onboarding.turn_off')}
            </button>
          </div>
        </div>
      )}

      {/* Thanh màn hình phụ theo GDD 08 §6.2 & §6.3, ẩn/hiện theo giai đoạn đời, địa vị & nghề */}
      <nav className="subscreen-bar" aria-label={t('subscreen.nav_label')}>
        <button className="small" onClick={() => setModal('character')}>
          {t('subscreen.character')}
        </button>
        <button className="small" onClick={() => setModal('family_tree')}>
          {t('subscreen.family')}
        </button>
        {showPropertiesBtn && (
          <button className="small" onClick={() => setModal('properties')}>
            {t('subscreen.properties')}
          </button>
        )}
        {showRelations && (
          <button className="small" onClick={() => setModal('relations')}>
            {t('subscreen.relations')}
          </button>
        )}
        {showMapBtn && (
          <button className="small" onClick={() => setModal('map')}>
            {t('subscreen.map')}
          </button>
        )}
        <button className="small" onClick={() => setModal('chronicle')}>
          {t('subscreen.chronicle')}
        </button>
        {hasHiddenPanels && (
          <button
            className="small"
            onClick={() => store.updateSettings({ progressiveUi: false })}
            title={t('onboarding.show_all_hint')}
          >
            {t('onboarding.show_all_panels')}
          </button>
        )}
      </nav>

      {/* Thanh chuyển cột nhanh cho màn hình hẹp / Mobile 1 cột */}
      <div className="mobile-nav-bar">
        {(['all', 'left', 'center', 'right'] as const).map((col) => (
          <button
            key={col}
            className={`small ${mobileCol === col ? 'active' : ''}`}
            onClick={() => setMobileCol(col)}
          >
            {t(`mobile.col.${col}`)}
          </button>
        ))}
      </div>

      <main className={`hud-grid mobile-col-${mobileCol}`}>
        <div className="col col-left">
          <ErrorBoundary section="profile">
            <ProfileCard hud={hud} onOpenCharacter={() => setModal('character')} />
          </ErrorBoundary>
          <ErrorBoundary section="status">
            <StatusCard hud={hud} />
          </ErrorBoundary>
          <ErrorBoundary section="wealth">
            <WealthCard hud={hud} />
          </ErrorBoundary>
          <ErrorBoundary section="skills">
            <SkillsCard hud={hud} />
          </ErrorBoundary>
        </div>

        <div className="col col-center">
          <ErrorBoundary section="scene">
            <SceneCard hud={hud} />
          </ErrorBoundary>
          {showFocus && (
            <ErrorBoundary section="focus">
              <FocusCard hud={hud} />
            </ErrorBoundary>
          )}
          <ErrorBoundary section="journal">
            <JournalPanel hud={hud} />
          </ErrorBoundary>
          {showCareer && (
            <ErrorBoundary section="career">
              <section className="card">
                <div className="card-head">
                  <h3>{t('tab.career')}</h3>
                </div>
                <CareerPanel hud={hud} />
              </section>
            </ErrorBoundary>
          )}
          {showAmbition && (
            <ErrorBoundary section="ambition">
              <AmbitionCard hud={hud} />
            </ErrorBoundary>
          )}
        </div>

        <div className="col col-right">
          <ErrorBoundary section="family">
            <FamilyCard hud={hud} />
          </ErrorBoundary>
          {showClans && (
            <ErrorBoundary section="clans">
              <VillageClansCard hud={hud} />
            </ErrorBoundary>
          )}
          <ErrorBoundary section="lifemap">
            <LifeMapCard hud={hud} />
          </ErrorBoundary>
          <ErrorBoundary section="chronicle">
            <ChronicleCard hud={hud} onOpenChronicle={() => setModal('chronicle')} />
          </ErrorBoundary>
          {showRelations && (
            <ErrorBoundary section="relations">
              <RelationsCard hud={hud} onOpenRelations={() => setModal('relations')} />
            </ErrorBoundary>
          )}
        </div>
      </main>

      {modal === 'pause' && <PauseMenuModal onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
      {modal === 'saves' && <SaveLoadModal allowSave onClose={() => setModal(null)} />}
      {modal === 'character' && <CharacterModal hud={hud} onClose={() => setModal(null)} />}
      {modal === 'family_tree' && (
        <FamilyTreeModal dynasty={hud.dynasty} onClose={() => setModal(null)} />
      )}
      {modal === 'properties' && (
        <Modal title={t('properties.modal_title')} onClose={() => setModal(null)}>
          <PropertiesPanel hud={hud} />
        </Modal>
      )}
      {modal === 'relations' && <RelationsModal hud={hud} onClose={() => setModal(null)} />}
      {modal === 'map' && <RegionMapModal hud={hud} onClose={() => setModal(null)} />}
      {modal === 'chronicle' && <ChronicleModal hud={hud} onClose={() => setModal(null)} />}

      {hud.pending ? <EventCard pending={hud.pending} /> : hud.minor && <EventCard pending={hud.minor} minor />}
      {hud.gameOver &&
        (hud.dynasty.playMode === 'dynasty' && hud.succession ? (
          <SuccessionModal summary={hud.gameOver} succession={hud.succession} dynasty={hud.dynasty} />
        ) : (
          <LifeSummary summary={hud.gameOver} />
        ))}
      <DevPanel />
    </div>
  );
}
