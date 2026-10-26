// [1] Phân hệ Gia đình cơ bản: kết hôn, mang thai, sinh con trong hộ gia đình (GDD 03 §7)
import { clamp } from '@shared/curve';
import { fullName, type Character } from '../../entities/Character';
import { queueCutscene } from '../../events/cutscene';
import { writeTemplate } from '../../events/journal';
import { SystemLog } from '../../events/systemLogKeys';
import { createCharacter } from '../../world/generate';
import { RngStream, type SimContext } from '../context';
import { ageNow, aliveMembers, callOf, player, playerHousehold } from '../people';
import { monthlyChildUpbringing } from './upbringing';

export * from './split';
export * from './inheritance';
export * from './succession';
export * from './upbringing';
export * from './marriageMarket';

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
    const rawAge = Math.max(mCfg.min_age, meAge + rng.range(mCfg.spouse_age_offset));
    const spouseAge = targetSex === 'f' ? Math.min(rawAge, 30) : rawAge;
    spouse = createCharacter(ctx, rng, {
      sex: targetSex,
      age: spouseAge,
      health: rng.range(mCfg.spouse_health),
    });
  }

  me.spouseId = spouse.id;
  spouse.spouseId = me.id;
  me.marriedYear = ctx.state.clock.year;
  spouse.marriedYear = ctx.state.clock.year;
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
  if (!me.alive) return;
  monthlyChildUpbringing(ctx);
  const mCfg = ctx.content.balance.life.marriage;
  const rng = ctx.rng.get(RngStream.Life);
  const h = playerHousehold(ctx);

  // Cho phép nam giới trưởng thành trong dòng họ (con trai, anh em trai đã tách hộ) lập gia đình & sinh con nối dõi
  const clanName = ctx.state.dynasty?.familyName || me.familyName;
  const clanMen = Object.values(ctx.state.characters).filter(
    (c) =>
      c.alive &&
      !c.villageRole &&
      c.sex === 'm' &&
      c.id !== me.id &&
      c.id !== me.fatherId &&
      c.familyName === clanName &&
      ageNow(ctx, c) >= 22,
  );
  for (const man of clanMen) {
    const manH = man.householdId ? ctx.state.households[man.householdId] : h;
    if (!manH) continue;
    let wife = man.spouseId ? ctx.state.characters[man.spouseId] : undefined;
    if (!wife?.alive && rng.chance(0.05)) {
      wife = createCharacter(ctx, rng, {
        sex: 'f',
        age: clamp(ageNow(ctx, man) - 2, mCfg.min_age, 28),
        health: rng.range(mCfg.spouse_health),
      });
      man.spouseId = wife.id;
      wife.spouseId = man.id;
      man.marriedYear = ctx.state.clock.year;
      wife.marriedYear = ctx.state.clock.year;
      wife.generation = man.generation;
      wife.householdId = manH.id;
      ctx.state.characters[wife.id] = wife;
      if (!manH.memberIds.includes(wife.id)) manH.memberIds.push(wife.id);
    }
    if (
      wife?.alive &&
      ageNow(ctx, wife) <= mCfg.fertility_age_f[1] &&
      aliveChildrenOf(ctx, man.id).length < 2 &&
      rng.chance(mCfg.base_conception_chance_month * 0.65)
    ) {
      const gSex = rng.chance(ctx.content.balance.life.male_ratio) ? 'm' : 'f';
      const desc = createCharacter(ctx, rng, {
        sex: gSex,
        age: 0,
        familyName: man.familyName,
        health: rng.range(mCfg.newborn_health),
      });
      desc.birthYear = ctx.state.clock.year;
      desc.birthMonth = ctx.state.clock.month;
      desc.fatherId = man.id;
      desc.motherId = wife.id;
      desc.collateral = man.fatherId !== me.id && man.motherId !== me.id;
      desc.generation = (man.generation ?? (ctx.state.dynasty?.currentGeneration ?? 1)) + 1;
      desc.householdId = manH.id;
      ctx.state.characters[desc.id] = desc;
      if (!manH.memberIds.includes(desc.id)) manH.memberIds.push(desc.id);
    }
  }

  if (!me.spouseId) return;
  const spouse = ctx.state.characters[me.spouseId];
  if (!spouse?.alive) return;

  const mother = me.sex === 'f' ? me : spouse;
  const father = me.sex === 'm' ? me : spouse;

  // 1) Nếu đang mang thai: đếm ngược đến ngày sinh
  if (mother.pregnancy) {
    mother.pregnancy.monthsLeft -= 1;
    if (mother.pregnancy.monthsLeft <= 0) {
      mother.pregnancy = null;
      const sex = rng.chance(ctx.content.balance.life.male_ratio) ? 'm' : 'f';
      const childFamilyName =
        ctx.state.playMode === 'dynasty' && ctx.state.dynasty?.familyName
          ? ctx.state.dynasty.familyName
          : father.familyName;
      const child = createCharacter(ctx, rng, {
        sex,
        age: 0,
        familyName: childFamilyName,
        health: clamp(Math.round((mother.health + father.health) / 2), mCfg.newborn_health[0], mCfg.newborn_health[1]),
      });
      // Trẻ sơ sinh chính xác 0 tuổi, sinh vào tháng hiện tại
      child.birthYear = ctx.state.clock.year;
      child.birthMonth = ctx.state.clock.month;
      child.fatherId = father.id;
      child.motherId = mother.id;
      child.generation = (me.generation ?? (ctx.state.dynasty?.currentGeneration ?? 1)) + 1;
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
