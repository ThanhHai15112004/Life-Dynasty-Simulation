// [8] Quản lý nhiều ô lưu (auto, slot_1, slot_2, slot_3), xuất/nhập file JSON & cảnh báo save hỏng
import { useRef, useState, type ChangeEvent } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useSnapshot, useUi } from '../context';
import { Modal } from './Modal';

export function SaveLoadModal({
  onClose,
  allowSave = true,
}: {
  onClose: () => void;
  allowSave?: boolean;
}) {
  const { store, t } = useUi();
  const snap = useSnapshot();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSlot, setImportSlot] = useState<string>('slot_1');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pasteJson, setPasteJson] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  const slotLabel = (slot: string) => {
    const key = `saves.slot.${slot}`;
    const trans = t(key);
    return trans === key ? slot : trans;
  };

  const handleSave = async (slot: string) => {
    const ok = await store.saveToSlot(slot);
    if (ok) {
      setStatusMsg(t('saves.saved_notice', { slot: slotLabel(slot) }));
    }
  };

  const handleLoad = async (slot: string) => {
    const ok = await store.loadSlot(slot);
    if (ok) {
      onClose();
    }
  };

  const handleExport = async (slot: string) => {
    const json = await store.exportSlot(slot);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dong_doi_${slot}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (store.importSave(text, importSlot)) {
        onClose();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteImport = () => {
    if (!pasteJson.trim()) return;
    if (store.importSave(pasteJson.trim(), importSlot)) {
      onClose();
    }
  };

  return (
    <Modal title={t('saves.modal_title')} onClose={onClose}>
      <div className="saves-panel">
        <p className="muted small">{t('saves.modal_subtitle')}</p>

        {snap.lastError && (
          <div className="save-error-banner" role="alert">
            <span>{t(snap.lastError)}</span>
            <button type="button" className="small" onClick={() => store.clearError()}>
              ✕
            </button>
          </div>
        )}

        {statusMsg && <div className="save-status-banner up">{statusMsg}</div>}

        <div className="save-slots-list">
          {snap.saveSlots.map((info) => {
            const origin = info.originId ? store.content.index.origin.get(info.originId) : undefined;
            const isActive = snap.screen === 'life' && snap.activeSlot === info.slot;
            return (
              <div
                key={info.slot}
                className={`save-slot-card ${isActive ? 'active' : ''} ${info.corrupted ? 'corrupted' : ''}`}
              >
                <div className="save-slot-info">
                  <div className="save-slot-head">
                    <b>{slotLabel(info.slot)}</b>
                    {isActive && <span className="chip up">{t('saves.active_tag')}</span>}
                    {info.corrupted && <span className="chip disease-chip">{t('saves.corrupted_tag')}</span>}
                  </div>
                  {!info.exists && <div className="muted small">{t('saves.empty_slot')}</div>}
                  {info.exists && info.corrupted && (
                    <div className="down small">{t(`error.${info.errorCode ?? 'save_corrupted'}`)}</div>
                  )}
                  {info.exists && !info.corrupted && (
                    <div className="muted small">
                      <b>{info.playerName}</b> · {t('profile.age', { age: info.age ?? 0 })} ·{' '}
                      {t('saves.year_gen', { year: info.year ?? 0, gen: info.generation ?? 1 })}
                      {origin ? ` · ${origin.name}` : ''}
                    </div>
                  )}
                </div>

                <div className="save-slot-actions">
                  {allowSave && snap.screen === 'life' && (
                    <button type="button" className="small" onClick={() => void handleSave(info.slot)}>
                      {t('saves.save_here')}
                    </button>
                  )}
                  {info.exists && !info.corrupted && (
                    <>
                      <button type="button" className="primary small" onClick={() => void handleLoad(info.slot)}>
                        {t('saves.load_btn')}
                      </button>
                      <button
                        type="button"
                        className="small"
                        title={t('saves.export_btn')}
                        onClick={() => void handleExport(info.slot)}
                      >
                        <Download size={14} /> {t('saves.export_btn')}
                      </button>
                    </>
                  )}
                  {info.exists && (
                    <button
                      type="button"
                      className="small"
                      title={t('saves.delete_btn')}
                      onClick={() => void store.deleteSlot(info.slot)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <h4>{t('saves.import_section')}</h4>
        <div className="row" style={{ alignItems: 'center' }}>
          <label className="small muted">{t('saves.import_target_slot')}</label>
          <select value={importSlot} onChange={(e) => setImportSlot(e.target.value)}>
            {snap.saveSlots.map((s) => (
              <option key={s.slot} value={s.slot}>
                {slotLabel(s.slot)}
              </option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> {t('saves.import_file_btn')}
          </button>
          <button type="button" className="small" onClick={() => setShowPaste((v) => !v)}>
            {t('saves.import_paste_toggle')}
          </button>
        </div>

        {showPaste && (
          <div className="save-paste-box">
            <textarea
              rows={3}
              placeholder={t('saves.import_paste_placeholder')}
              value={pasteJson}
              onChange={(e) => setPasteJson(e.target.value)}
            />
            <button type="button" className="primary small" onClick={handlePasteImport}>
              {t('saves.import_paste_submit')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
