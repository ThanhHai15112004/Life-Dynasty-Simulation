// [3] Hệ thống Chính trị Vương triều, Thiên mệnh, Phe phái & Các tỉnh (Phase 11 — GDD 03 §11)
import { clamp } from '@shared/curve';
import { addLedger } from '../../entities/Household';
import type { PolityState } from '../../entities/Polity';
import type { GameState } from '../../entities/World';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import type { SimContext } from '../context';
import { playerHousehold } from '../people';
import { changeScholarlyPrestige } from '../status';

function langText(ctx: SimContext, key: string, fallback = key): string {
  const lang = ctx.content.lang[ctx.content.balance.display.default_language] ?? {};
  return lang[key] ?? fallback;
}

/** Khởi tạo trạng thái chính trị vương triều, 3 phe phái và 3 tỉnh tiêu biểu nếu chưa có. */
export function ensurePoliticsState(state: GameState): PolityState {
  if (!state.politics) {
    state.politics = {
      mandateOfHeaven: 78,
      imperialTreasury: 320,
      imperialArmy: 1200,
      alignedFactionId: null,
      factions: {
        thanh_luu: {
          id: 'thanh_luu',
          name: 'politics.faction.thanh_luu',
          influence: 42,
          favorWithPlayer: 0,
        },
        the_gia: {
          id: 'the_gia',
          name: 'politics.faction.the_gia',
          influence: 35,
          favorWithPlayer: 0,
        },
        quan_cong: {
          id: 'quan_cong',
          name: 'politics.faction.quan_cong',
          influence: 23,
          favorWithPlayer: 0,
        },
      },
      provinces: {
        kinh_lo: {
          id: 'kinh_lo',
          name: 'politics.province.kinh_lo',
          population: 48000,
          prosperity: 75,
          grievance: 15,
          garrison: 500,
          taxRate: 1.0,
          unrestStatus: 'binh_yen',
        },
        nam_chau: {
          id: 'nam_chau',
          name: 'politics.province.nam_chau',
          population: 36000,
          prosperity: 68,
          grievance: 20,
          garrison: 380,
          taxRate: 1.0,
          unrestStatus: 'binh_yen',
        },
        bac_tran: {
          id: 'bac_tran',
          name: 'politics.province.bac_tran',
          population: 22000,
          prosperity: 52,
          grievance: 28,
          garrison: 320,
          taxRate: 1.0,
          unrestStatus: 'binh_yen',
        },
      },
    };
  }
  return state.politics;
}

/** Liên kết chính trị với một phe phái trong phủ/triều đình. */
export function alignWithFaction(ctx: SimContext, factionId: string): boolean {
  const pol = ensurePoliticsState(ctx.state);
  const fac = pol.factions[factionId];
  if (!fac) return false;
  pol.alignedFactionId = factionId;
  fac.favorWithPlayer = clamp(fac.favorWithPlayer + 15, -100, 100);
  const factionName = langText(ctx, `politics.faction.${factionId}`, fac.name);
  writeTemplate(ctx, SystemLog.FactionAligned, {
    params: { title: factionName },
  });
  return true;
}

/** Dâng sớ / Kiến nghị chính sách lên Phủ thành hoặc Triều đình ('giam_thue' | 'chan_te' | 'tang_binh'). */
export function petitionCourt(
  ctx: SimContext,
  policy: 'giam_thue' | 'chan_te' | 'tang_binh',
): boolean {
  const pol = ensurePoliticsState(ctx.state);
  const h = playerHousehold(ctx);
  const cost = 4;
  if (h.money < cost) return false;
  h.money -= cost;
  addLedger(h, Ledger.Event, -cost, 0);

  if (policy === 'giam_thue') {
    pol.mandateOfHeaven = clamp(pol.mandateOfHeaven + 5, 0, 100);
    for (const p of Object.values(pol.provinces)) {
      p.taxRate = clamp(p.taxRate - 0.1, 0.6, 1.8);
      p.grievance = clamp(p.grievance - 8, 0, 100);
    }
    changeScholarlyPrestige(ctx, 4);
  } else if (policy === 'chan_te') {
    pol.mandateOfHeaven = clamp(pol.mandateOfHeaven + 6, 0, 100);
    pol.imperialTreasury = Math.max(0, pol.imperialTreasury - 25);
    for (const p of Object.values(pol.provinces)) {
      p.grievance = clamp(p.grievance - 12, 0, 100);
      p.prosperity = clamp(p.prosperity + 4, 0, 100);
    }
    changeScholarlyPrestige(ctx, 5);
  } else if (policy === 'tang_binh') {
    pol.imperialArmy += 150;
    for (const p of Object.values(pol.provinces)) {
      p.garrison += 50;
    }
    ctx.state.career.merit += 10;
  }

  if (pol.alignedFactionId && pol.factions[pol.alignedFactionId]) {
    pol.factions[pol.alignedFactionId].favorWithPlayer = clamp(
      pol.factions[pol.alignedFactionId].favorWithPlayer + 8,
      -100,
      100,
    );
    pol.factions[pol.alignedFactionId].influence = clamp(
      pol.factions[pol.alignedFactionId].influence + 3,
      10,
      85,
    );
  }
  return true;
}

/** Cuối năm: cập nhật Thiên mệnh (Mandate of Heaven), độ thịnh vượng & bất mãn các tỉnh theo mùa màng và dịch bệnh. */
export function yearlyPolitics(ctx: SimContext): void {
  const pol = ensurePoliticsState(ctx.state);
  const prevMandate = pol.mandateOfHeaven;
  const hq = ctx.state.world.harvestQuality;
  const anyEpidemic = Object.values(ctx.state.settlements ?? {}).some((s) => s.epidemic !== null);

  let mandateDelta = 0;
  if (hq === 'duoc_mua') mandateDelta += 2;
  else if (hq === 'kem') mandateDelta -= 2;
  else if (hq === 'mat_mua') mandateDelta -= 6;
  if (anyEpidemic) mandateDelta -= 4;
  if (ctx.state.world.militaryAlert === 'chien_dich') mandateDelta -= 3;

  pol.mandateOfHeaven = clamp(pol.mandateOfHeaven + mandateDelta, 0, 100);

  for (const p of Object.values(pol.provinces)) {
    const gDelta =
      (hq === 'mat_mua' ? 8 : hq === 'duoc_mua' ? -4 : 0) +
      (p.taxRate > 1.1 ? 5 : p.taxRate < 0.9 ? -3 : 0) +
      (pol.mandateOfHeaven < 40 ? 4 : -1);
    p.grievance = clamp(p.grievance + gDelta, 0, 100);
    p.prosperity = clamp(p.prosperity + (hq === 'duoc_mua' ? 3 : hq === 'mat_mua' ? -5 : 1), 10, 100);
    p.unrestStatus =
      p.grievance >= 75 ? 'khoi_nghia' : p.grievance >= 45 ? 'bat_on' : 'binh_yen';
  }

  // Thông báo nếu Thiên mệnh tụt qua ngưỡng nguy hiểm
  if (prevMandate >= 45 && pol.mandateOfHeaven < 45) {
    writeTemplate(ctx, SystemLog.MandateChanged, {
      params: { title: `${pol.mandateOfHeaven}/100` },
    });
  }
}
