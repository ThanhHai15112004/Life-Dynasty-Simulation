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
import { regularIncomeParts } from '../systems/economy';
import { buyPrice, monthlyFoodNeed, monthlyMoneyNeed, selfFarms, sellPrice } from '../systems/economy/helpers';
import { healthCap, treatmentBlock } from '../systems/life';
import { lifeExpectancyAtBirth } from '../systems/life/mortality';
import { CHRONICLE_SOURCE_PREFIX } from '../systems/chronicle';
import { computeFor } from '../systems/modifiers';
import { ageGroupOf, ageNow, aliveMembers, callOf, householdHead, lifeStageOf, player, playerHousehold, relationToPlayer } from '../systems/people';
import { createResolver, seasonOf } from '../systems/resolver';
import { evaluate } from '../engine/RuleEvaluator';
import { fillTemplate } from '@shared/template';
import { actionChance, canExecuteCareerAction, careerAvailable } from '../systems/career';
import { computeSummaryAxes, type SummaryAxisView } from '../systems/happiness';
import { xpToNext } from '../systems/skills';
import { currentCivilization, currentStatusRank } from '../systems/status';
import { ambitionAvailable, focusAvailable } from './commands';

export interface HudView {
  date: { year: number; month: number; monthsPerYear: number; can: number; chi: number; seasonName: string; weatherName: string };
  /** [1] Niên hiệu và năm thứ mấy của triều vua hiện tại (biên niên giả tưởng). */
  reign: { name: string; year: number };
  player: {
    id: string;
    name: string;
    ageGroup: string;
    birth: { year: number; month: number; can: number; chi: number };
    originName: string;
    age: number;
    sex: 'm' | 'f';
    lifeStage: string;
    isHead: boolean;
    married: boolean;
    health: number;
    healthMax: number;
    healthKey: string;
    healthTrend: ModifierResult;
    stress: number;
    stressKey: string;
    stressTrend: ModifierResult;
    satisfaction: number;
    satisfactionKey: string;
    reputation: number;
    reputationKey: string;
    filialPiety: number;
    scholarlyPrestige: number;
    examDegreeId: string;
    examDegreeName: string;
    mourningMonthsLeft: number;
    /** [1] Bậc thang địa vị hiện tại (index trong thang, 0 = thấp nhất). */
    statusRank: { id: string; name: string; description: string; index: number; total: number };
    deathRiskMod: ModifierResult;
    diseases: { id: string; name: string; description: string; severity: string; remainingMonths: number }[];
    traits: { id: string; name: string; description: string }[];
    skills: { id: string; name: string; level: number; xp: number; next: number; bandKey: string }[];
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
    members: { id: string; call: string; name: string; relation: string; sex: 'm' | 'f'; ageGroup: string; age: number; healthKey: string; isPlayer: boolean }[];
    /** [1] Người ốm trong nhà và việc chạy chữa: giá, khả năng khỏi (chữ), chữa được không và vì sao. */
    sick: {
      characterId: string;
      call: string;
      isPlayer: boolean;
      diseaseId: string;
      diseaseName: string;
      severity: string;
      cost: number;
      chanceKey: string;
      /** null = chữa được; còn lại là mã lỗi (error.<mã>). */
      block: string | null;
    }[];
    properties: { id: string; name: string; unit: string; count: number; value: number; sellable: boolean }[];
    harvestYield: ModifierResult;
    /** [1] Nơi hộ sinh sống. */
    settlement: { name: string; typeName: string; typeDescription: string };
    /** [1] Hộ tự cày (false: ruộng phát canh thu tô). */
    selfFarm: boolean;
    /** [1] Tiền thu đều đặn mỗi tháng ước tính theo thời giá hiện tại (nghề nhà + Focus). */
    regularIncome: number;
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
    canChoose: boolean;
    /** [1] Chỉ các trọng tâm của giai đoạn đời hiện tại (đã lọc theo nghề nhà, nơi ở). */
    options: { id: string; name: string; description: string; icon: string; hints: { label: string; up: boolean; good: boolean }[] }[];
  };
  /** [1] Ai lo việc nhà: người chơi là chủ hộ thì được chi tiêu, mua bán; không thì nhà tự vận hành. */
  manage: { isHead: boolean; headCall: string; autoLivingStandard: boolean; autoRepayDebt: boolean };
  /** [1] Chuyện nhỏ đang chờ chọn (dừng thời gian như sự kiện thường). */
  minor: (Omit<PendingEvent, 'options'> & { options: (PendingEvent['options'][number] & { chanceKey?: string })[] }) | null;
  ambition: {
    currentId: string | null;
    achievedMilestones: string[];
    options: {
      id: string;
      name: string;
      description: string;
      icon: string;
      available: boolean;
      milestones: { id: string; name: string; achieved: boolean }[];
    }[];
  };
  relations: {
    id: string;
    role: string;
    call: string;
    age: number;
    opinion: number;
    favor: number;
  }[];
  career: {
    id: string;
    name: string;
    description: string;
    icon: string;
    /** [1] '' khi còn nhỏ (chưa có nghề riêng), nghe = nghề thật, trang_thai = phụ việc nhà / thất nghiệp. */
    kind: '' | 'nghe' | 'trang_thai';
    /** [1] Số tháng làm nghề hiện tại (thâm niên). */
    months: number;
    /** [1] Nghề nhà (nuôi cả hộ) — có thể khác nghề riêng của người chơi. */
    household: { id: string; name: string; icon: string };
    components: string[];
    rankIndex: number;
    rankName: string;
    nextRankName: string | null;
    nextRankMerit: number | null;
    merit: number;
    wanted: number;
    stipendMoney: number;
    stipendFood: number;
    duties: string[];
    opportunity: {
      tradeIndex: number;
      militaryAlert: string;
      patrolLevel: number;
    };
    actions: {
      id: string;
      name: string;
      description: string;
      hint?: string;
      costMoney: number;
      costFood: number;
      chanceKey: string;
      available: boolean;
      cooldownLeft: number;
    }[];
    availableCareers: {
      id: string;
      name: string;
      description: string;
      icon: string;
      available: boolean;
      /** [1] Vốn phải bỏ ra và lời giải thích điều kiện vào nghề. */
      costMoney: number;
      hint: string;
    }[];
  };
  livingStandards: { id: string; name: string; description: string; monthlyMoney: number }[];
  openLoops: { text: string; monthsLeft: number | null }[];
  log: LogYear[];
  /** [1] Bản đồ cuộc đời: một ô mỗi năm đã sống + tuổi thọ kỳ vọng của thời này. */
  lifeMap: { cells: { age: number; year: number; satisfaction: number; marks: string[] }[]; expectedLifespan: number };
  /** [1] Biến cố biên niên gần đây (mới nhất trước). */
  chronicle: { year: number; text: string; icon: string }[];
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
  axes: SummaryAxisView[];
  highlights: { year: number; text: string }[];
}

/** [1] Gợi ý tác động của một trọng tâm, đọc từ data: kỹ năng được XP, thu nhập, rồi các chỉ số modifier. */
function focusHints(ctx: SimContext, focusId: string): { label: string; up: boolean; good: boolean }[] {
  const { content } = ctx;
  const f = content.index.focus.get(focusId);
  if (!f) return [];
  const display = content.balance.display;
  const lang = content.lang[display.default_language] ?? {};
  const out: { label: string; up: boolean; good: boolean }[] = [];
  for (const skill of Object.keys(f.skill_xp)) out.push({ label: content.index.skill.get(skill)?.name ?? skill, up: true, good: true });
  if (f.income) out.push({ label: lang['hint.money'] ?? 'hint.money', up: true, good: true });
  for (const h of display.focus_hints) {
    const m = f.modifiers.find((x) => x.target === h.target);
    if (!m) continue;
    const up = m.op === 'mul' ? m.value > 1 : m.value > 0;
    out.push({ label: lang[h.key] ?? h.key, up, good: up === h.higher_is_good });
  }
  return out.slice(0, display.focus_hints_max);
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
      monthsPerYear: cal.months_per_year,
      can: cc.can,
      chi: cc.chi,
      seasonName: cal.seasons.find((s) => s.id === seasonOf(ctx))?.name ?? '',
      weatherName: cal.weathers.find((w) => w.id === state.world.weather)?.name ?? '',
    },
    reign: { name: state.world.reignName, year: state.clock.year - state.world.reignStartYear + 1 },
    player: {
      id: me.id,
      name: fullName(me),
      ageGroup: ageGroupOf(ctx, age),
      birth: { year: me.birthYear, month: me.birthMonth, ...canChi(me.birthYear) },
      originName: content.index.origin.get(state.originId)?.name ?? '',
      age,
      sex: me.sex,
      lifeStage: stage.name,
      isHead: householdHead(ctx)?.id === me.id,
      married: !!(me.spouseId && state.characters[me.spouseId]?.alive),
      health: me.health,
      healthMax: healthCap(ctx, me),
      healthKey: pickBand(display.health_bands, me.health).key,
      healthTrend: computeFor(ctx, me.id, StatTarget.HealthMonthly, 0),
      stress: me.stress,
      stressKey: pickBand(display.stress_bands, me.stress).key,
      stressTrend: computeFor(ctx, me.id, StatTarget.StressMonthly, 0),
      satisfaction: state.happiness.satisfaction,
      satisfactionKey: pickBand(display.satisfaction_bands, state.happiness.satisfaction).key,
      reputation: state.reputation.dan_lang ?? 0,
      reputationKey: pickBand(display.reputation_bands, state.reputation.dan_lang ?? 0).key,
      filialPiety: state.civilization.filialPiety,
      scholarlyPrestige: state.civilization.scholarlyPrestige,
      examDegreeId: state.civilization.examDegree,
      examDegreeName: currentCivilization(ctx).exam_degrees.find((d) => d.id === state.civilization.examDegree)?.name ?? '',
      mourningMonthsLeft: state.civilization.mourningMonthsLeft,
      statusRank: (() => {
        const civ = currentCivilization(ctx);
        const st = currentStatusRank(ctx);
        return { id: st.id, name: st.name, description: st.description, index: civ.status_ranks.indexOf(st), total: civ.status_ranks.length };
      })(),
      deathRiskMod: computeFor(ctx, me.id, StatTarget.DeathRisk, 1),
      diseases: (me.diseases ?? [])
        .map((d) => {
          const def = content.index.disease.get(d.id);
          return def
            ? { id: def.id, name: def.name, description: def.description, severity: def.severity, remainingMonths: d.remainingMonths }
            : null;
        })
        .filter((d): d is NonNullable<typeof d> => d !== null),
      traits: me.traits.map((id) => content.index.trait.get(id)).filter((t) => !!t).map((t) => ({ id: t!.id, name: t!.name, description: t!.description })),
      skills: content.skills.map((s) => ({
        id: s.id,
        name: s.name,
        level: me.skills[s.id]?.level ?? 0,
        xp: me.skills[s.id]?.xp ?? 0,
        next: xpToNext(ctx, me.skills[s.id]?.level ?? 0),
        bandKey: pickBand(display.skill_bands, me.skills[s.id]?.level ?? 0).key,
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
        name: fullName(c),
        relation: relationToPlayer(ctx, c),
        sex: c.sex,
        ageGroup: ageGroupOf(ctx, ageNow(ctx, c)),
        age: ageNow(ctx, c),
        healthKey: pickBand(display.health_bands, c.health).key,
        isPlayer: c.id === me.id,
      })),
      sick: aliveMembers(ctx, h).flatMap((c) =>
        c.diseases.flatMap((d) => {
          const def = content.index.disease.get(d.id);
          if (!def) return [];
          const head = householdHead(ctx)?.id === me.id;
          return [
            {
              characterId: c.id,
              call: callOf(ctx, c),
              isPlayer: c.id === me.id,
              diseaseId: def.id,
              diseaseName: def.name,
              severity: def.severity,
              cost: def.cure_cost,
              chanceKey: chanceKey(ctx, def.cure_chance),
              block: head ? treatmentBlock(ctx, c, def.id) : 'not_head',
            },
          ];
        }),
      ),
      properties: holdingsOf(h, content).map((p) => ({
        id: p.type.id,
        name: p.type.name,
        unit: p.type.unit,
        count: p.count,
        value: p.type.value,
        sellable: p.type.sellable,
      })),
      harvestYield: computeFor(ctx, me.id, StatTarget.HarvestYield, 1),
      settlement: {
        name: state.world.settlementName,
        typeName: content.index.settlementType.get(state.world.settlementType)?.name ?? '',
        typeDescription: content.index.settlementType.get(state.world.settlementType)?.description ?? '',
      },
      selfFarm: selfFarms(ctx),
      regularIncome: regularIncomeParts(ctx).reduce((sum, p) => sum + p.money, 0),
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
      canChoose: stage.can_choose_focus,
      options: content.focuses
        .filter((f) => focusAvailable(ctx, f.id))
        .map((f) => ({ id: f.id, name: f.name, description: f.description, icon: f.icon, hints: focusHints(ctx, f.id) })),
    },
    manage: (() => {
      const head = householdHead(ctx);
      return {
        isHead: head?.id === me.id,
        headCall: head && head.id !== me.id ? callOf(ctx, head) : '',
        autoLivingStandard: state.autoManage.livingStandard,
        autoRepayDebt: state.autoManage.repayDebt,
      };
    })(),
    minor: state.minor
      ? {
          ...state.minor,
          options: state.minor.options.map((o) => ({ ...o, chanceKey: o.chance ? chanceKey(ctx, (o.chance.shown[0] + o.chance.shown[1]) / 2) : undefined })),
        }
      : null,
    ambition: {
      currentId: state.ambition.id,
      achievedMilestones: state.ambition.achievedMilestones,
      options: content.ambitions.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        available: ambitionAvailable(ctx, a.id),
        milestones: a.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          achieved: state.ambition.achievedMilestones.includes(m.id),
        })),
      })),
    },
    relations: Object.entries(state.village)
      .map(([role, id]) => {
        const c = state.characters[id];
        if (!c?.alive) return null;
        return {
          id: c.id,
          role,
          call: callOf(ctx, c),
          age: ageNow(ctx, c),
          opinion: c.opinionOfPlayer,
          favor: c.favorWithPlayer ?? 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    career: (() => {
      const cDef = content.index.career.get(state.career.id);
      const home = content.index.career.get(state.householdCareer);
      const rank = cDef?.ranks[state.career.rankIndex] ?? cDef?.ranks[0];
      const nextRank = cDef?.ranks[state.career.rankIndex + 1];
      return {
        id: cDef?.id ?? state.career.id,
        name: cDef?.name ?? '',
        description: cDef?.description ?? '',
        icon: cDef?.icon ?? 'focus',
        kind: cDef?.kind ?? '',
        months: cDef ? state.clock.monthIndex - state.career.since : 0,
        household: { id: home?.id ?? state.householdCareer, name: home?.name ?? '', icon: home?.icon ?? 'focus' },
        components: cDef?.components ?? [],
        rankIndex: state.career.rankIndex,
        rankName: rank?.name ?? '',
        nextRankName: nextRank?.name ?? null,
        nextRankMerit: nextRank?.min_merit ?? null,
        merit: state.career.merit,
        wanted: state.career.wanted,
        stipendMoney: rank?.stipend_money_month ?? 0,
        stipendFood: rank?.stipend_food_month ?? 0,
        duties: cDef?.duties ?? [],
        opportunity: {
          tradeIndex: state.world.tradeIndex,
          militaryAlert: state.world.militaryAlert,
          patrolLevel: state.world.patrolLevel,
        },
        actions: (cDef?.actions ?? []).map((act) => {
          const check = canExecuteCareerAction(ctx, act);
          const p = actionChance(ctx, act.chance);
          return {
            id: act.id,
            name: act.name,
            description: act.description,
            hint: act.hint,
            costMoney: act.cost_money,
            costFood: act.cost_food,
            chanceKey: chanceKey(ctx, p),
            available: check.ok,
            cooldownLeft: check.cooldownLeft,
          };
        }),
        availableCareers: content.careers
          .filter((c) => c.id !== state.career.id && c.kind === 'nghe')
          .map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            icon: c.icon,
            // Vào nghề tốn vốn thì tiền nhà phải đủ và người chơi phải là chủ hộ
            available:
              careerAvailable(ctx, c.id) &&
              ((c.join?.cost_money ?? 0) === 0 || (householdHead(ctx)?.id === state.playerId && h.money >= (c.join?.cost_money ?? 0))),
            costMoney: c.join?.cost_money ?? 0,
            hint: c.join?.hint ?? '',
          })),
      };
    })(),
    livingStandards: content.balance.living_standards.levels.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      monthlyMoney: monthlyMoneyNeed(ctx, l.id),
    })),
    openLoops,
    log: state.log,
    lifeMap: { cells: state.lifeMap, expectedLifespan: lifeExpectancyAtBirth(ctx) },
    chronicle: state.log
      .flatMap((y) => y.entries)
      .filter((e) => e.sourceId.startsWith(CHRONICLE_SOURCE_PREFIX))
      .reverse()
      .slice(0, display.chronicle_shown)
      .map((e) => ({ year: e.year, text: e.text, icon: e.icon })),
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
    axes: computeSummaryAxes(ctx),
    highlights: state.log.flatMap((y) => y.entries.filter((e) => e.importance >= threshold).map((e) => ({ year: y.year, text: e.text }))),
  };
}
