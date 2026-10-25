// [1] Phân hệ Quan hệ xã hội, Danh tiếng & Quyền lực mềm (GDD 03 §6)
import { clamp } from '@shared/curve';
import type { Character } from '../../entities/Character';
import { tickStoredModifiers } from '../../engine/ModifierSystem';
import type { SimContext } from '../context';

/** Thêm một tác động thiện cảm có nguồn và thời hạn cho NPC đối với người chơi. */
export function addOpinionChange(ctx: SimContext, c: Character, value: number, label: string, months = 60): void {
  if (!c.opinionModifiers) c.opinionModifiers = [];
  c.opinionModifiers.push({
    sourceId: `opinion:${ctx.state.clock.monthIndex}`,
    label,
    target: 'opinion',
    value,
    op: 'add',
    remainingMonths: months,
  });
  c.opinionOfPlayer = clamp(c.opinionOfPlayer + value, -100, 100);
}

/** Thay đổi danh tiếng trong một nhóm xã hội (mặc định: dan_lang). */
export function changeReputation(ctx: SimContext, group: string, delta: number): void {
  const cur = ctx.state.reputation[group] ?? 0;
  ctx.state.reputation[group] = clamp(cur + delta, -100, 100);
}

/** Thay đổi ân tình giữa NPC và người chơi (>0: họ nợ người chơi, <0: người chơi nợ họ). */
export function changeFavor(c: Character, delta: number): void {
  c.favorWithPlayer = clamp((c.favorWithPlayer ?? 0) + delta, -10, 10);
}

/** Hàng tháng: giảm dần thời hạn các modifier thiện cảm của NPC. */
export function monthlySocial(ctx: SimContext): void {
  for (const id of Object.values(ctx.state.village)) {
    const c = ctx.state.characters[id];
    if (!c?.alive || !c.opinionModifiers || c.opinionModifiers.length === 0) continue;
    c.opinionModifiers = tickStoredModifiers(c.opinionModifiers);
  }
}

