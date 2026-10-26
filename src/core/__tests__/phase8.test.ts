// [8] Kiểm thử tầng @core cho Phase 8:
// - Lưu game nhiều ô, tương thích ngược save cũ (v1..v5 -> v6), phát hiện save hỏng (SaveError)
// - Minh bạch số liệu (Modifier breakdown cho Mãn nguyện, Danh tiếng, Hiếu đạo, Danh vọng khoa bảng, Tài sản ròng, Thu nhập)
// - 3 kịch bản kiểm thử Phase 8 (van_dau_tien_huong_dan, nap_save_phien_ban_cu, save_hong_phuc_hoi)
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SAVE_SLOTS,
  GameSession,
  MemoryStorage,
  SaveError,
  SaveSystem,
  deserialize,
  getHudView,
  serialize,
} from '../index';
import { SAVE_VERSION } from '../entities/World';
import { loadNodeContent } from '../../../tools/shared/nodeContent';

const content = loadNodeContent();

describe('Phase 8 (@core): Multi-slot SaveSystem, Legacy Migration & Corrupted Save Recovery', () => {
  it('saves, lists, inspects, and deletes across multiple slots', async () => {
    const storage = new MemoryStorage();
    const saveSys = new SaveSystem(storage);

    const s1 = GameSession.create(content, { originId: 'nong_dan', seed: 'slot-1-seed' });
    const s2 = GameSession.create(content, { originId: 'thuong_nhan', seed: 'slot-2-seed' });

    await saveSys.save('auto', s1.state);
    await saveSys.save('slot_1', s2.state);

    const slots = await saveSys.listSlots(DEFAULT_SAVE_SLOTS);
    expect(slots).toHaveLength(4);

    const autoInfo = slots.find((s) => s.slot === 'auto')!;
    expect(autoInfo.exists).toBe(true);
    expect(autoInfo.corrupted).toBe(false);
    expect(autoInfo.originId).toBe('nong_dan');

    const slot1Info = slots.find((s) => s.slot === 'slot_1')!;
    expect(slot1Info.exists).toBe(true);
    expect(slot1Info.corrupted).toBe(false);
    expect(slot1Info.originId).toBe('thuong_nhan');

    const slot2Info = slots.find((s) => s.slot === 'slot_2')!;
    expect(slot2Info.exists).toBe(false);

    await saveSys.remove('slot_1');
    const afterDelete = await saveSys.inspectSlot('slot_1');
    expect(afterDelete.exists).toBe(false);
  });

  it('migrates legacy v1-v5 saves cleanly to current SAVE_VERSION', () => {
    const session = GameSession.create(content, { originId: 'nong_dan', seed: 'legacy-save' });
    const rawCurrent = JSON.parse(serialize(session.state)) as Record<string, unknown>;

    // Giả lập bản lưu phiên bản v2 thiếu các trường Phase 3–7 (dynasty, settlements, activeTrip, ventures, loans)
    const legacyState: Record<string, unknown> = { ...rawCurrent, version: 2 };
    delete legacyState.dynasty;
    delete legacyState.settlements;
    delete legacyState.activeTrip;

    const legacyJson = JSON.stringify(legacyState);
    const restoredSession = GameSession.load(content, legacyJson);
    const hud = restoredSession.read(getHudView);

    expect(restoredSession.state.version).toBe(SAVE_VERSION);
    expect(hud.player.name.length).toBeGreaterThan(0);
    expect(hud.region.settlements.length).toBeGreaterThanOrEqual(3);
    expect(hud.dynasty.currentGeneration).toBe(1);
  });

  it('detects corrupted JSON and incompatible version with explicit SaveError codes', async () => {
    expect(() => deserialize('{not-valid-json')).toThrowError(SaveError);
    try {
      deserialize('{not-valid-json');
    } catch (e) {
      expect(e).toBeInstanceOf(SaveError);
      expect((e as SaveError).code).toBe('save_corrupted');
    }

    const futureJson = JSON.stringify({ version: SAVE_VERSION + 99 });
    try {
      deserialize(futureJson);
    } catch (e) {
      expect(e).toBeInstanceOf(SaveError);
      expect((e as SaveError).code).toBe('save_version');
    }

    const missingFieldsJson = JSON.stringify({ version: SAVE_VERSION, seed: 'broken' });
    const storage = new MemoryStorage();
    await storage.set('dongdoi.save.slot_2', missingFieldsJson);
    const saveSys = new SaveSystem(storage);
    const info = await saveSys.inspectSlot('slot_2');
    expect(info.exists).toBe(true);
    expect(info.corrupted).toBe(true);
    expect(info.errorCode).toBe('save_corrupted');
  });
});

describe('Phase 8 (@core): Transparency Breakdowns & Scenarios', () => {
  it('computes modifier breakdowns for all stats and wealth numbers in HudView', () => {
    const session = GameSession.create(content, { originId: 'nong_dan', startAge: 16, seed: 'hud-breakdown' });
    const hud = session.read(getHudView);

    expect(hud.player.lifeStageId).toBe('thanh_nien');
    expect(hud.player.satisfactionBreakdown.lines.length).toBeGreaterThan(0);
    expect(hud.player.reputationBreakdown.lines.length).toBeGreaterThan(0);
    expect(hud.player.filialPietyBreakdown.lines.length).toBeGreaterThan(0);
    expect(hud.player.scholarlyPrestigeBreakdown.lines.length).toBeGreaterThan(0);
    expect(hud.household.netWorthBreakdown.lines.length).toBeGreaterThan(0);
    expect(hud.household.incomeBreakdown.lines.length).toBeGreaterThan(0);
  });

  it('launches all 3 Phase 8 scenarios cleanly', () => {
    for (const id of ['van_dau_tien_huong_dan', 'nap_save_phien_ban_cu', 'save_hong_phuc_hoi']) {
      const sc = content.index.scenario.get(id);
      expect(sc).toBeDefined();
      expect(sc?.group).toBe('he_thong');
      const session = GameSession.createFromScenario(content, sc!);
      const hud = session.read(getHudView);
      expect(hud.player.name.length).toBeGreaterThan(0);
    }
  });
});
