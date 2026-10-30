// [0] Các hàm lấy dữ liệu để hiển thị. Trả về view model thuần; chữ do người viết nội dung soạn
// (tên Focus, lời kể) đi kèm sẵn, còn nhãn giao diện là khóa để UI tra data/lang.
import { clamp, pickBand } from '@shared/curve';
import { canChi } from '../engine/GameClock';
import type { ModifierLine, ModifierResult } from '../engine/ModifierSystem';
import { StatTarget } from '../engine/statTargets';
import { fullName } from '../entities/Character';
import type { ClanTie, DynastyFeud, PastLifeRecord, UnfinishedWish } from '../entities/Dynasty';
import type { LedgerEntry, LedgerYear } from '../entities/Household';
import type { DelegationPolicy, OrganizationFactors } from '../entities/Organization';
import type { RebellionStageId } from '../entities/Polity';
import type { ProvinceState } from '../entities/Province';
import { farmlandOf, holdingsOf } from '../entities/Property';
import type { CareerHistoryEntry, HookState, LogYear, PendingEvent, Resolution, SchemeState, SecretState } from '../entities/World';
import { aliveClanMembers } from '../systems/ai';
import type { SimContext } from '../systems/context';
import {
  availableBorrowers,
  availableCreditors,
  canOpenVenture,
  estimateVentureYear,
  houseUpgradeInfo,
  isUpgradeTargetVenture,
   purseActive,
  regularIncomeParts,
  ventureAssetValue,
  ventureExpandCost,
  ventureStatusKey,
} from '../systems/economy';
import { buyPrice, householdNetWorth, lastYearIncome, ledgerValue, monthlyFoodNeed, monthlyMoneyNeed, selfFarms, sellPrice } from '../systems/economy/helpers';
import { Ledger } from '../events/systemLogKeys';
import {
  aliveChildrenOf,
  canAdoptChild,
  canAdoptRelative,
  getHeirCandidates,
  getMarriageableMembers,
  getMatchmakingCandidates,
  type HeirCandidate,
  type MatchmakingCandidate,
} from '../systems/family';
import { healthCap, treatmentBlock } from '../systems/life';
import { lifeExpectancyAtBirth } from '../systems/life/mortality';
import { CHRONICLE_SOURCE_PREFIX } from '../systems/chronicle';
import { computeFor } from '../systems/modifiers';
import { activeCulture, ageGroupOf, ageNow, aliveMembers, callOf, eraStyleOf, householdHead, inCurrentEra, lifeStageOf, player, playerHousehold, relationToPlayer, type EraStyle } from '../systems/people';
import { createResolver, seasonOf } from '../systems/resolver';
import {
  activeSettlementId,
  canAppointPrefectureOfficial,
  findSettlementRoute,
  initRegionSettlements,
} from '../world/region';
import { evaluate } from '../engine/RuleEvaluator';
import { fillTemplate } from '@shared/template';
import {
  actionChance,
  canExecuteCareerAction,
  careerAvailable,
  careerInSettlement,
  careerSeniorityFactor,
  isSideJobActiveThisMonth,
  isUnlockedCareerExit,
  memberMonthlyCareerIncome,
  playerSectorMonths,
  sideJobAvailable,
} from '../systems/career';
import { computeSummaryAxes, type SummaryAxisView } from '../systems/happiness';
import { canJoinOrganization, ensureOrganizations } from '../systems/organization';
import { ensurePoliticsState } from '../systems/politics';
import { ensureRebellionState } from '../systems/rebellion';
import { xpToNext } from '../systems/skills';
import { ensureSocialState } from '../systems/social';
import { currentCivilization, currentStatusRank } from '../systems/status';
import { ambitionAvailable, focusAvailable } from './commands';
import { getLifeCard, getStoryView, type LifeCardView, type StoryView } from './storyQueries';

export interface HudView {
  date: {
    year: number;
    month: number;
    monthsPerYear: number;
    can: number;
    chi: number;
    seasonName: string;
    weatherName: string;
    calendarStyle: 'can_chi' | 'bce_ce';
  };
  /** Bối cảnh thế giới & từ vựng đơn vị theo văn hóa hiện tại. */
  worldContext: {
    polityName: string;
    eraName: string;
    eraStyle: EraStyle;
    civilizationId: string;
    civilizationName: string;
    ethnicityName: string;
    religionId: string;
    religionName: string;
    religionDescription: string;
    shrineName: string;
    calendarStyle: 'can_chi' | 'bce_ce';
    lexicon: { currency: string; food: string; land: string; stapleCrop: string };
  };
  /** [1] Niên hiệu và năm thứ mấy của triều vua hiện tại (biên niên giả tưởng). */
  reign: { name: string; year: number };
  player: {
    id: string;
    name: string;
    ageGroup: string;
    birth: { year: number; month: number; can: number; chi: number };
    originName: string;
    ethnicityName: string;
    phenotypeId: string;
    religionId: string;
    religionName: string;
    religionDescription: string;
    shrineName: string;
    age: number;
    sex: 'm' | 'f';
    lifeStageId: string;
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
    satisfactionBreakdown: ModifierResult;
    reputation: number;
    reputationKey: string;
    reputationBreakdown: ModifierResult;
    filialPiety: number;
    filialPietyBreakdown: ModifierResult;
    scholarlyPrestige: number;
    scholarlyPrestigeBreakdown: ModifierResult;
    examDegreeId: string;
    examDegreeName: string;
    mourningMonthsLeft: number;
    /** [1] Bậc thang địa vị hiện tại (index trong thang, 0 = thấp nhất). */
    statusRank: { id: string; name: string; description: string; index: number; total: number };
    deathRiskMod: ModifierResult;
    diseases: { id: string; name: string; description: string; severity: string; remainingMonths: number }[];
    traits: { id: string; name: string; description: string }[];
    skills: { id: string; name: string; level: number; xp: number; next: number; bandKey: string }[];
    /** [1] Ký ức cá nhân đang còn ảnh hưởng tâm lý. */
    memories: { id: string; label: string; importance: number; moodDelta: number; remainingMonths: number }[];
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
    members: {
      id: string;
      call: string;
      name: string;
      relation: string;
      sex: 'm' | 'f';
      ageGroup: string;
      age: number;
      healthKey: string;
      isPlayer: boolean;
      upbringing: string | null;
      canSetUpbringing: boolean;
      canArrangeMarriage: boolean;
      traits: string[];
      careerId: string | null;
      careerName: string | null;
      careerRankName: string | null;
      careerMonths: number;
    }[];
    upbringingOptions: { id: string; name: string; description: string; costMoneyMonth: number }[];
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
    properties: { id: string; name: string; description: string; unit: string; count: number; value: number; sellable: boolean; category: string; farmland: boolean }[];
    harvestYield: ModifierResult;
    /** [1] Nơi hộ sinh sống. */
    settlement: { name: string; typeName: string; typeDescription: string };
    /** [1] Hộ tự cày (false: ruộng phát canh thu tô). */
    selfFarm: boolean;
    /** [1] Tiền thu đều đặn mỗi tháng ước tính theo thời giá hiện tại (nghề nhà + Focus). */
    regularIncome: number;
    /** [1.5] Tài sản ròng (tiền + thóc theo giá gốc + tài sản − nợ), quan. */
    netWorth: number;
    /** [1.8] Tài sản ròng hiển thị chốt theo năm (cập nhật đầu mỗi năm + khi có quyết định/chi tiêu trực tiếp, không nhảy số lặt vặt mỗi tháng). */
    annualNetWorth: number;
    netWorthBreakdown: ModifierResult;
    /** [1.5] Thu nhập năm vừa chốt sổ (thóc quy ra tiền); chưa chốt năm nào thì phần đã làm ra năm nay. */
    incomeYear: number;
    incomeBreakdown: ModifierResult;
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
    /** [1.8] Túi tiền riêng hiển thị chốt theo năm (cộng trừ ngay khi có sự kiện/hành động trực tiếp). */
    annualMoney: number;
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
  /** [6] Nâng cấp nhà ở lên bậc cao hơn kế tiếp (nhà tranh -> nhà gỗ -> phủ đệ). */
  houseUpgrade: {
    currentId: string;
    currentName: string;
    nextId: string;
    nextName: string;
    nextDescription: string;
    cost: number;
    canAfford: boolean;
  } | null;
  /** [6] Cơ nghiệp kinh doanh & sản xuất (đang sở hữu và có thể mở mới). */
  ventures: {
    owned: {
      id: string;
      name: string;
      description: string;
      icon: string;
      stage: number;
      maxStage: number;
      health: number;
      statusKey: 'thriving' | 'normal' | 'declining' | 'critical';
      hiredWorkers: number;
      workersNeeded: number;
      familyWorkersUsed: number;
      hireWageYear: number;
      revenueYear: number;
      upkeepYear: number;
      profitYear: number;
      assetValue: number;
      sellPrice: number;
      expandCost: number | null;
      expandName: string | null;
      canExpand: boolean;
    }[];
    openable: {
      id: string;
      name: string;
      description: string;
      icon: string;
      capitalCost: number;
      baseRevenueYear: number;
      upkeepYear: number;
      workersNeeded: number;
      skillName: string;
      canOpen: boolean;
      canAfford: boolean;
    }[];
  };
  /** [6] Vay & cho vay gắn với NPC cụ thể (ân tình, thù oán, đòi nợ). */
  npcLoans: {
    borrowed: {
      id: string;
      npcId: string;
      npcName: string;
      npcCall: string;
      principal: number;
      amount: number;
      interestRate: number;
      dueYear: number;
      overdueYears: number;
    }[];
    lent: {
      id: string;
      npcId: string;
      npcName: string;
      npcCall: string;
      principal: number;
      amount: number;
      interestRate: number;
      dueYear: number;
      overdueYears: number;
    }[];
    creditors: {
      id: string;
      name: string;
      call: string;
      interestRate: number;
    }[];
    borrowers: {
      id: string;
      name: string;
      call: string;
      opinion: number;
      favor: number;
    }[];
    borrowAmounts: number[];
    lendAmounts: number[];
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
    /** [2] Ngành nghề (nong_nghiep, thu_cong, thuong_mai, y_dao, quan_binh, giang_ho, quan_hoc, dịch vụ...). */
    sector: string;
    /** [2] Độ sâu nghề (nhe / vua / sau). */
    depth: string;
    /** [1] Số tháng làm nghề hiện tại (thâm niên). */
    months: number;
    /** [2] Tổng số tháng đã làm trong ngành hiện tại (cộng dồn cả khi đổi nghề cùng ngành). */
    sectorMonths: number;
    /** [2] Phần trăm thưởng thu nhập theo thâm niên ngành. */
    seniorityBonusPercent: number;
    /** [1] Nghề nhà (nuôi cả hộ) — có thể khác nghề riêng của người chơi. */
    household: { id: string; name: string; icon: string };
    components: string[];
    skills: { id: string; name: string; level: number }[];
    rankIndex: number;
    rankName: string;
    nextRankName: string | null;
    nextRankMerit: number | null;
    nextRankRequirements: {
      minMerit: number;
      minYears: number;
      minSkill: { id: string; name: string; level: number; currentLevel: number } | null;
      minReputation: number | null;
    } | null;
    merit: number;
    wanted: number;
    stipendMoney: number;
    stipendFood: number;
    incomeRange: [number, number] | null;
    workEffects: {
      healthMonth: number;
      stressMonth: number;
      skillXp: { id: string; name: string; xp: number }[];
    };
    duties: string[];
    exits: {
      toId: string;
      toName: string;
      toIcon: string;
      hint: string;
      unlocked: boolean;
    }[];
    sideJob: {
      currentId: string | null;
      currentName: string | null;
      activeThisMonth: boolean;
      options: {
        id: string;
        name: string;
        description: string;
        icon: string;
        seasons: string[];
        seasonNames: string[];
        incomeMoneyMonth: number;
        stressMonth: number;
        available: boolean;
      }[];
    };
    familyCareers: {
      characterId: string;
      call: string;
      name: string;
      age: number;
      isPlayer: boolean;
      careerId: string;
      careerName: string;
      rankName: string;
      months: number;
      monthlyIncome: number;
      canChange: boolean;
    }[];
    history: {
      careerId: string;
      careerName: string;
      sector: string;
      rankName: string;
      startYear: number;
      endYear: number | null;
      months: number;
    }[];
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
      sector: string;
      depth: string;
      inSettlement: boolean;
      isExit: boolean;
      incomeRange: [number, number];
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
  /** Lớp câu chuyện: bạn cùng lứa, mốc suy ngẫm, giấy khai sinh. */
  story: StoryView;
  /** [2] Dòng họ truyền đời: gia phả nhiều đời, sử sách các đời đã qua, di nguyện và thoát hiểm tuyệt tự. */
  dynasty: DynastyView;
  /** [2] Dữ liệu màn hình Truyền đời & Tổng kết dòng họ khi người chơi qua đời ở chế độ dynasty. */
  succession: SuccessionView | null;
  /** [2] Danh sách 5–8 dòng họ NPC trong làng và quan hệ thông gia / ân oán (Phase 4). */
  villageClans: VillageClanView[];
  /** [2] Chợ hôn nhân & gả cưới cho người chơi / con cái (Phase 4). */
  matchmaking: MatchmakingView;
  /** [7] Bản đồ vùng 3 điểm (Làng nông – Thị trấn bến sông – Phủ thành), đi buôn chuyến, chuyển nhà & dịch bệnh. */
  region: RegionView;
  /** [A] Quyền lực mềm: Uy hiếp, Bí mật, Nắm thóp & Mưu sự nhiều tháng. */
  social: {
    dread: number;
    secrets: SecretState[];
    hooks: HookState[];
    activeScheme: SchemeState | null;
  };
  /** [C] Hệ thống Tổ chức Fractal & Ủy quyền (Phase 10). */
  organizations: OrganizationView[];
  /** [D] Hệ thống Chính trị Vương triều, Thiên mệnh, Phe phái, Tỉnh & Nổi dậy 8 giai đoạn (Phase 11). */
  politics: PoliticsView;
}

export interface OrganizationView {
  id: string;
  name: string;
  kind: string;
  description: string;
  settlementId: string;
  joinCostMoney: number;
  canJoin: boolean;
  playerRank: number;
  playerRankName: string | null;
  nextRankName: string | null;
  nextRankMinContribution: number | null;
  playerContribution: number;
  stipendMoneyMonth: number;
  factors: OrganizationFactors;
  delegation: {
    deputyId: string | null;
    deputyName: string | null;
    policy: DelegationPolicy;
    deputyLoyalty: number;
    monthsDelegated: number;
  };
  availableDeputies: { id: string; name: string; call: string; loyalty: number }[];
}

export interface PoliticsView {
  mandateOfHeaven: number;
  imperialTreasury: number;
  imperialArmy: number;
  alignedFactionId: string | null;
  factions: {
    id: string;
    name: string;
    influence: number;
    favorWithPlayer: number;
  }[];
  provinces: ProvinceState[];
  rebellion: {
    stage: RebellionStageId;
    stageIndex: number;
    progress: number;
    grievance: number;
    followers: number;
    supplies: number;
    secrecy: number;
    legitimacy: number;
    promise: 'chia_ruong' | 'xoa_thue' | 'tru_gian';
    playerJoined: boolean;
  };
}

export interface RegionNodeView {
  id: string;
  name: string;
  typeName: string;
  description: string;
  population: number;
  foodPrice: number;
  tradeIndex: number;
  tradeFactor: number;
  effectiveTradeFactor: number;
  patrolLevel: number;
  harvestQuality: string;
  harvestQualityName: string;
  disaster: string;
  epidemic: {
    diseaseId: string;
    diseaseName: string;
    monthsLeft: number;
  } | null;
  isHome: boolean;
  isCurrent: boolean;
  travelMonths: number;
  travelCost: number;
  relocateCost: number;
  canRelocate: boolean;
  canStartTrip: boolean;
  routes: { to: string; travelMonths: number; costMoney: number }[];
}

export interface RegionView {
  currentSettlementId: string;
  currentSettlementName: string;
  currentSettlementTypeName: string;
  homeSettlementId: string;
  homeSettlementName: string;
  homeSettlementTypeName: string;
  activeTrip: {
    kind: string;
    targetSettlementId: string;
    targetName: string;
    totalMonths: number;
    monthsLeft: number;
    cargoMoney: number;
    cancelRefund: number;
  } | null;
  cargoOptions: number[];
  canAppointOfficial: boolean;
  officialStipend: number;
  ruralPropertyRefund: number;
  settlements: RegionNodeView[];
}

export interface VillageClanView {
  id: string;
  familyName: string;
  headName: string;
  headAge: number;
  careerId: string;
  careerName: string;
  statusRankId: string;
  statusRankName: string;
  prestige: number;
  farmland: number;
  memberCount: number;
  relationWithPlayer: number;
  tie: ClanTie;
  tieReason?: string;
}

export interface MatchmakingTargetView {
  characterId: string;
  name: string;
  call: string;
  sex: 'm' | 'f';
  age: number;
  isPlayer: boolean;
  traits: { id: string; name: string }[];
  candidates: MatchmakingCandidate[];
}

export interface MatchmakingView {
  targets: MatchmakingTargetView[];
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
  careerHistory: {
    careerId: string;
    careerName: string;
    rankName: string;
    startYear: number;
    endYear: number | null;
    months: number;
  }[];
  /** Thẻ đời để chia sẻ (bạn cùng lứa, mốc suy ngẫm, văn bia, bản đồ đời). */
  card: LifeCardView | null;
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

const r10 = (v: number): number => Math.round(v * 10) / 10;

/** Tên tài sản tùy biến theo khuôn văn minh hiện tại (fallback về tên gốc). */
function propNameOf(ctx: SimContext, p: { name: string; names_by_civ?: Record<string, string> }): string {
  return p.names_by_civ?.[ctx.state.civilization.id] ?? p.name;
}

/** Mô tả tài sản tùy biến theo khuôn văn minh hiện tại. */
function propDescOf(ctx: SimContext, p: { description: string; descriptions_by_civ?: Record<string, string> }): string {
  return p.descriptions_by_civ?.[ctx.state.civilization.id] ?? p.description;
}

/** Tên nghề tùy biến theo khuôn văn minh hiện tại (fallback về tên gốc). */
function careerNameOf(ctx: SimContext, c: { name: string; names_by_civ?: Record<string, string> } | undefined): string {
  if (!c) return '';
  return c.names_by_civ?.[ctx.state.civilization.id] ?? c.name;
}

/** Tên bậc nghề tùy biến theo khuôn văn minh hiện tại (fallback về tên gốc). */
function careerRankNameOf(ctx: SimContext, r: { name: string; names_by_civ?: Record<string, string> } | undefined): string {
  if (!r) return '';
  return r.names_by_civ?.[ctx.state.civilization.id] ?? r.name;
}

/** Tên xuất thân tùy biến theo khuôn văn minh hiện tại. */
function originNameOf(ctx: SimContext, o: { name: string; names_by_civ?: Record<string, string> } | undefined): string {
  if (!o) return '';
  return o.names_by_civ?.[ctx.state.civilization.id] ?? o.name;
}

/** Tên khu định cư tùy biến theo khuôn văn minh hiện tại. */
function settlementNameOf(ctx: SimContext, st: { name: string; names_by_civ?: Record<string, string> } | undefined): string {
  if (!st) return '';
  return st.names_by_civ?.[ctx.state.civilization.id] ?? st.name;
}

/** Mô tả khu định cư tùy biến theo khuôn văn minh hiện tại. */
function settlementDescOf(ctx: SimContext, st: { description: string; descriptions_by_civ?: Record<string, string> } | undefined): string {
  if (!st) return '';
  return st.descriptions_by_civ?.[ctx.state.civilization.id] ?? st.description;
}

/** Mô tả nghề tùy biến theo khuôn văn minh hiện tại. */
function careerDescOf(ctx: SimContext, c: { description: string; descriptions_by_civ?: Record<string, string> } | undefined): string {
  if (!c) return '';
  return c.descriptions_by_civ?.[ctx.state.civilization.id] ?? c.description;
}

function computeSatisfactionBreakdown(ctx: SimContext): ModifierResult {
  const { state, content } = ctx;
  const me = player(ctx);
  const hCfg = content.balance.life.happiness;
  const r = createResolver(ctx);
  const lines: ModifierLine[] = [
    { sourceId: 'sat:base', label: 'mods.sat.base', op: 'add', value: hCfg.start },
  ];
  const [sLo, sHi] = hCfg.satisfaction_wealth_clamp;
  const wealthGap = r10(clamp((householdNetWorth(ctx) - state.happiness.baselineWealth) * hCfg.wealth_factor, sLo, sHi));
  if (wealthGap !== 0) {
    lines.push({ sourceId: 'sat:wealth', label: 'mods.sat.wealth_gap', op: 'add', value: wealthGap });
  }
  const hasSpouse = !!(me.spouseId && state.characters[me.spouseId]?.alive);
  const childrenCount = aliveChildrenOf(ctx, me.id).length;
  const familyBonus = (hasSpouse ? hCfg.marriage_bonus : 0) + Math.min(childrenCount * hCfg.child_bonus, hCfg.child_bonus_cap);
  if (familyBonus !== 0) {
    lines.push({ sourceId: 'sat:family', label: 'mods.sat.family', op: 'add', value: familyBonus });
  }
  const valAlign = hCfg.value_rules.reduce((sum, rule) => sum + (evaluate(rule.condition, r) ? rule.value : 0), 0);
  if (valAlign !== 0) {
    lines.push({ sourceId: 'sat:values', label: 'mods.sat.trait_values', op: 'add', value: valAlign });
  }
  if (state.happiness.ambitionBonus !== 0) {
    lines.push({ sourceId: 'sat:ambition', label: 'mods.sat.ambition', op: 'add', value: state.happiness.ambitionBonus });
  }
  const stressPen = -r10(me.stress * hCfg.stress_penalty_factor * hCfg.satisfaction_stress_share);
  if (stressPen !== 0) {
    lines.push({ sourceId: 'sat:stress', label: 'mods.sat.stress', op: 'add', value: stressPen });
  }
  const deadFamilyCount = Object.values(state.characters).filter(
    (c) => !c.alive && c.householdId === state.householdId && c.id !== me.id,
  ).length;
  const lossPen = -Math.min(deadFamilyCount * hCfg.family_death_penalty, hCfg.family_death_penalty_cap);
  if (lossPen !== 0) {
    lines.push({ sourceId: 'sat:loss', label: 'mods.sat.family_loss', op: 'add', value: lossPen });
  }
  return { value: state.happiness.satisfaction, base: 0, lines };
}

function computeReputationBreakdown(ctx: SimContext): ModifierResult {
  const { state } = ctx;
  const rep = state.reputation.dan_lang ?? 0;
  const civ = currentCivilization(ctx);
  const st = currentStatusRank(ctx);
  const deg = civ.exam_degrees.find((d) => d.id === state.civilization.examDegree);
  const degRep = deg ? r10(deg.prestige_gain * civ.prestige_reputation_factor) : 0;
  const otherRep = r10(rep - degRep);
  const lines: ModifierLine[] = [];
  if (degRep !== 0 && deg) {
    lines.push({ sourceId: 'rep:degree', label: deg.name, op: 'add', value: degRep });
  }
  if (otherRep !== 0 || lines.length === 0) {
    lines.push({ sourceId: 'rep:deeds', label: 'mods.rep.village_deeds', op: 'add', value: otherRep });
  }
  if (st.id !== civ.status_ranks[0]?.id) {
    lines.push({ sourceId: 'rep:status', label: st.name, op: 'add', value: 0 });
  }
  return { value: rep, base: 0, lines };
}

function computeFilialPietyBreakdown(ctx: SimContext): ModifierResult {
  const { state, content } = ctx;
  const civ = currentCivilization(ctx);
  const origin = content.index.origin.get(state.originId);
  const startVal = origin?.start_status.filial_piety ?? civ.start.filial_piety;
  const cur = state.civilization.filialPiety;
  const diff = r10(cur - startVal);
  const lines: ModifierLine[] = [
    { sourceId: 'filial:start', label: 'mods.filial.start', op: 'add', value: startVal },
  ];
  if (diff !== 0) {
    lines.push({ sourceId: 'filial:deeds', label: 'mods.filial.deeds', op: 'add', value: diff });
  }
  if (state.civilization.mourningMonthsLeft > 0) {
    lines.push({ sourceId: 'filial:mourning', label: 'mods.filial.mourning', op: 'add', value: 0 });
  }
  return { value: cur, base: 0, lines };
}

function computeScholarlyPrestigeBreakdown(ctx: SimContext): ModifierResult {
  const { state, content } = ctx;
  const civ = currentCivilization(ctx);
  const origin = content.index.origin.get(state.originId);
  const startVal = origin?.start_status.scholarly_prestige ?? civ.start.scholarly_prestige;
  const cur = state.civilization.scholarlyPrestige;
  const deg = civ.exam_degrees.find((d) => d.id === state.civilization.examDegree);
  const degGain = deg?.prestige_gain ?? 0;
  const diff = r10(cur - startVal - degGain);
  const lines: ModifierLine[] = [];
  if (startVal !== 0) {
    lines.push({ sourceId: 'sch:start', label: 'mods.scholarly.start', op: 'add', value: startVal });
  }
  if (degGain !== 0 && deg) {
    lines.push({ sourceId: 'sch:degree', label: deg.name, op: 'add', value: degGain });
  }
  if (diff !== 0 || lines.length === 0) {
    lines.push({ sourceId: 'sch:deeds', label: 'mods.scholarly.deeds', op: 'add', value: diff });
  }
  return { value: cur, base: 0, lines };
}

function computeNetWorthBreakdown(ctx: SimContext): ModifierResult {
  const { content } = ctx;
  const h = playerHousehold(ctx);
  const lines: ModifierLine[] = [];
  if (h.money !== 0) {
    lines.push({ sourceId: 'nw:cash', label: 'mods.wealth.cash', op: 'add', value: r10(h.money) });
  }
  const foodVal = r10(Math.max(0, h.food) * content.balance.economy.price.base);
  if (foodVal > 0) {
    lines.push({ sourceId: 'nw:food', label: 'mods.wealth.granary', op: 'add', value: foodVal });
  }
  for (const p of holdingsOf(h, content)) {
    const val = r10(p.type.value * p.count);
    if (val > 0) {
      lines.push({ sourceId: `nw:prop:${p.type.id}`, label: `${propNameOf(ctx, p.type)} (×${p.count})`, op: 'add', value: val });
    }
  }
  for (const v of h.ventures ?? []) {
    const def = content.index.venture.get(v.id);
    const val = r10(ventureAssetValue(ctx, v));
    if (val > 0) {
      lines.push({ sourceId: `nw:venture:${v.id}`, label: def?.name ?? v.id, op: 'add', value: val });
    }
  }
  const lentTotal = r10((h.loans ?? []).filter((l) => l.kind === 'lent').reduce((s, l) => s + l.amount, 0));
  if (lentTotal > 0) {
    lines.push({ sourceId: 'nw:lent', label: 'mods.wealth.loans_lent', op: 'add', value: lentTotal });
  }
  if (h.debt > 0) {
    lines.push({ sourceId: 'nw:debt', label: 'ledger.debt', op: 'add', value: -r10(h.debt) });
  }
  return { value: r10(householdNetWorth(ctx)), base: 0, lines };
}

function computeIncomeBreakdown(ctx: SimContext): ModifierResult {
  const { state, content } = ctx;
  const h = playerHousehold(ctx);
  const kinds = content.balance.economy.income_ledgers;
  const lastYear = state.ledgerHistory[state.ledgerHistory.length - 1];
  const entries = lastYear ? lastYear.entries : h.ledger;
  const lines: ModifierLine[] = [];
  for (const e of entries) {
    if (!kinds.includes(e.category)) continue;
    const val = r10(ledgerValue(ctx, e));
    if (val > 0) {
      lines.push({ sourceId: `inc:${e.category}`, label: `ledger.${e.category}`, op: 'add', value: val });
    }
  }
  if (lines.length === 0) {
    for (const part of regularIncomeParts(ctx)) {
      const yrVal = r10(part.money * content.balance.calendar.months_per_year);
      if (yrVal > 0) {
        lines.push({ sourceId: `inc:reg:${part.ledger}`, label: `ledger.${part.ledger}`, op: 'add', value: yrVal });
      }
    }
  }
  if (lines.length === 0) {
    lines.push({ sourceId: 'inc:none', label: 'mods.income.no_record_yet', op: 'add', value: 0 });
  }
  return { value: r10(lastYearIncome(ctx)), base: 0, lines };
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
  ].slice(0, 3);

  const culture = activeCulture(ctx);
  const calendarStyle: 'can_chi' | 'bce_ce' =
    state.civilization.id === 'hien_dai' || state.clock.year >= 1945 || state.clock.year < -500
      ? 'bce_ce'
      : (culture?.calendar_style ?? 'can_chi');
  const showReign = state.civilization.id === 'nho_giao' && state.clock.year >= 0 && state.clock.year < 1945;
  const polity = state.polityId ? content.index.polity.get(state.polityId) : undefined;
  const bookmark = state.bookmarkId ? content.index.bookmark.get(state.bookmarkId) : undefined;
  const civDef = currentCivilization(ctx);
  const rawLex = culture?.lexicon ?? { currency: '', food: '', land: '', staple_crop: '' };
  const eraStyle = eraStyleOf(state.clock.year, civDef.id);
  const ethnicityName = me.ethnicityName ?? polity?.ethnicity_name ?? culture?.ethnicity_name ?? culture?.name ?? '';
  const phenotypeId = me.phenotypeId ?? polity?.phenotype ?? culture?.phenotype ?? 'dong_a_bac';
  const relId = me.religionId ?? state.religionId ?? polity?.religion ?? culture?.default_religion ?? 'tho_to_tien';
  const relDef = content.index.religion.get(relId) ?? content.religions[0];

  return {
    date: {
      year: state.clock.year,
      month: state.clock.month,
      monthsPerYear: cal.months_per_year,
      can: cc.can,
      chi: cc.chi,
      seasonName: cal.seasons.find((s) => s.id === seasonOf(ctx))?.name ?? '',
      weatherName: cal.weathers.find((w) => w.id === state.world.weather)?.name ?? '',
      calendarStyle,
    },
    worldContext: {
      polityName: polity?.name ?? '',
      eraName: bookmark?.era_name ?? '',
      eraStyle,
      civilizationId: civDef.id,
      civilizationName: civDef.name,
      ethnicityName,
      religionId: relDef?.id ?? relId,
      religionName: relDef?.name ?? relId,
      religionDescription: relDef?.description ?? '',
      shrineName: relDef?.shrine_name ?? '',
      calendarStyle,
      lexicon: {
        currency: rawLex.currency,
        food: rawLex.food,
        land: rawLex.land,
        stapleCrop: rawLex.staple_crop,
      },
    },
    reign: { name: showReign ? state.world.reignName : '', year: state.clock.year - state.world.reignStartYear + 1 },
    player: {
      id: me.id,
      name: fullName(me),
      ageGroup: ageGroupOf(ctx, age),
      birth: { year: me.birthYear, month: me.birthMonth, ...canChi(me.birthYear) },
      originName: originNameOf(ctx, content.index.origin.get(state.originId)),
      ethnicityName,
      phenotypeId,
      religionId: relDef?.id ?? relId,
      religionName: relDef?.name ?? relId,
      religionDescription: relDef?.description ?? '',
      shrineName: relDef?.shrine_name ?? '',
      age,
      sex: me.sex,
      lifeStageId: stage.id,
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
      satisfactionBreakdown: computeSatisfactionBreakdown(ctx),
      reputation: state.reputation.dan_lang ?? 0,
      reputationKey: pickBand(display.reputation_bands, state.reputation.dan_lang ?? 0).key,
      reputationBreakdown: computeReputationBreakdown(ctx),
      filialPiety: state.civilization.filialPiety,
      filialPietyBreakdown: computeFilialPietyBreakdown(ctx),
      scholarlyPrestige: state.civilization.scholarlyPrestige,
      scholarlyPrestigeBreakdown: computeScholarlyPrestigeBreakdown(ctx),
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
      memories: (me.memories ?? []).map((m) => ({
        id: m.id,
        label: m.label,
        importance: m.importance,
        moodDelta: m.moodDelta,
        remainingMonths: m.remainingMonths,
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
      members: aliveMembers(ctx, h).map((c) => {
        const cAge = ageNow(ctx, c);
        const upCfg = content.balance.life.child_upbringing;
        const isChild = c.id !== me.id && (c.fatherId === me.id || c.motherId === me.id || Boolean(c.adopted) || Boolean(c.collateral));
        const canSetUpbringing = isChild && cAge >= upCfg.min_age && cAge <= upCfg.max_age;
        const canArrangeMarriage =
          (c.id === me.id || isChild) &&
          cAge >= content.balance.life.marriage.min_age &&
          (!c.spouseId || !state.characters[c.spouseId]?.alive);
        return {
          id: c.id,
          call: callOf(ctx, c),
          name: fullName(c),
          relation: relationToPlayer(ctx, c),
          sex: c.sex,
          ageGroup: ageGroupOf(ctx, cAge),
          age: cAge,
          healthKey: pickBand(display.health_bands, c.health).key,
          isPlayer: c.id === me.id,
          upbringing: canSetUpbringing ? (c.upbringing ?? upCfg.default_option) : (c.upbringing ?? null),
          canSetUpbringing,
          canArrangeMarriage,
          traits: c.traits.map((tId) => content.index.trait.get(tId)?.name ?? tId),
          careerId: c.id === me.id ? state.career.id || null : c.careerId ?? null,
          careerName: (() => {
            const cid = c.id === me.id ? state.career.id : c.careerId;
            const cDef = cid ? content.index.career.get(cid) : undefined;
            return cDef ? careerNameOf(ctx, cDef) : null;
          })(),
          careerRankName: (() => {
            const cid = c.id === me.id ? state.career.id : c.careerId;
            const rIdx = c.id === me.id ? state.career.rankIndex : (c.careerRankIndex ?? 0);
            const cDef = cid ? content.index.career.get(cid) : undefined;
            const rDef = cDef?.ranks[rIdx] ?? cDef?.ranks[0];
            return rDef ? careerRankNameOf(ctx, rDef) : null;
          })(),
          careerMonths:
            c.id === me.id
              ? Math.max(0, state.clock.monthIndex - state.career.since)
              : (c.careerMonths ?? 0),
        };
      }),
      upbringingOptions: content.balance.life.child_upbringing.options.map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description,
        costMoneyMonth: o.cost_money_month,
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
        name: propNameOf(ctx, p.type),
        description: propDescOf(ctx, p.type),
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
        typeName: settlementNameOf(ctx, content.index.settlementType.get(state.world.settlementType)),
        typeDescription: settlementDescOf(ctx, content.index.settlementType.get(state.world.settlementType)),
      },
      selfFarm: selfFarms(ctx),
      regularIncome: regularIncomeParts(ctx).reduce((sum, p) => sum + p.money, 0),
      netWorth: householdNetWorth(ctx),
      annualNetWorth: (() => {
        const immediateSet = new Set<string>([
          Ledger.Event,
          Ledger.Medicine,
          Ledger.Funeral,
          Ledger.PurseMergedIn,
          Ledger.HouseholdSplit,
          Ledger.Inheritance,
        ]);
        const baseOpen =
          state.ledgerHistory.length > 0 || state.yearOpenNetWorth !== 0
            ? state.yearOpenNetWorth
            : householdNetWorth(ctx);
        const immediateDelta = h.ledger
          .filter((e) => immediateSet.has(e.category))
          .reduce((sum, e) => sum + ledgerValue(ctx, e), 0);
        return Math.round(baseOpen + immediateDelta);
      })(),
      netWorthBreakdown: computeNetWorthBreakdown(ctx),
      incomeYear: lastYearIncome(ctx),
      incomeBreakdown: computeIncomeBreakdown(ctx),
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
        annualMoney: (() => {
          const baseOpen = p.history.length > 0 || p.openMoney !== 0 ? p.openMoney : p.money;
          const immediateDelta = p.ledger
            .filter((e) => e.category === Ledger.Event || e.category === Ledger.PurseMergedOut)
            .reduce((sum, e) => sum + e.money, 0);
          return Math.max(0, Math.round(baseOpen + immediateDelta));
        })(),
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
        .filter((p) => p.buyable && inCurrentEra(ctx, p.eras))
        .map((p) => ({ id: p.id, name: propNameOf(ctx, p), unit: p.unit, value: p.value, description: propDescOf(ctx, p) })),
      propertySellFactor: content.balance.economy.property_sell_factor,
    },
    houseUpgrade: (() => {
      const info = houseUpgradeInfo(ctx, h);
      if (!info) return null;
      return {
        currentId: info.current.id,
        currentName: propNameOf(ctx, info.current),
        nextId: info.next.id,
        nextName: propNameOf(ctx, info.next),
        nextDescription: propDescOf(ctx, info.next),
        cost: info.cost,
        canAfford: h.money >= info.cost,
      };
    })(),
    ventures: {
      owned: (h.ventures ?? []).map((v) => {
        const def = content.index.venture.get(v.id);
        const est = estimateVentureYear(ctx, v);
        const exp = ventureExpandCost(ctx, v);
        const assetVal = ventureAssetValue(ctx, v);
        return {
          id: v.id,
          name: def?.name ?? v.id,
          description: def?.description ?? '',
          icon: def?.icon ?? 'focus',
          stage: v.stage,
          maxStage: def?.max_stage ?? 3,
          health: Math.round(v.health),
          statusKey: ventureStatusKey(ctx, v.health),
          hiredWorkers: v.hiredWorkers,
          workersNeeded: est.workersNeeded,
          familyWorkersUsed: est.familyWorkersUsed,
          hireWageYear: def?.hire_wage_year ?? 3,
          revenueYear: est.revenue,
          upkeepYear: est.upkeep,
          profitYear: est.profit,
          assetValue: assetVal,
          sellPrice: Math.round(assetVal * content.balance.economy.property_sell_factor),
          expandCost: exp?.cost ?? null,
          expandName: exp?.nextName ?? null,
          canExpand: Boolean(exp && h.money >= exp.cost),
        };
      }),
      openable: content.ventures
        .filter((v) => inCurrentEra(ctx, v.eras) && !isUpgradeTargetVenture(ctx, v.id) && !(h.ventures ?? []).some((o) => o.id === v.id))
        .map((v) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          icon: v.icon,
          capitalCost: v.capital_cost,
          baseRevenueYear: v.base_revenue_year,
          upkeepYear: v.upkeep_year,
          workersNeeded: v.workers_needed,
          skillName: content.index.skill.get(v.skill)?.name ?? v.skill,
          canOpen: canOpenVenture(ctx, v.id),
          canAfford: h.money >= v.capital_cost,
        })),
    },
    npcLoans: {
      borrowed: (h.loans ?? [])
        .filter((l) => l.kind === 'borrowed')
        .map((l) => {
          const npc = state.characters[l.npcId];
          return {
            id: l.id,
            npcId: l.npcId,
            npcName: npc ? fullName(npc) : l.npcId,
            npcCall: npc ? callOf(ctx, npc) : l.npcId,
            principal: l.principal,
            amount: l.amount,
            interestRate: l.interestRate,
            dueYear: l.dueYear,
            overdueYears: l.overdueYears,
          };
        }),
      lent: (h.loans ?? [])
        .filter((l) => l.kind === 'lent')
        .map((l) => {
          const npc = state.characters[l.npcId];
          return {
            id: l.id,
            npcId: l.npcId,
            npcName: npc ? fullName(npc) : l.npcId,
            npcCall: npc ? callOf(ctx, npc) : l.npcId,
            principal: l.principal,
            amount: l.amount,
            interestRate: l.interestRate,
            dueYear: l.dueYear,
            overdueYears: l.overdueYears,
          };
        }),
      creditors: availableCreditors(ctx).map((c) => {
        const cfg = content.balance.economy.npc_loans;
        const rate =
          (c.opinionOfPlayer ?? 0) >= 20 || (c.favorWithPlayer ?? 0) >= 10
            ? cfg.friendly_annual_interest
            : cfg.creditor_annual_interest;
        return {
          id: c.id,
          name: fullName(c),
          call: callOf(ctx, c),
          interestRate: rate,
        };
      }),
      borrowers: availableBorrowers(ctx).map((c) => ({
        id: c.id,
        name: fullName(c),
        call: callOf(ctx, c),
        opinion: c.opinionOfPlayer ?? 0,
        favor: c.favorWithPlayer ?? 0,
      })),
      borrowAmounts: content.balance.economy.npc_loans.borrow_amounts,
      lendAmounts: content.balance.economy.npc_loans.lend_amounts,
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
      options: content.ambitions
        .filter((a) => inCurrentEra(ctx, a.eras))
        .map((a) => ({
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
      const curMonths = cDef ? Math.max(0, state.clock.monthIndex - state.career.since) : 0;
      const secMonths = playerSectorMonths(ctx);
      const senFactor = careerSeniorityFactor(ctx, secMonths);
      const isHead = householdHead(ctx)?.id === me.id;
      const adultAge = content.balance.life.adult_age;
      const curSj = state.career.sideJobId ? content.index.sideJob.get(state.career.sideJobId) : undefined;

      return {
        id: cDef?.id ?? state.career.id,
        name: careerNameOf(ctx, cDef),
        description: careerDescOf(ctx, cDef),
        icon: cDef?.icon ?? 'focus',
        kind: cDef?.kind ?? '',
        sector: cDef?.sector ?? 'dich_vu',
        depth: cDef?.depth ?? 'nhe',
        months: curMonths,
        sectorMonths: secMonths,
        seniorityBonusPercent: Math.round((senFactor - 1) * 100),
        household: { id: home?.id ?? state.householdCareer, name: careerNameOf(ctx, home), icon: home?.icon ?? 'focus' },
        components: cDef?.components ?? [],
        skills: (cDef?.skills ?? []).map((skId) => ({
          id: skId,
          name: content.index.skill.get(skId)?.name ?? skId,
          level: me.skills[skId]?.level ?? 0,
        })),
        rankIndex: state.career.rankIndex,
        rankName: careerRankNameOf(ctx, rank),
        nextRankName: nextRank ? careerRankNameOf(ctx, nextRank) : null,
        nextRankMerit: nextRank?.min_merit ?? null,
        nextRankRequirements: nextRank
          ? {
              minMerit: nextRank.min_merit,
              minYears: nextRank.min_years ?? 0,
              minSkill: nextRank.min_skill
                ? {
                    id: nextRank.min_skill.skill,
                    name: content.index.skill.get(nextRank.min_skill.skill)?.name ?? nextRank.min_skill.skill,
                    level: nextRank.min_skill.level,
                    currentLevel: me.skills[nextRank.min_skill.skill]?.level ?? 0,
                  }
                : null,
              minReputation: nextRank.min_reputation ?? null,
            }
          : null,
        merit: state.career.merit,
        wanted: state.career.wanted,
        stipendMoney: rank?.stipend_money_month ?? 0,
        stipendFood: rank?.stipend_food_month ?? 0,
        incomeRange: rank?.income_range
          ? [rank.income_range[0], rank.income_range[1]]
          : rank
            ? [
                Math.round(rank.stipend_money_month * 12),
                Math.round(rank.stipend_money_month * 12 * (1 + content.balance.life.career_v2.max_seniority_bonus)),
              ]
            : null,
        workEffects: {
          healthMonth: cDef?.work_effects?.health_month ?? 0,
          stressMonth: cDef?.work_effects?.stress_month ?? 0,
          skillXp: Object.entries(cDef?.work_effects?.skill_xp ?? {}).map(([skId, xp]) => ({
            id: skId,
            name: content.index.skill.get(skId)?.name ?? skId,
            xp,
          })),
        },
        duties: cDef?.duties ?? [],
        exits: (cDef?.exits ?? []).map((ex) => {
          const targetDef = content.index.career.get(ex.to);
          return {
            toId: ex.to,
            toName: targetDef ? careerNameOf(ctx, targetDef) : ex.to,
            toIcon: targetDef?.icon ?? 'focus',
            hint: ex.hint,
            unlocked: isUnlockedCareerExit(ctx, ex.to),
          };
        }),
        sideJob: {
          currentId: state.career.sideJobId,
          currentName: curSj?.name ?? null,
          activeThisMonth: isSideJobActiveThisMonth(ctx),
          options: content.sideJobs
            .filter((sj) => inCurrentEra(ctx, sj.eras))
            .map((sj) => ({
              id: sj.id,
              name: sj.name,
              description: sj.description,
              icon: sj.icon,
              seasons: sj.seasons,
              seasonNames: sj.seasons.map((sId) => cal.seasons.find((s) => s.id === sId)?.name ?? sId),
              incomeMoneyMonth: sj.income_money_month,
              stressMonth: sj.stress_month,
              available: sideJobAvailable(ctx, sj.id),
            })),
        },
        familyCareers: aliveMembers(ctx, h)
          .filter((m) => ageNow(ctx, m) >= adultAge)
          .map((m) => {
            const isPlayer = m.id === me.id;
            const mCareerId = isPlayer ? state.career.id : (m.careerId ?? 'phu_gia_dinh');
            const mRankIdx = isPlayer ? state.career.rankIndex : (m.careerRankIndex ?? 0);
            const mMonths = isPlayer ? curMonths : (m.careerMonths ?? 0);
            const mDef = content.index.career.get(mCareerId);
            const mRank = mDef?.ranks[mRankIdx] ?? mDef?.ranks[0];
            return {
              characterId: m.id,
              call: callOf(ctx, m),
              name: fullName(m),
              age: ageNow(ctx, m),
              isPlayer,
              careerId: mCareerId,
              careerName: mDef ? careerNameOf(ctx, mDef) : mCareerId,
              rankName: careerRankNameOf(ctx, mRank),
              months: mMonths,
              monthlyIncome: isPlayer
                ? Math.round((rank?.stipend_money_month ?? 0) * senFactor * 10) / 10
                : Math.round(memberMonthlyCareerIncome(ctx, m) * 10) / 10,
              canChange: !isPlayer && isHead,
            };
          }),
        history: (state.career.history ?? []).map((entry: CareerHistoryEntry) => {
          const hDef = content.index.career.get(entry.careerId);
          const hRank = hDef?.ranks[entry.highestRankIndex] ?? hDef?.ranks[0];
          return {
            careerId: entry.careerId,
            careerName: hDef ? careerNameOf(ctx, hDef) : entry.careerId,
            sector: hDef?.sector ?? 'dich_vu',
            rankName: hRank?.name ?? '',
            startYear: entry.startYear,
            endYear: entry.endYear,
            months: entry.months,
          };
        }),
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
          .filter((c) => c.id !== state.career.id && c.kind === 'nghe' && inCurrentEra(ctx, c.eras))
          .map((c) => {
            const firstRank = c.ranks[0];
            const lastRank = c.ranks[c.ranks.length - 1] ?? firstRank;
            const minInc = firstRank?.income_range?.[0] ?? Math.round((firstRank?.stipend_money_month ?? 0) * 12);
            const maxInc =
              lastRank?.income_range?.[1] ??
              Math.round((lastRank?.stipend_money_month ?? 0) * 12 * (1 + content.balance.life.career_v2.max_seniority_bonus));
            return {
              id: c.id,
              name: careerNameOf(ctx, c),
              description: careerDescOf(ctx, c),
              icon: c.icon,
              sector: c.sector,
              depth: c.depth,
              inSettlement: careerInSettlement(ctx, c.id),
              isExit: (cDef?.exits ?? []).some((ex) => ex.to === c.id),
              incomeRange: [minInc, maxInc] as [number, number],
              // Vào nghề tốn vốn thì tiền nhà phải đủ và người chơi phải là chủ hộ
              available:
                careerAvailable(ctx, c.id) &&
                ((c.join?.cost_money ?? 0) === 0 ||
                  (householdHead(ctx)?.id === state.playerId ? h.money : state.purse.money) >= (c.join?.cost_money ?? 0)),
              costMoney: c.join?.cost_money ?? 0,
              hint: c.join?.hint ?? '',
            };
          }),
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
    story: getStoryView(ctx),
    dynasty: getDynastyView(ctx),
    succession:
      state.gameOver && (state.playMode === 'dynasty' || state.playMode === 'legacy_of_ages')
        ? getSuccessionView(ctx)
        : null,
    villageClans: getVillageClansView(ctx),
    matchmaking: getMatchmakingView(ctx),
    region: getRegionView(ctx),
    social: (() => {
      const soc = ensureSocialState(state);
      return {
        dread: soc.dread,
        secrets: soc.secrets,
        hooks: soc.hooks,
        activeScheme: soc.activeScheme,
      };
    })(),
    organizations: getOrganizationsView(ctx),
    politics: getPoliticsView(ctx),
  };
}

export function getOrganizationsView(ctx: SimContext): OrganizationView[] {
  const orgs = ensureOrganizations(ctx);
  const { state, content } = ctx;
  const deputies = Object.values(state.village)
    .map((id) => state.characters[id])
    .filter((c): c is NonNullable<typeof c> => Boolean(c?.alive))
    .map((c) => ({
      id: c.id,
      name: fullName(c),
      call: callOf(ctx, c),
      loyalty: clamp(65 + Math.round(c.opinionOfPlayer * 0.3) + (c.favorWithPlayer ?? 0) * 3, 20, 100),
    }));

  return (content.organizations ?? [])
    .filter((def) => inCurrentEra(ctx, def.eras) && Boolean(orgs[def.id]))
    .map((def) => {
      const org = orgs[def.id]!;
    const rIdx = org.playerRank;
    const curRank = rIdx >= 0 ? def.ranks[rIdx] : undefined;
    const nextRank = rIdx >= 0 && rIdx < 3 ? def.ranks[rIdx + 1] : undefined;
    const deputyChar = org.delegation.deputyId ? state.characters[org.delegation.deputyId] : undefined;

    return {
      id: def.id,
      name: def.name,
      kind: def.kind,
      description: def.description,
      settlementId: def.settlement_id,
      joinCostMoney: def.join_cost_money,
      canJoin: canJoinOrganization(ctx, def.id),
      playerRank: rIdx,
      playerRankName: curRank?.name ?? null,
      nextRankName: nextRank?.name ?? null,
      nextRankMinContribution: nextRank?.min_contribution ?? null,
      playerContribution: Math.round(org.playerContribution),
      stipendMoneyMonth: curRank?.stipend_money_month ?? 0,
      factors: { ...org.factors },
      delegation: {
        deputyId: org.delegation.deputyId,
        deputyName: deputyChar ? callOf(ctx, deputyChar) : null,
        policy: org.delegation.policy,
        deputyLoyalty: org.delegation.deputyLoyalty,
        monthsDelegated: org.delegation.monthsDelegated,
      },
      availableDeputies: deputies,
    };
  });
}

export function getPoliticsView(ctx: SimContext): PoliticsView {
  const pol = ensurePoliticsState(ctx.state);
  const reb = ensureRebellionState(ctx.state);
  const lang = ctx.content.lang[ctx.content.balance.display.default_language] ?? {};
  const stages: RebellionStageId[] = [
    'none',
    'cam_phan',
    'ket_noi',
    'to_chuc',
    'cho_thoi',
    'khoi_nghia',
    'lan_rong',
    'ket_cuc',
    'hau_noi_day',
  ];
  return {
    mandateOfHeaven: pol.mandateOfHeaven,
    imperialTreasury: pol.imperialTreasury,
    imperialArmy: pol.imperialArmy,
    alignedFactionId: pol.alignedFactionId,
    factions: Object.values(pol.factions).map((f) => ({
      id: f.id,
      name: lang[f.name] ?? f.name,
      influence: f.influence,
      favorWithPlayer: f.favorWithPlayer,
    })),
    provinces: Object.values(pol.provinces).map((p) => ({
      ...p,
      name: lang[p.name] ?? p.name,
    })),
    rebellion: {
      ...reb,
      stageIndex: Math.max(0, stages.indexOf(reb.stage)),
    },
  };
}

export function getRegionView(ctx: SimContext): RegionView {
  initRegionSettlements(ctx);
  const { state, content } = ctx;
  const h = playerHousehold(ctx);
  const me = player(ctx);
  const isHead = householdHead(ctx)?.id === state.playerId;
  const isAdult = ageNow(ctx, me) >= content.balance.life.adult_age;
  const regionCfg = content.balance.opportunity.region;

  const homeId = state.world.settlementType;
  const curId = activeSettlementId(ctx);
  const homeNode = state.settlements[homeId];
  const curNode = state.settlements[curId] ?? homeNode;
  const homeType = content.index.settlementType.get(homeId);
  const curType = content.index.settlementType.get(curId) ?? homeType;

  const sellFactor = content.balance.economy.property_sell_factor;
  const ruralPropertyRefund = holdingsOf(h, content)
    .filter((item) => item.type.category === 'land' && item.count > 0)
    .reduce((sum, item) => sum + Math.round(item.type.value * sellFactor * item.count), 0);

  const minCargo = regionCfg.trip_cargo_options[0] ?? 4;

  const settlements: RegionNodeView[] = content.settlementTypes
    .filter((st) => st.region_node)
    .map((st) => {
      const s = state.settlements[st.id];
      const q = content.index.harvestQuality.get(s?.harvestQuality ?? state.world.harvestQuality);
      const route = findSettlementRoute(ctx, homeId, st.id);
      const isHome = st.id === homeId;
      const isCurrent = st.id === curId;
      const ep = s?.epidemic
        ? {
            diseaseId: s.epidemic.diseaseId,
            diseaseName: content.index.disease.get(s.epidemic.diseaseId)?.name ?? s.epidemic.diseaseId,
            monthsLeft: s.epidemic.monthsLeft,
          }
        : null;

      return {
        id: st.id,
        name: s?.name ?? settlementNameOf(ctx, st),
        typeName: settlementNameOf(ctx, st),
        description: settlementDescOf(ctx, st),
        population: s?.population ?? Math.round((st.population_band[0] + st.population_band[1]) / 2),
        foodPrice: s?.foodPrice ?? state.world.foodPrice,
        tradeIndex: s?.tradeIndex ?? state.world.tradeIndex,
        tradeFactor: st.trade_factor,
        effectiveTradeFactor: Math.round(((s?.tradeIndex ?? 1) * st.trade_factor) * 100) / 100,
        patrolLevel: s?.patrolLevel ?? state.world.patrolLevel,
        harvestQuality: s?.harvestQuality ?? state.world.harvestQuality,
        harvestQualityName: q?.name ?? '',
        disaster: s?.disaster ?? 'none',
        epidemic: ep,
        isHome,
        isCurrent,
        travelMonths: isHome ? 0 : route.travel_months,
        travelCost: isHome ? 0 : route.cost_money,
        relocateCost: st.relocate_cost,
        canRelocate: !isHome && isHead && !state.activeTrip && h.money >= st.relocate_cost,
        canStartTrip:
          !isHome &&
          isHead &&
          isAdult &&
          !state.activeTrip &&
          state.civilization.mourningMonthsLeft <= 0 &&
          h.money >= minCargo + route.cost_money,
        routes: st.routes.map((r) => ({
          to: r.to,
          travelMonths: r.travel_months,
          costMoney: r.cost_money,
        })),
      };
    });

  let activeTripView: RegionView['activeTrip'] = null;
  if (state.activeTrip) {
    const t = state.activeTrip;
    const dst = state.settlements[t.targetSettlementId];
    const dstType = content.index.settlementType.get(t.targetSettlementId);
    const dstLabel = dst ? `${dstType?.name ?? ''} ${dst.name}`.trim() : t.targetSettlementId;
    activeTripView = {
      kind: t.kind,
      targetSettlementId: t.targetSettlementId,
      targetName: dstLabel,
      totalMonths: t.totalMonths,
      monthsLeft: t.monthsLeft,
      cargoMoney: t.cargoMoney,
      cancelRefund: Math.max(0, Math.round(t.cargoMoney * (1 - regionCfg.trip_cancel_loss_factor))),
    };
  }

  return {
    currentSettlementId: curId,
    currentSettlementName: curNode?.name ?? state.world.settlementName,
    currentSettlementTypeName: settlementNameOf(ctx, curType),
    homeSettlementId: homeId,
    homeSettlementName: homeNode?.name ?? state.world.settlementName,
    homeSettlementTypeName: settlementNameOf(ctx, homeType),
    activeTrip: activeTripView,
    cargoOptions: regionCfg.trip_cargo_options,
    canAppointOfficial: canAppointPrefectureOfficial(ctx),
    officialStipend: regionCfg.official_relocate_stipend,
    ruralPropertyRefund,
    settlements,
  };
}

export function getVillageClansView(ctx: SimContext): VillageClanView[] {
  const { state, content } = ctx;
  const civ = currentCivilization(ctx);
  return Object.values(state.villageClans ?? {}).map((clan) => {
    const head = state.characters[clan.headId];
    const h = state.households[clan.householdId];
    const careerDef = content.index.career.get(clan.careerId);
    const statusDef = civ.status_ranks.find((r) => r.id === clan.statusRankId);
    const members = aliveClanMembers(ctx, clan.id);
    return {
      id: clan.id,
      familyName: clan.familyName,
      headName: head ? fullName(head) : clan.familyName,
      headAge: head?.alive ? ageNow(ctx, head) : 45,
      careerId: clan.careerId,
      careerName: careerDef ? careerNameOf(ctx, careerDef) : clan.careerId,
      statusRankId: clan.statusRankId,
      statusRankName: statusDef?.name ?? clan.statusRankId,
      prestige: clan.prestige,
      farmland: h ? (h.properties.ruong ?? 0) : 0,
      memberCount: members.length,
      relationWithPlayer: clan.relationWithPlayer,
      tie: clan.tie,
      tieReason: clan.tieReason,
    };
  });
}

export function getMatchmakingView(ctx: SimContext): MatchmakingView {
  const { state, content } = ctx;
  const targets = getMarriageableMembers(ctx).map((c) => ({
    characterId: c.id,
    name: fullName(c),
    call: c.id === state.playerId ? fullName(c) : callOf(ctx, c),
    sex: c.sex,
    age: ageNow(ctx, c),
    isPlayer: c.id === state.playerId,
    traits: c.traits.map((tId) => ({ id: tId, name: content.index.trait.get(tId)?.name ?? tId })),
    candidates: getMatchmakingCandidates(ctx, c.id),
  }));
  return { targets };
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
    .filter((c) => !c.villageRole && !c.clanId && (genMap.has(c.id) || c.familyName === state.dynasty.familyName))
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
    careerHistory: state.career.history ?? [],
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
    careerHistory: (state.career.history ?? []).map((entry: CareerHistoryEntry) => {
      const hDef = content.index.career.get(entry.careerId);
      const hRank = hDef?.ranks[entry.highestRankIndex] ?? hDef?.ranks[0];
      return {
        careerId: entry.careerId,
        careerName: hDef ? careerNameOf(ctx, hDef) : entry.careerId,
        rankName: hRank?.name ?? '',
        startYear: entry.startYear,
        endYear: entry.endYear,
        months: entry.months,
      };
    }),
    card: getLifeCard(ctx),
  };
}
