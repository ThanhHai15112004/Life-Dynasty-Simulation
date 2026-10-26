// [2] Kiểm thử tự động Phase 2: Tách hộ, Thừa kế Nho giáo, Chế độ số phận, Đỡ xui & Điềm báo trước cái chết
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { GameSession } from '../api/GameSession';
import { getHudView } from '../api/queries';
import { SAVE_VERSION } from '../entities/World';
import { weightOf } from '../events/selection';
import { Ledger, SystemLog } from '../events/systemLogKeys';
import { createContext } from '../systems/context';
import { isEldestChild, settleInheritance, splitPlayerHousehold } from '../systems/family';
import { kill, monthlyDeathRisk } from '../systems/life';
import { player, playerHousehold } from '../systems/people';

const content = loadNodeContent();

describe('Phase 2 — Tách hộ (Household Split)', () => {
  it('con thứ xin tách hộ: nhận phần ruộng/tiền/thóc, gộp túi tiền riêng, tạo hộ mới nối với nhà cha mẹ', () => {
    const sc = content.index.scenario.get('vua_cuoi_con_o_chung')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'split-test-1' });

    // Trước khi chọn phương án: đang có sự kiện gd_xin_ra_o_rieng
    expect(session.state.pending?.eventId).toBe('gd_xin_ra_o_rieng');
    const oldHouseholdId = session.state.householdId;
    const oldSao = session.state.households[oldHouseholdId].properties.ruong ?? 0;
    expect(oldSao).toBeGreaterThanOrEqual(4);

    // Chọn phương án 1: xin_phan_gia (tách hộ theo lệ thường)
    const res = session.dispatch({ type: 'chooseOption', optionId: 'xin_phan_gia' });
    expect(res.ok).toBe(true);

    const newHouseholdId = session.state.householdId;
    expect(newHouseholdId).not.toBe(oldHouseholdId);

    const newH = session.state.households[newHouseholdId];
    const parentH = session.state.households[oldHouseholdId];
    expect(newH.parentHouseholdId).toBe(oldHouseholdId);
    expect(newH.splitFromYear).toBe(session.state.clock.year);
    expect((newH.properties.ruong ?? 0) + (parentH.properties.ruong ?? 0)).toBe(oldSao);
    expect(newH.properties.ruong ?? 0).toBeGreaterThan(0);

    // Kiểm tra sổ sách hộ mới có dòng phan_gia và UI HudView hiển thị Nhà cha mẹ
    expect(newH.ledger.some((e) => e.category === Ledger.HouseholdSplit)).toBe(true);
    const hud = session.read(getHudView);
    expect(hud.player.isHead).toBe(true);
    expect(hud.household.parentHousehold).not.toBeNull();
    expect(hud.household.parentHousehold?.id).toBe(oldHouseholdId);
  });

  it('con thứ ra riêng tay trắng (share_factor = 0): không lấy ruộng của cha mẹ', () => {
    const sc = content.index.scenario.get('con_thu_ra_rieng_tay_trang')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'split-zero-1' });
    const hud = session.read(getHudView);
    expect(hud.household.parentHousehold).not.toBeNull();
    const newH = session.state.households[session.state.householdId];
    expect(newH.properties.ruong ?? 0).toBe(0);
    expect(hud.household.parentHousehold!.farmland).toBeGreaterThan(0);
  });
});

describe('Phase 2 — Thừa kế (Inheritance) & Điềm báo trước cái chết', () => {
  it('cha già ốm yếu phát điềm báo trước cái chết và khi mất thì phân chia gia sản cho 3 con trai theo luật Nho giáo', () => {
    const sc = content.index.scenario.get('cha_sap_mat_3_con')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'inherit-3-sons' });

    // Người chơi (28 tuổi) là anh cả trước 2 em trai (24 và 21 tuổi)
    session.read((ctx) => {
      expect(isEldestChild(ctx, player(ctx))).toBe(true);
    });

    const totalSaoBefore = session.state.households[session.state.householdId].properties.ruong ?? 0;
    expect(totalSaoBefore).toBeGreaterThanOrEqual(8);

    // Chạy 1 tháng để kiểm tra điềm báo ốm yếu (cha 68 tuổi, health = 12 <= 20)
    session.tickMonth();
    const allLogsAfter1m = session.state.log.flatMap((y) => y.entries);
    expect(allLogsAfter1m.some((e) => e.sourceId === SystemLog.DeathOmen)).toBe(true);

    // Nếu cha chưa chết tự nhiên trong tháng đầu, kích hoạt cha qua đời để kiểm tra phân chia di sản
    const me = session.state.characters[session.state.playerId];
    const father = session.state.characters[me.fatherId!];
    if (father.alive) {
      const ctx = createContext(session.state as never, content);
      kill(ctx, father, 'gia_yeu');
    }

    // Cha đã mất: kiểm tra cư tang, chia ruộng hương hỏa (50% + 1/3 của 50% = 66.7%) và 2 em trai tách ra hộ riêng
    expect(father.alive).toBe(false);
    expect(session.state.civilization.mourningMonthsLeft).toBeGreaterThan(0);

    const h = session.state.households[session.state.householdId];
    const expectedPlayerSao = Math.round(totalSaoBefore * (0.5 + 0.5 / 3));
    expect(h.properties.ruong).toBe(expectedPlayerSao);
    expect(h.ledger.some((e) => e.category === Ledger.Inheritance)).toBe(true);

    // Thẻ gia đình hiện 2 Nhà anh em đã ra riêng
    const hud = session.read(getHudView);
    expect(hud.household.siblingHouseholds.length).toBe(2);

    // Chốt sổ cuối năm có dòng thừa kế (ledger.thua_ke)
    const monthsLeftInYear = 12 - session.state.clock.month + 1;
    for (let i = 0; i < monthsLeftInYear; i++) {
      if (session.state.pending) {
        session.dispatch({ type: 'chooseOption', optionId: session.state.pending.options[0].id });
      }
      if (session.state.minor) session.autoResolveMinor();
      session.tickMonth();
    }
    const hudAfterYear = session.read(getHudView);
    expect(hudAfterYear.household.yearClose).not.toBeNull();
    expect(hudAfterYear.household.yearClose?.lines.some((l) => l.category === Ledger.Inheritance)).toBe(true);
  });

  it('nhận thừa kế khi người chơi là con thứ đã tách hộ ra ở riêng', () => {
    const session = GameSession.create(content, { seed: 'split-then-inherit', originId: 'nong_dan', startAge: 22, sex: 'm' });
    const ctx = createContext(session.state as never, content);
    const me = player(ctx);
    const parentH = playerHousehold(ctx);
    parentH.properties.ruong = 12;
    parentH.money = 60;

    // Cho người chơi tách hộ trước
    splitPlayerHousehold(ctx, 1);
    const playerH = playerHousehold(ctx);
    const saoAfterSplit = playerH.properties.ruong ?? 0;
    const parentSaoRemaining = parentH.properties.ruong ?? 0;
    expect(parentSaoRemaining).toBeGreaterThan(0);

    // Cha qua đời ở hộ gốc → người chơi ở hộ mới vẫn nhận phần thừa kế và bắt đầu cư tang
    const father = me.fatherId ? session.state.characters[me.fatherId] : undefined;
    if (father) {
      kill(ctx, father, 'gia_yeu');
    } else {
      settleInheritance(ctx, 1);
    }

    expect(playerH.properties.ruong ?? 0).toBeGreaterThan(saoAfterSplit);
    expect(playerH.ledger.some((e) => e.category === Ledger.Inheritance)).toBe(true);
  });
});

describe('Phase 2 — Chế độ số phận (Fate Modes) & Đỡ xui (Bad-luck Protection)', () => {
  it('cùng nhân vật và seed: rủi ro tử vong ở Khắc nghiệt > Đời thực > Đời bình lặng', () => {
    const sGentle = GameSession.create(content, { seed: 'fate-cmp', originId: 'nong_dan', startAge: 16, fateMode: 'binh_lang' });
    const sReal = GameSession.create(content, { seed: 'fate-cmp', originId: 'nong_dan', startAge: 16, fateMode: 'doi_thuc' });
    const sHarsh = GameSession.create(content, { seed: 'fate-cmp', originId: 'nong_dan', startAge: 16, fateMode: 'khac_nghiet' });

    const rGentle = sGentle.read((ctx) => monthlyDeathRisk(ctx, player(ctx)));
    const rReal = sReal.read((ctx) => monthlyDeathRisk(ctx, player(ctx)));
    const rHarsh = sHarsh.read((ctx) => monthlyDeathRisk(ctx, player(ctx)));

    expect(rGentle).toBeLessThan(rReal);
    expect(rHarsh).toBeGreaterThan(rReal);
    expect(rGentle / rReal).toBeCloseTo(0.7, 2);
    expect(rHarsh / rReal).toBeCloseTo(1.3, 2);
  });

  it('Đỡ xui (Bad-luck protection): khi badLuckCounter đạt ngưỡng thì tăng trọng số sự kiện cứu vãn và giảm sự kiện xấu', () => {
    const session = GameSession.create(content, { seed: 'blp-test', originId: 'nong_dan', startAge: 25 });
    const ctx = createContext(session.state as never, content);
    const salvationEv = content.index.event.get('gd_ho_hang_cuu_giup')!;

    const wNormal = weightOf(ctx, salvationEv, {});
    ctx.state.badLuckCounter = content.balance.director.bad_luck_protection.consecutive_bad_threshold;
    const wBoosted = weightOf(ctx, salvationEv, {});

    expect(wBoosted).toBeCloseTo(wNormal * content.balance.director.bad_luck_protection.salvation_event_boost, 5);
  });

  it('nâng cấp save cũ (version 2 → version 3) tự bù fateMode và badLuckCounter', () => {
    const session = GameSession.create(content, { seed: 'migrate-v3', originId: 'nong_dan', startAge: 16 });
    const raw = JSON.parse(session.serialize());
    raw.version = 2;
    delete raw.fateMode;
    delete raw.badLuckCounter;

    const loaded = GameSession.load(content, JSON.stringify(raw));
    expect(loaded.state.version).toBe(SAVE_VERSION);
    expect(loaded.state.fateMode).toBe('doi_thuc');
    expect(loaded.state.badLuckCounter).toBe(0);
  });
});
