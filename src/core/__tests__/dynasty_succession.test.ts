// [2] Kiểm thử tự động Phase 3: Truyền đời (Dynasty), luật kế vị, chọn người kế phụ nghèo hơn, giám hộ khi còn nhỏ, nhận con nuôi/đón cháu họ, di nguyện và 6 kịch bản thử nghiệm
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { GameSession } from '../api/GameSession';
import { getHudView } from '../api/queries';
import { createContext } from '../systems/context';
import { kill } from '../systems/life';
import { player } from '../systems/people';

const content = loadNodeContent();

function killPlayerInSession(session: GameSession, causeId: string): void {
  const ctx = createContext(session.state as never, content);
  kill(ctx, player(ctx), causeId);
  ctx.rng.flush();
}

describe('Phase 3: Truyền đời (Dynasty), Kế vị, Giám hộ & Tuyệt tự', () => {
  it('Kịch bản truyen_doi_68_tuoi_3_con: thứ tự kế vị ưu tiên con trai trưởng -> con trai thứ -> con gái; chọn con thứ vẫn chơi tiếp ở hộ nghèo hơn', () => {
    const sc = content.index.scenario.get('truyen_doi_68_tuoi_3_con')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'dyn-3-con' });
    killPlayerInSession(session, 'tuoi_gia');

    const hud = session.read(getHudView);
    expect(hud.gameOver).not.toBeNull();
    expect(hud.succession).not.toBeNull();
    expect(hud.succession!.extinct).toBe(false);
    expect(hud.succession!.candidates.length).toBe(3);

    const [first, second, third] = hud.succession!.candidates;
    expect(first.priorityGroup).toBe('eldest_son');
    expect(first.isMainHeir).toBe(true);
    expect(second.priorityGroup).toBe('other_son');
    expect(second.isMainHeir).toBe(false);
    expect(third.priorityGroup).toBe('daughter');
    expect(third.isMainHeir).toBe(false);
    expect(first.expectedSao).toBeGreaterThan(second.expectedSao);

    // Chọn người kế KHÔNG nhận phần chính (con trai thứ) để kiểm tra chơi tiếp ở hoàn cảnh nghèo hơn
    const res = session.dispatch({ type: 'chooseHeir', heirId: second.characterId });
    expect(res.ok).toBe(true);
    expect(session.state.gameOver).toBeNull();
    expect(session.state.playerId).toBe(second.characterId);
    expect(session.state.dynasty.currentGeneration).toBe(2);
    expect(session.state.dynasty.pastLives.length).toBe(1);
    expect(session.state.dynasty.unfinishedWishes.length).toBeGreaterThanOrEqual(1);

    const nextHud = session.read(getHudView);
    const ruong = nextHud.household.properties.find((p) => p.id === 'ruong')?.count ?? 0;
    expect(ruong).toBe(second.expectedSao);
  });

  it('Kịch bản mat_con_truong_5_tuoi: người kế còn nhỏ có mẹ làm giám hộ, nhà tự lo cho đến khi trưởng thành', () => {
    const sc = content.index.scenario.get('mat_con_truong_5_tuoi')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'dyn-minor-5' });
    killPlayerInSession(session, 'benh');

    const hudBefore = session.read(getHudView);
    const cand = hudBefore.succession!.candidates[0];
    expect(cand.age).toBe(5);
    expect(cand.needsGuardian).toBe(true);

    const res = session.dispatch({ type: 'chooseHeir', heirId: cand.characterId });
    expect(res.ok).toBe(true);
    expect(session.state.dynasty.guardianId).not.toBeNull();

    const hudAfter = session.read(getHudView);
    expect(hudAfter.dynasty.guardianCall).not.toBeNull();
    expect(hudAfter.manage.isHead).toBe(false);
  });

  it('Kịch bản khong_con_chi_co_chau_ho: không có con ruột thì cháu họ đứng đầu danh sách kế vị', () => {
    const sc = content.index.scenario.get('khong_con_chi_co_chau_ho')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'dyn-nephew' });
    killPlayerInSession(session, 'tuoi_gia');

    const hud = session.read(getHudView);
    expect(hud.succession!.extinct).toBe(false);
    expect(hud.succession!.candidates.length).toBe(1);
    expect(hud.succession!.candidates[0].priorityGroup).toBe('sibling_or_nephew');

    const res = session.dispatch({
      type: 'chooseHeir',
      heirId: hud.succession!.candidates[0].characterId,
    });
    expect(res.ok).toBe(true);
    expect(session.state.dynasty.currentGeneration).toBe(2);
  });

  it('Kịch bản tuyet_tu_hoan_toan: không còn người kế vị thì báo tuyệt tự và lập Bảng Tổng kết dòng họ', () => {
    const sc = content.index.scenario.get('tuyet_tu_hoan_toan')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'dyn-extinct' });
    killPlayerInSession(session, 'tuoi_gia');

    const hud = session.read(getHudView);
    expect(hud.succession).not.toBeNull();
    expect(hud.succession!.extinct).toBe(true);
    expect(hud.succession!.candidates.length).toBe(0);
    expect(hud.succession!.dynastySummary.generationsCount).toBe(1);
  });

  it('Lối thoát tuyệt tự: Nhận con nuôi (adoptChild) hoặc Đón cháu họ (adoptRelative) giúp có người kế vị', () => {
    const sc = content.index.scenario.get('tuyet_tu_hoan_toan')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'dyn-adopt' });
    const hudBefore = session.read(getHudView);
    expect(hudBefore.dynasty.canAdoptChild).toBe(true);

    const res = session.dispatch({ type: 'adoptChild' });
    expect(res.ok).toBe(true);

    killPlayerInSession(session, 'tuoi_gia');
    const hudAfter = session.read(getHudView);
    expect(hudAfter.succession!.extinct).toBe(false);
    expect(hudAfter.succession!.candidates[0].priorityGroup).toBe('adopted_child');
  });

  it('Kịch bản doi_thu_3_co_to_tien: có sẵn 2 đời tổ tiên trong sử sách và di nguyện chưa hoàn thành', () => {
    const sc = content.index.scenario.get('doi_thu_3_co_to_tien')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'dyn-gen3' });
    const hud = session.read(getHudView);

    expect(hud.dynasty.currentGeneration).toBe(3);
    expect(hud.dynasty.pastLives.length).toBe(2);
    expect(hud.dynasty.unfinishedWishes.length).toBe(1);
    expect(hud.dynasty.unfinishedWishes[0].fulfilled).toBe(false);
    expect(hud.pending?.eventId).toBe('gd_di_nguyen_cha_ong');
  });

  it('Kịch bản nguoi_ke_nong_nay: chọn phương án nhẫn nhịn trái tính cách Nóng nảy làm tăng căng thẳng (trait_stress)', () => {
    const sc = content.index.scenario.get('nguoi_ke_nong_nay')!;
    const session = GameSession.createFromScenario(content, sc, { seed: 'dyn-hot-temper' });
    const stressBefore = session.read(getHudView).player.stress;

    expect(session.state.pending?.eventId).toBe('gd_ngay_dau_lam_chu_sau_tang');
    const res = session.dispatch({ type: 'chooseOption', optionId: 'nhan_nhin_mem_mong' });
    expect(res.ok).toBe(true);

    const stressAfter = session.read(getHudView).player.stress;
    expect(stressAfter).toBe(stressBefore + 12);
  });
});
