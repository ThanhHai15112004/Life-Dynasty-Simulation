// [1] Phân hệ Gia đình cơ bản: kết hôn, mang thai, sinh con trong hộ gia đình (GDD 03 §7)
import { clamp } from '@shared/curve';
import { fullName, type Character } from '../../entities/Character';
import { queueCutscene } from '../../events/cutscene';
import { writeTemplate } from '../../events/journal';
import { SystemLog } from '../../events/systemLogKeys';
import { createCharacter } from '../../world/generate';
import { RngStream, type SimContext } from '../context';
import { ageNow, aliveMembers, callOf, player, playerHousehold } from '../people';

/** Danh sách con ruột còn sống của một nhân vật. */
export function aliveChildrenOf(ctx: SimContext, parentId: string): Character[] {
  return Object.values(ctx.state.characters).filter(
    (c) => c.alive && (c.fatherId === parentId || c.motherId === parentId),
  );
}

/** Kết hôn cho người chơi: nếu truyền partner thì cưới người đó, nếu không thì sinh người phối ngẫu phù hợp từ làng. */
export function marryPlayer(ctx: SimContext, partner?: Character): Character | null {
  const me = player(ctx);
  if (!me.alive) return null;
  const existingSpouse = me.spouseId ? ctx.state.characters[me.spouseId] : undefined;
  if (existingSpouse?.alive) return existingSpouse;

  const rng = ctx.rng.get(RngStream.Life);
  const mCfg = ctx.content.balance.life.marriage;
  const h = playerHousehold(ctx);

  let spouse = partner;
  if (!spouse) {
    const targetSex = me.sex === 'm' ? 'f' : 'm';
    const meAge = ageNow(ctx, me);
    const spouseAge = Math.max(mCfg.min_age, meAge + rng.range(mCfg.spouse_age_offset));
    spouse = createCharacter(ctx, rng, {
      sex: targetSex,
      age: spouseAge,
      health: rng.range(mCfg.spouse_health),
    });
  }

  me.spouseId = spouse.id;
  spouse.spouseId = me.id;
  spouse.householdId = h.id;
  ctx.state.characters[spouse.id] = spouse;
  if (!h.memberIds.includes(spouse.id)) h.memberIds.push(spouse.id);

  writeTemplate(ctx, SystemLog.Married, {
    self: spouse.id,
    params: { call: fullName(spouse), age: ageNow(ctx, spouse) },
  });
  queueCutscene(ctx, ctx.content.balance.life.marriage.wedding_cutscene);
  return spouse;
}

/** Hàng tháng: kiểm tra thụ thai và sinh nở của cặp vợ chồng người chơi. */
export function monthlyFamily(ctx: SimContext): void {
  const me = player(ctx);
  if (!me.alive || !me.spouseId) return;
  const spouse = ctx.state.characters[me.spouseId];
  if (!spouse?.alive) return;

  const mother = me.sex === 'f' ? me : spouse;
  const father = me.sex === 'm' ? me : spouse;
  const mCfg = ctx.content.balance.life.marriage;
  const rng = ctx.rng.get(RngStream.Life);
  const h = playerHousehold(ctx);

  // 1) Nếu đang mang thai: đếm ngược đến ngày sinh
  if (mother.pregnancy) {
    mother.pregnancy.monthsLeft -= 1;
    if (mother.pregnancy.monthsLeft <= 0) {
      mother.pregnancy = null;
      const sex = rng.chance(ctx.content.balance.life.male_ratio) ? 'm' : 'f';
      const child = createCharacter(ctx, rng, {
        sex,
        age: 0,
        familyName: father.familyName,
        health: clamp(Math.round((mother.health + father.health) / 2), mCfg.newborn_health[0], mCfg.newborn_health[1]),
      });
      // Trẻ sơ sinh chính xác 0 tuổi, sinh vào tháng hiện tại
      child.birthYear = ctx.state.clock.year;
      child.birthMonth = ctx.state.clock.month;
      child.fatherId = father.id;
      child.motherId = mother.id;
      child.householdId = h.id;
      ctx.state.characters[child.id] = child;
      h.memberIds.push(child.id);

      const culture = ctx.content.index.culture.get(ctx.state.cultureId);
      const k = culture?.kin_calls;
      const genderTitle = sex === 'm' ? (k?.son ?? 'son') : (k?.daughter ?? 'daughter');
      writeTemplate(ctx, SystemLog.ChildBorn, {
        self: child.id,
        params: { call: callOf(ctx, child), title: genderTitle.replace(/\s*\{given\}/g, '') },
      });
      queueCutscene(ctx, mCfg.birth_cutscene);
    }
    return;
  }

  // 2) Nếu chưa mang thai: kiểm tra điều kiện thụ thai
  const motherAge = ageNow(ctx, mother);
  if (motherAge < mCfg.fertility_age_f[0] || motherAge > mCfg.fertility_age_f[1]) return;
  const childrenInHouse = aliveMembers(ctx, h).filter((c) => c.fatherId === me.id || c.motherId === me.id).length;
  if (childrenInHouse >= mCfg.max_children_in_household) return;

  // Tuổi mẹ càng cao hoặc sức khỏe yếu thì xác suất thụ thai giảm nhẹ
  const [hfLo, hfHi] = mCfg.conception_health_factor;
  const healthFactor = clamp(mother.health / mCfg.conception_health_ref, hfLo, hfHi);
  const chance = mCfg.base_conception_chance_month * healthFactor;
  if (rng.chance(chance)) {
    mother.pregnancy = { monthsLeft: mCfg.pregnancy_months, fatherId: father.id };
  }
}
