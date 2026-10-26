// [2] Chợ hôn nhân, mai mối & gả cưới cho con (Phase 4): môn đăng hộ đối, sính lễ / hồi môn, thông gia & con cãi lời
import { clamp } from '@shared/curve';
import { fullName, type Character, type Sex } from '../../entities/Character';
import type { ClanTie } from '../../entities/Dynasty';
import { addLedger } from '../../entities/Household';
import { queueCutscene } from '../../events/cutscene';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { aliveClanMembers, changeClanRelation, generateVillageClans } from '../ai';
import { RngStream, type SimContext } from '../context';
import { ageNow, callOf, player, playerHousehold } from '../people';
import { changeReputation } from '../social';
import { currentCivilization } from '../status';

export interface MatchmakingCandidate {
  characterId: string;
  name: string;
  sex: Sex;
  age: number;
  health: number;
  clanId: string;
  clanName: string;
  statusRankId: string;
  statusRankName: string;
  careerId: string;
  careerName: string;
  tie: ClanTie;
  relationWithPlayer: number;
  traits: { id: string; name: string }[];
  bridePrice: number;
  dowry: number;
  netCost: number;
  matchTier: 'mon_dang_ho_doi' | 'ket_thong_gia_cao' | 'ha_minh';
  prestigeBonus: number;
  rebelChance: number;
  clanAccepts: boolean;
  blockReason: 'feud' | 'status_gap' | 'not_enough_money' | null;
}

/** Danh sách người trong hộ đủ tuổi dựng vợ gả chồng (bản thân người chơi nếu độc thân, và các con >= 16 tuổi chưa cưới). */
export function getMarriageableMembers(ctx: SimContext): Character[] {
  const { state, content } = ctx;
  const minAge = content.balance.life.marriage.min_age;
  const me = player(ctx);
  const h = playerHousehold(ctx);

  const list: Character[] = [];
  if (me.alive && ageNow(ctx, me) >= minAge && (!me.spouseId || !state.characters[me.spouseId]?.alive)) {
    list.push(me);
  }

  for (const id of h.memberIds) {
    if (id === me.id) continue;
    const c = state.characters[id];
    if (!c?.alive) continue;
    if (c.spouseId && state.characters[c.spouseId]?.alive) continue;
    if (ageNow(ctx, c) < minAge) continue;
    if (c.fatherId === me.id || c.motherId === me.id || c.adopted || c.collateral) {
      list.push(c);
    }
  }
  return list;
}

/** Tính xác suất con cãi lời cha mẹ khi sắp đặt hôn sự (theo tính cách của con và chênh lệch tuổi/thù oán). */
export function computeChildRebelChance(
  ctx: SimContext,
  child: Character,
  candidate: Character,
  clanTie: ClanTie,
): number {
  if (child.id === ctx.state.playerId) return 0;
  const cfg = ctx.content.balance.life.matchmaking;
  let prob = cfg.rebel_base_chance;

  for (const t of child.traits) {
    if (cfg.rebel_trait_bonuses[t]) prob += cfg.rebel_trait_bonuses[t];
    if (cfg.obey_trait_bonuses[t]) prob -= cfg.obey_trait_bonuses[t];
  }

  const ageDiff = Math.abs(ageNow(ctx, child) - ageNow(ctx, candidate));
  if (ageDiff > 8) prob += 0.12;
  if (clanTie === 'feud') prob += 0.2;

  return clamp(prob, 0, 0.75);
}

/** Đảm bảo có đủ ứng viên độc thân khác giới trong các dòng họ làng để bà mối giới thiệu. */
export function ensureVillageSuitors(ctx: SimContext, targetSex: Sex, targetAge: number, minCount = 3): void {
  const { state, content } = ctx;
  if (!state.villageClans || Object.keys(state.villageClans).length === 0) {
    generateVillageClans(ctx);
  }
  const clans = Object.values(state.villageClans);
  if (clans.length === 0) return;

  const minAge = content.balance.life.marriage.min_age;
  const existing = Object.values(state.characters).filter(
    (c) =>
      c.alive &&
      Boolean(c.clanId) &&
      c.sex === targetSex &&
      (!c.spouseId || !state.characters[c.spouseId]?.alive) &&
      ageNow(ctx, c) >= minAge &&
      ageNow(ctx, c) <= Math.max(36, targetAge + 12) &&
      c.id !== state.villageClans[c.clanId!]?.headId,
  );

  if (existing.length >= minCount) return;

  const rng = ctx.rng.get(RngStream.Clans);
  const culture = content.index.culture.get(state.cultureId) ?? content.cultures[0];
  const needed = minCount - existing.length;

  for (let i = 0; i < needed; i++) {
    const clan = clans[i % clans.length];
    const age = clamp(targetAge + rng.int(-2, 3), minAge, 32);
    const birthMonth = rng.int(1, content.balance.calendar.months_per_year);
    const birthYear = state.clock.year - age - (birthMonth > state.clock.month ? 1 : 0);

    const traitPool = content.traits;
    const pickedTrait = rng.weighted(traitPool, (x) => x.start_weight);
    let idx = Object.keys(state.characters).length + 1;
    while (state.characters[`nc_m_${idx}`]) idx += 1;

    const suitor: Character = {
      id: `nc_m_${idx}`,
      familyName: clan.familyName,
      givenName: rng.pick(culture.given_names[targetSex]),
      sex: targetSex,
      birthYear,
      birthMonth,
      alive: true,
      health: rng.int(70, 90),
      stress: content.balance.life.stress.start,
      skills: {},
      traits: pickedTrait ? [pickedTrait.id] : [],
      modifiers: [],
      diseases: [],
      householdId: clan.householdId,
      clanId: clan.id,
      fatherId: clan.headId,
      opinionOfPlayer: clan.relationWithPlayer,
      opinionModifiers: [],
      favorWithPlayer: 0,
    };
    state.characters[suitor.id] = suitor;
    const h = state.households[clan.householdId];
    if (h && !h.memberIds.includes(suitor.id)) h.memberIds.push(suitor.id);
  }
}

/** Lấy danh sách đối tượng mai mối cho một thành viên trong hộ (người chơi hoặc con cái) — hàm đọc thuần (pure query). */
export function getMatchmakingCandidates(ctx: SimContext, targetCharId?: string): MatchmakingCandidate[] {
  const { state, content } = ctx;
  if (!state.villageClans || Object.keys(state.villageClans).length === 0) {
    return [];
  }

  const members = getMarriageableMembers(ctx);
  const target = (targetCharId ? state.characters[targetCharId] : undefined) ?? members[0] ?? player(ctx);
  if (!target?.alive) return [];

  const desiredSex: Sex = target.sex === 'm' ? 'f' : 'm';
  const targetAge = ageNow(ctx, target);
  const cfg = content.balance.life.matchmaking;
  const minAge = content.balance.life.marriage.min_age;

  const civ = currentCivilization(ctx);
  const statusRanks = civ.status_ranks;
  const playerRankIdx = Math.max(0, statusRanks.findIndex((r) => r.id === state.civilization.statusRank));
  const h = playerHousehold(ctx);
  const availableMoney = h.money + state.purse.money;

  const rawSuitors = Object.values(state.characters)
    .filter(
      (c) =>
        c.alive &&
        Boolean(c.clanId) &&
        c.sex === desiredSex &&
        (!c.spouseId || !state.characters[c.spouseId]?.alive) &&
        ageNow(ctx, c) >= minAge &&
        ageNow(ctx, c) <= Math.max(38, targetAge + 14) &&
        c.id !== state.villageClans[c.clanId!]?.headId,
    )
    .sort((a, b) => Math.abs(ageNow(ctx, a) - targetAge) - Math.abs(ageNow(ctx, b) - targetAge))
    .slice(0, cfg.candidates_count[1]);

  return rawSuitors.map((c) => {
    const clan = state.villageClans[c.clanId!] ?? Object.values(state.villageClans)[0];
    const clanRankIdx = Math.max(0, statusRanks.findIndex((r) => r.id === clan.statusRankId));
    const statusDef = statusRanks[clanRankIdx] ?? statusRanks[0];
    const careerDef = content.index.career.get(clan.careerId);

    const baseBridePrice = cfg.base_bride_price[clan.statusRankId] ?? 5;
    const baseDowry = cfg.base_dowry[clan.statusRankId] ?? 3;

    const tieFactor = clan.tie === 'in_law' || clan.tie === 'ally' ? 0.8 : clan.tie === 'feud' ? 1.8 : 1;
    let bridePrice = Math.max(1, Math.round(baseBridePrice * tieFactor));
    let dowry = Math.max(1, Math.round(baseDowry));

    // Nếu nhà mình hỏi cưới vợ (target là nam): nộp sính lễ, nhận một phần của hồi môn nhà gái mang về
    // Nếu nhà mình gả con gái (target là nữ): nhận lễ dẫn cưới từ nhà trai, tặng của hồi môn cho con
    const netCost =
      target.sex === 'm'
        ? Math.max(1, bridePrice - Math.floor(dowry * 0.5))
        : Math.max(0, dowry - bridePrice);

    let matchTier: MatchmakingCandidate['matchTier'] = 'mon_dang_ho_doi';
    let prestigeBonus = cfg.equal_status_prestige_bonus;
    if (clanRankIdx > playerRankIdx) {
      matchTier = 'ket_thong_gia_cao';
      prestigeBonus = cfg.higher_status_prestige_bonus;
    } else if (clanRankIdx < playerRankIdx) {
      matchTier = 'ha_minh';
      prestigeBonus = Math.max(2, Math.floor(cfg.equal_status_prestige_bonus / 2));
    }

    const rebelChance = computeChildRebelChance(ctx, target, c, clan.tie);

    let blockReason: MatchmakingCandidate['blockReason'] = null;
    if (clan.tie === 'feud' && clan.relationWithPlayer < -30) {
      blockReason = 'feud';
    } else if (clanRankIdx - playerRankIdx >= 2 && (state.reputation.dan_lang ?? 0) < 15 && clan.relationWithPlayer < 20) {
      blockReason = 'status_gap';
    } else if (netCost > availableMoney) {
      blockReason = 'not_enough_money';
    }

    const traits = c.traits.map((tId) => {
      const tDef = content.index.trait.get(tId);
      return { id: tId, name: tDef?.name ?? tId };
    });

    return {
      characterId: c.id,
      name: fullName(c),
      sex: c.sex,
      age: ageNow(ctx, c),
      health: c.health,
      clanId: clan.id,
      clanName: clan.familyName,
      statusRankId: clan.statusRankId,
      statusRankName: statusDef?.name ?? clan.statusRankId,
      careerId: clan.careerId,
      careerName: careerDef?.name ?? clan.careerId,
      tie: clan.tie,
      relationWithPlayer: clan.relationWithPlayer,
      traits,
      bridePrice,
      dowry,
      netCost,
      matchTier,
      prestigeBonus,
      rebelChance,
      clanAccepts: blockReason === null,
      blockReason,
    };
  });
}

/** Sắp đặt hôn sự cho bản thân hoặc cho con cái với một đối tượng mai mối trong làng. */
export function arrangeMarriage(
  ctx: SimContext,
  targetCharId: string,
  candidateId: string,
): { ok: boolean; rebelled?: boolean; error?: string } {
  const { state, content } = ctx;
  const me = player(ctx);
  const target = state.characters[targetCharId];
  if (!target?.alive) return { ok: false, error: 'invalid_target' };

  const candidates = getMatchmakingCandidates(ctx, targetCharId);
  const cand = candidates.find((c) => c.characterId === candidateId);
  if (!cand) return { ok: false, error: 'invalid_candidate' };
  if (cand.blockReason === 'feud') return { ok: false, error: 'clan_feud' };
  if (cand.blockReason === 'status_gap') return { ok: false, error: 'status_gap' };
  if (cand.blockReason === 'not_enough_money') return { ok: false, error: 'not_enough_money' };

  const partner = state.characters[candidateId];
  const clan = state.villageClans[cand.clanId];
  if (!partner?.alive || !clan) return { ok: false, error: 'invalid_candidate' };

  const cfg = content.balance.life.matchmaking;
  const rng = ctx.rng.get(RngStream.Clans);

  // Kiểm tra con cái có cãi lời cha mẹ khi bị ép duyên không
  if (target.id !== me.id && cand.rebelChance > 0 && rng.chance(cand.rebelChance)) {
    target.stress = clamp(target.stress + cfg.rebel_stress_delta, 0, content.balance.life.stress.max);
    me.stress = clamp(me.stress + Math.round(cfg.rebel_stress_delta * 0.6), 0, content.balance.life.stress.max);
    writeTemplate(ctx, SystemLog.ChildRebelledMarriage, {
      self: target.id,
      params: {
        call: callOf(ctx, target),
        partner: fullName(partner),
        clan: clan.familyName,
      },
    });
    return { ok: true, rebelled: true };
  }

  // Thanh toán sính lễ / của hồi môn
  const h = playerHousehold(ctx);
  if (cand.netCost > 0) {
    if (h.money >= cand.netCost) {
      h.money -= cand.netCost;
    } else {
      const rem = cand.netCost - h.money;
      h.money = 0;
      state.purse.money = Math.max(0, state.purse.money - rem);
    }
    addLedger(h, Ledger.Event, -cand.netCost, 0);
  } else if (target.sex === 'f') {
    const gain = Math.max(1, cand.bridePrice - cand.dowry);
    h.money += gain;
    addLedger(h, Ledger.Event, gain, 0);
  }

  // Nối duyên vợ chồng
  target.spouseId = partner.id;
  partner.spouseId = target.id;
  target.marriedYear = state.clock.year;
  partner.marriedYear = state.clock.year;

  // Kiểm tra con gái độc nhất trong hộ (ở rể để giữ người nối dõi) hay xuất giá về nhà chồng
  const directChildrenAlive = Object.values(state.characters).filter(
    (c) => c.alive && (c.fatherId === me.id || c.motherId === me.id),
  );
  const isOnlyChild = target.id !== me.id && directChildrenAlive.length <= 1;

  if (target.id === me.id || target.sex === 'm' || isOnlyChild) {
    // Đón dâu (hoặc đón rể nếu con gái độc nhất) về hộ người chơi
    const oldH = partner.householdId ? state.households[partner.householdId] : undefined;
    if (oldH) oldH.memberIds = oldH.memberIds.filter((id) => id !== partner.id);
    partner.householdId = h.id;
    partner.clanId = undefined;
    if (!h.memberIds.includes(partner.id)) h.memberIds.push(partner.id);

    // Đảm bảo dòng họ kia vẫn còn người kế tiếp
    if (aliveClanMembers(ctx, clan.id).length < 2) {
      ensureVillageSuitors(ctx, partner.sex, ageNow(ctx, partner), 2);
    }
  } else {
    // Gả con gái về nhà chồng thuộc dòng họ NPC
    h.memberIds = h.memberIds.filter((id) => id !== target.id);
    target.householdId = clan.householdId;
    target.clanId = clan.id;
    const clanH = state.households[clan.householdId];
    if (clanH && !clanH.memberIds.includes(target.id)) clanH.memberIds.push(target.id);
  }

  // Kết tình thông gia giữa hai họ & tăng danh tiếng môn đăng hộ đối
  changeClanRelation(
    ctx,
    clan.id,
    cfg.in_law_relation_bonus,
    'in_law',
    `${fullName(target)} - ${fullName(partner)}`,
  );
  state.dynasty.prestige += cand.prestigeBonus;
  changeReputation(ctx, 'dan_lang', Math.round(cand.prestigeBonus / 2));

  if (target.id === me.id) {
    writeTemplate(ctx, SystemLog.Married, {
      self: partner.id,
      params: { call: fullName(partner), age: ageNow(ctx, partner) },
    });
  } else {
    writeTemplate(ctx, SystemLog.ChildMarried, {
      self: target.id,
      params: {
        call: callOf(ctx, target),
        partner: fullName(partner),
        clan: clan.familyName,
      },
    });
  }

  queueCutscene(ctx, content.balance.life.marriage.wedding_cutscene);
  return { ok: true, rebelled: false };
}
