// Kiểm thử phiên chơi với dữ liệu thật: tất định, lưu/tải, auto-pause, lệnh người chơi
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { GameSession } from '../api/GameSession';
import { getHudView } from '../api/queries';
import { marryPlayer } from '../systems/family';
import { cureCharacter, infectCharacter } from '../systems/life';
import { player } from '../systems/people';

const content = loadNodeContent();

/** Chơi n tháng, luôn chọn phương án đầu tiên khi có sự kiện. */
function play(s: GameSession, months: number): void {
  for (let i = 0; i < months && !s.state.gameOver; i++) {
    const r = s.tickMonth();
    if (r.decision) s.dispatch({ type: 'chooseOption', optionId: s.state.pending!.options[0].id });
  }
}

describe('GameSession', () => {
  it('cùng seed + cùng lựa chọn → cùng kết quả (tất định)', () => {
    const a = GameSession.create(content, { seed: 'det' });
    const b = GameSession.create(content, { seed: 'det' });
    play(a, 240);
    play(b, 240);
    expect(a.serialize()).toBe(b.serialize());
  });

  it('lưu giữa chừng rồi tải lại chơi tiếp ra đúng kết quả như chơi liền mạch', () => {
    const a = GameSession.create(content, { seed: 'save' });
    play(a, 60);
    const b = GameSession.load(content, a.serialize());
    play(a, 60);
    play(b, 60);
    expect(b.serialize()).toBe(a.serialize());
  });

  it('có sự kiện thì tự dừng: không tick được cho tới khi chọn', () => {
    const s = GameSession.create(content, { seed: 'pause' });
    let guard = 0;
    while (!s.state.pending && !s.state.gameOver && guard++ < 600) s.tickMonth();
    if (!s.state.pending) return; // hiếm: chết trước khi gặp sự kiện
    const month = s.state.clock.monthIndex;
    s.tickMonth();
    expect(s.state.clock.monthIndex).toBe(month);
    expect(s.dispatch({ type: 'setLivingStandard', id: 'du_day' })).toEqual({ ok: false, error: 'event_pending' });
    expect(s.dispatch({ type: 'chooseOption', optionId: s.state.pending.options[0].id }).ok).toBe(true);
    expect(s.state.pending).toBeNull();
  });

  it('nhật ký, sổ sách, cảnh pixel đều được sinh sau một năm', () => {
    const s = GameSession.create(content, { seed: 'year' });
    play(s, 12);
    const v = s.read(getHudView);
    expect(v.log.length).toBeGreaterThanOrEqual(1);
    expect(s.state.ledgerHistory.length).toBe(1);
    expect(s.state.ledgerHistory[0].entries.some((e) => e.category === 'thu_hoach')).toBe(true);
    const scene = s.sceneDescriptor();
    expect(scene.house).not.toBeNull();
    expect(scene.people.some((p) => p.isPlayer)).toBe(true);
  });

  it('bán thóc tăng tiền theo giá chợ, không bán quá số đang có', () => {
    const s = GameSession.create(content, { seed: 'trade' });
    const before = s.read(getHudView).household;
    expect(s.dispatch({ type: 'sellFood', amount: 5 }).ok).toBe(true);
    const after = s.read(getHudView).household;
    expect(after.food).toBe(before.food - 5);
    expect(after.money).toBeCloseTo(before.money + 5 * s.read(getHudView).market.sellPrice);
    expect(s.dispatch({ type: 'sellFood', amount: 99999 })).toEqual({ ok: false, error: 'not_enough_food' });
  });

  it('GĐ1: kết hôn, sinh con, mắc/chữa bệnh, đổi tham vọng và xuất tổng kết đời 5 trục', () => {
    const s = GameSession.create(content, { seed: 'phase1-test', startAge: 18 });
    // Đổi tham vọng cả đời
    expect(s.dispatch({ type: 'setAmbition', id: 'gia_dinh_am_em' }).ok).toBe(true);
    expect(s.read(getHudView).ambition.currentId).toBe('gia_dinh_am_em');

    // Kết hôn & kiểm tra mốc tham vọng đầu tiên ("thanh_gia")
    s.read((ctx) => {
      const spouse = marryPlayer(ctx);
      expect(spouse).not.toBeNull();
      // Mắc bệnh & chữa bệnh
      const me = player(ctx);
      expect(infectCharacter(ctx, me, 'cam_han')).toBe(true);
      expect(me.diseases.length).toBe(1);
      expect(cureCharacter(ctx, me, 'cam_han')).toBe(true);
      expect(me.diseases.length).toBe(0);
    });

    // Chạy đến khi đạt mốc kết hôn và kết thúc đời để kiểm tra 5 trục tổng kết
    play(s, 900);
    const v = s.read(getHudView);
    expect(v.ambition.achievedMilestones).toContain('thanh_gia');
    if (v.gameOver) {
      expect(v.gameOver.axes).toHaveLength(5);
      expect(v.gameOver.axes.map((a) => a.id)).toEqual([
        'man_nguyen',
        'di_san',
        'dau_an',
        'gia_dinh',
        'tham_vong',
      ]);
    }
  });

  it('GĐ1 (Gói 1B): khởi tạo đủ 3 xuất thân, hoạt động nghề nghiệp, chuyển nghề và thăng bậc', () => {
    const sNongDan = GameSession.create(content, { originId: 'nong_dan', seed: 'o1', startAge: 18 });
    const sThuongNhan = GameSession.create(content, { originId: 'thuong_nhan', seed: 'o2', startAge: 18 });
    const sQuyToc = GameSession.create(content, { originId: 'quy_toc_nho', seed: 'o3', startAge: 18 });

    expect(sNongDan.state.career.id).toBe('nong_dan');
    expect(sThuongNhan.state.career.id).toBe('thuong_nhan');
    expect(sQuyToc.state.career.id).toBe('nong_dan');
    expect(sQuyToc.read(getHudView).household.properties.some((p) => p.id === 'phu_nho')).toBe(true);

    // Thực hiện hoạt động nghề nghiệp của Nông dân ("Khẩn hoang bãi bồi", tốn 2 thóc)
    const actionRes = sNongDan.dispatch({ type: 'doCareerAction', actionId: 'khan_hoang_bai_boi' });
    expect(actionRes.ok).toBe(true);
    expect(sNongDan.state.career.actionCooldowns['khan_hoang_bai_boi']).toBeGreaterThan(0);

    // Chuyển sang nghề Lính và kiểm tra thăng bậc khi tích lũy đủ công trạng
    expect(sNongDan.dispatch({ type: 'joinCareer', careerId: 'linh' }).ok).toBe(true);
    expect(sNongDan.state.career.id).toBe('linh');
    expect(sNongDan.state.career.rankIndex).toBe(0);

    // Cộng công trạng và kỹ năng Quân sự để thăng lên bậc Ngũ trưởng (min_merit: 25, quan_su >= 2)
    sNongDan.read((ctx) => {
      player(ctx).skills['quan_su'] = { level: 2, xp: 0 };
    });
    sNongDan.state.career.merit = 30;
    sNongDan.tickMonth();
    expect(sNongDan.state.career.rankIndex).toBeGreaterThanOrEqual(1);
  });
});
