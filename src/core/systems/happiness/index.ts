// [1] Mô hình Hạnh phúc tâm lý 3 tầng, Tham vọng cả đời & Tổng kết đời 5 trục độc lập (GDD 01 §6–7)
import { clamp, pickBand } from '@shared/curve';
import { evaluate } from '../../engine/RuleEvaluator';
import { farmlandOf, holdingsOf } from '../../entities/Property';
import { writeTemplate } from '../../events/journal';
import { SystemLog } from '../../events/systemLogKeys';
import type { SimContext } from '../context';
import { aliveChildrenOf } from '../family';
import { ageNow, aliveMembers, player, playerHousehold } from '../people';
import { createResolver } from '../resolver';

export interface SummaryAxisView {
  id: string;
  score: number;
  bandKey: string;
}

/** Giá trị ròng của hộ gia đình (tiền mặt + giá trị tài sản - nợ). */
export function householdNetWorth(ctx: SimContext): number {
  const h = playerHousehold(ctx);
  const propValue = holdingsOf(h, ctx.content).reduce((s, p) => s + p.type.value * p.count, 0);
  return h.money + propValue - h.debt;
}

/** Điểm cộng/trừ mãn nguyện dựa trên việc cuộc sống hiện tại có khớp Hệ giá trị theo Tính cách không (GDD 01 §7.2). */
function traitValueAlignment(ctx: SimContext): number {
  const me = player(ctx);
  const h = playerHousehold(ctx);
  let bonus = 0;
  const children = aliveChildrenOf(ctx, me.id).length;
  const hasSpouse = !!(me.spouseId && ctx.state.characters[me.spouseId]?.alive);
  const netWorth = householdNetWorth(ctx);
  const rep = ctx.state.reputation.dan_lang ?? 0;

  if (me.traits.includes('trong_gia_dinh')) {
    bonus += (hasSpouse ? 6 : -4) + Math.min(children * 4, 12);
  }
  if (me.traits.includes('tham_vong')) {
    bonus += netWorth >= 180 ? 8 : netWorth < 90 && ageNow(ctx, me) >= 30 ? -8 : 0;
  }
  if (me.traits.includes('an_phan')) {
    bonus += h.debt <= 0 ? 6 : -6;
  }
  if (me.traits.includes('hao_phong') || me.traits.includes('nhan_tu')) {
    bonus += rep >= 15 ? 5 : rep < 0 ? -5 : 0;
  }
  return bonus;
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
  const netWorth = householdNetWorth(ctx);
  const wealthGap = (netWorth - state.happiness.baselineWealth) * hCfg.wealth_factor;
  const stressPenalty = me.stress * hCfg.stress_penalty_factor;
  const healthBonus = (me.health - 60) * 0.15;
  const hasSpouse = !!(me.spouseId && state.characters[me.spouseId]?.alive);
  const childrenCount = aliveChildrenOf(ctx, me.id).length;
  const familyBonus = (hasSpouse ? hCfg.marriage_bonus : 0) + Math.min(childrenCount * hCfg.child_bonus, 12);

  // Nỗi đau mất người thân trong hộ
  const deadFamilyCount = Object.values(state.characters).filter(
    (c) => !c.alive && c.householdId === state.householdId && c.id !== me.id,
  ).length;
  const lossPenalty = Math.min(deadFamilyCount * hCfg.family_death_penalty, 24);

  const mood = clamp(hCfg.start + healthBonus - stressPenalty + clamp(wealthGap, -15, 15), hCfg.min, hCfg.max);
  const satisfaction = clamp(
    hCfg.start +
      clamp(wealthGap, -18, 22) +
      familyBonus +
      traitValueAlignment(ctx) +
      state.happiness.ambitionBonus -
      stressPenalty * 0.6 -
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

/** Tính điểm 5 trục độc lập cho Bản tổng kết đời (GDD 01 §7.3). */
export function computeSummaryAxes(ctx: SimContext): SummaryAxisView[] {
  const { state, content } = ctx;
  const me = player(ctx);
  const h = playerHousehold(ctx);
  const bands = content.balance.display.summary_axis_bands;

  // 1. Mãn nguyện: Nhân vật tự thấy đời mình thế nào?
  const manNguyen = clamp(Math.round(state.happiness.satisfaction), 0, 100);

  // 2. Di sản: Để lại gì cho con cháu? (ruộng đất, nhà cửa, tiền bạc, không nợ nần, con cái nối dõi)
  const sao = farmlandOf(h, content);
  const children = aliveChildrenOf(ctx, me.id).length;
  const netWorth = householdNetWorth(ctx);
  const diSan = clamp(Math.round(15 + sao * 7 + Math.max(0, netWorth) * 0.2 + children * 8 - h.debt * 0.8), 0, 100);

  // 3. Dấu ấn: Thế giới / làng xã nhớ đến bạn thế nào? (danh tiếng, ân tình, bậc kỹ năng cao nhất)
  const rep = state.reputation.dan_lang ?? 0;
  const favors = Object.values(state.characters).reduce((s, c) => s + Math.max(0, c.favorWithPlayer ?? 0), 0);
  const bestSkill = Object.values(me.skills).reduce((m, s) => Math.max(m, s.level), 0);
  const dauAn = clamp(Math.round(25 + rep * 1.1 + favors * 8 + bestSkill * 4), 0, 100);

  // 4. Gia đình: Quan hệ và sự sum vầy của người thân trong nhà
  const hasSpouse = !!(me.spouseId && state.characters[me.spouseId]?.alive);
  const aliveKin = aliveMembers(ctx, h).length;
  const giaDinh = clamp(Math.round(20 + (hasSpouse ? 25 : 0) + children * 15 + aliveKin * 5), 0, 100);

  // 5. Tham vọng: Đạt được bao nhiêu mốc trong Tham vọng cả đời?
  const amb = state.ambition.id ? content.index.ambition.get(state.ambition.id) : undefined;
  const totalMilestones = amb?.milestones.length ?? 3;
  const achieved = state.ambition.achievedMilestones.length;
  const thamVong = clamp(Math.round(15 + (achieved / Math.max(1, totalMilestones)) * 85), 0, 100);

  const makeAxis = (id: string, score: number): SummaryAxisView => ({
    id,
    score,
    bandKey: pickBand(bands, score).key,
  });

  return [
    makeAxis('man_nguyen', manNguyen),
    makeAxis('di_san', diSan),
    makeAxis('dau_an', dauAn),
    makeAxis('gia_dinh', giaDinh),
    makeAxis('tham_vong', thamVong),
  ];
}
