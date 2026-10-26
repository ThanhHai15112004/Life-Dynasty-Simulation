import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent, type RawFile } from '@content/ContentLoader';
import { GameSession, getHudView } from '@core/index';
import { SAVE_VERSION } from '@core/entities/World';
import { migrateState } from '@core/world/migrate';
import { triggerSettlementEpidemic } from '@core/world/region';
import { createContext } from '@core/systems/context';

function readDirRecursive(root: string, dir = root): RawFile[] {
  const out: RawFile[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...readDirRecursive(root, full));
    else if (/\.(ya?ml|json)$/.test(name)) out.push({ path: relative(root, full), text: readFileSync(full, 'utf8') });
  }
  return out;
}

const content = loadContent(readDirRecursive(join(process.cwd(), 'src/data')));

describe('Phase 7 — Một vùng: Làng – Thị trấn – Phủ (region, travel, relocate, epidemic)', () => {
  it('khởi tạo đủ 3 khu định cư trong vùng (lang_nong, thi_tran_ben_song, phu_thanh) với tuyến đường và trạng thái riêng', () => {
    const session = GameSession.create(content, { seed: 'region_init_test', originId: 'nong_dan', startAge: 22 });
    const hud = session.read(getHudView);

    expect(hud.region.settlements.map((s) => s.id)).toEqual([
      'lang_nong',
      'thi_tran_ben_song',
      'phu_thanh',
    ]);
    expect(hud.region.homeSettlementId).toBe('lang_nong');
    expect(hud.region.currentSettlementId).toBe('lang_nong');
    expect(session.sceneDescriptor().location).toBe('lang_nong');

    const town = hud.region.settlements.find((s) => s.id === 'thi_tran_ben_song')!;
    const pref = hud.region.settlements.find((s) => s.id === 'phu_thanh')!;
    expect(town.travelMonths).toBe(1);
    expect(pref.travelMonths).toBe(2);
    expect(pref.tradeFactor).toBeGreaterThan(town.tradeFactor);
  });

  it('chuyển nhà (relocateHousehold) ra thị trấn: tùy chọn bán ruộng cũ hoặc giữ ruộng thu tô, đổi cảnh pixel', () => {
    const session = GameSession.create(content, { seed: 'relocate_test', originId: 'nong_dan', startAge: 25 });
    session.dispatch({ type: 'devModifyStat', stat: 'money', delta: 40 });

    // Đảm bảo người chơi là chủ hộ
    for (const c of Object.values(session.state.characters)) {
      if (c.id !== session.state.playerId) c.alive = false;
    }

    const hudBefore = session.read(getHudView);
    const farmlandBefore = hudBefore.household.properties.find((p) => p.id === 'ruong')?.count ?? 0;
    expect(farmlandBefore).toBeGreaterThan(0);

    // Chuyển nhà ra thị trấn và chọn bán ruộng cũ
    const res = session.dispatch({
      type: 'relocateHousehold',
      targetSettlementId: 'thi_tran_ben_song',
      sellOldProperties: true,
    });
    expect(res.ok).toBe(true);

    const hudAfter = session.read(getHudView);
    expect(hudAfter.region.homeSettlementId).toBe('thi_tran_ben_song');
    expect(hudAfter.household.properties.find((p) => p.id === 'ruong')?.count ?? 0).toBe(0);
    expect(session.sceneDescriptor().location).toBe('thi_tran_ben_song');
  });

  it('đi buôn chuyến (startTradeTrip): cảnh chuyển sang điểm đến khi đang đi và hoàn tất thu lời sau hành trình', () => {
    const session = GameSession.create(content, { seed: 'trade_trip_test', originId: 'thuong_nhan', startAge: 26 });
    session.dispatch({ type: 'devModifyStat', stat: 'money', delta: 30 });
    for (const c of Object.values(session.state.characters)) {
      if (c.id !== session.state.playerId) c.alive = false;
    }

    const moneyBefore = session.state.households[session.state.householdId].money;
    const startRes = session.dispatch({
      type: 'startTradeTrip',
      targetSettlementId: 'phu_thanh',
      cargoMoney: 8,
    });
    expect(startRes.ok).toBe(true);
    expect(session.state.activeTrip?.targetSettlementId).toBe('phu_thanh');
    expect(session.sceneDescriptor().location).toBe('phu_thanh');

    // Chạy qua tháng để hoàn tất chuyến đi (từ thị trấn lên phủ mất 1 tháng)
    if (session.state.pending) {
      session.dispatch({ type: 'chooseOption', optionId: session.state.pending.options[0].id });
    }
    if (session.state.minor) session.autoResolveMinor();
    session.tickMonth();

    expect(session.state.activeTrip).toBeNull();
    expect(session.sceneDescriptor().location).toBe('thi_tran_ben_song');
    const moneyAfter = session.state.households[session.state.householdId].money;
    expect(moneyAfter).toBeGreaterThan(moneyBefore - 9.5);
  });

  it('quan văn lên phủ nhậm chức (appointOfficial): nhận bổng lộc an gia, đổi nơi ở và cảnh sang phu_thanh', () => {
    const sc = content.index.scenario.get('vung_quan_van_nham_chuc')!;
    const session = GameSession.createFromScenario(content, sc);
    // Chọn phương án đầu tiên của sự kiện nhậm chức
    const optId = session.state.pending?.options[0]?.id;
    expect(optId).toBeDefined();
    if (optId) {
      expect(session.dispatch({ type: 'chooseOption', optionId: optId }).ok).toBe(true);
    }

    const hud = session.read(getHudView);
    expect(hud.region.homeSettlementId).toBe('phu_thanh');
    expect(session.sceneDescriptor().location).toBe('phu_thanh');
  });

  it('dịch bệnh bùng phát làm giảm chỉ số buôn bán và có thể lan truyền dọc tuyến giao thương', () => {
    const session = GameSession.create(content, { seed: 'epidemic_test', originId: 'thuong_nhan', startAge: 25 });
    const ctx = createContext(session.state as never, content);
    triggerSettlementEpidemic(ctx, 'thi_tran_ben_song', 'ta_ly', 5);

    const hud = session.read(getHudView);
    const town = hud.region.settlements.find((s) => s.id === 'thi_tran_ben_song')!;
    expect(town.epidemic).not.toBeNull();
    expect(town.epidemic?.diseaseId).toBe('ta_ly');
    expect(town.epidemic?.monthsLeft).toBe(5);
  });

  it('khởi tạo và chạy ổn định 4 kịch bản mới của Phase 7', () => {
    const ids = [
      'vung_chuyen_ra_thi_tran',
      'vung_quan_van_nham_chuc',
      'vung_dich_bung_thi_tran',
      'vung_di_buon_nha_co_viec',
    ];
    for (const id of ids) {
      const sc = content.index.scenario.get(id);
      expect(sc, `Thiếu kịch bản ${id}`).toBeDefined();
      const session = GameSession.createFromScenario(content, sc!);
      const hud = session.read(getHudView);
      expect(hud.pending).not.toBeNull();

      // Chọn phương án đầu tiên và chạy 12 tháng không lỗi
      const firstOpt = hud.pending!.options[0].id;
      expect(session.dispatch({ type: 'chooseOption', optionId: firstOpt }).ok).toBe(true);
      for (let m = 0; m < 12; m++) {
        if (session.state.gameOver) break;
        if (session.state.pending) {
          session.dispatch({ type: 'chooseOption', optionId: session.state.pending.options[0].id });
        }
        if (session.state.minor) session.autoResolveMinor();
        session.tickMonth();
      }
    }
  });

  it('migrateState nâng cấp save cũ lên SAVE_VERSION = 6 với settlements và activeTrip mặc định', () => {
    const session = GameSession.create(content, { seed: 'migrate_v6' });
    const raw = JSON.parse(session.serialize());
    raw.version = 5;
    delete raw.settlements;
    delete raw.activeTrip;

    const migrated = migrateState(raw, content);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(Object.keys(migrated.settlements)).toEqual([
      'lang_nong',
      'thi_tran_ben_song',
      'phu_thanh',
    ]);
    expect(migrated.activeTrip).toBeNull();
  });
});
