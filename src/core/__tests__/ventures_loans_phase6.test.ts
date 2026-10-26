import { describe, expect, it } from 'vitest';
import { GameSession } from '@core/api/GameSession';
import { getHudView } from '@core/api/queries';
import { SAVE_VERSION } from '@core/entities/World';
import { buildSceneDescriptor } from '@core/scene-descriptor';
import { migrateState } from '@core/world/migrate';
import { loadNodeContent } from '../../../tools/shared/nodeContent';

const content = loadNodeContent();

function createScenarioSession(scenarioId: string, seed: string): GameSession {
  const sc = content.index.scenario.get(scenarioId);
  if (!sc) throw new Error(`Missing scenario: ${scenarioId}`);
  return GameSession.createFromScenario(content, sc, { seed });
}

describe('Phase 6 — Cơ nghiệp & Tài sản (ventures, house upgrade, NPC loans)', () => {
  it('mở cơ nghiệp Sạp nhỏ, nâng cấp lên Cửa hiệu -> Hiệu buôn, thuê thợ và quyết toán năm', () => {
    const session = createScenarioSession('co_sap_nho', 'seed_phase6_1');
    let hud = session.read(getHudView);
    expect(hud.manage.isHead).toBe(true);
    expect(hud.ventures.owned.some((v) => v.id === 'sap_nho')).toBe(true);

    // Cho thêm tiền để nâng cấp Sạp nhỏ -> Cửa hiệu -> Hiệu buôn
    session.dispatch({ type: 'devModifyStat', stat: 'money', delta: 300 });
    expect(session.dispatch({ type: 'expandVenture', ventureId: 'sap_nho' }).ok).toBe(true);
    hud = session.read(getHudView);
    expect(hud.ventures.owned.some((v) => v.id === 'cua_hieu')).toBe(true);

    expect(session.dispatch({ type: 'expandVenture', ventureId: 'cua_hieu' }).ok).toBe(true);
    hud = session.read(getHudView);
    const hieuBuon = hud.ventures.owned.find((v) => v.id === 'hieu_buon');
    expect(hieuBuon).toBeDefined();
    expect(hieuBuon!.revenueYear).toBeGreaterThan(20);

    // Thuê thêm 2 thợ ngoài
    expect(
      session.dispatch({ type: 'setVentureWorkers', ventureId: 'hieu_buon', hiredWorkers: 2 }).ok,
    ).toBe(true);
    hud = session.read(getHudView);
    expect(hud.ventures.owned.find((v) => v.id === 'hieu_buon')?.hiredWorkers).toBe(2);

    // Chạy 12 tháng qua năm mới để kiểm tra quyết toán doanh thu cơ nghiệp
    for (let m = 0; m < 12; m++) {
      const h = session.read(getHudView);
      if (h.pending) {
        session.dispatch({ type: 'chooseOption', optionId: h.pending.options[0].id });
      }
      if (h.minor) {
        session.dispatch({ type: 'chooseMinor', optionId: h.minor.options[0].id });
      }
      session.tickMonth();
    }

    hud = session.read(getHudView);
    const historyEntries = hud.ledger.history[hud.ledger.history.length - 1]?.entries ?? [];
    expect(historyEntries.some((e) => e.category === 'co_nghiep' && e.money > 0)).toBe(true);
  });

  it('nâng cấp nhà ở từ Nhà tranh -> Nhà gỗ ba gian -> Phủ đệ năm gian và đổi cảnh pixel', () => {
    const session = createScenarioSession('co_sap_nho', 'seed_phase6_house');
    session.dispatch({ type: 'devModifyStat', stat: 'money', delta: 300 });

    let hud = session.read(getHudView);
    if (hud.houseUpgrade?.currentId === 'nha_tranh') {
      expect(session.dispatch({ type: 'upgradeHouse' }).ok).toBe(true);
      hud = session.read(getHudView);
      expect(hud.household.properties.find((p) => p.category === 'house')?.id).toBe('nha_go');
      const scene1 = session.read((ctx) => buildSceneDescriptor(ctx));
      expect(scene1.house).toBe('nha_go');
    }

    hud = session.read(getHudView);
    expect(hud.houseUpgrade?.nextId).toBe('phu_nho');
    expect(session.dispatch({ type: 'upgradeHouse' }).ok).toBe(true);

    hud = session.read(getHudView);
    expect(hud.household.properties.find((p) => p.category === 'house')?.id).toBe('phu_nho');
    expect(hud.houseUpgrade).toBeNull();
    const scene2 = session.read((ctx) => buildSceneDescriptor(ctx));
    expect(scene2.house).toBe('phu_nho');
  });

  it('vay và cho vay có chủ nợ / con nợ NPC: trả nợ, thu hồi nợ và xóa nợ lấy ân tình', () => {
    const session = createScenarioSession('co_sap_nho', 'seed_phase6_loan');
    session.dispatch({ type: 'devModifyStat', stat: 'money', delta: 100 });
    let hud = session.read(getHudView);

    // 1. Vay từ chủ nợ NPC
    const creditor = hud.npcLoans.creditors[0];
    expect(creditor).toBeDefined();
    expect(session.dispatch({ type: 'borrowFromNpc', npcId: creditor.id, amount: 25 }).ok).toBe(true);

    hud = session.read(getHudView);
    expect(hud.npcLoans.borrowed.length).toBe(1);
    expect(hud.npcLoans.borrowed[0].amount).toBe(25);
    expect(hud.household.debt).toBeGreaterThanOrEqual(25);

    // 2. Trả nợ cho chủ nợ NPC
    const loanId = hud.npcLoans.borrowed[0].id;
    expect(session.dispatch({ type: 'repayNpcLoan', loanId, amount: 25 }).ok).toBe(true);
    hud = session.read(getHudView);
    expect(hud.npcLoans.borrowed.length).toBe(0);

    // 3. Cho người trong làng vay tiền và xóa nợ lấy đại ân tình
    const borrower = hud.npcLoans.borrowers[0];
    expect(borrower).toBeDefined();
    const favorBefore = borrower.favor;
    expect(session.dispatch({ type: 'lendToNpc', npcId: borrower.id, amount: 10 }).ok).toBe(true);

    hud = session.read(getHudView);
    expect(hud.npcLoans.lent.length).toBe(1);
    const lentId = hud.npcLoans.lent[0].id;
    expect(session.dispatch({ type: 'forgiveNpcLoan', loanId: lentId }).ok).toBe(true);

    hud = session.read(getHudView);
    expect(hud.npcLoans.lent.length).toBe(0);
    const borrowerAfter = hud.npcLoans.borrowers.find((b) => b.id === borrower.id);
    expect(borrowerAfter?.favor).toBeGreaterThan(favorBefore + 10);
  });

  it('khởi tạo và chạy ổn định 5 kịch bản mới của Phase 6', () => {
    const scenarioIds = [
      'co_sap_nho',
      'hieu_buon_sap_pha_san',
      'thua_ke_xuong_gom',
      'gia_cao_bat_thuong',
      'chu_no_den_doi',
    ];
    for (const id of scenarioIds) {
      const session = createScenarioSession(id, `seed_${id}`);
      const hud = session.read(getHudView);
      expect(hud.player.age).toBeGreaterThan(15);
      if (id === 'hieu_buon_sap_pha_san') {
        expect(hud.ventures.owned.some((v) => v.id === 'hieu_buon' && v.statusKey === 'critical')).toBe(true);
        expect(hud.pending?.eventId).toBe('kt_co_nghiep_sa_sut');
      }
      if (id === 'thua_ke_xuong_gom') {
        expect(hud.ventures.owned.some((v) => v.id === 'lo_gom' && v.stage === 2)).toBe(true);
      }
      if (id === 'gia_cao_bat_thuong') {
        expect(hud.career.opportunity.tradeIndex).toBeCloseTo(1.55, 2);
      }
      if (id === 'chu_no_den_doi') {
        expect(hud.npcLoans.borrowed.length).toBeGreaterThan(0);
        expect(hud.pending?.eventId).toBe('kt_chu_no_den_doi');
      }
    }
  });

  it('migrateState nâng cấp save cũ lên SAVE_VERSION = 5 với ventures và loans mặc định', () => {
    const session = GameSession.create(content, { seed: 'migrate_v5' });
    const raw = JSON.parse(session.serialize());
    raw.version = 4;
    for (const h of Object.values(raw.households) as Record<string, unknown>[]) {
      delete h.ventures;
      delete h.loans;
    }
    const migrated = migrateState(raw, content);
    expect(migrated.version).toBe(SAVE_VERSION);
    for (const h of Object.values(migrated.households)) {
      expect(Array.isArray(h.ventures)).toBe(true);
      expect(Array.isArray(h.loans)).toBe(true);
    }
  });
});
