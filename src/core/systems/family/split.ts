// [2] Tách hộ (ra ở riêng): con thứ lập gia đình sau một thời gian thì tách ra hộ riêng, cha mẹ chia phần gia sản
import { clamp } from '@shared/curve';
import type { Character } from '../../entities/Character';
import { addLedger, type Household } from '../../entities/Household';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { createCharacter } from '../../world/generate';
import { newId, RngStream, type SimContext } from '../context';
import { mergePurse } from '../economy/purse';
import { ageNow, aliveMembers, callOf, householdHead, player, playerHousehold } from '../people';

/** Tất cả anh chị em ruột (cùng cha hoặc cùng mẹ với người chơi), tính cả người chơi. */
export function siblingsAndPlayer(ctx: SimContext): Character[] {
  const me = player(ctx);
  if (!me.fatherId && !me.motherId) return [me];
  return Object.values(ctx.state.characters).filter(
    (c) =>
      c.id === me.id ||
      (me.fatherId && c.fatherId === me.fatherId) ||
      (me.motherId && c.motherId === me.motherId),
  );
}

/** Kiểm tra một nhân vật có phải con trưởng (ưu tiên trưởng nam theo luật Nho giáo) trong gia đình gốc không. */
export function isEldestChild(ctx: SimContext, target: Character = player(ctx)): boolean {
  const allAlive = siblingsAndPlayer(ctx).filter((c) => c.alive);
  const targetBirth = target.birthYear * 12 + target.birthMonth;
  const hasOlderBrother = allAlive.some(
    (c) => c.id !== target.id && c.sex === 'm' && c.birthYear * 12 + c.birthMonth < targetBirth,
  );
  if (hasOlderBrother) return false;
  if (target.sex === 'm') return true;
  const hasOlderSibling = allAlive.some((c) => c.id !== target.id && c.birthYear * 12 + c.birthMonth < targetBirth);
  return !hasOlderSibling;
}

/** Kiểm tra người chơi hiện có đủ điều kiện xin tách hộ ra ở riêng không. */
export function canPlayerSplitHousehold(ctx: SimContext): boolean {
  const me = player(ctx);
  const h = playerHousehold(ctx);
  if (!me.alive || h.parentHouseholdId) return false;
  const spouse = me.spouseId ? ctx.state.characters[me.spouseId] : undefined;
  if (!spouse?.alive) return false;

  // Phải còn cha mẹ hoặc anh chị em người lớn ở hộ gốc để giữ nhà cũ
  const movingIds = new Set([
    me.id,
    spouse.id,
    ...aliveMembers(ctx, h)
      .filter((c) => c.fatherId === me.id || c.motherId === me.id)
      .map((c) => c.id),
  ]);
  const remainingAdults = aliveMembers(ctx, h).filter(
    (c) => !movingIds.has(c.id) && ageNow(ctx, c) >= ctx.content.balance.life.adult_age,
  );
  if (remainingAdults.length === 0) return false;

  const cfg = ctx.content.balance.life.household_split;
  const marriedYears =
    me.marriedYear !== undefined
      ? ctx.state.clock.year - me.marriedYear
      : Math.max(0, ageNow(ctx, me) - ctx.content.balance.life.marriage.min_age);
  if (marriedYears < cfg.min_years_married) return false;

  // Con thứ đã cưới đủ năm thì được xin ra ở riêng; con trưởng ở lại giữ hương hỏa và phụng dưỡng cha mẹ
  return !isEldestChild(ctx, me);
}

/**
 * Tách hộ cho người chơi ra ở riêng (nhận một phần ruộng, tiền, thóc từ hộ cha mẹ).
 * shareFactor = 0: ra riêng tay trắng (chỉ nhận chút ít lương thực/vốn mọn); shareFactor = 1: chia theo lệ thường.
 */
export function splitPlayerHousehold(ctx: SimContext, shareFactor = 1): boolean {
  const { state, content } = ctx;
  const me = player(ctx);
  const oldH = playerHousehold(ctx);
  if (!me.alive || oldH.parentHouseholdId) return false;

  const spouse = me.spouseId ? state.characters[me.spouseId] : undefined;
  const children = aliveMembers(ctx, oldH).filter((c) => c.fatherId === me.id || c.motherId === me.id);
  const movingIds = [me.id, ...(spouse?.alive ? [spouse.id] : []), ...children.map((c) => c.id)];
  const remaining = aliveMembers(ctx, oldH).filter((c) => !movingIds.includes(c.id));
  if (remaining.length === 0) return false;

  const cfg = content.balance.life.household_split;
  const share = clamp(cfg.share_per_child * shareFactor, 0, 0.6);

  const parentSao = oldH.properties.ruong ?? 0;
  const giveSao =
    shareFactor <= 0
      ? 0
      : Math.max(0, Math.min(Math.round(parentSao * share), Math.max(0, parentSao - cfg.min_parent_keep_sao)));
  oldH.properties.ruong = parentSao - giveSao;

  const targetMoney =
    shareFactor <= 0
      ? cfg.min_gift_money
      : Math.max(cfg.min_gift_money, Math.round(Math.max(0, oldH.money - cfg.min_parent_keep_money) * share));
  const giveMoney = Math.min(Math.max(0, oldH.money), targetMoney);
  oldH.money -= giveMoney;

  const targetFood = Math.max(cfg.min_gift_food, Math.round(oldH.food * Math.max(0.15, share)));
  const giveFood = Math.min(Math.max(0, oldH.food), targetFood);
  oldH.food -= giveFood;

  const newH: Household = {
    id: newId(ctx, 'h'),
    memberIds: [...movingIds],
    money: giveMoney,
    food: giveFood,
    debt: 0,
    livingStandard: oldH.livingStandard,
    properties: {
      nha_tranh: 1,
      ...(giveSao > 0 ? { ruong: giveSao } : {}),
    },
    ledger: [],
    parentHouseholdId: oldH.id,
    splitFromYear: state.clock.year,
  };

  oldH.memberIds = oldH.memberIds.filter((id) => !movingIds.includes(id));
  for (const id of movingIds) {
    const c = state.characters[id];
    if (c) c.householdId = newH.id;
  }

  state.households[newH.id] = newH;
  state.householdId = newH.id;

  // Đặt lại mốc đầu năm của hộ mới để chốt sổ năm ghi đúng phần nhận phân gia
  const purseMoneyBefore = state.purse.money;
  state.yearOpenNetWorth = purseMoneyBefore;
  mergePurse(ctx);

  const curCareer = content.index.career.get(state.career.id);
  if (curCareer?.kind === 'nghe') {
    state.householdCareer = curCareer.id;
  }

  const ruongVal = giveSao * (content.index.property.get('ruong')?.value ?? 0);
  const houseVal = content.index.property.get('nha_tranh')?.value ?? 0;
  addLedger(newH, Ledger.HouseholdSplit, giveMoney + ruongVal + houseVal, giveFood);

  const elder = remaining.find((c) => c.id === me.fatherId || c.id === me.motherId) ?? remaining[0];
  writeTemplate(ctx, SystemLog.HouseholdSplit, {
    self: elder?.id,
    params: {
      call: elder ? callOf(ctx, elder) : '',
      sao: giveSao,
      money: Math.round(giveMoney),
      food: Math.round(giveFood),
    },
  });
  return true;
}

/** Tách một anh/chị/em NPC trong hộ ra lập hộ riêng (khi đã đến tuổi dựng vợ gả chồng). */
export function splitSiblingToNewHousehold(ctx: SimContext, sibling: Character, silent = false): Household | null {
  const { state, content } = ctx;
  const h = sibling.householdId ? state.households[sibling.householdId] : undefined;
  if (!h || !sibling.alive || sibling.id === state.playerId) return null;

  const rng = ctx.rng.get(RngStream.Life);
  const cfg = content.balance.life.household_split;
  const mCfg = content.balance.life.marriage;

  // Nếu chưa có vợ/chồng thì cưới khi ra riêng
  let spouse = sibling.spouseId ? state.characters[sibling.spouseId] : undefined;
  if (!spouse?.alive) {
    spouse = createCharacter(ctx, rng, {
      sex: sibling.sex === 'm' ? 'f' : 'm',
      age: Math.max(mCfg.min_age, ageNow(ctx, sibling) + rng.range(mCfg.spouse_age_offset)),
      health: rng.range(mCfg.spouse_health),
    });
    spouse.spouseId = sibling.id;
    sibling.spouseId = spouse.id;
    sibling.marriedYear = state.clock.year;
    spouse.marriedYear = state.clock.year;
    state.characters[spouse.id] = spouse;
  }

  const parentSao = h.properties.ruong ?? 0;
  const giveSao = Math.max(0, Math.min(Math.floor(parentSao * cfg.share_per_child), Math.max(0, parentSao - cfg.min_parent_keep_sao)));
  h.properties.ruong = parentSao - giveSao;

  const giveMoney = Math.min(
    Math.max(0, h.money),
    Math.max(0, Math.round(Math.max(0, h.money - cfg.min_parent_keep_money) * cfg.share_per_child)),
  );
  h.money -= giveMoney;

  const giveFood = Math.min(Math.max(0, h.food), Math.round(h.food * cfg.share_per_child));
  h.food -= giveFood;

  const movingIds = [sibling.id, spouse.id];
  const sibH: Household = {
    id: newId(ctx, 'h'),
    memberIds: movingIds,
    money: Math.max(cfg.min_gift_money, giveMoney),
    food: Math.max(cfg.min_gift_food, giveFood),
    debt: 0,
    livingStandard: h.livingStandard,
    properties: {
      nha_tranh: 1,
      ...(giveSao > 0 ? { ruong: giveSao } : {}),
    },
    ledger: [],
    parentHouseholdId: h.parentHouseholdId ?? h.id,
    splitFromYear: state.clock.year,
  };

  h.memberIds = h.memberIds.filter((id) => !movingIds.includes(id));
  for (const id of movingIds) {
    const c = state.characters[id];
    if (c) c.householdId = sibH.id;
  }
  state.households[sibH.id] = sibH;

  if (h.id === state.householdId) {
    const ruongVal = giveSao * (content.index.property.get('ruong')?.value ?? 0);
    addLedger(h, Ledger.HouseholdSplit, -(giveMoney + ruongVal), -giveFood);
    if (!silent) {
      writeTemplate(ctx, SystemLog.SiblingSplit, {
        self: sibling.id,
        params: { call: callOf(ctx, sibling), sao: giveSao, money: Math.round(giveMoney) },
      });
    }
  }
  return sibH;
}

/** Đầu năm / Cuối năm: xét tách hộ tự động cho người chơi (nếu là con thứ đã cưới đủ năm) hoặc anh chị em trong nhà. */
export function yearlyHouseholdSplit(ctx: SimContext): void {
  const { content } = ctx;
  const cfg = content.balance.life.household_split;
  const rng = ctx.rng.get(RngStream.Life);

  // 1) Nếu người chơi là con thứ đủ điều kiện tách hộ và cha mẹ vẫn làm chủ hộ: xét vào mốc mới cưới đủ năm
  const me = player(ctx);
  const marriedYears =
    me.marriedYear !== undefined
      ? ctx.state.clock.year - me.marriedYear
      : Math.max(0, ageNow(ctx, me) - content.balance.life.marriage.min_age);
  if (
    canPlayerSplitHousehold(ctx) &&
    !isEldestChild(ctx, me) &&
    householdHead(ctx)?.id !== ctx.state.playerId &&
    marriedYears <= cfg.min_years_married + 4 &&
    !ctx.state.flags.da_xin_o_lai_chung
  ) {
    if (rng.chance(cfg.elder_head_split_chance)) {
      splitPlayerHousehold(ctx, 1);
      return;
    }
  }

  // 2) Anh chị em đã đến tuổi lập gia đình trong hộ người chơi có xác suất tách ra ở riêng
  const h = playerHousehold(ctx);
  const siblingsInHouse = aliveMembers(ctx, h).filter(
    (c) =>
      c.id !== me.id &&
      c.id !== me.fatherId &&
      c.id !== me.motherId &&
      c.id !== me.spouseId &&
      c.fatherId !== me.id &&
      c.motherId !== me.id &&
      ageNow(ctx, c) >= cfg.sibling_split_min_age,
  );
  for (const sib of siblingsInHouse) {
    // Giữ lại con trưởng nếu người chơi không phải con trưởng và chưa tách hộ
    if (isEldestChild(ctx, sib) && !isEldestChild(ctx, me) && !h.parentHouseholdId) continue;
    if (rng.chance(cfg.sibling_split_chance_year)) {
      splitSiblingToNewHousehold(ctx, sib);
      break;
    }
  }
}
