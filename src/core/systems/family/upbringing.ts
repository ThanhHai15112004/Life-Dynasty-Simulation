// [2] Nuôi dạy con cái (Phase 4): chọn hướng giáo dục (đi học, học nghề, phụ việc nhà) cho con từ 6–15 tuổi
import { addLedger } from '../../entities/Household';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { RngStream, type SimContext } from '../context';
import { ageNow, callOf, player, playerHousehold } from '../people';
import { addSkillXp } from '../skills';

/** Đặt hướng nuôi dạy cho một người con trong hộ (6–15 tuổi). */
export function setChildUpbringing(ctx: SimContext, childId: string, upbringingId: string): boolean {
  const { state, content } = ctx;
  const cfg = content.balance.life.child_upbringing;
  const opt = cfg.options.find((o) => o.id === upbringingId);
  if (!opt) return false;

  const me = player(ctx);
  const child = state.characters[childId];
  if (!child?.alive) return false;
  const isChildOrMember =
    child.fatherId === me.id || child.motherId === me.id || child.householdId === state.householdId;
  if (!isChildOrMember || child.id === me.id) return false;

  const age = ageNow(ctx, child);
  if (age < cfg.min_age || age > cfg.max_age) return false;

  child.upbringing = opt.id;
  writeTemplate(ctx, SystemLog.ChildUpbringingSet, {
    self: child.id,
    params: {
      call: callOf(ctx, child),
      title: opt.name,
    },
  });
  return true;
}

/** Hàng tháng: cộng XP kỹ năng và định hình tính cách cho các con trong độ tuổi nuôi dạy (6–15). */
export function monthlyChildUpbringing(ctx: SimContext): void {
  const { state, content } = ctx;
  const cfg = content.balance.life.child_upbringing;
  if (!cfg.options || cfg.options.length === 0) return;

  const me = player(ctx);
  const h = playerHousehold(ctx);
  const children = h.memberIds
    .map((id) => state.characters[id])
    .filter(
      (c): c is NonNullable<typeof c> =>
        Boolean(c?.alive) &&
        c.id !== me.id &&
        (c.fatherId === me.id || c.motherId === me.id),
    );

  for (const child of children) {
    const age = ageNow(ctx, child);
    if (age < cfg.min_age || age > cfg.max_age) continue;

    const explicitlyChosen = Boolean(child.upbringing);
    const upId = child.upbringing || cfg.default_option;
    const opt = cfg.options.find((o) => o.id === upId) ?? cfg.options[0];
    if (!opt) continue;

    // Chỉ trừ học phí nếu người chơi chủ động chọn hướng tốn phí và nhà còn tiền
    if (explicitlyChosen && opt.cost_money_month > 0 && h.money >= opt.cost_money_month) {
      h.money -= opt.cost_money_month;
      addLedger(h, Ledger.Living, -opt.cost_money_month, 0);
    }

    for (const [skillId, xp] of Object.entries(opt.skill_xp)) {
      addSkillXp(ctx, child, skillId, xp);
    }

    // Định hình tính cách thứ 2 theo môi trường giáo dục khi bước vào tuổi 12 hoặc 15
    if (
      child.birthMonth === state.clock.month &&
      (age === 12 || age === 15) &&
      child.traits.length < 2 &&
      opt.favored_traits.length > 0
    ) {
      const rng = ctx.rng.get(RngStream.Clans);
      const validTraits = opt.favored_traits.filter((tId) => {
        const def = content.index.trait.get(tId);
        return def && !child.traits.includes(tId) && !child.traits.includes(def.opposite);
      });
      if (validTraits.length > 0) {
        child.traits.push(rng.pick(validTraits));
      }
    }
  }
}
