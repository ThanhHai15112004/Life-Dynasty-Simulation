// [0] Các hàm lấy dữ liệu để hiển thị. Trả về view model thuần; chữ do người viết nội dung soạn
// (tên Focus, lời kể) đi kèm sẵn, còn nhãn giao diện là khóa để UI tra data/lang.
import { pickBand } from '@shared/curve';
import { canChi } from '../engine/GameClock';
import type { ModifierResult } from '../engine/ModifierSystem';
import { StatTarget } from '../engine/statTargets';
import { fullName } from '../entities/Character';
import type { DynastyFeud, PastLifeRecord, UnfinishedWish } from '../entities/Dynasty';
import type { LedgerEntry, LedgerYear } from '../entities/Household';
import { farmlandOf, holdingsOf } from '../entities/Property';
import type { LogYear, PendingEvent, Resolution } from '../entities/World';
import type { SimContext } from '../systems/context';
import { purseActive, regularIncomeParts } from '../systems/economy';
import { buyPrice, householdNetWorth, lastYearIncome, ledgerValue, monthlyFoodNeed, monthlyMoneyNeed, selfFarms, sellPrice } from '../systems/economy/helpers';
import { Ledger } from '../events/systemLogKeys';
import { canAdoptChild, canAdoptRelative, getHeirCandidates, type HeirCandidate } from '../systems/family';
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
    properties: { id: string; name: string; unit: string; count: number; value: number; sellable: boolean; category: string; farmland: boolean }[];
    harvestYield: ModifierResult;
    /** [1] Nơi hộ sinh sống. */
    settlement: { name: string; typeName: string; typeDescription: string };
    /** [1] Hộ tự cày (false: ruộng phát canh thu tô). */
    selfFarm: boolean;
    /** [1] Tiền thu đều đặn mỗi tháng ước tính theo thời giá hiện tại (nghề nhà + Focus). */
    regularIncome: number;
    /** [1.5] Tài sản ròng (tiền + thóc theo giá gốc + tài sản − nợ), quan. */
    netWorth: number;
    /** [1.5] Thu nhập năm vừa chốt sổ (thóc quy ra tiền); chưa chốt năm nào thì phần đã làm ra năm nay. */
    incomeYear: number;
    /** [1.5] Chốt sổ năm gần nhất kiểu 1in8b: mức thay đổi tài sản ròng và tối đa vài dòng lý do (đã gộp "Chuyện khác"). */
    yearClose: YearCloseView | null;
    /** [2] Nhà cha mẹ (khi người chơi đã tách hộ ra ở riêng). */
    parentHousehold: {
      id: string;
      farmland: number;
      money: number;
      members: { id: string; call: string; name: string; relation: string; sex: 'm' | 'f'; ageGroup: string; age: number; healthKey: string }[];
    } | null;
    /** [2] Nhà anh chị em đã tách ra ở riêng. */
    siblingHouseholds: {
      id: string;
      headCall: string;
      farmland: number;
      members: { id: string; call: string; name: string; relation: string; sex: 'm' | 'f'; ageGroup: string; age: number; healthKey: string }[];
    }[];
  };
  /** [1.5] Quy đổi để dễ hình dung: quan → đồng ngày nay, sào → m². */
  wealthUnits: { modernPerQuan: number; m2PerSao: number };
  /**
   * [1.5] Tài sản của riêng bạn (kiểu 1in8b) khi chưa làm chủ hộ: túi tiền riêng, thu nhập của bạn,
   * chốt sổ riêng; gia cảnh nhà cha mẹ chỉ hiện bằng chữ. Làm chủ hộ rồi thì active = false, thẻ hiện gia sản.
   */
  personal: {
    active: boolean;
    money: number;
    incomeYear: number;
    yearClose: YearCloseView | null;
    closes: YearCloseView[];
    /** Khóa chữ gia cảnh nhà (display.family_bands theo tài sản ròng của hộ). */
    familyKey: string;
    /** Chưa tới tuổi trưởng thành. */
    young: boolean;
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
  manage: { isHead: boolean; headCall: string; autoLivingStandard: boolean; autoRepayDebt: boolean; autoSellSurplus: boolean; autoInvest: boolean };
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
  /** closes: [1.5] chốt sổ từng năm đã qua (cũ → mới), cùng cách tính với household.yearClose. */
  ledger: { current: LedgerEntry[]; history: LedgerYear[]; closes: YearCloseView[] };
  pending: (Omit<PendingEvent, 'options'> & { options: (PendingEvent['options'][number] & { chanceKey?: string })[] }) | null;
  lastResolution: Resolution | null;
  gameOver: LifeSummaryView | null;
  /** [2] Dòng họ truyền đời: gia phả nhiều đời, sử sách các đời đã qua, di nguyện và thoát hiểm tuyệt tự. */
  dynasty: DynastyView;
  /** [2] Dữ liệu màn hình Truyền đời & Tổng kết dòng họ khi người chơi qua đời ở chế độ dynasty. */
  succession: SuccessionView | null;
}

export interface FamilyTreeNodeView {
  id: string;
  name: string;
  call: string;
  sex: 'm' | 'f';
  generation: number;
  birthYear: number;
  deathYear: number | null;
  age: number;
  alive: boolean;
  isPlayer: boolean;
  wasPlayed: boolean;
  adopted: boolean;
  collateral: boolean;
  fatherId: string | null;
  motherId: string | null;
  spouseName: string | null;
}

export interface DynastyView {
  playMode: string;
  familyName: string;
  currentGeneration: number;
  prestige: number;
  guardianCall: string | null;
  unfinishedWishes: UnfinishedWish[];
  feuds: DynastyFeud[];
  pastLives: PastLifeRecord[];
  familyTree: FamilyTreeNodeView[];
  canAdoptChild: boolean;
  canAdoptRelative: boolean;
  adoptChildCost: number;
  adoptRelativeCost: number;
}

export interface DynastySummaryView {
  familyName: string;
  generationsCount: number;
  totalYears: number;
  prestige: number;
  highestStatusRankName: string;
  wishesFulfilled: number;
  wishesTotal: number;
  lives: PastLifeRecord[];
}

export interface SuccessionView {
  candidates: HeirCandidate[];
  extinct: boolean;
  dynastySummary: DynastySummaryView;
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

export interface YearCloseView {
  year: number;
  /** Tài sản ròng cuối năm trừ đầu năm. */
  delta: number;
  /** Dòng lý do: category là khóa ledger.<id> trong lang; value đã quy thóc ra tiền. */
  lines: { category: string; value: number }[];
}

/** [1.5] Chốt sổ một năm: các khoản lớn nhất (bỏ khoản chỉ đổi dạng của cải), phần chênh còn lại là "Chuyện khác". */
export function yearCloseOf(ctx: SimContext, y: Pick<LedgerYear, 'year' | 'entries' | 'netWorth' | 'openNetWorth'>): YearCloseView {
  const { wealth } = ctx.content.balance.display;
  const transfers = ctx.content.balance.economy.transfer_ledgers;
  const priorityCategories = new Set<string>([Ledger.Inheritance, Ledger.HouseholdSplit]);
  const lines = y.entries
    .filter((e) => !transfers.includes(e.category))
    .map((e) => ({ category: e.category, value: ledgerValue(ctx, e) }))
    .filter((l) => Math.abs(l.value) >= wealth.line_min || priorityCategories.has(l.category))
    .sort((a, b) => {
      const aPri = priorityCategories.has(a.category) ? 1 : 0;
      const bPri = priorityCategories.has(b.category) ? 1 : 0;
      if (aPri !== bPri) return bPri - aPri;
      return Math.abs(b.value) - Math.abs(a.value);
    })
    .slice(0, wealth.year_lines);
  // Save cũ chưa lưu tài sản ròng: chỉ hiện các dòng, không suy ra phần chênh
  const legacy = y.netWorth === 0 && y.openNetWorth === 0;
  const listed = lines.reduce((sum, l) => sum + l.value, 0);
  const delta = legacy ? listed : y.netWorth - y.openNetWorth;
  if (Math.abs(delta - listed) >= wealth.line_min) lines.push({ category: Ledger.Other, value: delta - listed });
  return { year: y.year, delta, lines };
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
        category: p.type.category,
        farmland: p.type.farmland,
      })),
      harvestYield: computeFor(ctx, me.id, StatTarget.HarvestYield, 1),
      settlement: {
        name: state.world.settlementName,
        typeName: content.index.settlementType.get(state.world.settlementType)?.name ?? '',
        typeDescription: content.index.settlementType.get(state.world.settlementType)?.description ?? '',
      },
      selfFarm: selfFarms(ctx),
      regularIncome: regularIncomeParts(ctx).reduce((sum, p) => sum + p.money, 0),
      netWorth: householdNetWorth(ctx),
      incomeYear: lastYearIncome(ctx),
      yearClose: state.ledgerHistory.length > 0 ? yearCloseOf(ctx, state.ledgerHistory[state.ledgerHistory.length - 1]) : null,
      parentHousehold: (() => {
        if (!h.parentHouseholdId) return null;
        const pH = state.households[h.parentHouseholdId];
        if (!pH) return null;
        const members = aliveMembers(ctx, pH).map((c) => ({
          id: c.id,
          call: callOf(ctx, c),
          name: fullName(c),
          relation: relationToPlayer(ctx, c),
          sex: c.sex,
          ageGroup: ageGroupOf(ctx, ageNow(ctx, c)),
          age: ageNow(ctx, c),
          healthKey: pickBand(display.health_bands, c.health).key,
        }));
        if (members.length === 0) return null;
        return {
          id: pH.id,
          farmland: farmlandOf(pH, content),
          money: Math.round(pH.money),
          members,
        };
      })(),
      siblingHouseholds: (() => {
        const rootId = h.parentHouseholdId ?? h.id;
        return Object.values(state.households)
          .filter((otherH) => otherH.id !== h.id && otherH.id !== h.parentHouseholdId && otherH.parentHouseholdId === rootId)
          .map((sibH) => {
            const members = aliveMembers(ctx, sibH).map((c) => ({
              id: c.id,
              call: callOf(ctx, c),
              name: fullName(c),
              relation: relationToPlayer(ctx, c),
              sex: c.sex,
              ageGroup: ageGroupOf(ctx, ageNow(ctx, c)),
              age: ageNow(ctx, c),
              healthKey: pickBand(display.health_bands, c.health).key,
            }));
            const sib = aliveMembers(ctx, sibH).find((c) => {
              const rel = relationToPlayer(ctx, c);
              return rel === 'older_sibling' || rel === 'younger_sibling';
            }) ?? aliveMembers(ctx, sibH)[0];
            return {
              id: sibH.id,
              headCall: sib ? callOf(ctx, sib) : '',
              farmland: farmlandOf(sibH, content),
              members,
            };
          })
          .filter((x) => x.members.length > 0);
      })(),
    },
    wealthUnits: { modernPerQuan: display.wealth.modern_per_quan, m2PerSao: display.wealth.m2_per_sao },
    personal: (() => {
      const p = state.purse;
      const kinds = content.balance.economy.purse.income_ledgers;
      const last = p.history[p.history.length - 1];
      const current = p.ledger.filter((e) => kinds.includes(e.category)).reduce((sum, e) => sum + Math.max(0, e.money), 0);
      return {
        active: purseActive(ctx),
        money: p.money,
        incomeYear: last ? last.income : current,
        yearClose: last ? yearCloseOf(ctx, last) : null,
        closes: p.history.map((y) => yearCloseOf(ctx, y)),
        familyKey: pickBand(display.family_bands, householdNetWorth(ctx)).key,
        young: age < content.balance.life.adult_age,
      };
    })(),
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
        autoSellSurplus: state.autoManage.sellSurplus,
        autoInvest: state.autoManage.invest,
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
              ((c.join?.cost_money ?? 0) === 0 ||
                (householdHead(ctx)?.id === state.playerId ? h.money : state.purse.money) >= (c.join?.cost_money ?? 0)),
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
    ledger: { current: h.ledger, history: state.ledgerHistory, closes: state.ledgerHistory.map((y) => yearCloseOf(ctx, y)) },
    pending: state.pending
      ? {
          ...state.pending,
          options: state.pending.options.map((o) => ({ ...o, chanceKey: o.chance ? chanceKey(ctx, (o.chance.shown[0] + o.chance.shown[1]) / 2) : undefined })),
        }
      : null,
    lastResolution: state.lastResolution,
    gameOver: state.gameOver ? getLifeSummary(ctx) : null,
    dynasty: getDynastyView(ctx),
    succession: state.gameOver && state.playMode === 'dynasty' ? getSuccessionView(ctx) : null,
  };
}

function buildFamilyTree(ctx: SimContext): FamilyTreeNodeView[] {
  const { state } = ctx;
  const me = player(ctx);
  const playedIds = new Set(state.dynasty.pastLives.map((p) => p.characterId));
  playedIds.add(me.id);

  // Suy luận thế hệ cho các thành viên gia đình chưa gán generation
  const genMap = new Map<string, number>();
  for (const c of Object.values(state.characters)) {
    if (c.generation !== undefined) genMap.set(c.id, c.generation);
  }
  if (!genMap.has(me.id)) genMap.set(me.id, state.dynasty.currentGeneration);

  for (let pass = 0; pass < 4; pass++) {
    for (const c of Object.values(state.characters)) {
      if (c.villageRole) continue;
      const curGen = genMap.get(c.id);
      if (curGen !== undefined) {
        if (c.fatherId && !genMap.has(c.fatherId)) genMap.set(c.fatherId, curGen - 1);
        if (c.motherId && !genMap.has(c.motherId)) genMap.set(c.motherId, curGen - 1);
        if (c.spouseId && !genMap.has(c.spouseId)) genMap.set(c.spouseId, curGen);
      } else {
        const fGen = c.fatherId ? genMap.get(c.fatherId) : undefined;
        const mGen = c.motherId ? genMap.get(c.motherId) : undefined;
        if (fGen !== undefined) genMap.set(c.id, fGen + 1);
        else if (mGen !== undefined) genMap.set(c.id, mGen + 1);
      }
    }
  }

  return Object.values(state.characters)
    .filter((c) => !c.villageRole && (genMap.has(c.id) || c.familyName === state.dynasty.familyName))
    .map((c) => {
      const spouse = c.spouseId ? state.characters[c.spouseId] : undefined;
      return {
        id: c.id,
        name: fullName(c),
        call: callOf(ctx, c),
        sex: c.sex,
        generation: genMap.get(c.id) ?? state.dynasty.currentGeneration,
        birthYear: c.birthYear,
        deathYear: c.deathYear ?? null,
        age: ageNow(ctx, c),
        alive: c.alive,
        isPlayer: c.id === state.playerId,
        wasPlayed: playedIds.has(c.id),
        adopted: Boolean(c.adopted),
        collateral: Boolean(c.collateral),
        fatherId: c.fatherId ?? null,
        motherId: c.motherId ?? null,
        spouseName: spouse ? fullName(spouse) : null,
      };
    })
    .sort((a, b) => a.generation - b.generation || a.birthYear - b.birthYear);
}

export function getDynastyView(ctx: SimContext): DynastyView {
  const { state } = ctx;
  const me = player(ctx);
  const guardian = state.dynasty.guardianId ? state.characters[state.dynasty.guardianId] : undefined;
  const adoptC = canAdoptChild(ctx);
  const adoptR = canAdoptRelative(ctx);

  return {
    playMode: state.playMode,
    familyName: state.dynasty.familyName || me.familyName,
    currentGeneration: state.dynasty.currentGeneration,
    prestige: state.dynasty.prestige,
    guardianCall: guardian?.alive && ageNow(ctx, me) < ctx.content.balance.life.adult_age ? callOf(ctx, guardian) : null,
    unfinishedWishes: state.dynasty.unfinishedWishes,
    feuds: state.dynasty.feuds,
    pastLives: state.dynasty.pastLives,
    familyTree: buildFamilyTree(ctx),
    canAdoptChild: adoptC.ok,
    canAdoptRelative: adoptR.ok,
    adoptChildCost: adoptC.cost,
    adoptRelativeCost: adoptR.cost,
  };
}

export function getDynastySummary(ctx: SimContext): DynastySummaryView {
  const { state, content } = ctx;
  const me = player(ctx);
  const h = playerHousehold(ctx);
  const civ = currentCivilization(ctx);

  // Bao gồm cả các đời trước và đời hiện tại nếu vừa kết thúc
  const currentRecord: PastLifeRecord = {
    generation: state.dynasty.currentGeneration,
    characterId: me.id,
    name: fullName(me),
    sex: me.sex,
    birthYear: me.birthYear,
    deathYear: state.gameOver?.year ?? state.clock.year,
    deathAge: state.gameOver?.age ?? ageNow(ctx, me),
    causeId: state.gameOver?.causeId ?? me.deathCauseId ?? 'tuoi_gia',
    causeName:
      content.balance.life.mortality.causes.find((c) => c.id === (state.gameOver?.causeId ?? me.deathCauseId))?.name ??
      (state.gameOver?.causeId ?? ''),
    careerId: state.career.id || state.householdCareer,
    statusRankId: state.civilization.statusRank,
    examDegreeId: state.civilization.examDegree,
    yearsPlayed: Math.max(0, (state.gameOver?.year ?? state.clock.year) - (state.generationStartYear ?? content.balance.time.start_year)),
    decisions: state.stats.decisions,
    closing: {
      money: Math.round(h.money + state.purse.money),
      food: Math.round(h.food),
      debt: Math.round(h.debt),
      farmland: h.properties.ruong ?? 0,
      netWorth: Math.round(householdNetWorth(ctx)),
    },
    axes: computeSummaryAxes(ctx),
    highlights: state.log.flatMap((y) =>
      y.entries
        .filter((e) => e.importance >= content.balance.display.highlight_importance)
        .map((e) => ({ year: y.year, text: e.text })),
    ),
    lifeMap: state.lifeMap,
    log: state.log,
  };

  const lives = state.dynasty.pastLives.some(
    (p) => p.characterId === me.id && p.generation === state.dynasty.currentGeneration,
  )
    ? state.dynasty.pastLives
    : [...state.dynasty.pastLives, currentRecord];

  let highestIdx = 0;
  for (const life of lives) {
    const idx = civ.status_ranks.findIndex((r) => r.id === life.statusRankId);
    if (idx > highestIdx) highestIdx = idx;
  }

  return {
    familyName: state.dynasty.familyName || me.familyName,
    generationsCount: lives.length,
    totalYears: Math.max(0, state.clock.year - content.balance.time.start_year),
    prestige: state.dynasty.prestige,
    highestStatusRankName: civ.status_ranks[highestIdx]?.name ?? civ.status_ranks[0].name,
    wishesFulfilled: state.dynasty.unfinishedWishes.filter((w) => w.fulfilled).length,
    wishesTotal: state.dynasty.unfinishedWishes.length,
    lives,
  };
}

export function getSuccessionView(ctx: SimContext): SuccessionView {
  const candidates = getHeirCandidates(ctx, player(ctx));
  return {
    candidates,
    extinct: candidates.length === 0,
    dynastySummary: getDynastySummary(ctx),
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
    yearsPlayed: Math.max(0, state.gameOver.year - (state.generationStartYear ?? content.balance.time.start_year)),
    decisions: state.stats.decisions,
    closing: { money: h.money, food: h.food, debt: h.debt, farmland },
    axes: computeSummaryAxes(ctx),
    highlights: state.log.flatMap((y) => y.entries.filter((e) => e.importance >= threshold).map((e) => ({ year: y.year, text: e.text }))),
  };
}
