// [3] Hệ thống Nổi dậy 8 giai đoạn từ dưới lên (Phase 11 — GDD 03 §12)
// 1. cam_phan -> 2. ket_noi -> 3. to_chuc -> 4. cho_thoi -> 5. khoi_nghia -> 6. lan_rong -> 7. ket_cuc -> 8. hau_noi_day
import { clamp } from '@shared/curve';
import { addLedger } from '../../entities/Household';
import type { RebellionStageId, RebellionState } from '../../entities/Polity';
import type { GameState } from '../../entities/World';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import type { SimContext } from '../context';
import { player, playerHousehold } from '../people';
import { ensurePoliticsState } from '../politics';
import { addSkillXp } from '../skills';
import { changeReputation } from '../social';

export const REBELLION_STAGES: readonly RebellionStageId[] = [
  'none',
  'cam_phan',
  'ket_noi',
  'to_chuc',
  'cho_thoi',
  'khoi_nghia',
  'lan_rong',
  'ket_cuc',
  'hau_noi_day',
] as const;

function langText(ctx: SimContext, key: string, fallback = key): string {
  const lang = ctx.content.lang[ctx.content.balance.display.default_language] ?? {};
  return lang[key] ?? fallback;
}

export function ensureRebellionState(state: GameState): RebellionState {
  if (!state.rebellion) {
    state.rebellion = {
      stage: 'none',
      progress: 0,
      grievance: 15,
      followers: 0,
      supplies: 20,
      secrecy: 85,
      legitimacy: 50,
      promise: 'chia_ruong',
      playerJoined: false,
    };
  }
  return state.rebellion;
}

/** Tham gia hoặc khởi xướng phong trào nổi dậy từ dưới lên. */
export function joinRebellion(
  ctx: SimContext,
  promise: 'chia_ruong' | 'xoa_thue' | 'tru_gian' = 'chia_ruong',
): boolean {
  const reb = ensureRebellionState(ctx.state);
  reb.playerJoined = true;
  reb.promise = promise;
  if (reb.stage === 'none') {
    reb.stage = 'cam_phan';
    reb.progress = 25;
    reb.followers = Math.max(12, reb.followers);
    reb.secrecy = 85;
    const stageName = langText(ctx, `rebellion.stage.${reb.stage}`, reb.stage);
    writeTemplate(ctx, SystemLog.RebellionStageUp, {
      params: { title: stageName },
    });
  }
  return true;
}

/** Thực hiện hành động trong phong trào nổi dậy ('gather_followers' | 'stockpile_supplies' | 'keep_secrecy' | 'advance_stage'). */
export function executeRebellionAction(
  ctx: SimContext,
  action: 'gather_followers' | 'stockpile_supplies' | 'keep_secrecy' | 'advance_stage',
): boolean {
  const reb = ensureRebellionState(ctx.state);
  if (!reb.playerJoined) {
    joinRebellion(ctx, reb.promise);
  }
  const me = player(ctx);
  const h = playerHousehold(ctx);

  if (action === 'gather_followers') {
    const dip = me.skills.ngoai_giao?.level ?? 0;
    reb.followers += 15 + dip * 5;
    reb.legitimacy = clamp(reb.legitimacy + 6, 0, 100);
    reb.progress = clamp(reb.progress + 25, 0, 100);
    reb.secrecy = clamp(reb.secrecy - 4, 10, 100);
    addSkillXp(ctx, me, 'ngoai_giao', 12);
  } else if (action === 'stockpile_supplies') {
    const foodCost = Math.min(h.food, 8);
    if (foodCost > 0) {
      h.food -= foodCost;
      addLedger(h, Ledger.Event, 0, -foodCost);
    }
    reb.supplies = clamp(reb.supplies + 20, 0, 100);
    reb.progress = clamp(reb.progress + 22, 0, 100);
    addSkillXp(ctx, me, 'quan_tri', 12);
  } else if (action === 'keep_secrecy') {
    const intLvl = me.skills.muu_luoc?.level ?? 0;
    reb.secrecy = clamp(reb.secrecy + 18 + intLvl * 3, 0, 100);
    reb.progress = clamp(reb.progress + 15, 0, 100);
    addSkillXp(ctx, me, 'muu_luoc', 12);
  } else if (action === 'advance_stage') {
    if (reb.progress < 60) {
      reb.progress = clamp(reb.progress + 35, 0, 100);
    }
    advanceRebellionStage(ctx);
    return true;
  }

  if (reb.progress >= 100) {
    advanceRebellionStage(ctx);
  }
  return true;
}

function advanceRebellionStage(ctx: SimContext): void {
  const reb = ensureRebellionState(ctx.state);
  const pol = ensurePoliticsState(ctx.state);
  const h = playerHousehold(ctx);
  const idx = REBELLION_STAGES.indexOf(reb.stage);
  if (idx < 0 || idx >= REBELLION_STAGES.length - 1) return;

  const nextStage = REBELLION_STAGES[idx + 1];
  reb.stage = nextStage;
  reb.progress = 15;
  const stageName = langText(ctx, `rebellion.stage.${nextStage}`, nextStage);

  if (nextStage === 'ket_cuc') {
    // Phân định thắng bại khi tiến tới giai đoạn 7 (Kết cục)
    const rebelPower = reb.followers + reb.supplies * 3 + reb.legitimacy * 2 + (100 - pol.mandateOfHeaven) * 3;
    const courtPower = 240 + pol.mandateOfHeaven * 2;
    if (rebelPower >= courtPower) {
      reb.stage = 'hau_noi_day';
      reb.progress = 100;
      pol.mandateOfHeaven = 88;
      // Thực hiện lời hứa sau khởi nghĩa (giai đoạn 8: Hậu nổi dậy)
      if (reb.promise === 'chia_ruong') {
        h.properties.ruong = (h.properties.ruong ?? 0) + 3;
      } else if (reb.promise === 'xoa_thue') {
        h.debt = 0;
        h.money += 25;
        addLedger(h, Ledger.Event, 25, 0);
      } else {
        h.money += 35;
        addLedger(h, Ledger.Event, 35, 0);
      }
      ctx.state.dynasty.prestige += 25;
      changeReputation(ctx, 'dan_lang', 20);
      writeTemplate(ctx, SystemLog.RebellionVictory, {
        params: { title: langText(ctx, `rebellion.promise.${reb.promise}`, reb.promise) },
      });
    } else {
      reb.stage = 'none';
      reb.progress = 0;
      reb.playerJoined = false;
      reb.followers = Math.floor(reb.followers * 0.2);
      ctx.state.career.wanted += 15;
      writeTemplate(ctx, SystemLog.RebellionCrushed, {
        params: { title: stageName },
      });
    }
    return;
  }

  writeTemplate(ctx, SystemLog.RebellionStageUp, {
    params: { title: stageName },
  });
}

/** Hàng tháng: cập nhật tiến độ ngầm của phong trào khi người chơi đã tham gia. */
export function monthlyRebellion(ctx: SimContext): void {
  const reb = ensureRebellionState(ctx.state);
  if (!reb.playerJoined || reb.stage === 'none' || reb.stage === 'hau_noi_day') return;
  reb.progress = clamp(reb.progress + 3, 0, 100);
  if (reb.progress >= 100) {
    advanceRebellionStage(ctx);
  }
}

/** Cuối năm: tích tụ bất mãn tự nhiên từ mất mùa, nợ nần và Thiên mệnh suy giảm. */
export function yearlyRebellion(ctx: SimContext): void {
  const reb = ensureRebellionState(ctx.state);
  const pol = ensurePoliticsState(ctx.state);
  const hq = ctx.state.world.harvestQuality;
  const delta =
    (hq === 'mat_mua' ? 10 : hq === 'kem' ? 4 : -2) +
    (pol.mandateOfHeaven < 50 ? 6 : -1);
  reb.grievance = clamp(reb.grievance + delta, 0, 100);

  if (reb.stage === 'none' && reb.grievance >= 55) {
    reb.stage = 'cam_phan';
    reb.progress = 20;
  }
}
