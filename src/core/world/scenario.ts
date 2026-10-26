// [1] Khởi tạo thế giới từ kịch bản thử nghiệm (Phase 1)
import type { Scenario } from '@content/schemas';
import { applyEffects } from '../events/effects';
import { fireDecision } from '../events/decision';
import { bindRoles, eligibleRoles } from '../events/selection';
import { createCharacter } from './generate';
import { type SimContext, RngStream } from '../systems/context';
import { splitPlayerHousehold, splitSiblingToNewHousehold } from '../systems/family';
import { player, playerHousehold } from '../systems/people';

export function applyScenario(
  ctx: SimContext,
  scenario: Scenario,
): void {
  const { state, content } = ctx;
  if (scenario.base.fateMode && content.index.fateMode.has(scenario.base.fateMode)) {
    state.fateMode = scenario.base.fateMode;
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
    }
    if (me.motherId && state.characters[me.motherId]) {
      const mother = state.characters[me.motherId];
      if (f.mother_age !== undefined) mother.birthYear = state.clock.year - f.mother_age;
      if (f.mother_health !== undefined) mother.health = f.mother_health;
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
        state.civilization.mourningMonthsLeft = content.civilizations[0]?.mourning_months ?? 27;
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
        child.householdId = h.id;
        state.characters[child.id] = child;
        h.memberIds.push(child.id);
      }
    }

    // Tách hộ ngay nếu kịch bản yêu cầu
    if (f.split_household) {
      splitPlayerHousehold(ctx, 0);
    }
  }

  // 3. World setup nếu có
  if (scenario.world_setup) {
    const w = scenario.world_setup;
    if (w.harvestQuality) state.world.harvestQuality = w.harvestQuality;
    if (w.foodPrice !== undefined) state.world.foodPrice = w.foodPrice;
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
