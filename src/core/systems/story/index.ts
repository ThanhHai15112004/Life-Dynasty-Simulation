// Lớp câu chuyện của một đời: bạn cùng lứa sống song song, mốc dừng lại suy ngẫm, câu văn bia (src/data/story/)
import { clamp, interpolate } from '@shared/curve';
import { fillTemplate } from '@shared/template';
import type { PeerState } from '../../entities/World';
import { evaluate } from '../../engine/RuleEvaluator';
import { hashSeed } from '../../engine/Rng';
import { pushLog } from '../../events/journal';
import { LogKind } from '../../events/systemLogKeys';
import { RngStream, newId, type SimContext } from '../context';
import { currentFateMode } from '../life';
import { polityMortalityFactor } from '../life/mortality';
import { ageNow, player } from '../people';
import { createResolver } from '../resolver';

/** Sinh bạn cùng lứa cho đời đang chơi: các gia cảnh khác nhau, cùng năm sinh với người chơi. */
export function createPeers(ctx: SimContext): void {
  const { state, content } = ctx;
  const cfg = content.story.peers;
  const culture = content.index.culture.get(state.cultureId);
  const rng = ctx.rng.get(RngStream.Peers);
  const me = player(ctx);
  state.peers = [];
  if (!culture) return;
  // Mỗi người một gia cảnh khác nhau (rút không lặp theo trọng số) để thấy rõ cùng năm sinh mà khác số phận
  const pool = [...cfg.archetypes];
  for (let i = 0; i < cfg.count && pool.length > 0; i++) {
    const arch = rng.weighted(pool, (a) => a.weight)!;
    pool.splice(pool.indexOf(arch), 1);
    const sex = rng.chance(0.5) ? 'm' : 'f';
    const familyName = rng.weighted(culture.family_names, (f) => f.weight)!.name;
    state.peers.push({
      id: newId(ctx, 'peer'),
      name: `${familyName} ${rng.pick(culture.given_names[sex])}`,
      sex,
      archetypeId: arch.id,
      label: arch.label,
      birthYear: me.birthYear,
      alive: true,
      deathAge: null,
      causeName: null,
      story: [],
    });
  }
}

function peerText(template: string, p: PeerState, age: number, cause = ''): string {
  return fillTemplate(template, (k) =>
    k === 'name' ? p.name : k === 'label' ? p.label : k === 'age' ? age : k === 'cause' ? cause : undefined,
  );
}

/** Cuối năm: mỗi người bạn cùng lứa còn sống có thể qua đời (cùng bảng tử vong, nhân theo gia cảnh) hoặc có chuyện ở mốc tuổi. */
export function yearlyPeers(ctx: SimContext): void {
  const { state, content } = ctx;
  const cfg = content.story.peers;
  const m = content.balance.life.mortality;
  const rng = ctx.rng.get(RngStream.Peers);
  for (const p of state.peers ?? []) {
    if (!p.alive) continue;
    const arch = cfg.archetypes.find((a) => a.id === p.archetypeId);
    if (!arch) continue;
    // Cùng lứa với người chơi: lấy tuổi người chơi để mốc tuổi và số hiển thị khớp nhau
    const age = ageNow(ctx, player(ctx));
    const annual = clamp(
      interpolate(m.annual_by_age, 'age', 'rate', age) * arch.death_factor * polityMortalityFactor(ctx) * currentFateMode(ctx).mortality_factor,
      0,
      1,
    );
    if (rng.chance(annual)) {
      const causes = cfg.death_causes.filter((c) => age >= c.min_age && age <= c.max_age);
      const cause = rng.weighted(causes, (c) => c.weight);
      const causeName = m.causes.find((c) => c.id === cause?.cause)?.name ?? '';
      p.alive = false;
      p.deathAge = age;
      p.causeName = causeName;
      const text = peerText(rng.pick(cfg.death_text), p, age, causeName);
      p.story.push({ age, text });
      pushLog(ctx, {
        sourceId: `peer.${p.archetypeId}.death`,
        kind: LogKind.Peer,
        text,
        importance: cfg.death_importance,
        tone: 'buon',
        icon: cfg.icon,
        rumor: false,
        highlight: false,
        deltas: {},
      });
      continue;
    }
    const ms = arch.milestones.find((x) => x.age === age);
    if (!ms || !rng.chance(ms.chance)) continue;
    const outcome = rng.weighted(ms.outcomes, (o) => o.weight);
    if (!outcome) continue;
    const text = peerText(outcome.text, p, age);
    p.story.push({ age, text });
    pushLog(ctx, {
      sourceId: `peer.${p.archetypeId}.${age}`,
      kind: LogKind.Peer,
      text,
      importance: cfg.milestone_importance,
      tone: 'trung_tinh',
      icon: cfg.icon,
      rumor: false,
      highlight: false,
      deltas: {},
    });
  }
}

/** Đầu năm: đến mốc tuổi suy ngẫm thì đặt câu hỏi chờ (giao diện dừng thời gian để hỏi). Trả true nếu vừa đặt. */
export function checkReflection(ctx: SimContext): boolean {
  const { state, content } = ctx;
  const age = ageNow(ctx, player(ctx));
  const r = content.story.reflections.find((x) => x.age === age);
  if (!r || state.reflectionDue || (state.reflections ?? []).some((x) => x.age === age)) return false;
  state.reflectionDue = { age: r.age, question: r.question };
  return true;
}

/** Ghi dòng người chơi viết cho mốc suy ngẫm đang chờ (rỗng = bỏ qua). */
export function answerReflection(ctx: SimContext, text: string, maxLength: number): boolean {
  const { state } = ctx;
  const due = state.reflectionDue;
  if (!due) return false;
  state.reflections = [...(state.reflections ?? []), { age: due.age, question: due.question, answer: text.trim().slice(0, maxLength) }];
  state.reflectionDue = null;
  return true;
}

/** Câu văn bia cuối đời: chọn theo điều kiện + trọng số (tất định theo seed của đời). */
export function pickEpitaph(ctx: SimContext): string {
  const r = createResolver(ctx);
  const pool = ctx.content.story.epitaphs.filter((e) => evaluate(e.condition, r));
  if (pool.length === 0) return '';
  // Không dùng luồng RNG chung: truy vấn chỉ đọc không được làm lệch trạng thái — băm seed + người chơi
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = (hashSeed(`${ctx.state.seed}::${ctx.state.playerId}::epitaph`) / 4294967296) * total;
  for (const e of pool) {
    roll -= e.weight;
    if (roll < 0) return fillTemplate(e.text, r.token);
  }
  return fillTemplate(pool[pool.length - 1].text, r.token);
}
