// [0] Các hàm lấy dữ liệu để hiển thị. Trả về view model thuần; chữ do người viết nội dung soạn
// (tên Focus, lời kể) đi kèm sẵn, còn nhãn giao diện là khóa để UI tra data/lang.
import { pickBand } from '@shared/curve';
import { canChi } from '../engine/GameClock';
import type { ModifierResult } from '../engine/ModifierSystem';
import { StatTarget } from '../engine/statTargets';
import { fullName } from '../entities/Character';
import type { LedgerEntry, LedgerYear } from '../entities/Household';
import { holdingsOf } from '../entities/Property';
import type { LogYear, PendingEvent, Resolution } from '../entities/World';
import type { SimContext } from '../systems/context';
import { buyPrice, monthlyFoodNeed, monthlyMoneyNeed, sellPrice } from '../systems/economy/helpers';
import { healthCap } from '../systems/life';
import { computeFor } from '../systems/modifiers';
import { ageNow, aliveMembers, callOf, householdHead, lifeStageOf, player, playerHousehold } from '../systems/people';
import { createResolver, seasonOf } from '../systems/resolver';
import { evaluate } from '../engine/RuleEvaluator';
import { fillTemplate } from '@shared/template';
import { xpToNext } from '../systems/skills';
import { focusAvailable } from './commands';

export interface HudView {
  date: { year: number; month: number; can: number; chi: number; seasonName: string; weatherName: string };
  player: {
    name: string;
    age: number;
    sex: 'm' | 'f';
    lifeStage: string;
    isHead: boolean;
    health: number;
    healthMax: number;
    healthKey: string;
    healthTrend: ModifierResult;
    stress: number;
    stressKey: string;
    stressTrend: ModifierResult;
    deathRiskMod: ModifierResult;
    traits: { id: string; name: string; description: string }[];
    skills: { id: string; name: string; level: number; xp: number; next: number }[];
  };
  household: {
    money: number;
    food: number;
    debt: number;
    foodMonths: number;
    foodWarning: boolean;
    monthlyFood: number;
    monthlyMoney: number;
    livingStandard: string;
    members: { id: string; call: string; age: number; healthKey: string; isPlayer: boolean }[];
    properties: { id: string; name: string; unit: string; count: number; value: number; sellable: boolean }[];
    harvestYield: ModifierResult;
  };
  market: {
    buyPrice: number;
    sellPrice: number;
    tradeAmounts: number[];
    buyable: { id: string; name: string; unit: string; value: number; description: string }[];
    propertySellFactor: number;
  };
  focus: {
    primary: string;
    secondary: string | null;
    canChoose: boolean;
    canSecondary: boolean;
    options: { id: string; name: string; description: string; icon: string; available: boolean; allowSecondary: boolean }[];
  };
  livingStandards: { id: string; name: string; description: string; monthlyMoney: number }[];
  openLoops: { text: string; monthsLeft: number | null }[];
  log: LogYear[];
  ledger: { current: LedgerEntry[]; history: LedgerYear[] };
  pending: (Omit<PendingEvent, 'options'> & { options: (PendingEvent['options'][number] & { chanceKey?: string })[] }) | null;
  lastResolution: Resolution | null;
  gameOver: LifeSummaryView | null;
}

export interface LifeSummaryView {
  name: string;
  age: number;
  year: number;
  causeName: string;
  yearsPlayed: number;
  decisions: number;
  closing: { money: number; food: number; debt: number; farmland: number };
  highlights: { year: number; text: string }[];
}

function chanceKey(ctx: SimContext, p: number): string {
  return pickBand(ctx.content.balance.display.chance_bands, p).key;
}

export function getHudView(ctx: SimContext): HudView {
  const { state, content } = ctx;
  const me = player(ctx);
  const h = playerHousehold(ctx);
  const age = ageNow(ctx, me);
  const stage = lifeStageOf(ctx, age);
  const display = content.balance.display;
  const cal = content.balance.calendar;
  const cc = canChi(state.clock.year);
  const foodNeed = monthlyFoodNeed(ctx);
  const foodMonths = foodNeed > 0 ? h.food / foodNeed : Infinity;

  const r = createResolver(ctx);
  const openLoops: HudView['openLoops'] = [
    ...display.open_loop_rules
      .filter((rule) => evaluate(rule.condition, r))
      .map((rule) => ({ text: fillTemplate(rule.text, r.token), monthsLeft: null })),
    ...Object.values(state.flags)
      .filter((f) => f.label)
      .map((f) => ({ text: f.label!, monthsLeft: f.expiresAt === null ? null : f.expiresAt - state.clock.monthIndex })),
    ...state.scheduled
      .filter((s) => s.label)
      .map((s) => ({ text: s.label!, monthsLeft: s.dueMonthIndex - state.clock.monthIndex })),
  ];

  return {
    date: {
      year: state.clock.year,
      month: state.clock.month,
      can: cc.can,
      chi: cc.chi,
      seasonName: cal.seasons.find((s) => s.id === seasonOf(ctx))?.name ?? '',
      weatherName: cal.weathers.find((w) => w.id === state.world.weather)?.name ?? '',
    },
    player: {
      name: fullName(me),
      age,
      sex: me.sex,
      lifeStage: stage.name,
      isHead: householdHead(ctx)?.id === me.id,
      health: me.health,
      healthMax: healthCap(ctx, me),
      healthKey: pickBand(display.health_bands, me.health).key,
      healthTrend: computeFor(ctx, me.id, StatTarget.HealthMonthly, 0),
      stress: me.stress,
      stressKey: pickBand(display.stress_bands, me.stress).key,
      stressTrend: computeFor(ctx, me.id, StatTarget.StressMonthly, 0),
      deathRiskMod: computeFor(ctx, me.id, StatTarget.DeathRisk, 1),
      traits: me.traits.map((id) => content.index.trait.get(id)).filter((t) => !!t).map((t) => ({ id: t!.id, name: t!.name, description: t!.description })),
      skills: content.skills.map((s) => ({
        id: s.id,
        name: s.name,
        level: me.skills[s.id]?.level ?? 0,
        xp: me.skills[s.id]?.xp ?? 0,
        next: xpToNext(ctx, me.skills[s.id]?.level ?? 0),
      })),
    },
    household: {
      money: h.money,
      food: h.food,
      debt: h.debt,
      foodMonths,
      foodWarning: foodMonths < display.food_months_warning,
      monthlyFood: foodNeed,
      monthlyMoney: monthlyMoneyNeed(ctx),
      livingStandard: h.livingStandard,
      members: aliveMembers(ctx, h).map((c) => ({
        id: c.id,
        call: callOf(ctx, c),
        age: ageNow(ctx, c),
        healthKey: pickBand(display.health_bands, c.health).key,
        isPlayer: c.id === me.id,
      })),
      properties: holdingsOf(h, content).map((p) => ({
        id: p.type.id,
        name: p.type.name,
        unit: p.type.unit,
        count: p.count,
        value: p.type.value,
        sellable: p.type.sellable,
      })),
      harvestYield: computeFor(ctx, me.id, StatTarget.HarvestYield, 1),
    },
    market: {
      buyPrice: buyPrice(ctx),
      sellPrice: sellPrice(ctx),
      tradeAmounts: content.balance.economy.trade_amounts,
      buyable: content.properties
        .filter((p) => p.buyable)
        .map((p) => ({ id: p.id, name: p.name, unit: p.unit, value: p.value, description: p.description })),
      propertySellFactor: content.balance.economy.property_sell_factor,
    },
    focus: {
      primary: state.focus.primary,
      secondary: state.focus.secondary,
      canChoose: stage.can_choose_focus,
      canSecondary: stage.can_have_secondary_focus,
      options: content.focuses.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        icon: f.icon,
        available: focusAvailable(ctx, f.id),
        allowSecondary: f.allow_secondary,
      })),
    },
    livingStandards: content.balance.living_standards.levels.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      monthlyMoney: monthlyMoneyNeed(ctx, l.id),
    })),
    openLoops,
    log: state.log,
    ledger: { current: h.ledger, history: state.ledgerHistory },
    pending: state.pending
      ? {
          ...state.pending,
          options: state.pending.options.map((o) => ({ ...o, chanceKey: o.chance ? chanceKey(ctx, (o.chance.shown[0] + o.chance.shown[1]) / 2) : undefined })),
        }
      : null,
    lastResolution: state.lastResolution,
    gameOver: state.gameOver ? getLifeSummary(ctx) : null,
  };
}

export function getLifeSummary(ctx: SimContext): LifeSummaryView | null {
  const { state, content } = ctx;
  if (!state.gameOver) return null;
  const me = player(ctx);
  const h = playerHousehold(ctx);
  const farmland = holdingsOf(h, content).filter((p) => p.type.farmland).reduce((s, p) => s + p.count, 0);
  const threshold = content.balance.display.highlight_importance;
  return {
    name: fullName(me),
    age: state.gameOver.age,
    year: state.gameOver.year,
    causeName: content.balance.life.mortality.causes.find((c) => c.id === state.gameOver!.causeId)?.name ?? state.gameOver.causeId,
    yearsPlayed: state.gameOver.year - content.balance.time.start_year,
    decisions: state.stats.decisions,
    closing: { money: h.money, food: h.food, debt: h.debt, farmland },
    highlights: state.log.flatMap((y) => y.entries.filter((e) => e.importance >= threshold).map((e) => ({ year: y.year, text: e.text }))),
  };
}
