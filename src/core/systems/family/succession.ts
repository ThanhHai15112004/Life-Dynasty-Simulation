// [2] Truyền đời (Dynasty Succession — Phase 3): xét người kế vị theo khuôn văn minh, chuyển người chơi, giám hộ, nhận con nuôi & đón cháu họ
import type { SuccessionPriorityGroup } from '@content/schemas';
import { clamp } from '@shared/curve';
import { fullName, type Character, type Sex } from '../../entities/Character';
import type { PastLifeRecord, UnfinishedWish } from '../../entities/Dynasty';
import { addLedger, type Household } from '../../entities/Household';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { createCharacter } from '../../world/generate';
import { newId, RngStream, type SimContext } from '../context';
import { checkPromotion, ensureFamilyCareers, syncCareerHistory } from '../career';
import { householdNetWorth } from '../economy/helpers';
import { mergePurse } from '../economy/purse';
import { computeSummaryAxes } from '../happiness';
import { ensureFocus } from '../focus';
import { ageNow, callOf, player, playerHousehold, relationToPlayer, type Relation } from '../people';
import { computeStatusRank, currentCivilization } from '../status';

export interface HeirCandidate {
  characterId: string;
  name: string;
  call: string;
  relation: Relation;
  sex: Sex;
  age: number;
  priorityGroup: SuccessionPriorityGroup;
  isMainHeir: boolean;
  excludedReason: string | null;
  traits: { id: string; name: string; description: string }[];
  sharePercent: number;
  expectedSao: number;
  expectedMoney: number;
  expectedDebt: number;
  needsGuardian: boolean;
  guardianName: string | null;
}

function birthSortKey(c: Character): number {
  return c.birthYear * 12 + c.birthMonth;
}

function areSiblings(a: Character, b: Character): boolean {
  return Boolean(
    a.id !== b.id &&
      ((a.fatherId && a.fatherId === b.fatherId) || (a.motherId && a.motherId === b.motherId)),
  );
}

/** Đảm bảo nhân vật kế vị có đủ bộ kỹ năng và tính cách khi bước vào làm người chơi. */
function ensureHeirCapabilities(ctx: SimContext, heir: Character): void {
  const rng = ctx.rng.get(RngStream.Life);
  const age = ageNow(ctx, heir);
  const homeCareer = ctx.content.index.career.get(ctx.state.householdCareer);
  const focusDef = homeCareer?.default_focus ? ctx.content.index.focus.get(homeCareer.default_focus) : undefined;
  const trainedSkills = new Set(Object.keys(focusDef?.skill_xp ?? {}));

  for (const sk of ctx.content.skills) {
    const existing = heir.skills[sk.id]?.level ?? 0;
    let baseLvl = existing;
    if (age >= 16) {
      const yearsTrained = Math.max(0, age - 6);
      if (trainedSkills.has(sk.id)) {
        baseLvl = Math.max(existing, clamp(Math.floor(yearsTrained / 4), 1, 5));
      } else {
        baseLvl = Math.max(existing, age >= 25 ? rng.range([1, 3]) : rng.range([0, 2]));
      }
    }
    heir.skills[sk.id] = { level: baseLvl, xp: heir.skills[sk.id]?.xp ?? 0 };
  }
  if (!heir.traits || heir.traits.length === 0) {
    const picked: string[] = [];
    const pool = [...ctx.content.traits];
    while (picked.length < 2 && pool.length > 0) {
      const choice = rng.pick(pool);
      const idx = pool.findIndex((t) => t.id === choice.id);
      if (idx >= 0) pool.splice(idx, 1);
      if (picked.includes(choice.id) || picked.includes(choice.opposite)) continue;
      picked.push(choice.id);
    }
    heir.traits = picked;
  }
}

/** Tìm người giám hộ dự kiến nếu người kế vị còn nhỏ. */
function findPotentialGuardian(ctx: SimContext, heir: Character): Character | null {
  const { state, content } = ctx;
  const adultAge = content.balance.life.adult_age;
  if (heir.motherId) {
    const mother = state.characters[heir.motherId];
    if (mother?.alive && ageNow(ctx, mother) >= adultAge) return mother;
  }
  if (heir.fatherId && heir.fatherId !== state.playerId) {
    const father = state.characters[heir.fatherId];
    if (father?.alive && ageNow(ctx, father) >= adultAge) return father;
  }
  const h = playerHousehold(ctx);
  const adultInHouse = h.memberIds
    .map((id) => state.characters[id])
    .find((c) => c?.alive && c.id !== state.playerId && c.id !== heir.id && ageNow(ctx, c) >= adultAge);
  if (adultInHouse) return adultInHouse;

  const adultRelative = Object.values(state.characters).find(
    (c) =>
      c.alive &&
      c.id !== state.playerId &&
      c.id !== heir.id &&
      !c.villageRole &&
      !c.clanId &&
      ageNow(ctx, c) >= adultAge &&
      c.familyName === heir.familyName,
  );
  return adultRelative ?? null;
}

/** Lấy danh sách ứng viên kế vị theo thứ tự ưu tiên của Khuôn văn minh. */
export function getHeirCandidates(ctx: SimContext, deceased?: Character): HeirCandidate[] {
  const { state, content } = ctx;
  const me = deceased ?? player(ctx);
  const civ = currentCivilization(ctx);
  const law = civ.succession;
  const inhLaw = civ.inheritance;
  const adultAge = content.balance.life.adult_age;

  const allLiving = Object.values(state.characters).filter(
    (c) => c.alive && c.id !== me.id && !c.villageRole && !c.clanId,
  );

  // 1) Phân nhóm ứng viên
  const directChildren = allLiving
    .filter((c) => c.fatherId === me.id || c.motherId === me.id)
    .sort((a, b) => birthSortKey(a) - birthSortKey(b));

  const bioSons = directChildren.filter((c) => !c.adopted && c.sex === 'm');
  const eldestSon = bioSons[0];
  const otherSons = bioSons.slice(1);
  const adoptedChildren = directChildren.filter((c) => Boolean(c.adopted));
  const daughters = directChildren.filter((c) => !c.adopted && c.sex === 'f');

  const allChildrenEver = Object.values(state.characters).filter(
    (c) => c.fatherId === me.id || c.motherId === me.id,
  );
  const childIds = new Set(allChildrenEver.map((c) => c.id));

  const grandchildren = allLiving
    .filter(
      (c) =>
        !directChildren.includes(c) &&
        ((c.fatherId && childIds.has(c.fatherId)) || (c.motherId && childIds.has(c.motherId))),
    )
    .sort((a, b) => birthSortKey(a) - birthSortKey(b));

  const allSiblingsEver = Object.values(state.characters).filter((c) => areSiblings(c, me));
  const siblingIds = new Set(allSiblingsEver.map((c) => c.id));
  const clanName = state.dynasty?.familyName || me.familyName;

  const siblingsOrNephews = allLiving
    .filter(
      (c) =>
        !directChildren.includes(c) &&
        !grandchildren.includes(c) &&
        c.id !== me.fatherId &&
        c.id !== me.motherId &&
        c.id !== me.spouseId &&
        (siblingIds.has(c.id) ||
          Boolean(c.collateral) ||
          (c.fatherId && siblingIds.has(c.fatherId)) ||
          (c.motherId && siblingIds.has(c.motherId)) ||
          c.familyName === clanName),
    )
    .sort((a, b) => birthSortKey(a) - birthSortKey(b));

  const groupMap: Record<SuccessionPriorityGroup, Character[]> = {
    eldest_son: eldestSon ? [eldestSon] : [],
    other_son: otherSons,
    adopted_child: adoptedChildren,
    daughter: daughters,
    grandchild: grandchildren,
    sibling_or_nephew: siblingsOrNephews,
  };

  const ordered: { char: Character; group: SuccessionPriorityGroup }[] = [];
  for (const grp of law.priority_order) {
    for (const c of groupMap[grp] ?? []) {
      if (!ordered.some((x) => x.char.id === c.id)) {
        ordered.push({ char: c, group: grp });
      }
    }
  }

  if (ordered.length === 0) return [];

  const mainH = playerHousehold(ctx);
  const totalSao = mainH.properties.ruong ?? 0;
  const totalMoney = Math.max(0, mainH.money + state.purse.money);
  const totalDebt = mainH.debt;
  const worship = inhLaw.ancestor_worship_share;
  const directCount = directChildren.length;
  const unsplitSonsCount = bioSons.filter((c) => c.householdId === mainH.id).length;

  let mainAssigned = false;

  return ordered.map(({ char, group }) => {
    const isMainHeir = !mainAssigned;
    if (isMainHeir) mainAssigned = true;

    let ratio = 1;
    if (isMainHeir) {
      if (unsplitSonsCount > 1 && directChildren.some((d) => d.id === char.id)) {
        ratio = worship + (1 - worship) / unsplitSonsCount;
      } else {
        ratio = 1;
      }
    } else if (directChildren.some((d) => d.id === char.id)) {
      ratio = (1 - worship) / Math.max(2, directCount);
    } else {
      ratio = clamp((1 - worship) / Math.max(2, ordered.length), 0.1, 0.35);
    }

    const expectedSao = Math.round(totalSao * ratio);
    const expectedMoney = isMainHeir
      ? Math.round(totalMoney * ratio)
      : Math.max(law.non_main_heir_start_money, Math.round(totalMoney * ratio));
    const expectedDebt = inhLaw.debt_inheritance ? Math.round(totalDebt * ratio) : 0;

    const age = ageNow(ctx, char);
    const needsGuardian = age < adultAge;
    const guardian = needsGuardian ? findPotentialGuardian(ctx, char) : null;

    const traits = (char.traits ?? []).map((id) => {
      const def = content.index.trait.get(id);
      return { id, name: def?.name ?? id, description: def?.description ?? '' };
    });

    return {
      characterId: char.id,
      name: fullName(char),
      call: callOf(ctx, char),
      relation: relationToPlayer(ctx, char),
      sex: char.sex,
      age,
      priorityGroup: group,
      isMainHeir,
      excludedReason: null,
      traits,
      sharePercent: Math.round(ratio * 100),
      expectedSao,
      expectedMoney,
      expectedDebt,
      needsGuardian,
      guardianName: guardian ? callOf(ctx, guardian) : null,
    };
  });
}

/** Lưu trữ thông tin cuộc đời vừa khép lại vào Sử sách dòng họ và tạo Di nguyện nếu còn việc dang dở. */
export function archiveCurrentLife(ctx: SimContext, causeId?: string): PastLifeRecord {
  const { state, content } = ctx;
  const me = player(ctx);
  const existing = state.dynasty.pastLives.find(
    (p) => p.characterId === me.id && p.generation === state.dynasty.currentGeneration,
  );
  if (existing) return existing;

  const h = playerHousehold(ctx);
  const finalCauseId = causeId ?? me.deathCauseId ?? state.gameOver?.causeId ?? 'tuoi_gia';
  const causeName = content.balance.life.mortality.causes.find((c) => c.id === finalCauseId)?.name ?? finalCauseId;
  const axes = computeSummaryAxes(ctx);

  const highlights: { year: number; text: string }[] = [];
  for (const y of state.log) {
    for (const e of y.entries) {
      if (e.highlight || e.importance >= content.balance.display.highlight_importance) {
        highlights.push({ year: y.year, text: e.text });
      }
    }
  }
  const maxPastLogs = content.balance.display.performance.max_past_life_logs;
  const hiImportance = content.balance.display.highlight_importance;
  const trimmedHighlights = highlights.slice(-maxPastLogs);
  const trimmedLog = state.log
    .map((y) => ({
      ...y,
      entries: y.entries.filter((e) => e.highlight && e.importance >= hiImportance),
    }))
    .filter((y) => y.entries.length > 0)
    .slice(-Math.min(5, maxPastLogs));

  const netWorth = Math.round(householdNetWorth(ctx));
  const record: PastLifeRecord = {
    generation: state.dynasty.currentGeneration,
    characterId: me.id,
    name: fullName(me),
    sex: me.sex,
    birthYear: me.birthYear,
    deathYear: me.deathYear ?? state.clock.year,
    deathAge: state.gameOver?.age ?? ageNow(ctx, me),
    causeId: finalCauseId,
    causeName,
    careerId: state.career.id || state.householdCareer,
    careerHistory: [...(state.career.history ?? [])],
    statusRankId: state.civilization.statusRank,
    examDegreeId: state.civilization.examDegree,
    yearsPlayed: Math.max(0, state.clock.year - (state.generationStartYear ?? me.birthYear)),
    decisions: state.stats.decisions,
    closing: {
      money: Math.round(h.money + state.purse.money),
      food: Math.round(h.food),
      debt: Math.round(h.debt),
      farmland: h.properties.ruong ?? 0,
      netWorth,
    },
    axes,
    highlights: trimmedHighlights,
    lifeMap: [...state.lifeMap],
    log: trimmedLog,
  };

  state.dynasty.pastLives.push(record);

  // Cộng danh vọng dòng họ theo thành tựu đời vừa qua
  const avgAxis = axes.reduce((s, a) => s + a.score, 0) / Math.max(1, axes.length);
  const prestigeGain = Math.max(0, Math.round((avgAxis - 40) * 0.4));
  state.dynasty.prestige += prestigeGain;

  // Chuyển Tham vọng chưa trọn hoặc lời hứa dang dở thành Di nguyện cho đời sau
  const hasWishFromGen = state.dynasty.unfinishedWishes.some(
    (w) => w.fromGeneration === state.dynasty.currentGeneration,
  );
  if (!hasWishFromGen) {
    if (state.ambition.id) {
      const amb = content.index.ambition.get(state.ambition.id);
      const nextMs = amb?.milestones.find((m) => !state.ambition.achievedMilestones.includes(m.id));
      if (amb && nextMs) {
        const wish: UnfinishedWish = {
          id: `wish_gen_${state.dynasty.currentGeneration}_${amb.id}`,
          fromGeneration: state.dynasty.currentGeneration,
          fromName: fullName(me),
          ambitionId: amb.id,
          milestoneId: nextMs.id,
          text: `${amb.name}: ${nextMs.name}`,
          fulfilled: false,
        };
        state.dynasty.unfinishedWishes.push(wish);
      }
    } else {
      const openFlag = Object.entries(state.flags).find(([, f]) => Boolean(f.label));
      if (openFlag && openFlag[1].label) {
        state.dynasty.unfinishedWishes.push({
          id: `wish_flag_${state.dynasty.currentGeneration}_${openFlag[0]}`,
          fromGeneration: state.dynasty.currentGeneration,
          fromName: fullName(me),
          ambitionId: null,
          milestoneId: null,
          text: openFlag[1].label,
          fulfilled: false,
        });
      }
    }
  }

  return record;
}

/** Chuyển quyền điều khiển sang người kế vị đã chọn và bắt đầu đời mới. */
export function transitionToHeir(ctx: SimContext, heirId: string): boolean {
  const { state, content } = ctx;
  const me = player(ctx);
  const candidates = getHeirCandidates(ctx, me);
  const chosen = candidates.find((c) => c.characterId === heirId);
  if (!chosen) return false;

  const heir = state.characters[heirId];
  if (!heir?.alive) return false;

  // 1) Lưu tổng kết đời trước vào Sử sách dòng họ
  archiveCurrentLife(ctx, me.deathCauseId ?? state.gameOver?.causeId ?? 'tuoi_gia');

  // 2) Đảm bảo người kế có kỹ năng & tính cách hợp lệ
  ensureHeirCapabilities(ctx, heir);

  // 3) Phân chia gia sản và hộ gia đình theo vị thế người kế vị (nhận phần chính hay phần phụ nghèo hơn)
  mergePurse(ctx);
  const mainH = playerHousehold(ctx);
  const civ = currentCivilization(ctx);
  const law = civ.succession;
  const ruongPrice = content.index.property.get('ruong')?.value ?? 0;

  if (chosen.isMainHeir) {
    // Người kế chính giữ hộ tổ tiên, chia phần phụ cho các anh chị em trưởng thành khác
    if (!mainH.memberIds.includes(heir.id)) {
      if (heir.householdId && state.households[heir.householdId]) {
        const oldH = state.households[heir.householdId];
        oldH.memberIds = oldH.memberIds.filter((id) => id !== heir.id);
      }
      mainH.memberIds.push(heir.id);
      heir.householdId = mainH.id;
    }
    if (heir.spouseId && state.characters[heir.spouseId]?.alive && !mainH.memberIds.includes(heir.spouseId)) {
      mainH.memberIds.push(heir.spouseId);
      state.characters[heir.spouseId].householdId = mainH.id;
    }

    const otherDirect = candidates.filter(
      (c) =>
        c.characterId !== heir.id &&
        (c.priorityGroup === 'eldest_son' ||
          c.priorityGroup === 'other_son' ||
          c.priorityGroup === 'adopted_child' ||
          c.priorityGroup === 'daughter'),
    );
    let distributedSao = 0;
    let distributedMoney = 0;
    if (otherDirect.length > 0) {
      const remSao = Math.max(0, (mainH.properties.ruong ?? 0) - chosen.expectedSao);
      const remMoney = Math.max(0, mainH.money - chosen.expectedMoney);
      const eachSao = Math.floor(remSao / otherDirect.length);
      const eachMoney = Math.floor(remMoney / otherDirect.length);

      for (const sibCand of otherDirect) {
        const sib = state.characters[sibCand.characterId];
        if (!sib?.alive) continue;
        if (sib.householdId === mainH.id && ageNow(ctx, sib) >= content.balance.life.marriage.min_age) {
          const movingIds = [sib.id, ...(sib.spouseId && state.characters[sib.spouseId]?.alive ? [sib.spouseId] : [])];
          const sibH: Household = {
            id: newId(ctx, 'h'),
            memberIds: movingIds,
            money: Math.max(content.balance.life.household_split.min_gift_money, eachMoney),
            food: content.balance.life.household_split.min_gift_food,
            debt: 0,
            livingStandard: mainH.livingStandard,
            properties: {
              nha_tranh: 1,
              ...(eachSao > 0 ? { ruong: eachSao } : {}),
            },
            ledger: [],
            parentHouseholdId: mainH.id,
            splitFromYear: state.clock.year,
          };
          mainH.memberIds = mainH.memberIds.filter((id) => !movingIds.includes(id));
          for (const id of movingIds) {
            if (state.characters[id]) state.characters[id].householdId = sibH.id;
          }
          state.households[sibH.id] = sibH;
          distributedSao += eachSao;
          distributedMoney += eachMoney;
        }
      }
    }

    mainH.properties.ruong = Math.max(0, (mainH.properties.ruong ?? 0) - distributedSao);
    mainH.money = Math.max(0, mainH.money - distributedMoney);
    mainH.debt = chosen.expectedDebt;
    mainH.ledger = [];
    const netInherited = mainH.money + (mainH.properties.ruong ?? 0) * ruongPrice - mainH.debt;
    addLedger(mainH, Ledger.Inheritance, netInherited !== 0 ? netInherited : 1, mainH.food);
    state.householdId = mainH.id;
  } else {
    // Người chơi chọn người kế KHÔNG nhận phần chính: chơi tiếp ở hộ nhánh nghèo hơn (GDD 01 §9)
    const startFood = Math.max(
      law.non_main_heir_start_food,
      Math.round(mainH.food * (chosen.sharePercent / 100)),
    );
    mainH.properties.ruong = Math.max(0, (mainH.properties.ruong ?? 0) - chosen.expectedSao);
    mainH.money = Math.max(0, mainH.money - chosen.expectedMoney);
    mainH.food = Math.max(0, mainH.food - startFood);
    mainH.debt = Math.max(0, mainH.debt - chosen.expectedDebt);

    const movingIds = [heir.id];
    if (heir.spouseId && state.characters[heir.spouseId]?.alive) movingIds.push(heir.spouseId);
    for (const c of Object.values(state.characters)) {
      if (c.alive && (c.fatherId === heir.id || c.motherId === heir.id) && !movingIds.includes(c.id)) {
        movingIds.push(c.id);
      }
    }

    mainH.memberIds = mainH.memberIds.filter((id) => !movingIds.includes(id));
    const branchH: Household = {
      id: newId(ctx, 'h'),
      memberIds: movingIds,
      money: chosen.expectedMoney,
      food: startFood,
      debt: chosen.expectedDebt,
      livingStandard: content.balance.living_standards.levels[1]?.id ?? mainH.livingStandard,
      properties: {
        nha_tranh: 1,
        ...(chosen.expectedSao > 0 ? { ruong: chosen.expectedSao } : {}),
      },
      ledger: [],
      parentHouseholdId: mainH.id,
      splitFromYear: state.clock.year,
    };
    for (const id of movingIds) {
      if (state.characters[id]) state.characters[id].householdId = branchH.id;
    }
    state.households[branchH.id] = branchH;
    state.householdId = branchH.id;
    const netInherited = chosen.expectedMoney + chosen.expectedSao * ruongPrice - chosen.expectedDebt;
    addLedger(branchH, Ledger.Inheritance, netInherited !== 0 ? netInherited : 1, startFood);
  }

  // 4) Chuyển playerId & thiết lập lại trạng thái cá nhân của đời mới
  const prevName = fullName(me);
  state.playerId = heir.id;
  state.dynasty.currentGeneration += 1;
  heir.generation = state.dynasty.currentGeneration;
  state.generationStartYear = state.clock.year;

  state.purse = { money: 0, ledger: [], history: [], openMoney: 0 };
  state.focus = { primary: '' };
  state.ambition = { id: null, achievedMilestones: [] };
  state.lifeMap = [];
  state.log = [];
  state.eventHistory = {};
  state.ambientHistory = {};
  state.scheduled = [];
  state.pending = null;
  state.minor = null;
  state.lastResolution = null;
  state.stats = { decisions: 0, minorDecisions: 0, eventsSeen: {} };
  state.gameOver = null;

  // 5) Kế thừa danh tiếng dòng họ, danh vọng sĩ phu (không kế thừa học vị và kỹ năng)
  state.reputation.dan_lang = Math.round((state.reputation.dan_lang ?? 0) * law.reputation_carry_factor);
  state.civilization.scholarlyPrestige = Math.round(
    state.civilization.scholarlyPrestige * law.scholarly_prestige_carry_factor,
  );
  state.civilization.examDegree = 'none';
  state.civilization.mourningMonthsLeft = civ.mourning_months;
  state.director.mourningThisYear = true;

  // Nếu có di nguyện từ đời trước chưa có tham vọng gắn vào thì gợi ý tham vọng tương ứng
  const activeWish = state.dynasty.unfinishedWishes.find((w) => !w.fulfilled && w.ambitionId);
  if (activeWish?.ambitionId && ageNow(ctx, heir) >= content.balance.life.adult_age) {
    state.ambition = { id: activeWish.ambitionId, achievedMilestones: [] };
  }

  // 6) Xử lý người kế còn nhỏ (giám hộ) hoặc đã trưởng thành (làm chủ hộ ngay)
  const heirAge = ageNow(ctx, heir);
  const currentH = playerHousehold(ctx);

  if (heirAge < content.balance.life.adult_age) {
    let guardian = findPotentialGuardian(ctx, heir);
    if (!guardian) {
      const rng = ctx.rng.get(RngStream.Life);
      guardian = createCharacter(ctx, rng, {
        sex: 'm',
        age: rng.range([28, 42]),
        familyName: heir.familyName,
        health: rng.range([70, 90]),
      });
      state.characters[guardian.id] = guardian;
    }
    if (!currentH.memberIds.includes(guardian.id)) {
      currentH.memberIds.push(guardian.id);
      guardian.householdId = currentH.id;
    }
    state.dynasty.guardianId = guardian.id;
    state.wasHead = false;
    state.autoManage = { livingStandard: true, repayDebt: true, sellSurplus: true, invest: true };
    state.career = {
      id: '',
      since: state.clock.monthIndex,
      rankIndex: 0,
      merit: 0,
      wanted: 0,
      actionCooldowns: {},
      sectorMonths: {},
      sideJobId: null,
      history: [],
    };
    writeTemplate(ctx, SystemLog.SuccessionGuardian, {
      self: guardian.id,
      params: {
        prev: prevName,
        call: callOf(ctx, guardian),
        generation: state.dynasty.currentGeneration,
      },
    });
  } else {
    state.dynasty.guardianId = null;
    state.wasHead = true;
    const careerId =
      heir.careerId && content.index.career.has(heir.careerId)
        ? heir.careerId
        : state.householdCareer || 'nong_dan';
    const adultYears = Math.max(0, heirAge - content.balance.life.adult_age);
    const initialMerit =
      heir.careerMerit ?? (chosen.isMainHeir ? Math.min(45, adultYears * 3) : Math.min(20, adultYears * 2));
    const initialMonths = heir.careerMonths ?? adultYears * 12;
    const cDef = content.index.career.get(careerId);
    state.career = {
      id: careerId,
      since: state.clock.monthIndex - initialMonths,
      rankIndex: heir.careerRankIndex ?? 0,
      merit: initialMerit,
      wanted: 0,
      actionCooldowns: {},
      sectorMonths: cDef?.sector && initialMonths > 0 ? { [cDef.sector]: initialMonths } : {},
      sideJobId: null,
      history: [],
    };
    if (cDef?.kind === 'nghe') {
      state.householdCareer = careerId;
    }
    syncCareerHistory(ctx);
    while (checkPromotion(ctx)) {
      /* thăng tới bậc mà tài sản/danh tiếng và kinh nghiệm đã đủ */
    }
    syncCareerHistory(ctx);
    writeTemplate(ctx, SystemLog.SuccessionStart, {
      params: {
        prev: prevName,
        generation: state.dynasty.currentGeneration,
        sao: currentH.properties.ruong ?? 0,
        money: Math.round(currentH.money),
      },
    });
    if (content.index.event.has('gd_ngay_dau_lam_chu_sau_tang')) {
      state.scheduled.push({
        eventId: 'gd_ngay_dau_lam_chu_sau_tang',
        dueMonthIndex: state.clock.monthIndex + 1,
        roles: {},
      });
    }
  }

  ensureFocus(ctx);
  ensureFamilyCareers(ctx);
  state.civilization.statusRank = computeStatusRank(ctx).id;
  const nw = householdNetWorth(ctx);
  state.yearOpenNetWorth = nw;
  state.happiness.baselineWealth = nw;

  return true;
}

/** Kiểm tra điều kiện nhận con nuôi nối dõi. */
export function canAdoptChild(ctx: SimContext): { ok: boolean; cost: number } {
  const me = player(ctx);
  const law = currentCivilization(ctx).succession.adoption;
  if (!me.alive || ageNow(ctx, me) < law.min_parent_age) {
    return { ok: false, cost: law.cost_money };
  }
  const hasChild = Object.values(ctx.state.characters).some(
    (c) => c.alive && (c.fatherId === me.id || c.motherId === me.id),
  );
  if (hasChild) return { ok: false, cost: law.cost_money };
  const h = playerHousehold(ctx);
  const availableMoney = h.money + ctx.state.purse.money;
  return { ok: availableMoney >= law.cost_money, cost: law.cost_money };
}

/** Nhận con nuôi về hộ để nối dõi tông đường. */
export function adoptChild(ctx: SimContext, preferredSex?: Sex, deductCost = true): Character | null {
  const { state } = ctx;
  const me = player(ctx);
  if (!me.alive) return null;
  const law = currentCivilization(ctx).succession.adoption;
  const h = playerHousehold(ctx);

  if (deductCost) {
    if (h.money + state.purse.money < law.cost_money) return null;
    if (h.money >= law.cost_money) {
      h.money -= law.cost_money;
    } else {
      const rem = law.cost_money - h.money;
      h.money = 0;
      state.purse.money = Math.max(0, state.purse.money - rem);
    }
    addLedger(h, Ledger.Event, -law.cost_money, 0);
  }

  const rng = ctx.rng.get(RngStream.Life);
  const sex: Sex = preferredSex ?? 'm';
  const age = rng.range(law.child_age_range);
  const child = createCharacter(ctx, rng, {
    sex,
    age,
    familyName: me.familyName,
    health: rng.range(law.child_health_range),
  });
  child.adopted = true;
  child.generation = (state.dynasty?.currentGeneration ?? 1) + 1;
  if (me.sex === 'm') {
    child.fatherId = me.id;
    if (me.spouseId && state.characters[me.spouseId]?.alive) child.motherId = me.spouseId;
  } else {
    child.motherId = me.id;
    if (me.spouseId && state.characters[me.spouseId]?.alive) child.fatherId = me.spouseId;
  }
  child.householdId = h.id;
  state.characters[child.id] = child;
  if (!h.memberIds.includes(child.id)) h.memberIds.push(child.id);

  writeTemplate(ctx, SystemLog.ChildAdopted, {
    self: child.id,
    params: { call: callOf(ctx, child), age: ageNow(ctx, child) },
  });
  return child;
}

/** Kiểm tra điều kiện đón cháu họ xa về lập tự. */
export function canAdoptRelative(ctx: SimContext): { ok: boolean; cost: number } {
  const me = player(ctx);
  const law = currentCivilization(ctx).succession;
  const cost = law.distant_relative.cost_money;
  if (!me.alive || ageNow(ctx, me) < ctx.content.balance.life.adult_age) {
    return { ok: false, cost };
  }
  const hasHeir = getHeirCandidates(ctx, me).length > 0;
  if (hasHeir) return { ok: false, cost };
  return { ok: true, cost };
}

/** Đón cháu họ từ chi xa về hộ để tránh tuyệt tự. */
export function adoptDistantRelative(ctx: SimContext, preferredSex?: Sex, deductCost = true): Character | null {
  const { state } = ctx;
  const me = player(ctx);
  if (!me.alive) return null;
  const law = currentCivilization(ctx).succession.distant_relative;
  const h = playerHousehold(ctx);

  if (deductCost) {
    const actualCost = Math.min(h.money + state.purse.money, law.cost_money);
    if (actualCost > 0) {
      if (h.money >= actualCost) {
        h.money -= actualCost;
      } else {
        const rem = actualCost - h.money;
        h.money = 0;
        state.purse.money = Math.max(0, state.purse.money - rem);
      }
      addLedger(h, Ledger.Event, -actualCost, 0);
    }
  }

  const rng = ctx.rng.get(RngStream.Life);
  const sex: Sex = preferredSex ?? 'm';
  const age = rng.range(law.age_range);
  const rel = createCharacter(ctx, rng, {
    sex,
    age,
    familyName: me.familyName,
    health: rng.range(law.health_range),
  });
  rel.collateral = true;
  rel.generation = (state.dynasty?.currentGeneration ?? 1) + 1;
  rel.householdId = h.id;
  state.characters[rel.id] = rel;
  if (!h.memberIds.includes(rel.id)) h.memberIds.push(rel.id);

  writeTemplate(ctx, SystemLog.RelativeAdopted, {
    self: rel.id,
    params: { call: callOf(ctx, rel), age: ageNow(ctx, rel) },
  });
  return rel;
}
