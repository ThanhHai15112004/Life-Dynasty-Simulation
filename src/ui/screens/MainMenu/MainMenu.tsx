// [0] Menu chính: 3 Tabs (Chơi tiếp / Ván mới / Thử nghiệm)
import { useState } from 'react';
import { useSnapshot, useUi } from '../../context';
import { NewGame } from '../NewGame/NewGame';
import { ScenarioBrowser } from '../ScenarioBrowser/ScenarioBrowser';
import '../ScenarioBrowser/ScenarioBrowser.css';

type MainMenuTab = 'continue' | 'new_game' | 'scenarios';

export function MainMenu() {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const [tab, setTab] = useState<MainMenuTab>(snap.hasSave ? 'continue' : 'new_game');

  return (
    <div className="menu">
      <div className="menu-card panel" style={{ maxWidth: tab === 'scenarios' ? '760px' : '480px' }}>
        <h1>{t('app.title')}</h1>
        <p className="tagline">{t('app.tagline')}</p>

        <div className="menu-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
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
            <button className="primary wide" onClick={() => void store.continueGame()}>
              {t('menu.continue')}
            </button>
          </div>
        )}

        {tab === 'new_game' && <NewGame />}

        {tab === 'scenarios' && <ScenarioBrowser />}

        <p className="muted small" style={{ marginTop: '16px' }}>{t('menu.hint')}</p>
      </div>
    </div>
  );
}
