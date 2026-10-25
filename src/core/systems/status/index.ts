// [1] Hệ thống Khuôn văn minh & Thang địa vị (GDD 07): Khoa cử, Hiếu đạo, Danh vọng sĩ phu, Cư tang
import { clamp } from '@shared/curve';
import type { ExamDegreeId } from '@content/schemas';
import { evaluate } from '../../engine/RuleEvaluator';
import { addLedger } from '../../entities/Household';
import { queueCutscene } from '../../events/cutscene';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import type { SimContext } from '../context';
import { player, playerHousehold } from '../people';
import { createResolver } from '../resolver';
import { changeReputation } from '../social';

/** Giai đoạn khoa thi của năm nay: 'huong' (thi Hương), 'hoi' (thi Hội – Đình) hoặc 'none'. */
export const ExamStage = { None: 'none', Huong: 'huong', Hoi: 'hoi' } as const;

/** Thang 0..100 của các chỉ số khuôn văn minh (giá trị kỹ thuật của thang đo). */
const SCALE_MAX = 100;

export function currentCivilization(ctx: SimContext) {
  return ctx.content.index.civilization.get(ctx.state.civilization.id) ?? ctx.content.civilizations[0];
}

export function examStage(ctx: SimContext): string {
  const civ = currentCivilization(ctx);
  const elapsed = ctx.state.clock.year - ctx.content.balance.time.start_year;
  if (elapsed <= 0) return ExamStage.None;
  const phase = elapsed % civ.exam_interval_years;
  if (phase === 0) return ExamStage.Huong;
  if (phase === civ.metropolitan_exam_offset_years) return ExamStage.Hoi;
  return ExamStage.None;
}

export function changeFilialPiety(ctx: SimContext, delta: number): void {
  ctx.state.civilization.filialPiety = clamp(ctx.state.civilization.filialPiety + delta, 0, SCALE_MAX);
}

export function changeScholarlyPrestige(ctx: SimContext, delta: number): void {
  ctx.state.civilization.scholarlyPrestige = clamp(ctx.state.civilization.scholarlyPrestige + delta, 0, SCALE_MAX);
}

/**
 * Đạt học vị Khoa cử. Không bao giờ hạ học vị; nếu Học vấn chưa đủ min_hoc_van của bậc xin đỗ
 * thì chỉ nhận bậc cao nhất (giữa học vị hiện tại và bậc xin đỗ) mà Học vấn đáp ứng được.
 */
export function setExamDegree(ctx: SimContext, degree: ExamDegreeId): void {
  const civ = currentCivilization(ctx);
  const degrees = civ.exam_degrees;
  const currentIdx = degrees.findIndex((d) => d.id === ctx.state.civilization.examDegree);
  const wantedIdx = degrees.findIndex((d) => d.id === degree);
  if (wantedIdx <= currentIdx) return;
  const hocVan = player(ctx).skills[civ.exam_skill]?.level ?? 0;
  let idx = wantedIdx;
  while (idx > currentIdx && hocVan < degrees[idx].min_hoc_van) idx -= 1;
  if (idx <= currentIdx) return;

  const degDef = degrees[idx];
  ctx.state.civilization.examDegree = degDef.id;
  changeScholarlyPrestige(ctx, degDef.prestige_gain);
  changeReputation(ctx, civ.reputation_group, Math.round(degDef.prestige_gain * civ.prestige_reputation_factor));
  queueCutscene(ctx, civ.cutscenes.exam_passed);
  writeTemplate(ctx, SystemLog.ExamPassed, { params: { title: degDef.name } });
}

export function startMourning(ctx: SimContext, call: string): void {
  const civ = currentCivilization(ctx);
  const months = civ.mourning_months;
  ctx.state.civilization.mourningMonthsLeft = months;
  queueCutscene(ctx, civ.cutscenes.mourning);
  writeTemplate(ctx, SystemLog.MourningStarted, { params: { call, amount: months } });
}

/** Bậc địa vị hiện tại: bậc cao nhất có điều kiện đúng (bậc đầu là mặc định). */
export function computeStatusRank(ctx: SimContext) {
  const civ = currentCivilization(ctx);
  const r = createResolver(ctx);
  let rank = civ.status_ranks[0];
  for (const s of civ.status_ranks) if (!s.condition || evaluate(s.condition, r)) rank = s;
  return rank;
}

export function currentStatusRank(ctx: SimContext) {
  const civ = currentCivilization(ctx);
  return civ.status_ranks.find((s) => s.id === ctx.state.civilization.statusRank) ?? civ.status_ranks[0];
}

export function monthlyStatus(ctx: SimContext): void {
  const civState = ctx.state.civilization;
  if (civState.mourningMonthsLeft > 0) civState.mourningMonthsLeft -= 1;

  const civ = currentCivilization(ctx);
  const degDef = civ.exam_degrees.find((d) => d.id === civState.examDegree);
  if (degDef && degDef.stipend_money_month > 0) {
    const h = playerHousehold(ctx);
    h.money += degDef.stipend_money_month;
    addLedger(h, Ledger.Career, degDef.stipend_money_month, 0);
  }

  // Thang địa vị: đổi bậc thì ghi nhật ký (lên hay xuống đều là dấu mốc đời người)
  const rank = computeStatusRank(ctx);
  if (rank.id !== civState.statusRank) {
    const oldIdx = civ.status_ranks.findIndex((s) => s.id === civState.statusRank);
    const newIdx = civ.status_ranks.findIndex((s) => s.id === rank.id);
    civState.statusRank = rank.id;
    writeTemplate(ctx, newIdx > oldIdx ? SystemLog.StatusRose : SystemLog.StatusFell, { params: { title: rank.name } });
  }
}
