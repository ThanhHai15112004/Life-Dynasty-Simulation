// [8] Kiểm thử tầng @bridge cho Phase 8:
// - SettingsStore lưu trữ và làm sạch cài đặt người chơi qua StorageAdapter
// - GameStore quản lý nhiều ô lưu và báo mã lỗi khi gặp save hỏng
// - AudioManager chọn nhạc nền theo văn minh & tâm trạng và âm thanh môi trường theo cảnh
import { describe, expect, it } from 'vitest';
import { GameSession, MemoryStorage, SaveSystem } from '@core/index';
import { AudioManager } from '../AudioManager';
import { GameStore } from '../GameStore';
import { SettingsStore } from '../SettingsStore';
import { loadNodeContent } from '../../../tools/shared/nodeContent';

const content = loadNodeContent();

describe('Phase 8 (@bridge): SettingsStore, GameStore & AudioManager', () => {
  it('persists and sanitizes user settings in StorageAdapter', async () => {
    const storage = new MemoryStorage();
    const settingsStore = new SettingsStore(storage, content);

    const initial = await settingsStore.load();
    expect(initial.language).toBe('vi');
    expect(initial.progressiveUi).toBe(true);
    expect(initial.onboardingEnabled).toBe(true);

    await settingsStore.save({
      ...initial,
      language: 'en',
      numberDisplay: 'numbers',
      musicVolume: 80,
      fontScale: 'lg',
      dismissedOnboardingStages: ['au_tho'],
    });

    const reloaded = await settingsStore.load();
    expect(reloaded.language).toBe('en');
    expect(reloaded.numberDisplay).toBe('numbers');
    expect(reloaded.musicVolume).toBe(80);
    expect(reloaded.fontScale).toBe('lg');
    expect(reloaded.dismissedOnboardingStages).toEqual(['au_tho']);
  });

  it('manages multi-slot saves and reports corrupted slot errors in GameStore', async () => {
    const storage = new MemoryStorage();
    const saveSys = new SaveSystem(storage);
    const store = new GameStore(content, saveSys);

    store.newGame({ originId: 'nong_dan', seed: 'store-test' });
    const savedOk = await store.saveToSlot('slot_1');
    expect(savedOk).toBe(true);
    expect(store.getSnapshot().activeSlot).toBe('slot_1');

    // Ghi dữ liệu hỏng vào slot_2 và thử nạp
    await storage.set('dongdoi.save.slot_2', '{broken_json');
    await store.refreshSaveSlots();
    const corruptedSlot = store.getSnapshot().saveSlots.find((s) => s.slot === 'slot_2');
    expect(corruptedSlot?.corrupted).toBe(true);

    const loadedBroken = await store.loadSlot('slot_2');
    expect(loadedBroken).toBe(false);
    expect(store.getSnapshot().lastError).toBe('error.save_corrupted');
  });

  it('selects music mood and ambient tracks from SceneDescriptor in AudioManager', () => {
    const audio = new AudioManager();
    const session = GameSession.create(content, { originId: 'nong_dan', startAge: 16, seed: 'audio-test' });
    const scene = session.sceneDescriptor();

    audio.syncScene(scene, 10, 0);
    expect(audio.getState().mood).toBe('yen_binh');
    expect(audio.getState().ambient).toBe('dong_que');

    audio.syncScene(scene, 80, 0);
    expect(audio.getState().mood).toBe('cang_thang');

    audio.syncScene(scene, 10, 12);
    expect(audio.getState().mood).toBe('tang_toc');
  });
});
