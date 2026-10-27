// [0] Event Director — điều nhịp sự kiện quyết định và nhật ký thường (GDD 05 §5, §12)
// Chỉ điều chỉnh tần suất/thời điểm, KHÔNG sửa xác suất đã hiển thị cho người chơi.
import type { AmbientTemplate } from '@content/schemas';
import { fillTemplate } from '@shared/template';
import type { LogEntry } from '../entities/World';
import { RngStream, type SimContext } from '../systems/context';
import { ageNow, lifeStageOf, player } from '../systems/people';
import { fireDecision, fireMinor, shownOptionCount } from './decision';
import { currentLogYear, pushLog, writeTemplate } from './journal';
import { eligibleRoles, onCooldown, weightOf } from './selection';
import { LogKind } from './systemLogKeys';

function stageOfPlayer(ctx: SimContext) {
  return lifeStageOf(ctx, ageNow(ctx, player(ctx)));
}

/** Đầu năm: định số dòng nhật ký thường (R3) và rải vào các tháng. */
export function directorYearStart(ctx: SimContext): void {
  const { state, content } = ctx;
  const rng = ctx.rng.get(RngStream.Director);
  const stage = stageOfPlayer(ctx);
  const count = rng.range(stage.ambient_lines);
  const months = Array.from({ length: content.balance.calendar.months_per_year }, (_, i) => i + 1);
  state.director.ambientSlots = rng.sample(months, count).sort((a, b) => a - b);
  state.director.decisionsThisYear = 0;
  state.director.minorThisYear = 0;
  state.director.unexpectedDeathsThisYear = 0;
  state.director.mourningThisYear = false;
  currentLogYear(ctx);
}

/** Sự kiện đã hẹn (chuỗi, "chưa phải lúc") đến hạn — ưu tiên trước sự kiện ngẫu nhiên. */
function fireScheduled(ctx: SimContext): boolean {
  const { state, content } = ctx;
  const due = state.scheduled.filter((s) => s.dueMonthIndex <= state.clock.monthIndex);
  for (const s of due) {
    state.scheduled = state.scheduled.filter((x) => x !== s);
    const ev = content.index.event.get(s.eventId);
    if (!ev) continue;
    const roles = eligibleRoles(ctx, { ...ev, months: undefined }, s.roles);
    if (!roles || shownOptionCount(ctx, ev, roles) < 2) continue;
    fireDecision(ctx, ev, roles);
    return true;
  }
  return false;
}

function tryRandomDecision(ctx: SimContext): void {
  const { state, content } = ctx;
  const d = content.balance.director;
  const dir = state.director;
  if (!stageOfPlayer(ctx).decisions) return;
  if (dir.decisionsThisYear >= d.max_decisions_per_year) return;
  if (state.clock.monthIndex - dir.lastDecisionMonthIndex < d.min_months_between) return;

  // Mốc đời đủ điều kiện thì phát ngay (vẫn tôn trọng khoảng cách tối thiểu giữa hai quyết định)
  const seen = (id: string) => state.eventHistory[id]?.count ?? 0;
  const underCap = (id: string) => d.max_decision_repeats_per_life === 0 || seen(id) < d.max_decision_repeats_per_life;
  const urgent = content.events
    .filter((ev) => ev.priority && !ev.minor && !onCooldown(ctx, ev, state.eventHistory))
    .map((ev) => ({ ev, roles: eligibleRoles(ctx, ev) }))
    .find((x): x is { ev: (typeof x)['ev']; roles: Record<string, string> } => x.roles !== null && shownOptionCount(ctx, x.ev, x.roles) >= 2);
  if (urgent) {
    fireDecision(ctx, urgent.ev, urgent.roles);
    return;
  }

  const rng = ctx.rng.get(RngStream.Director);
  let chance = d.base_monthly_chance;
  if (dir.decisionsThisYear === 0) chance += d.drought_bonus_per_month * (state.clock.month - 1);
  if (dir.tension >= d.tension.high_threshold) chance *= d.tension.high_factor;
  if (!rng.chance(chance)) return;

  const major = d.major_events;
  const majorBlocked =
    state.clock.monthIndex - (dir.lastMajorMonthIndex ?? -Infinity) < major.min_gap_years * content.balance.calendar.months_per_year;
  const pool = content.events
    .filter((ev) => !ev.scheduled_only && !ev.minor && underCap(ev.id) && !onCooldown(ctx, ev, state.eventHistory))
    .filter((ev) => !(majorBlocked && ev.importance >= major.min_importance))
    .map((ev) => ({ ev, roles: eligibleRoles(ctx, ev) }))
    .filter((x): x is { ev: (typeof x)['ev']; roles: Record<string, string> } => x.roles !== null && shownOptionCount(ctx, x.ev, x.roles) >= 2);
  const repeat = (id: string) => Math.pow(d.repeat_weight_factor, seen(id));
  const pick = rng.weighted(pool, (x) => weightOf(ctx, x.ev, x.roles) * repeat(x.ev.id));
  if (pick) {
    const blp = d.bad_luck_protection;
    const isBad = pick.ev.tags.some((t) => blp.bad_tags.includes(t));
    const isSalvation = pick.ev.tags.some((t) => blp.salvation_tags.includes(t));
    if (isSalvation && !isBad && (state.badLuckCounter ?? 0) >= blp.consecutive_bad_threshold) {
      state.badLuckCounter = Math.max(0, (state.badLuckCounter ?? 0) - 2);
    } else if (isBad) {
      state.badLuckCounter = (state.badLuckCounter ?? 0) + 1;
    }
    fireDecision(ctx, pick.ev, pick.roles);
  }
}

/** [1] Chuyện nhỏ: chọn riêng, dừng thời gian chờ chọn; giãn cách với sự kiện quyết định và giới hạn số lần lặp mỗi đời. */
function tryMinor(ctx: SimContext): void {
  const { state, content } = ctx;
  const m = content.balance.director.minor;
  const dir = state.director;
  if (!stageOfPlayer(ctx).decisions) return;
  if (dir.minorThisYear >= m.max_per_year) return;
  if (state.clock.monthIndex - dir.lastMinorMonthIndex < m.min_months_between) return;
  if (state.clock.monthIndex - dir.lastDecisionMonthIndex < m.min_months_after_decision) return;
  const rng = ctx.rng.get(RngStream.Director);
  if (!rng.chance(m.monthly_chance)) return;
  const seen = (id: string) => state.eventHistory[id]?.count ?? 0;
  const repeat = (id: string) => Math.pow(content.balance.director.repeat_weight_factor, seen(id));
  const pool = content.events
    .filter((ev) => ev.minor && !onCooldown(ctx, ev, state.eventHistory))
    .filter((ev) => m.max_repeats_per_life === 0 || seen(ev.id) < m.max_repeats_per_life)
    .map((ev) => ({ ev, roles: eligibleRoles(ctx, ev) }))
    .filter((x): x is { ev: (typeof x)['ev']; roles: Record<string, string> } => x.roles !== null && shownOptionCount(ctx, x.ev, x.roles) >= 2);
  const pick = rng.weighted(pool, (x) => weightOf(ctx, x.ev, x.roles) * repeat(x.ev.id));
  if (pick) fireMinor(ctx, pick.ev, pick.roles);
}

function ambientWeight(ctx: SimContext, t: AmbientTemplate, roles: Record<string, string>): number {
  const seen = ctx.state.ambientHistory[t.id]?.count ?? 0;
  let w = weightOf(ctx, t, roles) * Math.pow(ctx.content.balance.director.ambient_repeat_weight_factor, seen);
  if (ctx.state.director.mourningThisYear) {
    w *= ctx.content.balance.director.ambient.mourning_tone_factor[t.tone] ?? 1;
  }
  return w;
}

function writeAmbient(ctx: SimContext): void {
  const { state, content } = ctx;
  const pool = content.ambient
    .filter((t) => t.kind !== 'he_thong' && t.weight > 0 && !onCooldown(ctx, t, state.ambientHistory))
    .map((t) => ({ t, roles: eligibleRoles(ctx, t) }))
    .filter((x): x is { t: AmbientTemplate; roles: Record<string, string> } => x.roles !== null);
  const pick = ctx.rng.get(RngStream.Director).weighted(pool, (x) => ambientWeight(ctx, x.t, x.roles));
  if (pick) writeTemplate(ctx, pick.t.id, { roles: pick.roles });
}

export function directorMonthly(ctx: SimContext): void {
  const { state, content } = ctx;
  state.director.tension = Math.max(0, state.director.tension - content.balance.director.tension.decay_per_month);
  if (state.gameOver) return;
  if (state.director.ambientSlots.includes(state.clock.month)) writeAmbient(ctx);
  if (state.pending) return;
  tryMinor(ctx);
  if (state.minor) return;
  if (!fireScheduled(ctx)) tryRandomDecision(ctx);
}

/** Cuối năm: năm trống vẫn có chữ (R7), gộp dòng điểm thấp khi năm quá nhiều chuyện (R4). */
export function directorYearEnd(ctx: SimContext): void {
  const { state, content } = ctx;
  const year = currentLogYear(ctx);
  const isStory = (e: LogEntry) => e.kind !== 'he_thong' && e.kind !== 'bao_cao';
  if (!year.entries.some(isStory)) {
    const q = content.index.harvestQuality.get(state.world.harvestQuality);
    if (q) writeTemplate(ctx, q.quiet_year_log);
  }

  const amb = content.balance.director.ambient;
  const maxLines = stageOfPlayer(ctx).ambient_lines[1];
  const mergeable = year.entries.filter((e) => e.short && e.importance <= amb.merge_importance_max && !e.highlight);
  if (year.entries.length > maxLines && mergeable.length >= 2) {
    const items = mergeable.map((e) => e.short!).join(amb.digest_separator);
    const deltas: Record<string, number> = {};
    for (const e of mergeable) for (const [k, v] of Object.entries(e.deltas)) deltas[k] = (deltas[k] ?? 0) + v;
    year.entries = year.entries.filter((e) => !mergeable.includes(e));
    const tpl = content.index.ambient.get(amb.digest_template);
    const text = tpl ? fillTemplate(tpl.variants[0], (k) => (k === 'items' ? items : undefined)) : items;
    pushLog(ctx, {
      sourceId: amb.digest_template,
      kind: LogKind.Digest,
      text,
      importance: amb.merge_importance_max,
      tone: 'trung_tinh',
      icon: tpl?.icon ?? LogKind.Digest,
      rumor: false,
      highlight: false,
      deltas,
    });
  }
}
