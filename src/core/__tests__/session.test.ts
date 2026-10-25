// Kiểm thử phiên chơi với dữ liệu thật: tất định, lưu/tải, auto-pause, lệnh người chơi
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { GameSession } from '../api/GameSession';
import { getHudView } from '../api/queries';

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
});
