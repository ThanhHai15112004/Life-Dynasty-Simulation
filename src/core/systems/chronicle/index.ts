// [1] Biên niên vương triều: đầu mỗi năm xét các biến cố thế giới (đổi vua, chiến tranh, nạn đói, cải cách...)
// trong data/chronicle/, ghi vào nhật ký như tin thiên hạ và tác động lên thế giới. Mô phỏng chỉ đọc dữ liệu.
import { fillTemplate } from '@shared/template';
import { evaluate } from '../../engine/RuleEvaluator';
import { applyEffects } from '../../events/effects';
import { pushLog } from '../../events/journal';
import { RngStream, type SimContext } from '../context';
import { inCurrentEra } from '../people';
import { createResolver } from '../resolver';

/** Tiền tố sourceId của dòng nhật ký biên niên (queries dùng để lọc). */
export const CHRONICLE_SOURCE_PREFIX = 'chronicle.';

/** Loại dòng nhật ký của biến cố biên niên. */
const CHRONICLE_KIND = 'tin_the_gioi';

export function yearlyChronicle(ctx: SimContext): void {
  const { state, content } = ctx;
  const rng = ctx.rng.get(RngStream.World);
  const startYear = state.generationStartYear ?? content.balance.time.start_year;
  const elapsed = state.clock.year - startYear;
  for (const entry of content.chronicle.entries) {
    if (!inCurrentEra(ctx, entry.eras)) continue;
    const last = state.chronicle[entry.id];
    if (last !== undefined && (entry.once || state.clock.year - last < entry.cooldown_years)) continue;
    if (elapsed < entry.years[0] || elapsed > entry.years[1]) continue;
    if (!evaluate(entry.condition, createResolver(ctx))) continue;
    if (!rng.chance(entry.chance_per_year)) continue;

    state.chronicle[entry.id] = state.clock.year;
    if (entry.reign) {
      state.world.reignName = entry.reign;
      state.world.reignStartYear = state.clock.year;
    }
    if (entry.harvest_quality) state.world.harvestQuality = entry.harvest_quality;
    if (entry.military_alert) {
      state.world.militaryAlert = entry.military_alert.id;
      state.world.alertLock = { id: entry.military_alert.id, untilYear: state.clock.year + entry.military_alert.years - 1 };
    }
    const deltas = applyEffects(ctx, entry.effects, {});
    pushLog(ctx, {
      sourceId: `${CHRONICLE_SOURCE_PREFIX}${entry.id}`,
      kind: CHRONICLE_KIND,
      text: fillTemplate(rng.pick(entry.text), createResolver(ctx).token),
      importance: entry.importance,
      tone: entry.tone,
      icon: entry.icon,
      rumor: false,
      highlight: true,
      deltas,
    });
  }
}

/** Động tĩnh quân sự đang bị biên niên khóa (chiến tranh kéo dài nhiều năm). */
export function lockedAlert(ctx: SimContext): string | null {
  const lock = ctx.state.world.alertLock;
  return lock && ctx.state.clock.year <= lock.untilYear ? lock.id : null;
}
