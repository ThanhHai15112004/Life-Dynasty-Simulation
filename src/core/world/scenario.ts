// [1] Khởi tạo thế giới từ kịch bản thử nghiệm (Phase 1)
import type { Scenario } from '@content/schemas';
import { fullName } from '../entities/Character';
import { applyEffects } from '../events/effects';
import { fireDecision } from '../events/decision';
import { bindRoles, eligibleRoles } from '../events/selection';
import { createCharacter } from './generate';
import { changeClanRelation, generateVillageClans, syncClanFeuds } from '../systems/ai';
import { ensureFamilyCareers } from '../systems/career';
import { type SimContext, RngStream } from '../systems/context';
import {
  ensureVillageSuitors,
  getHeirCandidates,
  getMarriageableMembers,
  splitPlayerHousehold,
  splitSiblingToNewHousehold,
} from '../systems/family';
import { player, playerHousehold } from '../systems/people';

export function applyScenario(
  ctx: SimContext,
  scenario: Scenario,
): void {
  const { state, content } = ctx;
  if (scenario.base.fateMode && content.index.fateMode.has(scenario.base.fateMode)) {
    state.fateMode = scenario.base.fateMode;
  }
  if (scenario.base.playMode && content.index.playMode.has(scenario.base.playMode)) {
    state.playMode = scenario.base.playMode;
  }

  // 1. Áp dụng hiệu ứng có sẵn trong scenario.setup
  if (scenario.setup && scenario.setup.length > 0) {
    applyEffects(ctx, scenario.setup);
  }

  // 2. Family setup nếu có
  if (scenario.family_setup) {
    const f = scenario.family_setup;
    const me = player(ctx);

    // Xử lý cha / mẹ
    if (me.fatherId && state.characters[me.fatherId]) {
      const father = state.characters[me.fatherId];
      if (f.father_age !== undefined) father.birthYear = state.clock.year - f.father_age;
      if (f.father_health !== undefined) father.health = f.father_health;
      if (f.father_career) {
        father.careerId = f.father_career;
        father.careerRankIndex = 0;
        father.careerMonths = 36;
      }
    }
    if (me.motherId && state.characters[me.motherId]) {
      const mother = state.characters[me.motherId];
      if (f.mother_age !== undefined) mother.birthYear = state.clock.year - f.mother_age;
      if (f.mother_health !== undefined) mother.health = f.mother_health;
      if (f.mother_career) {
        mother.careerId = f.mother_career;
        mother.careerRankIndex = 0;
        mother.careerMonths = 36;
      }
    }
    if (f.parents) {
      if (me.fatherId && (f.parents === 'father_dead' || f.parents === 'both_dead')) {
        const father = state.characters[me.fatherId];
        if (father) {
          father.alive = false;
          father.deathCauseId = 'benh';
          father.deathYear = state.clock.year;
        }
      }
      if (me.motherId && (f.parents === 'mother_dead' || f.parents === 'both_dead')) {
        const mother = state.characters[me.motherId];
        if (mother) {
          mother.alive = false;
          mother.deathCauseId = 'benh';
          mother.deathYear = state.clock.year;
        }
      }
      if (f.parents !== 'both_alive') {
        const civ = content.index.civilization.get(state.civilization.id) ?? content.civilizations[0];
        state.civilization.mourningMonthsLeft = civ?.mourning_months ?? 27;
        state.director.mourningThisYear = true;
      }
    }

    // Xử lý vợ/chồng (nếu có yêu cầu tuổi, số năm cưới hoặc mang thai)
    if (f.years_married !== undefined) {
      me.marriedYear = state.clock.year - f.years_married;
    }
    if (me.spouseId) {
      const spouse = state.characters[me.spouseId];
      if (spouse) {
        if (f.spouse_age !== undefined) {
          spouse.birthYear = state.clock.year - f.spouse_age;
        }
        if (f.years_married !== undefined) {
          spouse.marriedYear = state.clock.year - f.years_married;
        }
        if (f.spouse_pregnant) {
          spouse.pregnancy = { monthsLeft: 6, fatherId: me.id };
        }
        if (f.spouse_career) {
          spouse.careerId = f.spouse_career;
          spouse.careerRankIndex = 0;
          spouse.careerMonths = 24;
        }
      }
    }

    // Xử lý danh sách anh chị em thiết lập cụ thể (thay cho anh chị em ngẫu nhiên lúc khởi tạo)
    if (f.siblings) {
      const h = playerHousehold(ctx);
      // Xóa anh chị em ngẫu nhiên cũ
      for (const id of [...h.memberIds]) {
        const c = state.characters[id];
        if (!c || c.id === me.id || c.id === me.fatherId || c.id === me.motherId || c.id === me.spouseId) continue;
        if (c.fatherId === me.id || c.motherId === me.id) continue;
        h.memberIds = h.memberIds.filter((mId) => mId !== id);
        delete state.characters[id];
      }
      const rng = ctx.rng.get(RngStream.Life);
      for (const sibSpec of f.siblings) {
        const sib = createCharacter(ctx, rng, {
          sex: sibSpec.sex,
          age: sibSpec.age,
          familyName: me.familyName,
          health: content.balance.life.health.npc_default,
        });
        sib.fatherId = me.fatherId;
        sib.motherId = me.motherId;
        sib.householdId = h.id;
        if (sibSpec.career) {
          sib.careerId = sibSpec.career;
          sib.careerRankIndex = 0;
          sib.careerMonths = 24;
        }
        state.characters[sib.id] = sib;
        h.memberIds.push(sib.id);
        if (sibSpec.split) {
          splitSiblingToNewHousehold(ctx, sib, true);
        }
      }
    }

    // Xử lý thêm con cái
    if (f.children && f.children.length > 0) {
      const h = playerHousehold(ctx);
      const rng = ctx.rng.get(RngStream.Life);
      for (const childSpec of f.children) {
        const child = createCharacter(ctx, rng, {
          sex: childSpec.sex,
          age: childSpec.age,
          familyName: me.familyName,
          health: content.balance.life.health.npc_default,
        });
        child.fatherId = me.sex === 'm' ? me.id : me.spouseId;
        child.motherId = me.sex === 'f' ? me.id : me.spouseId;
        child.generation = (state.dynasty?.currentGeneration ?? 1) + 1;
        if (childSpec.upbringing) child.upbringing = childSpec.upbringing;
        if (childSpec.skills) {
          for (const [sk, lvl] of Object.entries(childSpec.skills)) {
            child.skills[sk] = { level: lvl, xp: 0 };
          }
        }
        if (childSpec.traits && childSpec.traits.length > 0) {
          child.traits = [...childSpec.traits];
        }
        if (childSpec.career) {
          child.careerId = childSpec.career;
          child.careerRankIndex = 0;
          child.careerMonths = 24;
        }
        child.householdId = h.id;
        state.characters[child.id] = child;
        h.memberIds.push(child.id);
      }
    }

    // Xử lý thêm cháu họ (nhánh bên)
    if (f.nephews && f.nephews.length > 0) {
      const h = playerHousehold(ctx);
      const rng = ctx.rng.get(RngStream.Life);
      for (const nepSpec of f.nephews) {
        const nep = createCharacter(ctx, rng, {
          sex: nepSpec.sex,
          age: nepSpec.age,
          familyName: me.familyName,
          health: content.balance.life.health.npc_default,
        });
        nep.collateral = true;
        nep.generation = (state.dynasty?.currentGeneration ?? 1) + 1;
        nep.householdId = h.id;
        state.characters[nep.id] = nep;
        h.memberIds.push(nep.id);
      }
    }

    // Gán tính cách cụ thể cho người kế vị đầu tiên (nếu có)
    if (f.heir_traits && f.heir_traits.length > 0) {
      const firstCand = getHeirCandidates(ctx, me)[0];
      const heirChar = firstCand ? state.characters[firstCand.characterId] : undefined;
      if (heirChar) {
        heirChar.traits = [...f.heir_traits];
      }
    }

    // Tạo sẵn các đời tổ tiên (ví dụ: Đời thứ 3 có sẵn 2 đời tổ tiên)
    if (f.ancestors_count && f.ancestors_count > 0) {
      const rng = ctx.rng.get(RngStream.Life);
      const totalGen = f.ancestors_count + 1;
      state.dynasty.currentGeneration = totalGen;
      me.generation = totalGen;

      let prevId: string | undefined;
      for (let g = 1; g <= f.ancestors_count; g++) {
        const isDirectFather = g === f.ancestors_count && me.fatherId && state.characters[me.fatherId];
        const anc = isDirectFather
          ? state.characters[me.fatherId!]
          : createCharacter(ctx, rng, {
              sex: 'm',
              age: 64,
              familyName: me.familyName,
              health: 0,
            });
        anc.generation = g;
        anc.alive = false;
        anc.birthYear = state.clock.year - (f.ancestors_count - g + 1) * 28 - 36;
        anc.deathYear = anc.birthYear + 62;
        anc.deathCauseId = 'tuoi_gia';
        if (prevId) anc.fatherId = prevId;
        state.characters[anc.id] = anc;
        if (g === 1) state.dynasty.founderId = anc.id;
        prevId = anc.id;

        const causeName =
          content.balance.life.mortality.causes.find((c) => c.id === 'tuoi_gia')?.name ?? 'tuoi_gia';
        const defaultAxes = content.balance.life.summary_axes.map((ax, idx) => ({
          id: ax.id,
          score: 52 + ((g * 7 + idx * 5) % 25),
          bandKey: content.balance.display.summary_axis_bands[2]?.key ?? 'vua',
        }));

        state.dynasty.pastLives.push({
          generation: g,
          characterId: anc.id,
          name: fullName(anc),
          sex: anc.sex,
          birthYear: anc.birthYear,
          deathYear: anc.deathYear,
          deathAge: 62,
          causeId: 'tuoi_gia',
          causeName,
          careerId: g === 1 ? 'nong_dan' : state.householdCareer,
          statusRankId: content.civilizations[0]?.status_ranks[g > 1 ? 1 : 0]?.id ?? 'dan_thuong',
          examDegreeId: 'none',
          yearsPlayed: 46,
          decisions: 18 + g * 4,
          closing: {
            money: 12 * g,
            food: 24,
            debt: 0,
            farmland: 4 + g * 2,
            netWorth: 40 * g,
          },
          axes: defaultAxes,
          highlights: [
            {
              year: anc.birthYear + 24,
              text: `${fullName(anc)} · ${state.world.settlementName}`,
            },
          ],
          lifeMap: [
            { age: 20, year: anc.birthYear + 20, satisfaction: 55, marks: ['focus'] },
            { age: 40, year: anc.birthYear + 40, satisfaction: 64, marks: ['mua_gat'] },
            { age: 60, year: anc.birthYear + 60, satisfaction: 68, marks: ['moc_doi'] },
          ],
          log: [],
        });
      }
      if (prevId && me.fatherId !== prevId) {
        me.fatherId = prevId;
      }
      state.dynasty.prestige += f.ancestors_count * 18;
    }

    // Thêm di nguyện từ đời trước (nếu có)
    if (f.unfinished_wish) {
      const lastAnc = state.dynasty.pastLives[state.dynasty.pastLives.length - 1];
      state.dynasty.unfinishedWishes.push({
        id: f.unfinished_wish.id,
        fromGeneration: Math.max(1, state.dynasty.currentGeneration - 1),
        fromName: lastAnc?.name ?? me.familyName,
        ambitionId: f.unfinished_wish.ambitionId ?? null,
        milestoneId: f.unfinished_wish.milestoneId ?? null,
        text: f.unfinished_wish.text,
        fulfilled: false,
      });
    }

    // Thiết lập mối thù truyền đời với một dòng họ trong làng (Phase 4)
    if (f.clan_feud) {
      generateVillageClans(ctx);
      const clans = Object.values(state.villageClans);
      const targetClan =
        (f.clan_feud.familyName ? clans.find((c) => c.familyName === f.clan_feud!.familyName) : undefined) ??
        clans.find((c) => c.statusRankId === 'phu_ho' || c.statusRankId === 'si_phu') ??
        clans[0];
      if (targetClan) {
        if (f.clan_feud.familyName) targetClan.familyName = f.clan_feud.familyName;
        const grudge = f.clan_feud.grudge ?? 55;
        changeClanRelation(ctx, targetClan.id, -grudge, 'feud', f.clan_feud.reason);
        syncClanFeuds(ctx);
      }
    }

    // Sinh sẵn các mối mai mối từ các dòng họ khác nhau trong làng (Phase 4)
    if (f.matchmaking_suitors && f.matchmaking_suitors > 0) {
      generateVillageClans(ctx);
      const clans = Object.values(state.villageClans);
      const tiers = ['phu_ho', 'si_phu', 'thuong_dan'];
      for (let i = 0; i < Math.min(tiers.length, clans.length); i++) {
        clans[i].statusRankId = tiers[i];
        if (tiers[i] === 'si_phu') clans[i].careerId = 'si_tu';
        else if (tiers[i] === 'phu_ho') clans[i].careerId = 'thuong_nhan';
      }
      const target = getMarriageableMembers(ctx).find((m) => m.id !== state.playerId) ?? me;
      const desiredSex = target.sex === 'm' ? 'f' : 'm';
      ensureVillageSuitors(ctx, desiredSex, scenario.base.age ?? 18, f.matchmaking_suitors);
    }

    // Tách hộ ngay nếu kịch bản yêu cầu
    if (f.split_household) {
      splitPlayerHousehold(ctx, 0);
    }
  }

  // Đảm bảo mọi thành viên trưởng thành trong hộ có nghề riêng (Phase 5)
  ensureFamilyCareers(ctx);

  // 3. World setup nếu có
  if (scenario.world_setup) {
    const w = scenario.world_setup;
    if (w.harvestQuality) state.world.harvestQuality = w.harvestQuality;
    if (w.foodPrice !== undefined) state.world.foodPrice = w.foodPrice;
    if (w.tradeIndex !== undefined) state.world.tradeIndex = w.tradeIndex;
    if (w.weather) state.world.weather = w.weather;
  }

  // 4. Start event nếu có
  if (scenario.start_event) {
    const ev = content.index.event.get(scenario.start_event);
    if (ev) {
      const roles = eligibleRoles(ctx, ev) ?? bindRoles(ctx, ev.roles);
      if (roles) {
        fireDecision(ctx, ev, roles);
      }
    }
  }
}
