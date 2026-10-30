// [3] Hệ thống Quân sự & Chiến dịch (Phase 11 — GDD 03 §11)
import { clamp } from '@shared/curve';
import { addLedger } from '../../entities/Household';
import { Ledger } from '../../events/systemLogKeys';
import type { SimContext } from '../context';
import { player, playerHousehold } from '../people';
import { ensurePoliticsState } from '../politics';
import { addSkillXp } from '../skills';

/** Điều binh tuần tiễu hoặc dẹp loạn tại một tỉnh (dành cho người chơi theo nghề Lính/Quan hoặc giữ chức Nha môn). */
export function dispatchMilitaryCampaign(
  ctx: SimContext,
  provinceId: string,
  action: 'suppress_unrest' | 'fortify_border',
): boolean {
  const pol = ensurePoliticsState(ctx.state);
  const prov = pol.provinces[provinceId];
  if (!prov) return false;

  const me = player(ctx);
  const isMilitaryOrOfficial =
    ctx.state.career.id === 'linh' ||
    ctx.state.career.id === 'si_tu' ||
    ctx.state.career.id === 'nha_lai' ||
    (ctx.state.organizations?.nha_mon_phu?.playerRank ?? -1) >= 1;
  if (!isMilitaryOrOfficial) return false;

  const h = playerHousehold(ctx);
  if (action === 'suppress_unrest') {
    prov.grievance = clamp(prov.grievance - 18, 0, 100);
    prov.unrestStatus =
      prov.grievance >= 75 ? 'khoi_nghia' : prov.grievance >= 45 ? 'bat_on' : 'binh_yen';
    ctx.state.career.merit += 14;
    h.money += 4;
    addLedger(h, Ledger.Career, 4, 0);
    addSkillXp(ctx, me, 'quan_su', 16);
  } else {
    prov.garrison += 60;
    prov.prosperity = clamp(prov.prosperity + 4, 0, 100);
    pol.mandateOfHeaven = clamp(pol.mandateOfHeaven + 2, 0, 100);
    ctx.state.career.merit += 10;
    addSkillXp(ctx, me, 'quan_su', 12);
  }
  return true;
}
