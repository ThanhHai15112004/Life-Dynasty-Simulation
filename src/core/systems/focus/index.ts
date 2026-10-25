// [1] Trọng tâm theo giai đoạn đời (GDD 01 §5): mỗi giai đoạn một bộ lựa chọn trong data/focuses,
// lọc theo nghề nhà / nơi ở; khi lựa chọn cũ không còn hợp (lớn lên, đổi nghề) thì tự chọn lại.
import { evaluate } from '../../engine/RuleEvaluator';
import type { SimContext } from '../context';
import { ageNow, lifeStageOf, player } from '../people';
import { createResolver } from '../resolver';

export function focusAvailable(ctx: SimContext, focusId: string): boolean {
  const f = ctx.content.index.focus.get(focusId);
  if (!f) return false;
  const stage = lifeStageOf(ctx, ageNow(ctx, player(ctx)));
  return stage.can_choose_focus && f.life_stages.includes(stage.id) && evaluate(f.condition, createResolver(ctx));
}

/** Trọng tâm tự chọn: nghề nhà ưu tiên → xuất thân → thứ tự của giai đoạn → lựa chọn khả dụng đầu tiên. */
export function defaultFocus(ctx: SimContext): string {
  const { content, state } = ctx;
  const stage = lifeStageOf(ctx, ageNow(ctx, player(ctx)));
  if (!stage.can_choose_focus) return '';
  const prefs = [
    content.index.career.get(state.career.id)?.default_focus,
    content.index.origin.get(state.originId)?.default_focus,
    ...stage.default_focuses,
    ...content.focuses.map((f) => f.id),
  ];
  return prefs.find((id): id is string => !!id && focusAvailable(ctx, id)) ?? '';
}

/** Mỗi tháng: trọng tâm hiện tại không còn hợp (hoặc còn trống) thì chọn lại; quá nhỏ thì để trống. */
export function ensureFocus(ctx: SimContext): void {
  const cur = ctx.state.focus.primary;
  if (cur && focusAvailable(ctx, cur)) return;
  ctx.state.focus.primary = defaultFocus(ctx);
}
