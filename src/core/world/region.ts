// [7] Hệ thống Vùng 3 điểm (Làng nông – Thị trấn bến sông – Phủ thành):
// - Trạng thái riêng từng khu định cư: giá lúa, Thời cơ, dân cư thưa, thiên tai, dịch bệnh lan theo tuyến đường
// - Chuyển nhà (bán hoặc giữ ruộng cũ), đi buôn chuyến xa nhà, lên phủ nhậm chức quan văn
import { clamp } from '@shared/curve';
import { addLedger } from '../entities/Household';
import { holdingsOf } from '../entities/Property';
import type { Settlement, TripKind } from '../entities/Settlement';
import { writeTemplate } from '../events/journal';
import { Ledger, SystemLog } from '../events/systemLogKeys';
import { RngStream, type SimContext } from '../systems/context';
import { currentFateMode } from '../systems/life';
import { ageNow, player, playerHousehold } from '../systems/people';
import { addSkillXp } from '../systems/skills';

/** ID khu định cư mà người chơi đang có mặt (đang đi chuyến xa thì là điểm đến, ở nhà thì là nơi hộ định cư). */
export function activeSettlementId(ctx: SimContext): string {
  return ctx.state.activeTrip?.targetSettlementId ?? ctx.state.world.settlementType;
}

/** Lấy thực thể khu định cư nơi hộ đang ở. */
export function homeSettlement(ctx: SimContext): Settlement | undefined {
  return ctx.state.settlements?.[ctx.state.world.settlementType];
}

/** Lấy thực thể khu định cư nơi người chơi đang có mặt. */
export function currentSettlement(ctx: SimContext): Settlement | undefined {
  return ctx.state.settlements?.[activeSettlementId(ctx)] ?? homeSettlement(ctx);
}

/** Khởi tạo 3 khu định cư trong vùng (lang_nong, thi_tran_ben_song, phu_thanh) tất định theo seed. */
export function initRegionSettlements(ctx: SimContext): void {
  const { content, state } = ctx;
  const rng = ctx.rng.get(RngStream.Region);
  const culture = content.index.culture.get(state.cultureId) ?? content.cultures[0];
  const civId = state.civilization?.id ?? content.civilizations[0]?.id ?? 'nho_giao';

  if (!state.settlements) state.settlements = {};
  if (state.activeTrip === undefined) state.activeTrip = null;

  const regionNodes = content.settlementTypes.filter((st) => st.region_node);
  for (const st of regionNodes) {
    if (state.settlements[st.id]) continue;
    let name = '';
    if (st.id === state.world.settlementType && state.world.settlementName) {
      name = state.world.settlementName;
    } else if (st.id === 'thi_tran_ben_song' && culture?.town_names?.length) {
      name = rng.pick(culture.town_names);
    } else if (st.id === 'phu_thanh' && culture?.prefecture_names?.length) {
      name = rng.pick(culture.prefecture_names);
    } else if (culture?.village_names?.length) {
      name = rng.pick(culture.village_names);
    } else {
      name = st.name;
    }

    const popMid = Math.round((st.population_band[0] + st.population_band[1]) / 2);
    const isHome = st.id === state.world.settlementType;
    const pricePremium = isHome ? 1 : 1 + (st.trade_factor - 1) * 0.12;
    state.settlements[st.id] = {
      id: st.id,
      name,
      typeId: st.id,
      civilizationId: civId,
      population: popMid,
      harvestQuality: state.world.harvestQuality,
      foodPrice: isHome ? state.world.foodPrice : Math.round(state.world.foodPrice * pricePremium * 100) / 100,
      tradeIndex: state.world.tradeIndex,
      patrolLevel: isHome
        ? state.world.patrolLevel
        : clamp(
            state.world.patrolLevel + (st.id === 'phu_thanh' ? 15 : st.id === 'thi_tran_ben_song' ? 5 : 0),
            0,
            100,
          ),
      disaster: 'none',
      epidemic: null,
    };
  }

  syncWorldWithHomeSettlement(ctx);
}

/** Đồng bộ các chỉ số của khu định cư quê nhà vào state.world để tương thích ngược toàn bộ hệ thống. */
export function syncWorldWithHomeSettlement(ctx: SimContext): void {
  const home = homeSettlement(ctx);
  if (!home) return;
  ctx.state.world.settlementName = home.name;
  ctx.state.world.harvestQuality = home.harvestQuality;
  ctx.state.world.foodPrice = home.foodPrice;
  ctx.state.world.tradeIndex = home.tradeIndex;
  ctx.state.world.patrolLevel = home.patrolLevel;
}

/** Tìm tuyến đường đi từ khu định cư A sang khu định cư B. */
export function findSettlementRoute(ctx: SimContext, fromId: string, toId: string) {
  const fromType = ctx.content.index.settlementType.get(fromId);
  const direct = fromType?.routes.find((r) => r.to === toId);
  if (direct) return direct;
  return { to: toId, travel_months: 1, cost_money: 1, risk_chance: 0.12 };
}

/** Kích hoạt dịch bệnh tại một khu định cư (dùng cho mô phỏng đầu năm, kịch bản hoặc hiệu ứng sự kiện). */
export function triggerSettlementEpidemic(
  ctx: SimContext,
  settlementId: string,
  diseaseId?: string,
  months?: number,
  sourceSettlementId?: string,
): void {
  initRegionSettlements(ctx);
  const target = ctx.state.settlements[settlementId];
  if (!target) return;
  const rng = ctx.rng.get(RngStream.Region);
  const regionCfg = ctx.content.balance.opportunity.region;
  const pool = regionCfg.epidemic_diseases.filter((id) => ctx.content.index.disease.has(id));
  const chosenDisease =
    diseaseId && ctx.content.index.disease.has(diseaseId)
      ? diseaseId
      : pool.length > 0
        ? rng.pick(pool)
        : 'ta_ly';
  const duration = months ?? rng.range(regionCfg.epidemic_duration_months);
  target.epidemic = {
    diseaseId: chosenDisease,
    monthsLeft: duration,
    sourceId: sourceSettlementId,
  };

  const diseaseName = ctx.content.index.disease.get(chosenDisease)?.name ?? chosenDisease;
  if (sourceSettlementId && ctx.state.settlements[sourceSettlementId]) {
    const srcName = ctx.state.settlements[sourceSettlementId].name;
    writeTemplate(ctx, SystemLog.EpidemicSpread, {
      params: { title: diseaseName, call: srcName, stage: target.name },
    });
  } else {
    writeTemplate(ctx, SystemLog.EpidemicOutbreak, {
      params: { title: diseaseName, stage: target.name },
    });
  }
}

/** Đầu năm: cập nhật mùa màng, thiên tai, biến động dân cư thưa và nguy cơ bùng dịch từng nơi. */
export function yearlyRegion(ctx: SimContext): void {
  initRegionSettlements(ctx);
  const { content, state } = ctx;
  const rng = ctx.rng.get(RngStream.Region);
  const disasterFactor = currentFateMode(ctx).disaster_factor;
  const diseaseFactor = currentFateMode(ctx).disease_factor;

  for (const s of Object.values(state.settlements)) {
    const st = content.index.settlementType.get(s.typeId);
    if (!st) continue;

    if (s.typeId === state.world.settlementType) {
      s.harvestQuality = state.world.harvestQuality;
    } else {
      const q = rng.weighted(content.balance.economy.harvest_qualities, (x) =>
        x.yield_factor < 1 ? x.weight * disasterFactor : x.weight,
      );
      if (q) s.harvestQuality = q.id;
    }

    // Thiên tai cục bộ khi mất mùa
    if (s.harvestQuality === 'mat_mua') {
      s.disaster = s.typeId === 'thi_tran_ben_song' ? 'lut' : rng.chance(0.55) ? 'lut' : 'han';
    } else {
      s.disaster = 'none';
    }

    // Dân cư mô phỏng thưa: tăng nhẹ khi được mùa/bình yên, giảm khi mất mùa hoặc có dịch
    let popDelta = 0;
    if (s.epidemic) {
      popDelta = -Math.max(1, Math.round(s.population * 0.03));
    } else if (s.harvestQuality === 'mat_mua') {
      popDelta = -Math.max(1, Math.round(s.population * 0.02));
    } else if (s.harvestQuality === 'duoc_mua') {
      popDelta = Math.max(1, Math.round(s.population * 0.02));
    } else {
      popDelta = rng.int(-1, 2);
    }
    s.population = clamp(s.population + popDelta, st.population_band[0], st.population_band[1]);

    // Xét bùng phát dịch bệnh mới nếu nơi này chưa có dịch
    if (!s.epidemic) {
      let chance = st.epidemic_base_chance_year * diseaseFactor;
      if (s.disaster !== 'none') chance *= 1.65;
      if (rng.chance(chance)) {
        triggerSettlementEpidemic(ctx, s.typeId);
      }
    }
  }

  syncWorldWithHomeSettlement(ctx);
}

/** Mỗi tháng: cập nhật giá lúa, Thời cơ từng nơi, lan truyền dịch bệnh và tiến trình đi buôn chuyến. */
export function monthlyRegion(ctx: SimContext): void {
  initRegionSettlements(ctx);
  const { content, state } = ctx;
  const rng = ctx.rng.get(RngStream.Region);
  const priceCfg = content.balance.economy.price;
  const oppCfg = content.balance.opportunity;
  const regionCfg = oppCfg.region;

  // 1. Cập nhật giá thóc, Thời cơ và mức tuần tra cho từng khu định cư
  for (const s of Object.values(state.settlements)) {
    const st = content.index.settlementType.get(s.typeId);
    const q =
      content.index.harvestQuality.get(s.harvestQuality) ?? content.balance.economy.harvest_qualities[0];

    if (s.typeId === state.world.settlementType) {
      s.foodPrice = state.world.foodPrice;
      s.patrolLevel = state.world.patrolLevel;
      const baseTrade = state.world.tradeIndex;
      s.tradeIndex = s.epidemic
        ? Math.round(clamp(baseTrade * regionCfg.epidemic_trade_penalty, oppCfg.trade.clamp[0], oppCfg.trade.clamp[1]) * 100) / 100
        : baseTrade;
      state.world.tradeIndex = s.tradeIndex;
    } else {
      const mFactor = priceCfg.monthly_factor[(state.clock.month - 1) % priceCfg.monthly_factor.length];
      const pricePremium = 1 + ((st?.trade_factor ?? 1) - 1) * 0.12;
      const pNoise = 1 + priceCfg.noise * (rng.next() * 2 - 1);
      s.foodPrice = Math.round(priceCfg.base * mFactor * q.price_factor * pricePremium * pNoise * 100) / 100;

      const t = oppCfg.trade;
      const seasonal = t.monthly_factor[(state.clock.month - 1) % t.monthly_factor.length];
      const bump = t.harvest_bump[s.harvestQuality] ?? 0;
      const tNoise = (rng.next() * 2 - 1) * t.noise;
      let rawTrade = clamp(seasonal + bump + tNoise, t.clamp[0], t.clamp[1]);
      if (s.epidemic) {
        rawTrade = clamp(rawTrade * regionCfg.epidemic_trade_penalty, t.clamp[0], t.clamp[1]);
      }
      s.tradeIndex = Math.round(rawTrade * 100) / 100;

      const p = oppCfg.patrol;
      const basePatrol =
        oppCfg.military_alerts.find((a) => a.id === state.world.militaryAlert)?.patrol_base ??
        oppCfg.start_patrol_level;
      const townBonus = s.typeId === 'phu_thanh' ? 15 : s.typeId === 'thi_tran_ben_song' ? 5 : 0;
      s.patrolLevel = Math.round(
        clamp(basePatrol + townBonus + state.career.wanted * p.wanted_factor + rng.int(-p.noise, p.noise), p.clamp[0], p.clamp[1]),
      );
    }
  }

  // 2. Lan truyền dịch bệnh dọc theo tuyến giao thương và đếm ngược tháng dịch
  const currentlyInfected = Object.values(state.settlements).filter((s) => s.epidemic !== null);
  for (const src of currentlyInfected) {
    const srcType = content.index.settlementType.get(src.typeId);
    if (!srcType || !src.epidemic) continue;
    for (const route of srcType.routes) {
      const dst = state.settlements[route.to];
      if (!dst || dst.epidemic) continue;
      const dstType = content.index.settlementType.get(dst.typeId);
      const tradeIntensity = ((srcType.trade_factor ?? 1) + (dstType?.trade_factor ?? 1)) / 2;
      const spreadChance = regionCfg.epidemic_spread_chance_month * tradeIntensity;
      if (rng.chance(spreadChance)) {
        triggerSettlementEpidemic(ctx, dst.typeId, src.epidemic.diseaseId, undefined, src.typeId);
      }
    }
  }

  for (const s of currentlyInfected) {
    if (!s.epidemic) continue;
    s.epidemic.monthsLeft -= 1;
    if (s.epidemic.monthsLeft <= 0) {
      const diseaseName = content.index.disease.get(s.epidemic.diseaseId)?.name ?? s.epidemic.diseaseId;
      s.epidemic = null;
      writeTemplate(ctx, SystemLog.EpidemicEnded, {
        params: { title: diseaseName, stage: s.name },
      });
    }
  }

  // 3. Tiến trình chuyến đi xa nhà (đi buôn chuyến / công vụ)
  if (state.activeTrip) {
    state.activeTrip.monthsLeft -= 1;
    if (state.activeTrip.monthsLeft > 0) {
      if (
        state.activeTrip.kind === 'buon_chuyen' &&
        !state.activeTrip.homeEmergencyFired &&
        rng.chance(regionCfg.trip_home_emergency_chance_month)
      ) {
        state.activeTrip.homeEmergencyFired = true;
        state.flags.nha_co_viec_khi_di_xa = {
          expiresAt: state.clock.monthIndex + 2,
        };
      }
    } else {
      completeActiveTrip(ctx);
    }
  }

  syncWorldWithHomeSettlement(ctx);
}

/** Hoàn tất chuyến đi xa nhà và kết toán lợi nhuận buôn chuyến. */
export function completeActiveTrip(ctx: SimContext): void {
  const trip = ctx.state.activeTrip;
  if (!trip) return;
  const { content, state } = ctx;
  const regionCfg = content.balance.opportunity.region;
  const h = playerHousehold(ctx);
  const p = player(ctx);
  const dst = state.settlements[trip.targetSettlementId];
  const dstType = content.index.settlementType.get(trip.targetSettlementId);
  const dstName = dst ? `${dstType?.name ?? ''} ${dst.name}`.trim() : trip.targetSettlementId;

  if (trip.kind === 'buon_chuyen' && trip.cargoMoney > 0) {
    const targetEffectiveTrade = (dst?.tradeIndex ?? 1) * (dstType?.trade_factor ?? 1);
    const spreadBonus = Math.max(-0.08, (targetEffectiveTrade - trip.buyTradeIndex) * 0.4);
    const skillLevel = p.skills.thuong_mai?.level ?? 0;
    const skillBonus = skillLevel * regionCfg.trip_skill_bonus_per_level;
    const returnRate = Math.max(0.1, regionCfg.trip_base_return_rate + spreadBonus + skillBonus);
    const profit = Math.max(1, Math.round(trip.cargoMoney * returnRate));
    const totalReturn = Math.round(trip.cargoMoney + profit);

    h.money += totalReturn;
    addLedger(h, Ledger.Career, profit, 0);
    addSkillXp(ctx, p, 'thuong_mai', 18);
    if (state.career.id === 'thuong_nhan' || state.career.id === 'ban_rong' || state.career.id === 'chu_do') {
      state.career.merit += 12;
    }

    writeTemplate(ctx, SystemLog.TradeTripReturned, {
      params: { title: dstName, money: totalReturn, amount: profit },
    });
  }

  state.activeTrip = null;
}

/** Hủy chuyến đi giữa chừng (quay về gấp khi nhà có việc), chịu hao hụt một phần vốn hàng. */
export function cancelActiveTrip(ctx: SimContext): boolean {
  const trip = ctx.state.activeTrip;
  if (!trip) return false;
  const { content, state } = ctx;
  const regionCfg = content.balance.opportunity.region;
  const h = playerHousehold(ctx);
  const dst = state.settlements[trip.targetSettlementId];
  const dstType = content.index.settlementType.get(trip.targetSettlementId);
  const dstName = dst ? `${dstType?.name ?? ''} ${dst.name}`.trim() : trip.targetSettlementId;

  if (trip.cargoMoney > 0) {
    const lossFactor = regionCfg.trip_cancel_loss_factor;
    const recovered = Math.max(0, Math.round(trip.cargoMoney * (1 - lossFactor)));
    const lost = trip.cargoMoney - recovered;
    h.money += recovered;
    if (lost > 0) {
      addLedger(h, Ledger.Event, -lost, 0);
    }
    writeTemplate(ctx, SystemLog.TradeTripCancelled, {
      params: { title: dstName, money: recovered },
    });
  }

  state.activeTrip = null;
  return true;
}

/** Bắt đầu một chuyến đi buôn xa (vắng nhà 1–2 tháng). */
export function startTradeTrip(
  ctx: SimContext,
  targetSettlementId: string,
  cargoMoney: number,
  kind: TripKind = 'buon_chuyen',
): boolean {
  initRegionSettlements(ctx);
  const { content, state } = ctx;
  const p = player(ctx);
  if (!p.alive || ageNow(ctx, p) < content.balance.life.adult_age) return false;
  if (state.activeTrip) return false;
  if (state.civilization.mourningMonthsLeft > 0) return false;
  if (targetSettlementId === state.world.settlementType) return false;

  const dst = state.settlements[targetSettlementId];
  if (!dst) return false;
  const route = findSettlementRoute(ctx, state.world.settlementType, targetSettlementId);
  const h = playerHousehold(ctx);
  const totalCost = Math.max(0, cargoMoney) + route.cost_money;
  if (h.money < totalCost) return false;

  h.money -= totalCost;
  if (route.cost_money > 0) {
    addLedger(h, Ledger.Living, -route.cost_money, 0);
  }

  state.activeTrip = {
    kind,
    fromSettlementId: state.world.settlementType,
    targetSettlementId,
    totalMonths: route.travel_months,
    monthsLeft: route.travel_months,
    cargoMoney: Math.max(0, cargoMoney),
    buyTradeIndex: state.world.tradeIndex,
    buyFoodPrice: state.world.foodPrice,
    homeEmergencyFired: false,
  };

  const dstType = content.index.settlementType.get(targetSettlementId);
  const dstName = `${dstType?.name ?? ''} ${dst.name}`.trim();
  if (kind === 'buon_chuyen') {
    writeTemplate(ctx, SystemLog.TradeTripStarted, {
      params: { money: cargoMoney, title: dstName, amount: route.travel_months },
    });
  }
  return true;
}

/** Chuyển hộ gia đình sang định cư ở khu định cư khác trong vùng (tùy chọn bán hoặc giữ tài sản ruộng vườn cũ). */
export function relocateHousehold(
  ctx: SimContext,
  targetSettlementId: string,
  sellOldProperties: boolean,
  opts?: { official?: boolean; free?: boolean },
): boolean {
  initRegionSettlements(ctx);
  const { content, state } = ctx;
  const p = player(ctx);
  if (!p.alive) return false;
  if (targetSettlementId === state.world.settlementType && !opts?.official) return false;

  const dst = state.settlements[targetSettlementId];
  const dstType = content.index.settlementType.get(targetSettlementId);
  if (!dst || !dstType) return false;

  const h = playerHousehold(ctx);
  const relocateCost = opts?.official || opts?.free ? 0 : dstType.relocate_cost;
  if (h.money < relocateCost) return false;

  if (relocateCost > 0) {
    h.money -= relocateCost;
    addLedger(h, Ledger.Living, -relocateCost, 0);
  }

  // Nếu chọn bán tài sản ruộng/ao cũ khi chuyển nhà
  if (sellOldProperties) {
    const sellFactor = content.balance.economy.property_sell_factor;
    for (const item of holdingsOf(h, content)) {
      if (item.type.category === 'land' && item.count > 0) {
        const gain = Math.round(item.type.value * sellFactor * item.count);
        h.properties[item.type.id] = 0;
        h.money += gain;
        addLedger(h, Ledger.SellProperty, gain, 0);
      }
    }
  }

  // Thanh lý các cơ nghiệp không hỗ trợ tại nơi ở mới
  if (h.ventures && h.ventures.length > 0) {
    const sellFactor = content.balance.economy.property_sell_factor;
    const kept = [];
    for (const v of h.ventures) {
      const def = content.index.venture.get(v.id);
      if (def && !def.settlement_types.includes(targetSettlementId)) {
        const totalInvested = def.capital_cost * (1 + (v.stage - 1) * def.expand_cost_factor);
        const healthFactor = Math.min(1, Math.max(0.3, v.health / 100));
        const refund = Math.max(1, Math.round(totalInvested * sellFactor * healthFactor));
        h.money += refund;
        addLedger(h, Ledger.SellProperty, refund, 0);
      } else {
        kept.push(v);
      }
    }
    h.ventures = kept;
  }

  // Hủy chuyến đi đang dở (nếu có) và cập nhật nơi ở mới
  state.activeTrip = null;
  state.world.settlementType = targetSettlementId;
  syncWorldWithHomeSettlement(ctx);

  // Kiểm tra nghề tay trái có hợp lệ tại nơi ở mới không
  if (state.career.sideJobId) {
    const sj = content.index.sideJob.get(state.career.sideJobId);
    if (sj && sj.settlement_types.length > 0 && !sj.settlement_types.includes(targetSettlementId)) {
      state.career.sideJobId = null;
    }
  }

  const dstLabel = `${dstType.name} ${dst.name}`.trim();

  if (opts?.official) {
    const stipend = content.balance.opportunity.region.official_relocate_stipend;
    h.money += stipend;
    addLedger(h, Ledger.Career, stipend, 0);

    if (state.career.id !== 'si_tu' && state.career.id !== 'nha_lai') {
      state.career.id = 'si_tu';
      state.career.since = state.clock.monthIndex;
      state.career.rankIndex = 0;
      state.householdCareer = 'si_tu';
    }
    if (state.career.id === 'si_tu') {
      const targetRank = state.civilization.examDegree === 'tien_si' ? 3 : 2;
      if (state.career.rankIndex < targetRank) {
        state.career.rankIndex = targetRank;
        state.career.merit = Math.max(state.career.merit, targetRank === 3 ? 70 : 40);
      }
    }
    const cDef = content.index.career.get(state.career.id);
    const rankName = cDef?.ranks[state.career.rankIndex]?.name ?? cDef?.name ?? state.career.id;
    writeTemplate(ctx, SystemLog.OfficialAppointed, {
      params: { title: dstLabel, stage: rankName, money: stipend },
    });
  } else {
    writeTemplate(ctx, SystemLog.HouseholdRelocated, {
      params: { title: dstLabel },
    });
  }

  return true;
}

/** Kiểm tra người chơi có đủ điều kiện lên Phủ thành nhậm chức quan văn hay không. */
export function canAppointPrefectureOfficial(ctx: SimContext): boolean {
  const { state } = ctx;
  const p = player(ctx);
  if (!p.alive || ageNow(ctx, p) < ctx.content.balance.life.adult_age) return false;
  if (state.world.settlementType === 'phu_thanh') return false;
  if (state.civilization.mourningMonthsLeft > 0) return false;
  const deg = state.civilization.examDegree;
  if (deg === 'huong_cong' || deg === 'tien_si') return true;
  if (state.career.id === 'si_tu' && state.career.rankIndex >= 2) return true;
  if (state.career.id === 'nha_lai' && state.career.rankIndex >= 1) return true;
  return false;
}

/** Lên Phủ thành nhậm chức quan văn (dời hộ lên phủ, nhận bổng lộc an gia và thăng hàm). */
export function appointPrefectureOfficial(ctx: SimContext): boolean {
  if (!canAppointPrefectureOfficial(ctx)) return false;
  return relocateHousehold(ctx, 'phu_thanh', false, { official: true });
}
