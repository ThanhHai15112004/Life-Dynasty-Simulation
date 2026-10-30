// [1] Mô hình Hạnh phúc tâm lý 3 tầng, Tham vọng cả đời & Tổng kết đời 5 trục độc lập (GDD 01 §6–7)
// Luật hệ giá trị và công thức các trục nằm ở data/balance/life.yaml — code chỉ cộng dồn.
import { clamp, pickBand } from '@shared/curve';
import type { Character, CharacterMemory } from '../../entities/Character';
import { evaluate } from '../../engine/RuleEvaluator';
import { writeTemplate } from '../../events/journal';
import { SystemLog } from '../../events/systemLogKeys';
import { RngStream, type SimContext } from '../context';
import { householdNetWorth } from '../economy/helpers';
import { aliveChildrenOf } from '../family';
import { healthCap } from '../life/health';
import { ageNow, player } from '../people';
import { createResolver } from '../resolver';
import { changeReputation } from '../social';

export { householdNetWorth };

/** Ghi nhận một ký ức cá nhân có thời hạn và tác động cảm xúc cho nhân vật (tối đa 8 ký ức gần nhất). */
export function addCharacterMemory(c: Character, mem: CharacterMemory): void {
  if (!c.memories) c.memories = [];
  const existingIdx = c.memories.findIndex((m) => m.id === mem.id);
  if (existingIdx >= 0) {
    c.memories[existingIdx] = mem;
  } else {
    c.memories.push(mem);
    if (c.memories.length > 8) {
      c.memories.sort((a, b) => b.importance - a.importance);
      c.memories.length = 8;
    }
  }
}

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
          addCharacterMemory(me, {
            id: `amb_${ms.id}`,
            label: `${amb.name} — ${ms.name}`,
            importance: 8,
            moodDelta: 6,
            remainingMonths: 36,
          });
          writeTemplate(ctx, SystemLog.AmbitionMilestone, {
            params: { title: `${amb.name} — ${ms.name}` },
          });
        }
      }
    }
  }

  // 1b) Kiểm tra hoàn thành Di nguyện dòng họ (nếu có)
  if (state.dynasty?.unfinishedWishes?.length) {
    const r = createResolver(ctx);
    for (const wish of state.dynasty.unfinishedWishes) {
      if (wish.fulfilled) continue;
      if (wish.ambitionId && wish.milestoneId) {
        const amb = content.index.ambition.get(wish.ambitionId);
        const ms = amb?.milestones.find((m) => m.id === wish.milestoneId);
        if (ms && evaluate(ms.condition, r)) {
          wish.fulfilled = true;
          me.stress = clamp(me.stress - ms.stress_relief, 0, content.balance.life.stress.max);
          state.happiness.ambitionBonus += ms.satisfaction_bonus;
          state.dynasty.prestige += 15;
          addCharacterMemory(me, {
            id: `wish_${wish.id}`,
            label: wish.text,
            importance: 9,
            moodDelta: 8,
            remainingMonths: 48,
          });
          writeTemplate(ctx, SystemLog.WishFulfilled, {
            params: { title: wish.text, ancestor: wish.fromName },
          });
        }
      }
    }
  }

  // 1c) Suy giảm ký ức cá nhân hàng tháng & Kiểm tra Khủng hoảng tâm lý (Mental Break khi stress >= ngưỡng)
  if (me.memories && me.memories.length > 0) {
    for (const m of me.memories) m.remainingMonths -= 1;
    me.memories = me.memories.filter((m) => m.remainingMonths > 0);
  }
  state.mentalBreakCooldown = Math.max(0, (state.mentalBreakCooldown ?? 0) - 1);
  const stressCfg = content.balance.life.stress;
  if (me.stress >= stressCfg.mental_break_threshold && (state.mentalBreakCooldown ?? 0) <= 0) {
    const rng = ctx.rng.get(RngStream.Social);
    const pool = stressCfg.mental_break_types;
    const brk = pool.length > 0 ? rng.pick(pool) : undefined;
    me.stress = clamp(me.stress - stressCfg.mental_break_relief, 0, stressCfg.max);
    state.mentalBreakCooldown = stressCfg.mental_break_cooldown_months;
    if (brk) {
      if (brk.health_delta !== 0) {
        me.health = clamp(me.health + brk.health_delta, 1, healthCap(ctx, me));
      }
      if (brk.reputation_delta !== 0) {
        changeReputation(ctx, 'dan_lang', brk.reputation_delta);
      }
      addCharacterMemory(me, {
        id: `mb_${brk.id}`,
        label: brk.name,
        importance: 7,
        moodDelta: brk.mood_delta,
        remainingMonths: brk.memory_months,
      });
      writeTemplate(ctx, SystemLog.MentalBreak, {
        params: { title: brk.name },
      });
    }
  }
  const memoryMoodBonus = clamp(
    (me.memories ?? []).reduce((sum, m) => sum + m.moodDelta, 0),
    -18,
    18,
  );

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
  const mood = clamp(hCfg.start + healthBonus - stressPenalty + memoryMoodBonus + clamp(wealthGap, mLo, mHi), hCfg.min, hCfg.max);
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
