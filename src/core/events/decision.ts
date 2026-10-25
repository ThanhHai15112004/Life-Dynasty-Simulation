// [0] Sự kiện quyết định: bật thẻ (auto-pause), hiển thị khoảng xác suất, áp hậu quả khi chọn (GDD 05 §2, §6)
import type { DecisionEvent, EventOption } from '@content/schemas';
import { clamp } from '@shared/curve';
import { fillTemplate } from '@shared/template';
import type { PendingEvent } from '../entities/World';
import { evaluate } from '../engine/RuleEvaluator';
import { RngStream, type SimContext } from '../systems/context';
import { player } from '../systems/people';
import { createResolver } from '../systems/resolver';
import { applyEffects } from './effects';
import { pushLog } from './journal';
import { LogKind } from './systemLogKeys';

function trueChance(ctx: SimContext, opt: EventOption, roles: Record<string, string>): number | undefined {
  const c = opt.chance;
  if (!c) return undefined;
  const r = createResolver(ctx, { roles });
  const level = c.skill ? player(ctx).skills[c.skill]?.level ?? 0 : 0;
  let p = c.base + c.per_level * level;
  for (const m of c.modifiers) if (evaluate(m.condition, r)) p += m.add;
  return clamp(p, c.min, c.max);
}

/** Khoảng hiển thị: kỹ năng càng cao càng hẹp — "kỹ năng là kính lúp thông tin". */
function shownRange(ctx: SimContext, p: number, skill: string | undefined): [number, number] {
  const d = ctx.content.balance.director.chance_display;
  const level = skill ? player(ctx).skills[skill]?.level ?? 0 : 0;
  const spread = Math.max(d.min_spread, d.base_spread - d.spread_per_level * level);
  const u = ctx.rng.get(RngStream.Display).next();
  return [clamp(p - spread * u, 0, 1), clamp(p + spread * (1 - u), 0, 1)];
}

export function fireDecision(ctx: SimContext, ev: DecisionEvent, roles: Record<string, string>): PendingEvent {
  const { state } = ctx;
  const r = createResolver(ctx, { roles });
  const rng = ctx.rng.get(RngStream.Events);
  state.nextId += 1;
  const options = ev.options
    .filter((o) => evaluate(o.condition, r))
    .map((o) => {
      const p = trueChance(ctx, o, roles);
      return {
        id: o.id,
        text: fillTemplate(o.text, r.token),
        hint: o.hint ? fillTemplate(o.hint, r.token) : undefined,
        chance: p === undefined ? undefined : { p, shown: shownRange(ctx, p, o.chance?.skill) },
      };
    });
  const pending: PendingEvent = {
    instanceId: state.nextId,
    eventId: ev.id,
    roles,
    title: fillTemplate(ev.title, r.token),
    text: fillTemplate(rng.pick(ev.text), r.token),
    options,
  };
  state.pending = pending;
  const prev = state.eventHistory[ev.id];
  state.eventHistory[ev.id] = { lastMonthIndex: state.clock.monthIndex, count: (prev?.count ?? 0) + 1 };
  state.stats.eventsSeen[ev.id] = (state.stats.eventsSeen[ev.id] ?? 0) + 1;
  state.director.decisionsThisYear += 1;
  state.director.lastDecisionMonthIndex = state.clock.monthIndex;
  state.director.tension += ev.tension;
  return pending;
}

/** Áp lựa chọn của người chơi. Trả false nếu lựa chọn không hợp lệ. */
export function resolveDecision(ctx: SimContext, optionId: string): boolean {
  const { state, content } = ctx;
  const pending = state.pending;
  if (!pending) return false;
  const ev = content.index.event.get(pending.eventId);
  const opt = ev?.options.find((o) => o.id === optionId);
  const shown = pending.options.find((o) => o.id === optionId);
  if (!ev || !opt || !shown) return false;

  const b = { roles: pending.roles };
  const r = createResolver(ctx, b);
  const rng = ctx.rng.get(RngStream.Events);
  const deltas: Record<string, number> = {};
  const merge = (d: Record<string, number>) => {
    for (const [k, v] of Object.entries(d)) deltas[k] = (deltas[k] ?? 0) + v;
  };

  const me = player(ctx);
  for (const [traitId, stress] of Object.entries(opt.trait_stress)) {
    if (me.traits.includes(traitId)) merge(applyEffects(ctx, [{ type: 'stress', value: stress, who: 'player' }], b));
  }
  merge(applyEffects(ctx, opt.effects, b));

  let success: boolean | null = null;
  let texts = opt.result;
  if (shown.chance) {
    success = rng.chance(shown.chance.p);
    merge(applyEffects(ctx, success ? opt.success : opt.failure, b));
    texts = success ? opt.success_result : opt.failure_result;
  }
  if (opt.defer) {
    state.scheduled.push({
      eventId: ev.id,
      dueMonthIndex: state.clock.monthIndex + opt.defer.months,
      roles: { ...pending.roles },
      label: pending.title,
    });
  }

  const resultText = texts.length > 0 ? fillTemplate(rng.pick(texts), r.token) : shown.text;
  const logText = fillTemplate(content.balance.director.decision_log_template, (k) =>
    k === 'title' ? pending.title : k === 'result' ? resultText : undefined,
  );
  pushLog(ctx, {
    sourceId: ev.id,
    kind: LogKind.Decision,
    text: logText,
    importance: ev.importance,
    tone: 'trung_tinh',
    icon: ev.icon,
    rumor: false,
    highlight: ev.importance >= content.balance.display.highlight_importance,
    deltas,
  });
  state.lastResolution = { eventId: ev.id, title: pending.title, optionText: shown.text, resultText, success, deltas };
  state.pending = null;
  state.stats.decisions += 1;
  return true;
}
