// [0] Kỹ năng, kinh nghiệm theo Focus (GDD 03 §3): học nhanh lúc trẻ, lợi ích giảm dần ở bậc cao
import { interpolate } from '@shared/curve';
import type { Character } from '../../entities/Character';
import { StatTarget, xpTarget } from '../../engine/statTargets';
import { SystemLog } from '../../events/systemLogKeys';
import { writeTemplate } from '../../events/journal';
import type { SimContext } from '../context';
import { computeFor } from '../modifiers';
import { ageNow, lifeStageOf, player } from '../people';

export function xpToNext(ctx: SimContext, level: number): number {
  const b = ctx.content.balance.skills;
  return b.xp_base * Math.pow(b.xp_growth, level);
}

export function addSkillXp(ctx: SimContext, c: Character, skillId: string, amount: number): void {
  if (!ctx.content.index.skill.has(skillId) || amount <= 0) return;
  const max = ctx.content.balance.skills.max_level;
  const s = (c.skills[skillId] ??= { level: 0, xp: 0 });
  if (s.level >= max) return;
  s.xp += amount;
  while (s.level < max && s.xp >= xpToNext(ctx, s.level)) {
    s.xp -= xpToNext(ctx, s.level);
    s.level += 1;
    if (c.id === ctx.state.playerId) {
      const skill = ctx.content.index.skill.get(skillId);
      writeTemplate(ctx, SystemLog.SkillUp, { params: { skill: skill?.name ?? skillId, level: s.level } });
    }
  }
}

/** XP mỗi tháng của người chơi từ Focus chính và phụ. */
export function monthlySkills(ctx: SimContext): void {
  const { state, content } = ctx;
  const me = player(ctx);
  const age = ageNow(ctx, me);
  const stage = lifeStageOf(ctx, age);
  if (!stage.can_choose_focus) return;
  const learning = interpolate(content.balance.skills.learning_by_age, 'age', 'factor', age);
  const all = computeFor(ctx, me.id, StatTarget.XpAll, 1).value;

  const gains = new Map<string, number>();
  const addFrom = (focusId: string | null, scale: number) => {
    const f = focusId ? content.index.focus.get(focusId) : undefined;
    if (!f) return;
    for (const [skill, xp] of Object.entries(f.skill_xp)) gains.set(skill, (gains.get(skill) ?? 0) + xp * scale);
  };
  addFrom(state.focus.primary, 1);
  if (stage.can_have_secondary_focus) addFrom(state.focus.secondary, content.balance.skills.secondary_focus_factor);

  for (const [skill, base] of gains) {
    const perSkill = computeFor(ctx, me.id, xpTarget(skill), 1).value;
    addSkillXp(ctx, me, skill, base * learning * all * perSkill);
  }
}
