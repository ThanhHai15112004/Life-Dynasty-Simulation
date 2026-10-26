// [8] Menu tạm dừng trong ván (Pause Menu Modal): Tiếp tục, Lưu/Nạp nhiều ô, Cài đặt, Hướng dẫn, Về menu chính
import { useState } from 'react';
import { BookOpen, FolderOpen, Home, Play, Save, Settings } from 'lucide-react';
import { useSnapshot, useUi } from '../context';
import { Modal } from './Modal';
import { SaveLoadModal } from './SaveLoadModal';
import { SettingsModal } from './SettingsModal';

export function PauseMenuModal({ onClose }: { onClose: () => void }) {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const [subModal, setSubModal] = useState<'saves' | 'settings' | null>(null);
  const [quickSaved, setQuickSaved] = useState(false);

  if (subModal === 'saves') {
    return <SaveLoadModal allowSave onClose={() => setSubModal(null)} />;
  }
  if (subModal === 'settings') {
    return <SettingsModal onClose={() => setSubModal(null)} />;
  }

  const handleQuickSave = async () => {
    const ok = await store.save(snap.activeSlot);
    if (ok) {
      setQuickSaved(true);
      setTimeout(() => setQuickSaved(false), 1800);
    }
  };

  return (
    <Modal title={t('pause.title')} onClose={onClose}>
      <div className="pause-menu-list">
        <p className="muted small">{t('pause.subtitle')}</p>

        <button type="button" className="primary wide" onClick={onClose}>
          <Play size={16} /> {t('pause.resume')}
        </button>

        <button type="button" className="wide" onClick={() => void handleQuickSave()}>
          <Save size={16} /> {quickSaved ? t('pause.quick_saved') : t('pause.quick_save')}
        </button>

        <button type="button" className="wide" onClick={() => setSubModal('saves')}>
          <FolderOpen size={16} /> {t('pause.manage_saves')}
        </button>

        <button type="button" className="wide" onClick={() => setSubModal('settings')}>
          <Settings size={16} /> {t('settings.title')}
        </button>

        <button
          type="button"
          className="wide"
          onClick={() => {
            void store.resetOnboarding();
            onClose();
          }}
        >
          <BookOpen size={16} /> {t('pause.reopen_guide')}
        </button>

        <button
          type="button"
          className="wide"
          onClick={() => {
            onClose();
            store.backToMenu();
          }}
        >
          <Home size={16} /> {t('menu.back')}
        </button>

        <div className="pause-hotkeys muted small">{t('settings.hotkeys_desc')}</div>
      </div>
    </Modal>
  );
}
