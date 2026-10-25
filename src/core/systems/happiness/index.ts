// [1] Mô hình Hạnh phúc tâm lý 3 tầng, Tham vọng cả đời & Tổng kết đời 5 trục độc lập (GDD 01 §6–7)
// Luật hệ giá trị và công thức các trục nằm ở data/balance/life.yaml — code chỉ cộng dồn.
import { clamp, pickBand } from '@shared/curve';
import { evaluate } from '../../engine/RuleEvaluator';
import { writeTemplate } from '../../events/journal';
import { SystemLog } from '../../events/systemLogKeys';
import type { SimContext } from '../context';
import { householdNetWorth } from '../economy/helpers';
import { aliveChildrenOf } from '../family';
import { ageNow, player } from '../people';
import { createResolver } from '../resolver';

export { householdNetWorth };

export interface SummaryAxisView {
  id: string;
  score: number;
  bandKey: string;
}

/** Thang 0..100 của trục tổng kết (giá trị kỹ thuật của thang đo). */
const AXIS_MAX = 100;

/** Điểm cộng/trừ mãn nguyện khi cuộc sống khớp Hệ giá trị theo Tính cách (GDD 01 §7.2). */
function valueAlignment(ctx: SimContext): number {
  const r = createResolver(ctx);
  return ctx.content.balance.life.happiness.value_rules.reduce((sum, rule) => sum + (evaluate(rule.condition, r) ? rule.value : 0), 0);
}

/** Hàng tháng: kiểm tra hoàn thành các mốc phụ của Tham vọng cả đời & cập nhật Mood/Mãn nguyện. */
export function monthlyHappiness(ctx: SimContext): void {
  const { state, content } = ctx;
  const me = player(ctx);
  if (!me.alive) return;
  const hCfg = content.balance.life.happiness;

  // 1) Kiểm tra các mốc phụ của Tham vọng hiện tại
  if (state.ambition.id) {
    const amb = content.index.ambition.get(state.ambition.id);
    if (amb) {
      const r = createResolver(ctx);
      for (const ms of amb.milestones) {
        if (state.ambition.achievedMilestones.includes(ms.id)) continue;
        if (evaluate(ms.condition, r)) {
          state.ambition.achievedMilestones.push(ms.id);
          me.stress = clamp(me.stress - ms.stress_relief, 0, content.balance.life.stress.max);
          state.happiness.ambitionBonus += ms.satisfaction_bonus;
          writeTemplate(ctx, SystemLog.AmbitionMilestone, {
            params: { title: `${amb.name} — ${ms.name}` },
          });
        }
      }
    }
  }

  // 2) Tính Tâm trạng (Mood) trung hạn và Mãn nguyện đời (Life Satisfaction = Thực tế - Kỳ vọng + Giá trị sống)
  const wealthGap = (householdNetWorth(ctx) - state.happiness.baselineWealth) * hCfg.wealth_factor;
  const stressPenalty = me.stress * hCfg.stress_penalty_factor;
  const healthBonus = (me.health - hCfg.health_ref) * hCfg.health_factor;
  const hasSpouse = !!(me.spouseId && state.characters[me.spouseId]?.alive);
  const childrenCount = aliveChildrenOf(ctx, me.id).length;
  const familyBonus = (hasSpouse ? hCfg.marriage_bonus : 0) + Math.min(childrenCount * hCfg.child_bonus, hCfg.child_bonus_cap);

  // Nỗi đau mất người thân trong hộ
  const deadFamilyCount = Object.values(state.characters).filter(
    (c) => !c.alive && c.householdId === state.householdId && c.id !== me.id,
  ).length;
  const lossPenalty = Math.min(deadFamilyCount * hCfg.family_death_penalty, hCfg.family_death_penalty_cap);

  const [mLo, mHi] = hCfg.mood_wealth_clamp;
  const [sLo, sHi] = hCfg.satisfaction_wealth_clamp;
  const mood = clamp(hCfg.start + healthBonus - stressPenalty + clamp(wealthGap, mLo, mHi), hCfg.min, hCfg.max);
  const satisfaction = clamp(
    hCfg.start +
      clamp(wealthGap, sLo, sHi) +
      familyBonus +
      valueAlignment(ctx) +
      state.happiness.ambitionBonus -
      stressPenalty * hCfg.satisfaction_stress_share -
      lossPenalty,
    hCfg.min,
    hCfg.max,
  );

  state.happiness.mood = Math.round(mood);
  state.happiness.satisfaction = Math.round(satisfaction);
}

/** Cuối năm: Thích nghi (Hedonic Adaptation) — kỳ vọng tài sản dịch chuyển dần về mức thực tế (GDD 01 §7.2). */
export function yearlyHappiness(ctx: SimContext): void {
  const rate = ctx.content.balance.life.happiness.adaptation_rate_year;
  const actual = householdNetWorth(ctx);
  ctx.state.happiness.baselineWealth += (actual - ctx.state.happiness.baselineWealth) * rate;
}

/** Cuối năm: ghi một ô vào Bản đồ cuộc đời (mãn nguyện + biểu tượng các dòng nổi bật trong năm). */
export function recordLifeYear(ctx: SimContext): void {
  const { state, content } = ctx;
  const me = player(ctx);
  const year = state.log.find((y) => y.year === state.clock.year);
  const marks = (year?.entries ?? [])
    .filter((e) => e.highlight || e.importance >= content.balance.display.highlight_importance)
    .slice(0, content.balance.display.life_map_marks_per_year)
    .map((e) => e.icon);
  // Tuổi của năm lấy theo năm nhật ký (tuổi lúc đầu năm), khớp cột tuổi trong Ghi chép cuộc đời
  state.lifeMap.push({ age: year?.age ?? ageNow(ctx, me), year: state.clock.year, satisfaction: state.happiness.satisfaction, marks });
}

/** Tính điểm các trục độc lập của Bản tổng kết đời (GDD 01 §7.3) theo công thức trong data. */
export function computeSummaryAxes(ctx: SimContext): SummaryAxisView[] {
  const { content } = ctx;
  const r = createResolver(ctx);
  const bands = content.balance.display.summary_axis_bands;
  const num = (path: string): number => {
    const v = r.get(path);
    return typeof v === 'number' ? v : v === true ? 1 : 0;
  };
  return content.balance.life.summary_axes.map((axis) => {
    const raw = axis.terms.reduce((sum, t) => sum + clamp(num(t.var) * t.factor, t.min ?? -Infinity, t.max ?? Infinity), axis.base);
    const score = clamp(Math.round(raw), 0, AXIS_MAX);
    return { id: axis.id, score, bandKey: pickBand(bands, score).key };
  });
}
