// [1] Khởi tạo thế giới từ kịch bản thử nghiệm (Phase 1)
import type { Scenario } from '@content/schemas';
import { applyEffects } from '../events/effects';
import { fireDecision } from '../events/decision';
import { eligibleRoles } from '../events/selection';
import { createCharacter } from './generate';
import { type SimContext, RngStream } from '../systems/context';
import { player, playerHousehold } from '../systems/people';

export function applyScenario(
  ctx: SimContext,
  scenario: Scenario,
): void {
  const { state, content } = ctx;

  // 1. Áp dụng hiệu ứng có sẵn trong scenario.setup
  if (scenario.setup && scenario.setup.length > 0) {
    applyEffects(ctx, scenario.setup);
  }

  // 2. Family setup nếu có
  if (scenario.family_setup) {
    const f = scenario.family_setup;
    const me = player(ctx);

    // Xử lý cha / mẹ
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
    }

    // Xử lý vợ/chồng (nếu có yêu cầu tuổi hoặc mang thai)
    if (me.spouseId) {
      const spouse = state.characters[me.spouseId];
      if (spouse) {
        if (f.spouse_age !== undefined) {
          spouse.birthYear = state.clock.year - f.spouse_age;
        }
        if (f.spouse_pregnant) {
          spouse.pregnancy = { monthsLeft: 6, fatherId: me.id };
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
      const roles = eligibleRoles(ctx, ev);
      if (roles) {
        fireDecision(ctx, ev, roles);
      }
    }
  }
}
