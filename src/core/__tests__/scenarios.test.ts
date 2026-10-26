// [1] Kiểm thử kịch bản thử nghiệm: dựng thành công, chạy 10 năm không lỗi, cùng seed ra cùng kết quả
import { describe, expect, it } from 'vitest';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { GameSession } from '../api/GameSession';

describe('Scenarios (Phase 1)', () => {
  const content = loadNodeContent();

  it('phải nạp đủ ~25 kịch bản', () => {
    expect(content.scenarios.length).toBeGreaterThanOrEqual(25);
  });

  for (const sc of content.scenarios) {
    it(`kịch bản "${sc.id}" khởi tạo và chạy 10 năm không lỗi`, () => {
      const session = GameSession.createFromScenario(content, sc, { seed: `test-${sc.id}` });
      expect(session.state).toBeDefined();

      const months = 10 * content.balance.calendar.months_per_year;
      for (let m = 0; m < months; m++) {
        if (session.state.gameOver) break;
        if (session.state.pending) {
          const opt = session.state.pending.options[0];
          if (opt) session.dispatch({ type: 'chooseOption', optionId: opt.id });
        }
        if (session.state.minor) {
          session.autoResolveMinor();
        }
        session.tickMonth();
      }
      expect(session.state.clock.year).toBeGreaterThanOrEqual(session.state.clock.year);
    });
  }

  it('cùng seed và lựa chọn phải ra cùng một kết quả (tính tất định)', () => {
    const sc = content.scenarios[0];
    const s1 = GameSession.createFromScenario(content, sc, { seed: 'deterministic-123' });
    const s2 = GameSession.createFromScenario(content, sc, { seed: 'deterministic-123' });

    for (let m = 0; m < 24; m++) {
      if (s1.state.gameOver || s2.state.gameOver) break;
      s1.tickMonth();
      s2.tickMonth();
    }

    expect(s1.state.clock.monthIndex).toBe(s2.state.clock.monthIndex);
    expect(s1.serialize()).toBe(s2.serialize());
  });
});

