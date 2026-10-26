// [2] Character AI T1 & Các dòng họ NPC trong làng (Phase 4): mô phỏng thưa theo năm (sinh tử, cưới hỏi, sinh con, làm giàu / sa sút)
import { clamp } from '@shared/curve';
import type { Character, Sex } from '../../entities/Character';
import type { ClanTie, NpcClan } from '../../entities/Dynasty';
import type { Household } from '../../entities/Household';
import { RngStream, type SimContext } from '../context';
import { annualNpcDeathRisk, pickCause } from '../life/mortality';
import { ageNow } from '../people';

function nextClanEntityId(ctx: SimContext, prefix: string): string {
  let idx = Object.keys(ctx.state.characters).length + Object.keys(ctx.state.households).length + Object.keys(ctx.state.villageClans ?? {}).length + 1;
  while (
    ctx.state.characters[`${prefix}${idx}`] ||
    ctx.state.households[`${prefix}${idx}`] ||
    ctx.state.villageClans?.[`${prefix}${idx}`]
  ) {
    idx += 1;
  }
  return `${prefix}${idx}`;
}

function createClanMember(
  ctx: SimContext,
  spec: {
    sex: Sex;
    age: number;
    familyName: string;
    clanId: string;
    householdId: string;
    health?: number;
  },
): Character {
  const rng = ctx.rng.get(RngStream.Clans);
  const culture = ctx.content.index.culture.get(ctx.state.cultureId) ?? ctx.content.cultures[0];
  const { year, month } = ctx.state.clock;
  const birthMonth = rng.int(1, ctx.content.balance.calendar.months_per_year);
  const birthYear = year - spec.age - (birthMonth > month ? 1 : 0);

  const traits: string[] = [];
  const traitPool = ctx.content.traits.filter((t) => !traits.includes(t.id) && !traits.includes(t.opposite));
  const pickedTrait = rng.weighted(traitPool, (x) => x.start_weight);
  if (pickedTrait) traits.push(pickedTrait.id);

  const c: Character = {
    id: nextClanEntityId(ctx, 'nc_'),
    familyName: spec.familyName,
    givenName: rng.pick(culture.given_names[spec.sex]),
    sex: spec.sex,
    birthYear,
    birthMonth,
    alive: true,
    health: spec.health ?? rng.int(68, 88),
    stress: ctx.content.balance.life.stress.start,
    skills: {},
    traits,
    modifiers: [],
    diseases: [],
    householdId: spec.householdId,
    clanId: spec.clanId,
    opinionOfPlayer: rng.int(-5, 15),
    opinionModifiers: [],
    favorWithPlayer: 0,
  };
  ctx.state.characters[c.id] = c;
  const h = ctx.state.households[spec.householdId];
  if (h && !h.memberIds.includes(c.id)) {
    h.memberIds.push(c.id);
  }
  return c;
}

/** Tính lại bậc gia thế của một dòng họ NPC dựa trên ruộng đất, tiền của và nghề nghiệp. */
export function updateClanStatusRank(ctx: SimContext, clan: NpcClan): void {
  const h = ctx.state.households[clan.householdId];
  if (!h) return;
  const sao = h.properties.ruong ?? 0;
  const netWorth = h.money + sao * (ctx.content.index.property.get('ruong')?.value ?? 35);
  if (clan.careerId === 'si_tu' && (sao >= 6 || clan.prestige >= 35)) {
    clan.statusRankId = 'si_phu';
  } else if (sao >= 12 || netWorth >= 480) {
    clan.statusRankId = 'phu_ho';
  } else if (sao >= 4 || netWorth >= 150) {
    clan.statusRankId = 'thuong_dan';
  } else {
    clan.statusRankId = 'dan_ngheo';
  }
}

/** Đồng bộ trạng thái thù oán của các họ NPC sang state.dynasty.feuds. */
export function syncClanFeuds(ctx: SimContext): void {
  const { state } = ctx;
  if (!state.dynasty) return;
  for (const clan of Object.values(state.villageClans ?? {})) {
    const existingIdx = state.dynasty.feuds.findIndex(
      (f) => f.id === `feud_${clan.id}` || f.targetName.includes(clan.familyName),
    );
    if (clan.tie === 'feud') {
      const grudge = Math.max(20, Math.abs(clan.relationWithPlayer));
      if (existingIdx >= 0) {
        state.dynasty.feuds[existingIdx].grudge = grudge;
        if (clan.tieReason) state.dynasty.feuds[existingIdx].reason = clan.tieReason;
      } else {
        state.dynasty.feuds.push({
          id: `feud_${clan.id}`,
          targetName: clan.familyName,
          grudge,
          reason: clan.tieReason ?? ctx.content.balance.life.village_clans.default_feud_reason,
          sinceYear: clan.sinceYear || state.clock.year,
        });
      }
    } else if (existingIdx >= 0 && state.dynasty.feuds[existingIdx].id === `feud_${clan.id}`) {
      state.dynasty.feuds.splice(existingIdx, 1);
    }
  }
}

/** Khởi tạo 5–8 dòng họ NPC trong làng lúc bắt đầu ván mới. */
export function generateVillageClans(ctx: SimContext): void {
  const { state, content } = ctx;
  const cfg = content.balance.life.village_clans;
  const rng = ctx.rng.get(RngStream.Clans);
  const culture = content.index.culture.get(state.cultureId) ?? content.cultures[0];
  if (!culture) return;

  state.villageClans ??= {};
  if (Object.keys(state.villageClans).length > 0) return;

  const count = rng.range(cfg.count_range);
  const playerSurname = state.dynasty?.familyName || state.characters[state.playerId]?.familyName || '';
  const availableSurnames = culture.family_names
    .map((f) => f.name)
    .filter((name) => name !== playerSurname);

  const defaultStatuses =
    cfg.initial_statuses.length > 0
      ? cfg.initial_statuses
      : [
          { id: 'dan_ngheo', weight: 30, farmland: [1, 3] as [number, number], money: [2, 8] as [number, number] },
          { id: 'thuong_dan', weight: 45, farmland: [4, 9] as [number, number], money: [10, 28] as [number, number] },
          { id: 'phu_ho', weight: 15, farmland: [12, 22] as [number, number], money: [45, 90] as [number, number] },
          { id: 'si_phu', weight: 10, farmland: [6, 12] as [number, number], money: [25, 55] as [number, number] },
        ];

  for (let i = 0; i < count; i++) {
    const familyName =
      availableSurnames[i] ??
      rng.weighted(culture.family_names, (f) => f.weight)?.name ??
      culture.family_names[0].name;

    const clanId = `clan_${i + 1}`;
    const hId = nextClanEntityId(ctx, 'nh_');
    const stSpec = rng.weighted(defaultStatuses, (s) => s.weight) ?? defaultStatuses[1];
    const sao = rng.range(stSpec.farmland);
    const money = rng.range(stSpec.money);

    let careerId = 'nong_dan';
    if (stSpec.id === 'si_phu') {
      careerId = 'si_tu';
    } else if (stSpec.id === 'phu_ho') {
      careerId = rng.chance(0.5) ? 'thuong_nhan' : 'nong_dan';
    } else if (cfg.careers.length > 0 && rng.chance(0.35)) {
      careerId = rng.pick(cfg.careers);
    }

    const h: Household = {
      id: hId,
      memberIds: [],
      money,
      food: sao * 8 + 15,
      debt: 0,
      livingStandard: stSpec.id === 'phu_ho' || stSpec.id === 'si_phu' ? 'du_day' : 'dam_bac',
      properties: {
        ...(stSpec.id === 'phu_ho' || stSpec.id === 'si_phu' ? { nha_go: 1 } : { nha_tranh: 1 }),
        ruong: sao,
      },
      ledger: [],
      ventures: [],
      loans: [],
    };
    state.households[hId] = h;

    const headAge = rng.int(36, 52);
    const head = createClanMember(ctx, {
      sex: 'm',
      age: headAge,
      familyName,
      clanId,
      householdId: hId,
    });

    const wife = createClanMember(ctx, {
      sex: 'f',
      age: clamp(headAge - rng.int(1, 5), 28, 46),
      familyName: rng.weighted(culture.family_names, (f) => f.weight)?.name ?? familyName,
      clanId,
      householdId: hId,
    });
    head.spouseId = wife.id;
    wife.spouseId = head.id;
    head.marriedYear = state.clock.year - rng.int(10, 20);
    wife.marriedYear = head.marriedYear;

    const extraMembers = rng.range(cfg.members_per_clan) - 2;
    const childCount = Math.max(2, extraMembers);
    for (let cIdx = 0; cIdx < childCount; cIdx++) {
      // Đảm bảo mỗi họ có cả nam thanh nữ tú ở độ tuổi kết hôn (16–22) hoặc thiếu niên (10–15)
      const childSex: Sex = cIdx === 0 ? 'f' : cIdx === 1 ? 'm' : rng.chance(0.5) ? 'm' : 'f';
      const childAge = cIdx < 2 ? rng.int(16, 22) : rng.int(8, 17);
      const child = createClanMember(ctx, {
        sex: childSex,
        age: childAge,
        familyName,
        clanId,
        householdId: hId,
      });
      child.fatherId = head.id;
      child.motherId = wife.id;
    }

    const prestigeBase =
      stSpec.id === 'si_phu' ? rng.int(35, 55) : stSpec.id === 'phu_ho' ? rng.int(25, 45) : stSpec.id === 'thuong_dan' ? rng.int(10, 22) : rng.int(0, 8);

    const clan: NpcClan = {
      id: clanId,
      familyName,
      headId: head.id,
      householdId: hId,
      careerId,
      statusRankId: stSpec.id,
      prestige: prestigeBase,
      relationWithPlayer: rng.int(-5, 15),
      tie: 'none',
      sinceYear: state.clock.year,
    };
    state.villageClans[clanId] = clan;
  }
}

/** Danh sách thành viên còn sống của một dòng họ NPC. */
export function aliveClanMembers(ctx: SimContext, clanId: string): Character[] {
  return Object.values(ctx.state.characters).filter((c) => c.alive && c.clanId === clanId);
}

/** Thay đổi quan hệ và mối liên kết (thông gia / đồng minh / thù oán) với một dòng họ trong làng. */
export function changeClanRelation(
  ctx: SimContext,
  clanIdOrName: string | undefined,
  delta: number,
  tie?: ClanTie,
  reason?: string,
): NpcClan | null {
  const clans = Object.values(ctx.state.villageClans ?? {});
  if (clans.length === 0) return null;
  let target =
    clans.find((c) => c.id === clanIdOrName || c.familyName === clanIdOrName) ??
    clans[0];
  if (!target) return null;

  target.relationWithPlayer = clamp(target.relationWithPlayer + delta, -100, 100);
  if (tie) {
    target.tie = tie;
    target.sinceYear = ctx.state.clock.year;
    if (reason) target.tieReason = reason;
  } else if (target.relationWithPlayer <= -40 && target.tie === 'none') {
    target.tie = 'feud';
    target.sinceYear = ctx.state.clock.year;
    if (reason) target.tieReason = reason;
  } else if (target.relationWithPlayer >= 35 && target.tie === 'none') {
    target.tie = 'ally';
    target.sinceYear = ctx.state.clock.year;
  }

  const head = ctx.state.characters[target.headId];
  if (head) {
    head.opinionOfPlayer = clamp(head.opinionOfPlayer + delta, -100, 100);
  }
  syncClanFeuds(ctx);
  return target;
}

/**
 * Character AI T1 chạy mỗi cuối năm:
 * - Xét sinh tử & kế vị tộc trưởng các họ trong làng
 * - Tự dựng vợ gả chồng & sinh con có kiểm soát quy mô dân số làng (không tuyệt chủng, không bùng nổ)
 * - Thăng trầm gia thế & đổi nghề theo thời thế
 */
export function yearlyVillageClans(ctx: SimContext): void {
  const { state, content } = ctx;
  if (!state.villageClans || Object.keys(state.villageClans).length === 0) {
    generateVillageClans(ctx);
  }
  const clans = Object.values(state.villageClans);
  if (clans.length === 0) return;

  const cfg = content.balance.life.village_clans;
  const rng = ctx.rng.get(RngStream.Clans);
  const culture = content.index.culture.get(state.cultureId) ?? content.cultures[0];

  // 1) Sinh tử & kế vị Tộc trưởng
  for (const clan of clans) {
    const members = aliveClanMembers(ctx, clan.id);
    for (const c of members) {
      if (rng.chance(annualNpcDeathRisk(ctx, c))) {
        const cause = pickCause(ctx, c);
        c.alive = false;
        c.deathYear = state.clock.year;
        c.deathCauseId = cause?.id;
      }
    }

    // Kiểm tra kế vị tộc trưởng hoặc bổ sung nhánh xa nếu họ có nguy cơ tuyệt tự
    let living = aliveClanMembers(ctx, clan.id);
    if (living.length === 0) {
      const newcomer = createClanMember(ctx, {
        sex: 'm',
        age: rng.int(22, 34),
        familyName: clan.familyName,
        clanId: clan.id,
        householdId: clan.householdId,
      });
      const spouse = createClanMember(ctx, {
        sex: 'f',
        age: rng.int(19, 29),
        familyName: rng.weighted(culture.family_names, (f) => f.weight)?.name ?? clan.familyName,
        clanId: clan.id,
        householdId: clan.householdId,
      });
      newcomer.spouseId = spouse.id;
      spouse.spouseId = newcomer.id;
      newcomer.marriedYear = state.clock.year;
      spouse.marriedYear = state.clock.year;
      clan.headId = newcomer.id;
      living = [newcomer, spouse];
    } else {
      const currentHead = state.characters[clan.headId];
      if (!currentHead?.alive) {
        const sorted = [...living].sort((a, b) => {
          if (a.sex !== b.sex) return a.sex === 'm' ? -1 : 1;
          return a.birthYear - b.birthYear;
        });
        clan.headId = sorted[0].id;
      }
    }
  }

  // 2) Kết hôn & Sinh con giữa các họ (giữ dân số làng trong khoảng [min_village_population, max_village_population])
  const allClanLiving = Object.values(state.characters).filter((c) => c.alive && Boolean(c.clanId));
  const totalPop = allClanLiving.length;

  // Đảm bảo trong làng luôn có ít nhất vài nam thanh nữ tú độc thân để chợ hôn nhân không bị trống
  for (const sex of ['m', 'f'] as const) {
    const singles = allClanLiving.filter(
      (c) =>
        c.sex === sex &&
        !c.spouseId &&
        ageNow(ctx, c) >= content.balance.life.marriage.min_age &&
        ageNow(ctx, c) <= 32 &&
        c.id !== state.villageClans[c.clanId!]?.headId,
    );
    if (singles.length < 3 && clans.length > 0) {
      const targetClan = clans[rng.int(0, clans.length - 1)];
      const youth = createClanMember(ctx, {
        sex,
        age: rng.int(16, 22),
        familyName: targetClan.familyName,
        clanId: targetClan.id,
        householdId: targetClan.householdId,
      });
      youth.fatherId = targetClan.headId;
    }
  }

  for (const clan of clans) {
    const members = aliveClanMembers(ctx, clan.id);

    // Nếu họ quá neo người (< 3 người) và dân số làng chưa chạm trần, cho thanh niên cưới sớm hơn
    const marriageChance =
      members.length <= 2 || totalPop < cfg.min_village_population
        ? Math.min(0.65, cfg.ai_marriage_chance_year * 2)
        : cfg.ai_marriage_chance_year;

    const unmarriedAdults = members.filter((c) => {
      const age = ageNow(ctx, c);
      return age >= 17 && age <= 38 && !c.spouseId;
    });

    for (const single of unmarriedAdults) {
      if (!rng.chance(marriageChance)) continue;
      // Tìm người khác giới độc thân ở họ khác trong làng, hoặc đón dâu/rể từ thôn bên
      const partnerCandidate = Object.values(state.characters).find(
        (other) =>
          other.alive &&
          other.clanId &&
          other.clanId !== clan.id &&
          other.sex !== single.sex &&
          !other.spouseId &&
          ageNow(ctx, other) >= 16 &&
          ageNow(ctx, other) <= 36 &&
          other.id !== state.villageClans[other.clanId]?.headId,
      );

      if (partnerCandidate && single.sex === 'm') {
        // Đón dâu từ họ khác về họ này
        const oldH = partnerCandidate.householdId ? state.households[partnerCandidate.householdId] : undefined;
        if (oldH) oldH.memberIds = oldH.memberIds.filter((id) => id !== partnerCandidate.id);
        partnerCandidate.clanId = clan.id;
        partnerCandidate.householdId = clan.householdId;
        const newH = state.households[clan.householdId];
        if (newH && !newH.memberIds.includes(partnerCandidate.id)) newH.memberIds.push(partnerCandidate.id);
        single.spouseId = partnerCandidate.id;
        partnerCandidate.spouseId = single.id;
        single.marriedYear = state.clock.year;
        partnerCandidate.marriedYear = state.clock.year;
      } else if (
        single.sex === 'm' &&
        Object.values(state.characters).filter((c) => c.alive && Boolean(c.clanId)).length <
          cfg.max_village_population &&
        aliveClanMembers(ctx, clan.id).length < 6
      ) {
        const bride = createClanMember(ctx, {
          sex: 'f',
          age: clamp(ageNow(ctx, single) - rng.int(0, 4), 16, 30),
          familyName: rng.weighted(culture.family_names, (f) => f.weight)?.name ?? clan.familyName,
          clanId: clan.id,
          householdId: clan.householdId,
        });
        single.spouseId = bride.id;
        bride.spouseId = single.id;
        single.marriedYear = state.clock.year;
        bride.marriedYear = state.clock.year;
      }
    }

    // Sinh con cho các cặp vợ chồng trong họ nếu chưa vượt trần dân số làng
    const currentTotalPop = Object.values(state.characters).filter((c) => c.alive && Boolean(c.clanId)).length;
    if (currentTotalPop < cfg.max_village_population && aliveClanMembers(ctx, clan.id).length < 6) {
      const birthChance =
        currentTotalPop < cfg.min_village_population
          ? Math.min(0.65, cfg.ai_birth_chance_year * 1.8)
          : cfg.ai_birth_chance_year;

      const marriedMen = members.filter((c) => c.sex === 'm' && c.spouseId && state.characters[c.spouseId]?.alive);
      for (const husband of marriedMen) {
        if (
          Object.values(state.characters).filter((c) => c.alive && Boolean(c.clanId)).length >=
            cfg.max_village_population ||
          aliveClanMembers(ctx, clan.id).length >= 6
        ) {
          break;
        }
        const wife = state.characters[husband.spouseId!];
        if (!wife?.alive) continue;
        const wAge = ageNow(ctx, wife);
        if (wAge >= 17 && wAge <= 40 && rng.chance(birthChance)) {
          const childSex: Sex = rng.chance(content.balance.life.male_ratio) ? 'm' : 'f';
          const baby = createClanMember(ctx, {
            sex: childSex,
            age: 0,
            familyName: clan.familyName,
            clanId: clan.id,
            householdId: clan.householdId,
          });
          baby.birthYear = state.clock.year;
          baby.birthMonth = rng.int(1, 12);
          baby.fatherId = husband.id;
          baby.motherId = wife.id;
        }
      }
    }

    // 3) Thăng trầm gia thế & đổi nghề (Character AI T1)
    const h = state.households[clan.householdId];
    const head = state.characters[clan.headId];
    if (h && head?.alive && rng.chance(cfg.ai_mobility_chance_year)) {
      const diligent =
        head.traits.includes('tham_vong') ||
        head.traits.includes('kien_nhan') ||
        head.traits.includes('than_trong');
      const reckless = head.traits.includes('nong_nay') || head.traits.includes('tu_do');
      const goodHarvest = state.world.harvestQuality === 'duoc_mua';
      const badHarvest = state.world.harvestQuality === 'mat_mua';

      const growProb = clamp(0.5 + (diligent ? 0.18 : 0) - (reckless ? 0.15 : 0) + (goodHarvest ? 0.12 : 0) - (badHarvest ? 0.15 : 0), 0.15, 0.85);
      if (rng.chance(growProb)) {
        h.properties.ruong = Math.min(28, (h.properties.ruong ?? 1) + rng.int(1, 2));
        h.money = Math.min(200, h.money + rng.int(4, 14));
        clan.prestige = clamp(clan.prestige + rng.int(2, 6), 0, 100);
        if ((h.properties.ruong ?? 0) >= 10 && clan.careerId === 'nong_dan' && rng.chance(0.25)) {
          clan.careerId = rng.chance(0.5) ? 'thuong_nhan' : 'si_tu';
        }
      } else {
        h.properties.ruong = Math.max(1, (h.properties.ruong ?? 1) - 1);
        h.money = Math.max(1, h.money - rng.int(2, 8));
        clan.prestige = clamp(clan.prestige - rng.int(1, 4), 0, 100);
      }
      updateClanStatusRank(ctx, clan);
    }
  }

  syncClanFeuds(ctx);
}
