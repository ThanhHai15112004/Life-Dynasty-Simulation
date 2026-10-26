// [2] Kiểm thử tự động Phase 5: Nghề nghiệp v2 (10 nghề nhẹ/vừa mới, thâm niên ngành, nghề tay trái mùa nông nhàn, nghề của người nhà, bản đồ chuyển nghề & 14 kịch bản mới)
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { GameSession } from '../api/GameSession';
import { getHudView } from '../api/queries';
import { SAVE_VERSION } from '../entities/World';
import { Ledger } from '../events/systemLogKeys';
import { createContext } from '../systems/context';
import { createResolver } from '../systems/resolver';
import { migrateState } from '../world/migrate';

const content = loadNodeContent();

describe('Phase 5: Nghề nghiệp v2 (Khung)', () => {
  it('Nạp đủ 10 nghề nhẹ/vừa mới và 5 nghề tay trái mùa nông nhàn đúng schema', () => {
    const newCareerIds = [
      'ta_dien',
      'lam_thue',
      'tho_moc',
      'tho_ren',
      'thay_lang',
      'ngu_dan',
      'chu_do',
      'nha_lai',
      'ban_rong',
      'ba_do',
    ];
    for (const id of newCareerIds) {
      const c = content.index.career.get(id);
      expect(c, `Thiếu nghề ${id}`).toBeDefined();
      expect(['nhe', 'vua']).toContain(c!.depth);
      expect(c!.ranks.length).toBeGreaterThanOrEqual(3);
      expect(c!.actions.length).toBeGreaterThanOrEqual(1);
    }

    const sideJobIds = ['dan_lat', 'danh_ca', 'cho_do', 'buon_chuyen_nho', 'kiem_cui'];
    for (const sjId of sideJobIds) {
      const sj = content.index.sideJob.get(sjId);
      expect(sj, `Thiếu nghề tay trái ${sjId}`).toBeDefined();
      expect(sj!.income_money_month).toBeGreaterThan(0);
      expect(sj!.seasons.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Thâm niên 20 năm, thưởng thu nhập theo thâm niên ngành và xét thăng bậc theo năm + kỹ năng + danh tiếng', () => {
    const sc = content.index.scenario.get('lam_20_nam_sap_len_bac')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'phase5-seniority' });

    let hud = session.read(getHudView);
    expect(hud.career.id).toBe('tho_moc');
    expect(hud.career.months).toBe(240);
    expect(hud.career.sectorMonths).toBeGreaterThanOrEqual(240);
    // 20 năm * 3%/năm = +60% thưởng thâm niên
    expect(hud.career.seniorityBonusPercent).toBe(60);
    expect(hud.career.rankIndex).toBe(1); // Thợ mộc lành nghề (sắp lên Phó cả ở mốc 65 merit)

    // Chọn phương án đầu tiên của sự kiện tho_moc_cham_vi_keo_dinh hoặc dùng hành động để lên Phó cả
    if (hud.pending) {
      session.dispatch({ type: 'chooseOption', optionId: hud.pending.options[0].id });
    }
    session.dispatch({ type: 'doCareerAction', actionId: 'nhan_dung_nha_go' });
    session.tickMonth();

    hud = session.read(getHudView);
    expect(hud.career.rankIndex).toBe(2); // Đã lên Phó cả dựng đình
    expect(hud.career.history.length).toBeGreaterThanOrEqual(1);
    expect(hud.career.history[0].careerId).toBe('tho_moc');
  });

  it('Nghề tay trái mùa nông nhàn: tự cộng thu nhập đúng mùa và tạm nghỉ vào tháng gặt', () => {
    const sc = content.index.scenario.get('mua_nong_nhan_nghe_tay_trai')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'phase5-sidejob' });

    let hud = session.read(getHudView);
    expect(hud.career.sideJob.currentId).toBe('dan_lat');

    // Chạy qua 6 tháng đầu năm (bao gồm mùa xuân tháng 1-3 và tháng gặt tháng 5)
    for (let i = 0; i < 6; i++) {
      if (session.state.pending) {
        session.dispatch({ type: 'chooseOption', optionId: session.state.pending.options[0].id });
      }
      if (session.state.minor) {
        session.dispatch({ type: 'chooseMinor', optionId: session.state.minor.options[0].id });
      }
      session.tickMonth();
    }

    hud = session.read(getHudView);
    const sideJobEntry = hud.ledger.current.find((e) => e.category === Ledger.SideJob);
    expect(sideJobEntry).toBeDefined();
    expect(sideJobEntry!.money).toBeGreaterThan(0);

    // Đổi nghề tay trái qua lệnh setSideJob
    const changeRes = session.dispatch({ type: 'setSideJob', sideJobId: 'danh_ca' });
    expect(changeRes.ok).toBe(true);
    expect(session.read(getHudView).career.sideJob.currentId).toBe('danh_ca');
  });

  it('Nhà có ba người ba nghề: mỗi thành viên trưởng thành có nghề riêng, đóng góp thu nhập và chủ hộ đổi nghề được', () => {
    const sc = content.index.scenario.get('nha_ba_nguoi_ba_nghe')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'phase5-family-careers' });

    let hud = session.read(getHudView);
    expect(hud.career.id).toBe('tho_moc');
    expect(hud.career.familyCareers.length).toBeGreaterThanOrEqual(4);

    const ctx = createContext(session.state as never, content);
    const distinctCareers = createResolver(ctx).get('household.distinct_careers');
    expect(distinctCareers).toBeGreaterThanOrEqual(3);

    const spouseCareer = hud.career.familyCareers.find((fc) => !fc.isPlayer && fc.careerId === 'ban_rong');
    expect(spouseCareer).toBeDefined();
    expect(spouseCareer!.monthlyIncome).toBeGreaterThan(0);

    // Chủ hộ đổi nghề cho vợ sang 'tho_moc'
    const res = session.dispatch({
      type: 'setMemberCareer',
      characterId: spouseCareer!.characterId,
      careerId: 'tho_moc',
    });
    expect(res.ok).toBe(true);

    hud = session.read(getHudView);
    const updatedSpouse = hud.career.familyCareers.find((fc) => fc.characterId === spouseCareer!.characterId);
    expect(updatedSpouse!.careerId).toBe('tho_moc');
  });

  it('Khủng hoảng bị bắt lính & Bản đồ chuyển nghề (Lối ra): chuyển nghề lưu lại Lý lịch nghề nghiệp', () => {
    const sc = content.index.scenario.get('bi_bat_linh')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'phase5-conscription' });

    let hud = session.read(getHudView);
    expect(hud.career.id).toBe('nong_dan');
    expect(hud.pending?.eventId).toBe('sk_bi_bat_linh_khan_cap');

    // Chọn phương án 1: Chấp nhận nhập ngũ
    const res = session.dispatch({ type: 'chooseOption', optionId: 'chap_nhan_nhap_ngu' });
    expect(res.ok).toBe(true);

    hud = session.read(getHudView);
    expect(hud.career.id).toBe('linh');
    expect(hud.career.history.length).toBe(2);
    expect(hud.career.history[0].careerId).toBe('nong_dan');
    expect(hud.career.history[0].endYear).toBe(hud.date.year);
    expect(hud.career.history[1].careerId).toBe('linh');
    expect(hud.career.history[1].endYear).toBeNull();
  });

  it('Khởi tạo thành công toàn bộ 14 kịch bản mới của Phase 5 và nâng cấp save v3 → v4', () => {
    const phase5ScenarioIds = [
      'nghe_ta_dien',
      'nghe_lam_thue',
      'nghe_tho_moc',
      'nghe_tho_ren',
      'nghe_thay_lang',
      'nghe_ngu_dan',
      'nghe_chu_do',
      'nghe_nha_lai',
      'nghe_ban_rong',
      'nghe_ba_do',
      'lam_20_nam_sap_len_bac',
      'bi_bat_linh',
      'mua_nong_nhan_nghe_tay_trai',
      'nha_ba_nguoi_ba_nghe',
    ];

    for (const scId of phase5ScenarioIds) {
      const sc = content.index.scenario.get(scId);
      expect(sc, `Thiếu kịch bản ${scId}`).toBeDefined();
      const session = GameSession.createFromScenario(content, sc!, { seed: `test-${scId}` });
      const hud = session.read(getHudView);
      expect(hud.career.id).toBeTruthy();
    }

    // Kiểm tra migrate save v3 -> v4
    const session = GameSession.create(content, { seed: 'migrate-v3-v4', startAge: 20 });
    const rawV3 = JSON.parse(JSON.stringify(session.state));
    rawV3.version = 3;
    rawV3.career.id = 'nong_dan';
    delete rawV3.career.sectorMonths;
    delete rawV3.career.sideJobId;
    delete rawV3.career.history;

    const migrated = migrateState(rawV3, content);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.career.sectorMonths).toBeDefined();
    expect(migrated.career.sideJobId).toBeNull();
    expect(Array.isArray(migrated.career.history)).toBe(true);
    expect(migrated.career.history.length).toBeGreaterThanOrEqual(1);
  });
});
