// Lớp câu chuyện & các luật nhịp mới: bạn cùng lứa, mốc suy ngẫm, bốc thăm xuất thân, sự kiện người lớn, trần lặp, việc làng & ma chay
import { describe, expect, it } from 'vitest';
import { GameSession, getHudView } from '../index';
import { loadNodeContent } from '../../../tools/shared/nodeContent';
import { kill } from '../systems/life/mortality';

const content = loadNodeContent();

function play(s: GameSession, months: number): void {
  for (let i = 0; i < months && !s.state.gameOver; i++) {
    const r = s.tickMonth();
    if (r.minor) s.autoResolveMinor();
    if (r.decision) s.dispatch({ type: 'chooseOption', optionId: s.state.pending!.options[0].id });
  }
}

describe('Lớp câu chuyện', () => {
  it('sinh đủ bạn cùng lứa, mỗi người một gia cảnh, cùng năm sinh với người chơi', () => {
    const s = GameSession.create(content, { seed: 'peers', startAge: 0 });
    const peers = s.state.peers;
    expect(peers.length).toBe(content.story.peers.count);
    expect(new Set(peers.map((p) => p.archetypeId)).size).toBe(peers.length);
    const me = s.state.characters[s.state.playerId];
    expect(peers.every((p) => p.birthYear === me.birthYear)).toBe(true);
  });

  it('bạn cùng lứa có thể mất hoặc có chuyện theo năm, ghi vào nhật ký', () => {
    const s = GameSession.create(content, { seed: 'peers-run', startAge: 16 });
    play(s, 12 * 30);
    const told = s.state.peers.some((p) => p.story.length > 0);
    expect(told).toBe(true);
    for (const p of s.state.peers.filter((x) => !x.alive)) {
      expect(p.deathAge).not.toBeNull();
      expect(p.causeName).toBeTruthy();
    }
  });

  it('đến mốc tuổi suy ngẫm thì đặt câu hỏi chờ, trả lời xong thì lưu lại (không chặn mô phỏng)', () => {
    const first = content.story.reflections[0];
    const s = GameSession.create(content, { seed: 'reflect', startAge: first.age - 1 });
    let guard = 0;
    while (!s.state.reflectionDue && !s.state.gameOver && guard++ < 24) play(s, 1);
    if (s.state.gameOver) return;
    expect(s.state.reflectionDue?.age).toBe(first.age);
    // Mô phỏng vẫn chạy khi câu hỏi đang chờ
    const before = s.state.clock.monthIndex;
    s.tickMonth();
    expect(s.state.clock.monthIndex).toBe(before + 1);
    expect(s.dispatch({ type: 'answerReflection', text: 'Tiếng mẹ ru' }).ok).toBe(true);
    expect(s.state.reflectionDue).toBeNull();
    expect(s.state.reflections[0].answer).toBe('Tiếng mẹ ru');
  });

  it('bốc thăm số phận rút xuất thân theo birth_weight, cùng seed thì cùng kết quả', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 60; i++) {
      const s = GameSession.create(content, { seed: `lottery-${i}`, lottery: true, startAge: 0 });
      counts[s.state.originId] = (counts[s.state.originId] ?? 0) + 1;
    }
    const heaviest = [...content.origins].sort((a, b) => b.birth_weight - a.birth_weight)[0];
    expect(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]).toBe(heaviest.id);
    const a = GameSession.create(content, { seed: 'same', lottery: true });
    const b = GameSession.create(content, { seed: 'same', lottery: true });
    expect(a.state.originId).toBe(b.state.originId);
  });

  it('giấy khai sinh và thẻ đời có đủ thông tin', () => {
    const s = GameSession.create(content, { seed: 'card', startAge: 0 });
    const birth = s.read(getHudView).story.birthCard;
    expect(birth.name).toBeTruthy();
    expect(birth.originSharePct).toBeGreaterThan(0);
    expect(birth.peers.length).toBe(content.story.peers.count);
    play(s, 12 * 120);
    const summary = s.read(getHudView).gameOver;
    expect(summary?.card?.epitaph).toBeTruthy();
    expect(summary?.card?.cells.length).toBeGreaterThan(0);
  });
});

describe('Luật nhịp sự kiện', () => {
  it('sự kiện không ghi giai đoạn đời chỉ phát cho người lớn (trẻ con không quyết chuyện tiền nhà)', () => {
    const adult = new Set(content.balance.director.default_event_life_stages);
    expect(adult.size).toBeGreaterThan(0);
    const ev = content.index.event.get('ban_ruong_gap');
    expect(ev?.life_stages?.every((st) => adult.has(st))).toBe(true);
  });

  it('một sự kiện quyết định không gặp quá trần số lần mỗi đời', () => {
    const cap = content.balance.director.max_decision_repeats_per_life;
    const s = GameSession.create(content, { seed: 'repeat-cap', startAge: 16 });
    play(s, 12 * 50);
    const randomIds = new Set(content.events.filter((e) => !e.scheduled_only && !e.priority).map((e) => e.id));
    for (const [id, h] of Object.entries(s.state.eventHistory)) {
      if (!randomIds.has(id)) continue;
      // Phương án "chưa phải lúc" có thể hẹn lại tối đa max_defer_fires lần ngoài trần
      expect(h.count).toBeLessThanOrEqual(cap + content.balance.director.max_defer_fires);
    }
  });

  it('cuối năm có khoản việc làng, việc họ; người nhà mất thì tốn ma chay', () => {
    const s = GameSession.create(content, { seed: 'duties', startAge: 30 });
    play(s, 12);
    const cats = s.state.ledgerHistory[0]?.entries.map((e) => e.category) ?? [];
    expect(cats).toContain('viec_lang_ho');
    s.read((ctx) => {
      const victim = Object.values(ctx.state.characters).find(
        (c) => c.alive && c.householdId === ctx.state.householdId && c.id !== ctx.state.playerId,
      );
      if (!victim) return;
      kill(ctx, victim, 'benh');
      const h = ctx.state.households[ctx.state.householdId];
      expect(h.ledger.some((e) => e.category === 'ma_chay' && e.money < 0)).toBe(true);
    });
  });
});
