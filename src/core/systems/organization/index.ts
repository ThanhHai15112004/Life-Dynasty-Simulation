// [2] Hệ thống Tổ chức Fractal & Ủy quyền (Phase 10 — GDD 03 §10)
import { clamp } from '@shared/curve';
import { evaluate } from '../../engine/RuleEvaluator';
import { addLedger } from '../../entities/Household';
import type {
  DelegationPolicy,
  OrganizationFactorKey,
  OrganizationState,
} from '../../entities/Organization';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { RngStream, type SimContext } from '../context';
import { callOf, inCurrentEra, player, playerHousehold } from '../people';
import { createResolver } from '../resolver';
import { changeReputation } from '../social';

function langText(ctx: SimContext, key: string, fallback = key): string {
  const lang = ctx.content.lang[ctx.content.balance.display.default_language] ?? {};
  return lang[key] ?? fallback;
}

/** Khởi tạo các tổ chức trong vùng thuộc thời đại hiện tại từ dữ liệu organizations.yaml nếu chưa có. */
export function ensureOrganizations(ctx: SimContext): Record<string, OrganizationState> {
  if (!ctx.state.organizations) {
    ctx.state.organizations = {};
  }
  const orgs = ctx.state.organizations;
  for (const def of ctx.content.organizations ?? []) {
    if (!inCurrentEra(ctx, def.eras)) continue;
    if (!orgs[def.id]) {
      const villageLeader =
        def.kind === 'village_council'
          ? (ctx.state.village.ly_truong ?? ctx.state.village.ba_ho ?? 'npc')
          : 'npc';
      orgs[def.id] = {
        id: def.id,
        name: def.name,
        kind: def.kind,
        settlementId: def.settlement_id,
        leaderId: villageLeader,
        playerRank: -1,
        playerContribution: 0,
        factors: { ...def.initial_factors },
        delegation: {
          deputyId: null,
          policy: 'balanced',
          deputyLoyalty: 75,
          monthsDelegated: 0,
        },
      };
    }
  }
  return orgs;
}

export function canJoinOrganization(ctx: SimContext, orgId: string): boolean {
  const orgs = ensureOrganizations(ctx);
  const org = orgs[orgId];
  const def = ctx.content.index.organization.get(orgId);
  if (!org || !def || !inCurrentEra(ctx, def.eras) || org.playerRank >= 0) return false;
  const h = playerHousehold(ctx);
  if (h.money < def.join_cost_money) return false;
  if (def.entry_condition && !evaluate(def.entry_condition, createResolver(ctx))) return false;
  return true;
}

/** Gia nhập một tổ chức ở bậc 0. */
export function joinOrganization(ctx: SimContext, orgId: string): boolean {
  if (!canJoinOrganization(ctx, orgId)) return false;
  const orgs = ensureOrganizations(ctx);
  const org = orgs[orgId]!;
  const def = ctx.content.index.organization.get(orgId)!;
  const h = playerHousehold(ctx);
  if (def.join_cost_money > 0) {
    h.money -= def.join_cost_money;
    addLedger(h, Ledger.Event, -def.join_cost_money, 0);
    org.factors.treasury += def.join_cost_money;
  }
  org.playerRank = 0;
  org.playerContribution = Math.max(5, org.playerContribution);
  writeTemplate(ctx, SystemLog.OrgJoined, {
    params: {
      title: def.name,
      stage: def.ranks[0]?.name ?? '0',
    },
  });
  return true;
}

/** Đóng góp tiền hoặc sức lực vào tổ chức để tăng điểm cống hiến và thăng chức. */
export function contributeToOrganization(ctx: SimContext, orgId: string, amountMoney: number): boolean {
  const orgs = ensureOrganizations(ctx);
  const org = orgs[orgId];
  const def = ctx.content.index.organization.get(orgId);
  if (!org || !def || org.playerRank < 0 || amountMoney <= 0) return false;
  const h = playerHousehold(ctx);
  if (h.money < amountMoney) return false;

  h.money -= amountMoney;
  addLedger(h, Ledger.Event, -amountMoney, 0);
  org.factors.treasury += amountMoney;
  org.factors.morale = clamp(org.factors.morale + Math.min(6, Math.round(amountMoney / 2)), 0, 100);
  org.playerContribution += amountMoney * 4;
  checkOrgPromotion(ctx, org);
  return true;
}

function checkOrgPromotion(ctx: SimContext, org: OrganizationState): void {
  const def = ctx.content.index.organization.get(org.id);
  if (!def || org.playerRank < 0 || org.playerRank >= 3) return;
  let promoted = false;
  while (org.playerRank < 3) {
    const nextRank = def.ranks[org.playerRank + 1];
    if (!nextRank || org.playerContribution < nextRank.min_contribution) break;
    org.playerRank += 1;
    promoted = true;
    if (org.playerRank === 3) {
      org.leaderId = 'player';
      ctx.state.dynasty.prestige += 12;
      changeReputation(ctx, 'dan_lang', 8);
    }
  }
  if (promoted) {
    const rankName = def.ranks[org.playerRank]?.name ?? String(org.playerRank);
    writeTemplate(ctx, SystemLog.OrgPromoted, {
      params: {
        title: def.name,
        stage: rankName,
      },
    });
  }
}

/** Điều phối trực tiếp 1 trong 5 yếu tố quản lý Fractal (dành cho Chấp sự / Phó hội / Thủ lĩnh bậc >= 1). */
export function investOrganizationFactor(
  ctx: SimContext,
  orgId: string,
  factor: OrganizationFactorKey,
): boolean {
  const orgs = ensureOrganizations(ctx);
  const org = orgs[orgId];
  if (!org || org.playerRank < 1) return false;
  const cost = 6;
  if (org.factors.treasury < cost) return false;
  org.factors.treasury -= cost;
  if (factor === 'treasury') {
    org.factors.treasury += cost + 4;
  } else {
    org.factors[factor] = clamp(org.factors[factor] + 10, 0, 100);
  }
  org.playerContribution += 8;
  checkOrgPromotion(ctx, org);
  return true;
}

/** Ủy quyền điều hành tổ chức cho NPC cấp dưới hoặc thu hồi quyền tự điều hành (dành cho bậc >= 2). */
export function delegateOrganization(
  ctx: SimContext,
  orgId: string,
  deputyId: string | null,
  policy: DelegationPolicy,
): boolean {
  const orgs = ensureOrganizations(ctx);
  const org = orgs[orgId];
  const def = ctx.content.index.organization.get(orgId);
  if (!org || !def || org.playerRank < 2) return false;

  if (!deputyId) {
    org.delegation = {
      deputyId: null,
      policy,
      deputyLoyalty: 80,
      monthsDelegated: 0,
    };
    return true;
  }

  const npc = ctx.state.characters[deputyId];
  if (!npc || !npc.alive) return false;
  const baseLoyalty = clamp(65 + Math.round(npc.opinionOfPlayer * 0.3) + (npc.favorWithPlayer ?? 0) * 3, 20, 100);
  org.delegation = {
    deputyId: npc.id,
    policy,
    deputyLoyalty: baseLoyalty,
    monthsDelegated: 0,
  };
  const policyLabel = langText(ctx, `org.policy.${policy}`, policy);
  writeTemplate(ctx, SystemLog.OrgDelegated, {
    params: {
      title: def.name,
      call: callOf(ctx, npc),
      stage: policyLabel,
    },
  });
  return true;
}

/** Hàng tháng: phát phụ cấp chức vụ tổ chức & cập nhật tiến trình ủy quyền. */
export function monthlyOrganization(ctx: SimContext): void {
  const orgs = ensureOrganizations(ctx);
  const h = playerHousehold(ctx);
  for (const org of Object.values(orgs)) {
    if (org.playerRank < 0) continue;
    const def = ctx.content.index.organization.get(org.id);
    if (!def) continue;
    const rankDef = def.ranks[org.playerRank];
    if (rankDef && rankDef.stipend_money_month > 0 && org.factors.treasury >= rankDef.stipend_money_month) {
      const stipend = rankDef.stipend_money_month;
      org.factors.treasury = Math.round((org.factors.treasury - stipend) * 100) / 100;
      h.money += stipend;
      addLedger(h, Ledger.Career, stipend, 0);
    }
    org.playerContribution += 0.5;
    if (org.delegation.deputyId) {
      org.delegation.monthsDelegated += 1;
    }
  }
}

/** Cuối năm: kết toán 5 yếu tố Fractal của các tổ chức & xét hiệu quả / rủi ro tham ô của người được ủy quyền. */
export function yearlyOrganization(ctx: SimContext): void {
  const orgs = ensureOrganizations(ctx);
  const me = player(ctx);
  const adminSkill = me.skills.quan_tri?.level ?? 0;

  for (const org of Object.values(orgs)) {
    const def = ctx.content.index.organization.get(org.id);
    if (!def) continue;

    // Dòng thu tự nhiên của tổ chức theo Đầu tư & Ảnh hưởng
    const yearlyRevenue = Math.round(4 + org.factors.investment * 0.12 + org.factors.influence * 0.08);
    org.factors.treasury = Math.max(0, org.factors.treasury + yearlyRevenue);

    if (org.playerRank >= 2 && org.delegation.deputyId) {
      const npc = ctx.state.characters[org.delegation.deputyId];
      if (!npc || !npc.alive) {
        org.delegation.deputyId = null;
        continue;
      }
      const p = org.delegation.policy;
      if (p === 'treasury') org.factors.treasury += 8;
      else if (p === 'morale') org.factors.morale = clamp(org.factors.morale + 5, 0, 100);
      else if (p === 'security') org.factors.security = clamp(org.factors.security + 5, 0, 100);
      else if (p === 'expansion') {
        org.factors.investment = clamp(org.factors.investment + 4, 0, 100);
        org.factors.influence = clamp(org.factors.influence + 4, 0, 100);
      } else {
        org.factors.morale = clamp(org.factors.morale + 2, 0, 100);
        org.factors.security = clamp(org.factors.security + 2, 0, 100);
        org.factors.treasury += 4;
      }

      // Kiểm tra rủi ro cấp dưới tham ô nếu bất trung hoặc có tính tham lam / cơ hội
      const greedy = npc.traits.includes('tham_lam') || npc.traits.includes('co_hoi');
      const betrayChance = clamp(
        (greedy ? 0.14 : 0.04) + (60 - org.delegation.deputyLoyalty) * 0.003 - adminSkill * 0.015,
        0.01,
        0.35,
      );
      const rng = ctx.rng.get(RngStream.Organization);
      if (org.factors.treasury >= 12 && rng.chance(betrayChance)) {
        const stolen = Math.min(org.factors.treasury, Math.max(4, Math.round(org.factors.treasury * 0.2)));
        org.factors.treasury -= stolen;
        org.factors.morale = clamp(org.factors.morale - 6, 0, 100);
        writeTemplate(ctx, SystemLog.OrgDeputyBetrayed, {
          params: {
            title: def.name,
            call: callOf(ctx, npc),
            money: stolen,
          },
        });
      }
    }

    if (org.playerRank >= 0) {
      checkOrgPromotion(ctx, org);
    }
  }
}
