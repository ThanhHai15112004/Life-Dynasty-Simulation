// [1] Hệ thống Khuôn văn minh & Thang địa vị (GDD 07): Khoa cử, Hiếu đạo, Danh vọng sĩ phu, Cư tang
import { clamp } from '@shared/curve';
import type { ExamDegreeId } from '@content/schemas';
import { addLedger } from '../../entities/Household';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import type { SimContext } from '../context';
import { playerHousehold } from '../people';
import { changeReputation } from '../social';

export function currentCivilization(ctx: SimContext) {
  return ctx.content.index.civilization.get(ctx.state.civilization.id) ?? ctx.content.civilizations[0];
}

export function isExamYear(ctx: SimContext): boolean {
  const civ = currentCivilization(ctx);
  const interval = civ?.exam_interval_years ?? 3;
  const elapsed = ctx.state.clock.year - ctx.content.balance.time.start_year;
  return elapsed > 0 && elapsed % interval === 0;
}

export function changeFilialPiety(ctx: SimContext, delta: number): void {
  ctx.state.civilization.filialPiety = clamp(ctx.state.civilization.filialPiety + delta, 0, 100);
}

export function changeScholarlyPrestige(ctx: SimContext, delta: number): void {
  ctx.state.civilization.scholarlyPrestige = clamp(ctx.state.civilization.scholarlyPrestige + delta, 0, 100);
}

export function setExamDegree(ctx: SimContext, degree: ExamDegreeId): void {
  const civ = currentCivilization(ctx);
  const degDef = civ?.exam_degrees.find((d) => d.id === degree);
  ctx.state.civilization.examDegree = degree;
  if (degDef && degree !== 'none') {
    changeScholarlyPrestige(ctx, degDef.prestige_gain);
    changeReputation(ctx, 'dan_lang', Math.round(degDef.prestige_gain * 0.6));
    ctx.state.lastCutsceneId = 'vinh_quy_bai_to';
    writeTemplate(ctx, SystemLog.ExamPassed, {
      params: { title: degDef.name },
    });
  }
}

export function startMourning(ctx: SimContext, call: string): void {
  const civ = currentCivilization(ctx);
  const months = civ?.mourning_months ?? 27;
  ctx.state.civilization.mourningMonthsLeft = months;
  ctx.state.flags['cu_tang'] = {
    expiresAt: ctx.state.clock.monthIndex + months,
  };
  ctx.state.lastCutsceneId = 'tang_le';
  writeTemplate(ctx, SystemLog.MourningStarted, {
    params: { call, amount: months },
  });
}

export function monthlyStatus(ctx: SimContext): void {
  const civState = ctx.state.civilization;
  if (civState.mourningMonthsLeft > 0) {
    civState.mourningMonthsLeft -= 1;
    if (civState.mourningMonthsLeft <= 0) {
      delete ctx.state.flags['cu_tang'];
    }
  }

  const civ = currentCivilization(ctx);
  const degDef = civ?.exam_degrees.find((d) => d.id === civState.examDegree);
  if (degDef && degDef.stipend_money_month > 0) {
    const h = playerHousehold(ctx);
    h.money += degDef.stipend_money_month;
    addLedger(h, Ledger.Career, degDef.stipend_money_month, 0);
  }
}

