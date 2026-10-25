// [0] Ghi dòng vào nhật ký năm (Ambient Life Log — GDD 05 §12)
import type { AmbientTemplate } from '@content/schemas';
import { fillTemplate } from '@shared/template';
import type { LogEntry, LogYear } from '../entities/World';
import { RngStream, type SimContext } from '../systems/context';
import { ageNow, player } from '../systems/people';
import { createResolver, type Bindings } from '../systems/resolver';
import { applyEffects } from './effects';

export function currentLogYear(ctx: SimContext): LogYear {
  const { state } = ctx;
  let year = state.log[state.log.length - 1];
  if (!year || year.year !== state.clock.year) {
    year = { year: state.clock.year, age: ageNow(ctx, player(ctx)), entries: [] };
    state.log.push(year);
  }
  return year;
}

export function pushLog(ctx: SimContext, entry: Omit<LogEntry, 'id' | 'year' | 'month'>): LogEntry {
  ctx.state.nextId += 1;
  const full: LogEntry = { id: ctx.state.nextId, year: ctx.state.clock.year, month: ctx.state.clock.month, ...entry };
  currentLogYear(ctx).entries.push(full);
  return full;
}

/** Chọn cách viết, tránh lặp cách viết vừa dùng của chính mẫu này (R5). */
function pickVariant(ctx: SimContext, t: AmbientTemplate): number {
  const last = ctx.state.ambientHistory[t.id]?.lastVariant ?? -1;
  const choices = t.variants.map((_, i) => i).filter((i) => t.variants.length === 1 || i !== last);
  return ctx.rng.get(RngStream.Ambient).pick(choices);
}

/** Viết một mẫu (hệ thống hoặc thường) vào nhật ký, áp tác động nhỏ của mẫu. */
export function writeTemplate(ctx: SimContext, templateId: string, b: Bindings = {}): LogEntry | undefined {
  const t = ctx.content.index.ambient.get(templateId);
  if (!t) return undefined;
  const r = createResolver(ctx, b);
  const variant = pickVariant(ctx, t);
  let text = fillTemplate(t.variants[variant], r.token);
  const me = player(ctx);
  for (const [traitId, reaction] of Object.entries(t.trait_reactions)) {
    if (me.traits.includes(traitId)) {
      text = `${text} ${fillTemplate(reaction, r.token)}`;
      break;
    }
  }
  const deltas = applyEffects(ctx, t.effects, b);
  const prev = ctx.state.ambientHistory[t.id];
  ctx.state.ambientHistory[t.id] = {
    lastMonthIndex: ctx.state.clock.monthIndex,
    lastVariant: variant,
    count: (prev?.count ?? 0) + 1,
  };
  return pushLog(ctx, {
    sourceId: t.id,
    kind: t.kind,
    text,
    short: t.short ? fillTemplate(t.short, r.token) : undefined,
    importance: t.importance,
    tone: t.tone,
    icon: t.icon,
    rumor: t.rumor,
    highlight: t.highlight,
    deltas,
  });
}
