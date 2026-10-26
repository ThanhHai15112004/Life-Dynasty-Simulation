// [2] Thừa kế (inheritance): khi cha/mẹ qua đời, phân chia gia sản (tiền, ruộng, thóc) và nợ theo luật Nho giáo
import { clamp } from '@shared/curve';
import type { Character } from '../../entities/Character';
import { addLedger, type Household } from '../../entities/Household';
import { writeTemplate } from '../../events/journal';
import { Ledger, SystemLog } from '../../events/systemLogKeys';
import { createCharacter } from '../../world/generate';
import { newId, RngStream, type SimContext } from '../context';
import { mergePurse } from '../economy/purse';
import { ageNow, callOf, player, playerHousehold } from '../people';
import { currentCivilization } from '../status';
import { isEldestChild, siblingsAndPlayer } from './split';

/** Tìm hộ gốc của cha mẹ (nếu người chơi đã tách hộ thì là parentHouseholdId, chưa tách thì là hộ hiện tại). */
export function parentOriginHousehold(ctx: SimContext): Household {
  const h = playerHousehold(ctx);
  if (h.parentHouseholdId && ctx.state.households[h.parentHouseholdId]) {
    return ctx.state.households[h.parentHouseholdId];
  }
  return h;
}

/**
 * Thực hiện phân chia di sản từ hộ cha mẹ theo luật khuôn văn minh (con trưởng giữ hương hỏa + chia phần còn lại).
 * Có thể gọi tự động khi cha/mẹ qua đời hoặc qua hiệu ứng sự kiện (`trigger_inheritance`).
 */
export function settleInheritance(ctx: SimContext, shareFactor = 1, deceasedParent?: Character): boolean {
  const { state, content } = ctx;
  const me = player(ctx);
  if (!me.alive) return false;

  const ancestralH = parentOriginHousehold(ctx);
  if (ancestralH.inheritanceSettled) return false;
  ancestralH.inheritanceSettled = true;

  const law = currentCivilization(ctx).inheritance;
  const heirs = siblingsAndPlayer(ctx).filter((c) => c.alive);
  const count = Math.max(1, heirs.length);
  const eldest = isEldestChild(ctx, me);

  // Tỷ lệ thừa kế của người chơi theo luật Nho giáo: con trưởng nhận phần hương hỏa + 1/count phần còn lại
  let baseRatio = 1;
  if (count > 1) {
    const worship = law.ancestor_worship_share;
    baseRatio = eldest ? worship + (1 - worship) / count : (1 - worship) / count;
  }
  const playerRatio = clamp(baseRatio * shareFactor, 0, 1);

  const parentChar =
    deceasedParent ??
    (me.fatherId ? state.characters[me.fatherId] : undefined) ??
    (me.motherId ? state.characters[me.motherId] : undefined);
  const parentCall = parentChar ? callOf(ctx, parentChar) : '';
  const ruongPrice = content.index.property.get('ruong')?.value ?? 0;

  // Trường hợp 1: Người chơi đã tách ra ở hộ riêng, nhận di sản chuyển từ hộ cha mẹ sang
  if (ancestralH.id !== state.householdId) {
    const playerH = playerHousehold(ctx);
    const totalSao = ancestralH.properties.ruong ?? 0;
    const sao = Math.round(totalSao * playerRatio);
    const money = Math.round(Math.max(0, ancestralH.money) * playerRatio);
    const food = Math.round(Math.max(0, ancestralH.food) * playerRatio);
    const debt = law.debt_inheritance ? Math.round(ancestralH.debt * playerRatio) : 0;

    ancestralH.properties.ruong = Math.max(0, totalSao - sao);
    ancestralH.money = Math.max(0, ancestralH.money - money);
    ancestralH.food = Math.max(0, ancestralH.food - food);
    ancestralH.debt = Math.max(0, ancestralH.debt - debt);

    playerH.properties.ruong = (playerH.properties.ruong ?? 0) + sao;
    playerH.money += money;
    playerH.food += food;
    playerH.debt += debt;

    // [6] Cơ nghiệp gia truyền: con trưởng hoặc người chơi thừa kế nếu hộ gốc còn cơ nghiệp
    let inheritedVentureVal = 0;
    if ((eldest || count === 1) && ancestralH.ventures && ancestralH.ventures.length > 0) {
      if (!playerH.ventures) playerH.ventures = [];
      for (const v of ancestralH.ventures) {
        if (!playerH.ventures.some((x) => x.id === v.id)) {
          playerH.ventures.push({ ...v });
          const def = content.index.venture.get(v.id);
          if (def) inheritedVentureVal += def.capital_cost;
        }
      }
      ancestralH.ventures = [];
    }

    // Chia phần còn lại cho các anh chị em khác
    const otherHeirs = heirs.filter(
    (c) =>
      c.id !== me.id &&
      (c.householdId !== ancestralH.id || ageNow(ctx, c) >= content.balance.life.marriage.min_age),
  );
    if (otherHeirs.length > 0) {
      const eachSao = Math.floor((ancestralH.properties.ruong ?? 0) / otherHeirs.length);
      const eachMoney = Math.floor(ancestralH.money / otherHeirs.length);
      for (const sib of otherHeirs) {
        const sibH = sib.householdId ? state.households[sib.householdId] : undefined;
        if (sibH && sibH.id !== ancestralH.id) {
          sibH.properties.ruong = (sibH.properties.ruong ?? 0) + eachSao;
          sibH.money += eachMoney;
          ancestralH.properties.ruong = Math.max(0, (ancestralH.properties.ruong ?? 0) - eachSao);
          ancestralH.money = Math.max(0, ancestralH.money - eachMoney);
        }
      }
    }

    const netLedgerMoney = money + sao * ruongPrice + inheritedVentureVal - debt;
    addLedger(playerH, Ledger.Inheritance, netLedgerMoney !== 0 ? netLedgerMoney : 1, food);
    writeTemplate(ctx, SystemLog.Inheritance, {
      self: parentChar?.id,
      params: {
        call: parentCall,
        sao,
        money: Math.round(money),
        debt: Math.round(debt),
      },
    });
    return true;
  }

  // Trường hợp 2: Người chơi đang ở ngay trong hộ gốc khi cha/mẹ qua đời
  mergePurse(ctx);
  const totalSao = ancestralH.properties.ruong ?? 0;
  const totalMoney = Math.max(0, ancestralH.money);
  const totalFood = Math.max(0, ancestralH.food);
  const totalDebt = ancestralH.debt;

  const otherHeirs = heirs.filter(
    (c) =>
      c.id !== me.id &&
      (c.householdId !== ancestralH.id || ageNow(ctx, c) >= content.balance.life.marriage.min_age),
  );

  const keepSao = otherHeirs.length > 0 ? Math.round(totalSao * playerRatio) : totalSao;
  const keepMoney = otherHeirs.length > 0 ? Math.round(totalMoney * playerRatio) : totalMoney;
  const keepFood = otherHeirs.length > 0 ? Math.round(totalFood * playerRatio) : totalFood;
  const keepDebt = law.debt_inheritance
    ? otherHeirs.length > 0
      ? Math.round(totalDebt * playerRatio)
      : totalDebt
    : 0;

  if (otherHeirs.length > 0) {
    const remSao = Math.max(0, totalSao - keepSao);
    const remMoney = Math.max(0, totalMoney - keepMoney);
    const remFood = Math.max(0, totalFood - keepFood);
    const eachSao = Math.floor(remSao / otherHeirs.length);
    const eachMoney = Math.floor(remMoney / otherHeirs.length);
    const eachFood = Math.floor(remFood / otherHeirs.length);
    const rng = ctx.rng.get(RngStream.Life);
    const mCfg = content.balance.life.marriage;

    for (const sib of otherHeirs) {
      if (sib.householdId === ancestralH.id) {
        // Anh chị em đã trưởng thành tách ra hộ riêng nhận phần di sản
        let spouse = sib.spouseId ? state.characters[sib.spouseId] : undefined;
        if (!spouse?.alive && ageNow(ctx, sib) >= mCfg.min_age) {
          spouse = createCharacter(ctx, rng, {
            sex: sib.sex === 'm' ? 'f' : 'm',
            age: Math.max(mCfg.min_age, ageNow(ctx, sib) + rng.range(mCfg.spouse_age_offset)),
            health: rng.range(mCfg.spouse_health),
          });
          spouse.spouseId = sib.id;
          sib.spouseId = spouse.id;
          state.characters[spouse.id] = spouse;
        }
        const movingIds = [sib.id, ...(spouse?.alive ? [spouse.id] : [])];
        const sibH: Household = {
          id: newId(ctx, 'h'),
          memberIds: movingIds,
          money: Math.max(content.balance.life.household_split.min_gift_money, eachMoney),
          food: Math.max(content.balance.life.household_split.min_gift_food, eachFood),
          debt: 0,
          livingStandard: ancestralH.livingStandard,
          properties: {
            nha_tranh: 1,
            ...(eachSao > 0 ? { ruong: eachSao } : {}),
          },
          ledger: [],
          ventures: [],
          loans: [],
          parentHouseholdId: ancestralH.id,
          splitFromYear: state.clock.year,
        };
        ancestralH.memberIds = ancestralH.memberIds.filter((id) => !movingIds.includes(id));
        for (const id of movingIds) {
          const c = state.characters[id];
          if (c) c.householdId = sibH.id;
        }
        state.households[sibH.id] = sibH;
      } else if (sib.householdId && state.households[sib.householdId]) {
        const sibH = state.households[sib.householdId];
        sibH.properties.ruong = (sibH.properties.ruong ?? 0) + eachSao;
        sibH.money += eachMoney;
        sibH.food += eachFood;
      }
    }
  }

  ancestralH.properties.ruong = keepSao;
  ancestralH.money = keepMoney;
  ancestralH.food = keepFood;
  ancestralH.debt = keepDebt;

  const otherPropVal = Object.entries(ancestralH.properties)
    .filter(([k]) => k !== 'ruong')
    .reduce((sum, [k, cnt]) => sum + (content.index.property.get(k)?.value ?? 0) * cnt, 0);
  const ventureVal = (ancestralH.ventures ?? []).reduce((sum, v) => {
    const def = content.index.venture.get(v.id);
    return sum + (def ? def.capital_cost * v.stage : 0);
  }, 0);
  const netInherited = keepMoney + keepSao * ruongPrice + otherPropVal + ventureVal - keepDebt;

  // Đặt mốc đầu năm về 0 để dòng Thừa kế phản ánh đúng phần di sản người chơi chính thức tiếp nhận
  state.yearOpenNetWorth = 0;
  addLedger(ancestralH, Ledger.Inheritance, netInherited, keepFood);

  writeTemplate(ctx, SystemLog.Inheritance, {
    self: parentChar?.id,
    params: {
      call: parentCall,
      sao: keepSao,
      money: Math.round(keepMoney),
      debt: Math.round(keepDebt),
    },
  });
  return true;
}

/** Kiểm tra và kích hoạt thừa kế khi cha hoặc mẹ ruột của người chơi vừa qua đời. */
export function checkParentInheritance(ctx: SimContext, deceased: Character): void {
  const me = player(ctx);
  if (!me.alive) return;
  const isFather = deceased.id === me.fatherId;
  const isMother = deceased.id === me.motherId;
  if (!isFather && !isMother) return;

  const fatherAlive = me.fatherId ? ctx.state.characters[me.fatherId]?.alive : false;
  // Cha qua đời (trụ cột theo Nho giáo) hoặc người cha/mẹ cuối cùng qua đời thì mở phân chia di sản
  if (isFather || !fatherAlive) {
    settleInheritance(ctx, 1, deceased);
  }
}
