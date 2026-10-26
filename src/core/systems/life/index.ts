// [0] Phân hệ Đời sống: tuổi, giai đoạn đời, sức khỏe, tử vong; NPC làng sống thưa theo năm
import { SystemLog } from '../../events/systemLogKeys';
import { writeTemplate } from '../../events/journal';
import { spawnVillageNpc } from '../../world/generate';
import { RngStream, type SimContext } from '../context';
import { ageNow, callOf, lifeStageOf, player } from '../people';
import { monthlyHealth } from './health';
import { autoTreatment, monthlyDiseases, infectCharacter, cureCharacter } from './disease';
import { annualNpcDeathRisk, monthlyMortality, pickCause } from './mortality';

export { kill, monthlyDeathRisk, currentFateMode } from './mortality';
export { healthCap } from './health';
export { monthlyDiseases, infectCharacter, cureCharacter, treatDisease, treatmentBlock, type TreatmentBlock } from './disease';

function birthdays(ctx: SimContext): void {
  const me = player(ctx);
  if (me.birthMonth !== ctx.state.clock.month) return;
  const age = ageNow(ctx, me);
  writeTemplate(ctx, SystemLog.Birthday, { params: { age } });
  const stage = lifeStageOf(ctx, age);
  if (stage.min_age === age) writeTemplate(ctx, SystemLog.LifeStage, { params: { stage: stage.name } });
}

export function monthlyLife(ctx: SimContext): void {
  birthdays(ctx);
  monthlyDiseases(ctx);
  autoTreatment(ctx);
  monthlyHealth(ctx);
  monthlyMortality(ctx);
}

/** Cuối năm: NPC làng già đi, có thể qua đời, vai trò được người mới thay (R1: tin chỉ viết khi có thật). */
export function yearlyVillage(ctx: SimContext): void {
  const { state, content } = ctx;
  const origin = content.index.origin.get(state.originId);
  const rng = ctx.rng.get(RngStream.Npc);
  for (const [role, id] of Object.entries(state.village)) {
    const c = state.characters[id];
    if (!c?.alive || !rng.chance(annualNpcDeathRisk(ctx, c))) continue;
    const cause = pickCause(ctx, c);
    const age = ageNow(ctx, c);
    const call = callOf(ctx, c);
    c.alive = false;
    c.deathYear = state.clock.year;
    c.deathCauseId = cause?.id;
    writeTemplate(ctx, SystemLog.VillageDeath, { self: c.id, params: { call, age, cause: cause?.name ?? '' } });
    const spec = origin?.village_npcs.find((n) => n.role === role);
    if (spec?.refill) {
      const successor = spawnVillageNpc(ctx, spec);
      writeTemplate(ctx, SystemLog.VillageNewRole, {
        self: successor.id,
        params: { call: callOf(ctx, successor), title: content.index.culture.get(state.cultureId)?.village_roles[role]?.title ?? role },
      });
    }
  }
}
