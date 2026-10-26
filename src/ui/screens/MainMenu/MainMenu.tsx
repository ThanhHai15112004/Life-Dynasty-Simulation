// [0] Menu chính: 3 Tabs (Chơi tiếp / Ván mới / Thử nghiệm) + Quản lý ô lưu & Cài đặt (Phase 8)
import { useState } from 'react';
import { SaveLoadModal } from '../../components/SaveLoadModal';
import { SettingsModal } from '../../components/SettingsModal';
import { useSnapshot, useUi } from '../../context';
import { NewGame } from '../NewGame/NewGame';
import { ScenarioBrowser } from '../ScenarioBrowser/ScenarioBrowser';
import '../ScenarioBrowser/ScenarioBrowser.css';

type MainMenuTab = 'continue' | 'new_game' | 'scenarios';

export function MainMenu() {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const [tab, setTab] = useState<MainMenuTab>(snap.hasSave ? 'continue' : 'new_game');
  const [openModal, setOpenModal] = useState<null | 'saves' | 'settings' | 'changelog'>(null);

  const validSlots = snap.saveSlots.filter((s) => s.exists && !s.corrupted);
  const corruptedSlots = snap.saveSlots.filter((s) => s.corrupted);
  const latestSlot = validSlots.find((s) => s.slot === snap.activeSlot) ?? validSlots[0];

  return (
    <div className="menu">
      <div className="menu-card panel" style={{ maxWidth: tab === 'scenarios' ? '760px' : '520px' }}>
        <div className="card-head" style={{ marginBottom: 4 }}>
          <div>
            <h1>{t('app.title')}</h1>
            <span className="chip" style={{ marginTop: 2 }}>{t('app.version')}</span>
          </div>
          <div className="row" style={{ margin: 0 }}>
            <button className="small" onClick={() => setOpenModal('saves')}>
              {t('saves.short')}
            </button>
            <button className="small" onClick={() => setOpenModal('settings')}>
              {t('settings.title')}
            </button>
          </div>
        </div>
        <p className="tagline">{t('app.tagline')}</p>

        {snap.lastError && (
          <div className="hud-banner error-banner" style={{ marginBottom: 12 }}>
            <span>{t(snap.lastError.startsWith('error.') ? snap.lastError : `error.${snap.lastError}`)}</span>
            <button className="small" onClick={() => store.clearError()}>
              {t('onboarding.dismiss')}
            </button>
          </div>
        )}

        {corruptedSlots.length > 0 && !snap.lastError && (
          <div className="hud-banner error-banner" style={{ marginBottom: 12 }}>
            <span>{t('saves.corrupted_notice', { n: corruptedSlots.length })}</span>
            <button className="small" onClick={() => setOpenModal('saves')}>
              {t('saves.manage_btn')}
            </button>
          </div>
        )}

        <div className="menu-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {snap.hasSave && (
            <button
              className={`chip ${tab === 'continue' ? 'active' : ''}`}
              onClick={() => setTab('continue')}
            >
              {t('menu.tab_continue')}
            </button>
          )}
          <button
            className={`chip ${tab === 'new_game' ? 'active' : ''}`}
            onClick={() => setTab('new_game')}
          >
            {t('menu.tab_new_game')}
          </button>
          <button
            className={`chip ${tab === 'scenarios' ? 'active' : ''}`}
            onClick={() => setTab('scenarios')}
          >
            {t('menu.tab_scenarios')}
          </button>
        </div>

        {tab === 'continue' && snap.hasSave && (
          <div>
            {latestSlot && (
              <div className="save-slot-card active" style={{ marginBottom: 12 }}>
                <div className="card-head" style={{ marginBottom: 4 }}>
                  <b>{latestSlot.playerName}</b>
                  <span className="chip">{t(`saves.slot.${latestSlot.slot}`)}</span>
                </div>
                <div className="muted small">
                  {t('saves.meta_line', {
                    age: latestSlot.age ?? 0,
                    year: latestSlot.year ?? 0,
                    gen: latestSlot.generation ?? 1,
                  })}
                </div>
              </div>
            )}
            <button className="primary wide" onClick={() => void store.continueGame(latestSlot?.slot)}>
              {t('menu.continue')}
            </button>
            <button className="wide" onClick={() => setOpenModal('saves')}>
              {t('saves.manage_btn')}
            </button>
          </div>
        )}

        {tab === 'new_game' && <NewGame />}

        {tab === 'scenarios' && <ScenarioBrowser />}

        <p className="muted small" style={{ marginTop: '16px' }}>{t('menu.hint')}</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 8, marginBottom: 0 }}>
          <button className="small" onClick={() => setOpenModal('changelog')}>
            {t('menu.changelog_btn')}
          </button>
        </div>
      </div>

      {openModal === 'saves' && <SaveLoadModal allowSave={false} onClose={() => setOpenModal(null)} />}
      {openModal === 'settings' && <SettingsModal onClose={() => setOpenModal(null)} />}
      {openModal === 'changelog' && (
        <div className="modal-backdrop" onClick={() => setOpenModal(null)}>
          <div className="modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <h2>{t('changelog.title')}</h2>
              <button className="small" onClick={() => setOpenModal(null)}>
                {t('settings.close')}
              </button>
            </div>
            <p className="muted small" style={{ marginBottom: 12 }}>
              {t('changelog.subtitle')}
            </p>
            <div className="modal-body">
              <div className="subhead">{t('changelog.v1_0_heading')}</div>
              <ul className="duties">
                <li>{t('changelog.v1_0_item_1')}</li>
                <li>{t('changelog.v1_0_item_2')}</li>
                <li>{t('changelog.v1_0_item_3')}</li>
                <li>{t('changelog.v1_0_item_4')}</li>
                <li>{t('changelog.v1_0_item_5')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
