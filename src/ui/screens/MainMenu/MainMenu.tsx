// [0] Menu chính: ván mới (xuất thân, tuổi bắt đầu, giới tính, seed) hoặc chơi tiếp bản lưu
import { useSnapshot, useUi } from '../../context';
import { NewGame } from '../NewGame/NewGame';

export function MainMenu() {
  const { store, t } = useUi();
  const snap = useSnapshot();

  return (
    <div className="menu">
      <div className="menu-card panel">
        <h1>{t('app.title')}</h1>
        <p className="tagline">{t('app.tagline')}</p>

        {snap.hasSave && (
          <button className="primary wide" onClick={() => void store.continueGame()}>
            {t('menu.continue')}
          </button>
        )}

        <NewGame />

        <p className="muted small">{t('menu.hint')}</p>
      </div>
    </div>
  );
}
