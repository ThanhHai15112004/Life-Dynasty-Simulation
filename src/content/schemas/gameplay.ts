// [0] Dữ liệu gameplay: kỹ năng, tính cách, Focus, tài sản, xuất thân, văn hóa
import { z } from 'zod';
import { conditionSchema } from './condition';
import { effectSchema, examDegreeIds } from './effect';
import { ambientTones, chanceSchema } from './event';
import { modifierDefSchema } from './modifier';

const range = z.tuple([z.number(), z.number()]);

/** [1] Nguồn thu đều đặn mỗi tháng (nghề, Focus): base + bậc kỹ năng × per_level, có thể nhân Thời cơ buôn bán. */
export const incomeSpecSchema = z
  .object({
    money_month: z.number().default(0),
    skill: z.string().optional(),
    per_level: z.number().default(0),
    /** Nhân chỉ số giá buôn (world.trade_index) × hệ số buôn bán của khu định cư. */
    trade_scaled: z.boolean().default(false),
    /** Danh mục sổ sách (khóa ledger.<id> trong lang). */
    ledger: z.string(),
  })
  .strict();
export type IncomeSpec = z.infer<typeof incomeSpecSchema>;

export const skillSchema = z
  .object({ id: z.string(), name: z.string(), description: z.string().default('') })
  .strict();
export const skillFileSchema = z.object({ skills: z.array(skillSchema).min(1) }).strict();
export type Skill = z.infer<typeof skillSchema>;

export const traitSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    opposite: z.string(),
    description: z.string().default(''),
    modifiers: z.array(modifierDefSchema).default([]),
    start_weight: z.number().min(0).default(1),
  })
  .strict();
export const traitFileSchema = z.object({ traits: z.array(traitSchema).min(1) }).strict();
export type Trait = z.infer<typeof traitSchema>;

export const focusSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string().default('focus'),
    /** [1] Giai đoạn đời có trọng tâm này (mỗi giai đoạn một bộ lựa chọn riêng). */
    life_stages: z.array(z.string()).min(1),
    /** Điều kiện khả dụng (nghề nhà, nơi ở, tuổi...) — biến `player.*`, `household.*`. */
    condition: conditionSchema.optional(),
    /** XP mỗi tháng cho từng kỹ năng khi là Focus chính. */
    skill_xp: z.record(z.string(), z.number()).default({}),
    modifiers: z.array(modifierDefSchema).default([]),
    /** Bộ lọc sự kiện: nhân trọng số sự kiện có thẻ tương ứng. */
    event_weights: z.record(z.string(), z.number()).default({}),
    /** [1] Thu nhập khi là Focus chính (kỹ năng tính theo người chơi). */
    income: incomeSpecSchema.optional(),
  })
  .strict();
export const focusFileSchema = z.object({ focuses: z.array(focusSchema).min(1) }).strict();
export type Focus = z.infer<typeof focusSchema>;

export const propertySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['land', 'livestock', 'house', 'other']),
    unit: z.string(),
    description: z.string().default(''),
    value: z.number().min(0),
    buyable: z.boolean().default(true),
    sellable: z.boolean().default(true),
    upkeep_money_year: z.number().min(0).default(0),
    upkeep_food_month: z.number().min(0).default(0),
    income_money_year: z.number().min(0).default(0),
    /** Với ruộng: mỗi đơn vị là một sào canh tác được. */
    farmland: z.boolean().default(false),
    /** Với nhà: bậc nhà, nhà bậc cao nhất được vẽ lên cảnh. */
    house_tier: z.number().int().optional(),
    modifiers: z.array(modifierDefSchema).default([]),
    scene: z
      .object({ layer: z.enum(['buildings', 'props']), sprite: z.string(), max_draw: z.number().int().default(1) })
      .strict()
      .optional(),
  })
  .strict();
export const propertyFileSchema = z.object({ properties: z.array(propertySchema).min(1) }).strict();
export type PropertyType = z.infer<typeof propertySchema>;

const memberSpecSchema = z
  .object({
    relation: z.enum(['father', 'mother', 'sibling']),
    sex: z.enum(['m', 'f', 'any']).default('any'),
    /** Tuổi tuyệt đối (cha mẹ) hoặc độ lệch so với người chơi (anh chị em). */
    age: range.optional(),
    age_offset: range.optional(),
    count: range.default([1, 1]),
    health: range.default([60, 80]),
    skills: z.record(z.string(), range).default({}),
  })
  .strict();

const villageNpcSchema = z
  .object({
    role: z.string(),
    sex: z.enum(['m', 'f', 'any']).default('m'),
    age: range,
    opinion: range.default([0, 0]),
    /** Khi người giữ vai trò qua đời, làng có người mới thay. */
    refill: z.boolean().default(true),
  })
  .strict();

export const originSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    culture: z.string(),
    start_age_options: z.array(z.number().int().min(0)).min(1),
    default_start_age: z.number().int().min(0),
    player: z
      .object({
        sex: z.enum(['m', 'f', 'any']).default('any'),
        health: range,
        skills: z.record(z.string(), range).default({}),
        trait_count: z.number().int().min(0).default(2),
      })
      .strict(),
    household: z
      .object({
        money: range,
        food: range,
        debt: range.default([0, 0]),
        living_standard: z.string(),
        properties: z.array(z.object({ id: z.string(), count: range }).strict()),
        members: z.array(memberSpecSchema),
      })
      .strict(),
    village_npcs: z.array(villageNpcSchema),
    default_focus: z.string(),
    default_career: z.string().default('nong_dan'),
    /** [1] Mẫu nhật ký mở đầu đời (id trong events/ambient); bỏ trống thì dùng sys.khoi_dau. */
    start_log: z.string().optional(),
    /** [1] Loại khu định cư nơi hộ sinh sống (data/world/settlement_types.yaml). */
    settlement: z.string(),
    /** [1] Chỉ số khuôn văn minh lúc bắt đầu, ghi đè giá trị mặc định của khuôn. */
    start_status: z
      .object({ filial_piety: z.number().optional(), scholarly_prestige: z.number().optional() })
      .strict()
      .default({}),
  })
  .strict();
export type Origin = z.infer<typeof originSchema>;

export const cultureSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    family_names: z.array(z.object({ name: z.string(), weight: z.number().positive() }).strict()).min(1),
    given_names: z.object({ m: z.array(z.string()).min(1), f: z.array(z.string()).min(1) }).strict(),
    village_names: z.array(z.string()).min(1),
    /** Cách người chơi gọi người thân: token {given}, {family}. */
    kin_calls: z
      .object({
        father: z.string(),
        mother: z.string(),
        older_m: z.string(),
        older_f: z.string(),
        younger: z.string(),
        husband: z.string().default('{given}'),
        wife: z.string().default('{given}'),
        son: z.string().default('{given}'),
        daughter: z.string().default('{given}'),
        other: z.string(),
      })
      .strict(),
    /** Cách gọi người giữ vai trò trong làng: token {given}, {family}. */
    village_roles: z.record(z.string(), z.object({ title: z.string(), call: z.string() }).strict()),
  })
  .strict();
export type Culture = z.infer<typeof cultureSchema>;

/** [1] Bệnh tật cụ thể (GDD 03 §2): mức nặng, tiến triển, chi phí chữa, nguyên nhân tử vong liên kết. */
export const diseaseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    severity: z.enum(['nhe', 'nang', 'nguy_kich']).default('nhe'),
    duration_months: range,
    cure_cost: z.number().min(0).default(1),
    /** [1] Xác suất một lần chạy chữa khỏi bệnh ngay (không khỏi thì mất tiền, chờ ít tháng mới chữa lại được). */
    cure_chance: z.number().min(0).max(1).default(0.6),
    self_heal_chance_month: z.number().min(0).max(1).default(0.1),
    mortality_cause: z.string().optional(),
    /** Xác suất cơ bản mắc phải mỗi tháng khi thỏa điều kiện (biến `self.*`). */
    monthly_chance: z.number().min(0).max(1).default(0),
    condition: conditionSchema.optional(),
    modifiers: z.array(modifierDefSchema).default([]),
  })
  .strict();
export const diseaseFileSchema = z.object({ diseases: z.array(diseaseSchema).min(1) }).strict();
export type Disease = z.infer<typeof diseaseSchema>;

/** [1] Tham vọng cả đời & các mốc phụ (GDD 01 §6). */
export const ambitionMilestoneSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    condition: conditionSchema,
    stress_relief: z.number().min(0).default(4),
    satisfaction_bonus: z.number().default(10),
  })
  .strict();
export type AmbitionMilestone = z.infer<typeof ambitionMilestoneSchema>;

export const ambitionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string().default('moc_doi'),
    condition: conditionSchema.optional(),
    /** Tính cách ưu tiên chọn tham vọng này (hoặc cộng thêm mãn nguyện khi hoàn thành). */
    traits: z.array(z.string()).default([]),
    milestones: z.array(ambitionMilestoneSchema).min(2).max(5),
  })
  .strict();
export const ambitionFileSchema = z.object({ ambitions: z.array(ambitionSchema).min(1) }).strict();
export type Ambition = z.infer<typeof ambitionSchema>;

/** [1] Hợp đồng nghề & Thành phần lắp ghép (GDD 04 §4–5). */
export const careerComponentTypes = ['farmland', 'trade_route', 'military_rank', 'outlaw_band', 'exam_ladder'] as const;
export type CareerComponentType = (typeof careerComponentTypes)[number];

export const careerRankSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    min_merit: z.number().min(0).default(0),
    condition: conditionSchema.optional(),
    stipend_money_month: z.number().default(0),
    stipend_food_month: z.number().default(0),
    modifiers: z.array(modifierDefSchema).default([]),
  })
  .strict();
export type CareerRank = z.infer<typeof careerRankSchema>;

export const careerActionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    hint: z.string().optional(),
    cooldown_months: z.number().int().positive().default(6),
    cost_money: z.number().min(0).default(0),
    cost_food: z.number().min(0).default(0),
    condition: conditionSchema.optional(),
    chance: chanceSchema,
    success: z.array(effectSchema).default([]),
    failure: z.array(effectSchema).default([]),
    success_log: z.array(z.string()).min(1),
    failure_log: z.array(z.string()).min(1),
  })
  .strict();
export type CareerAction = z.infer<typeof careerActionSchema>;

export const careerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string().default('focus'),
    /** [1] nghe: nghề thật (bậc, lương, hành động) · trang_thai: chưa có nghề riêng (phụ việc nhà, thất nghiệp). */
    kind: z.enum(['nghe', 'trang_thai']).default('nghe'),
    components: z.array(z.enum(careerComponentTypes)).default([]),
    /** [1] Kinh nghiệm (công trạng) tích mỗi tháng — phụ việc nhà thì mang theo khi tiếp quản nghề nhà. */
    merit_month: z.number().min(0).default(0),
    /** [1] Con cái nhà theo nghề này, đến tuổi trưởng thành thì bắt đầu bằng nghề riêng nào (mặc định: life.career_start.helper). */
    youth_career: z.string().optional(),
    entry_condition: conditionSchema.optional(),
    /** [1] Tự vào nghề (tìm việc / ra làm riêng): vốn bỏ ra và lời giải thích điều kiện hiện cho người chơi. */
    join: z.object({ cost_money: z.number().min(0).default(0), hint: z.string() }).strict().optional(),
    duties: z.array(z.string()).default([]),
    ranks: z.array(careerRankSchema).min(1),
    actions: z.array(careerActionSchema).default([]),
    /** [1] Trọng tâm ưu tiên khi người theo nghề này cần đổi trọng tâm (vd. lớn lên sang giai đoạn mới). */
    default_focus: z.string().optional(),
    /** [1] Bộ lọc sự kiện theo nghề nhà: nhân trọng số sự kiện/nhật ký có thẻ tương ứng. */
    event_weights: z.record(z.string(), z.number().min(0)).default({}),
    /** [1] Cách hộ mưu sinh khi theo nghề này (cả lúc người chơi còn nhỏ — nghề của nhà). */
    economy: z
      .object({
        /** Hộ tự cày ruộng; false thì ruộng phát canh thu tô (balance.economy.tenancy). */
        self_farm: z.boolean().default(true),
        /** Tiền công mỗi tháng của một người nhà dư sức (mặc định: làm thuê theo balance). */
        family_wage_month: z.number().min(0).optional(),
        /** Thu nhập của nghề nhà (kỹ năng tính theo người giỏi nhất trong hộ). */
        income: incomeSpecSchema.optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export const careerFileSchema = z.object({ careers: z.array(careerSchema).min(1) }).strict();
export type Career = z.infer<typeof careerSchema>;

/** [1] Khuôn văn minh (GDD 07) & Loại khu định cư (GDD 06). */
export const examDegreeDefSchema = z
  .object({
    id: z.enum(examDegreeIds),
    name: z.string(),
    min_hoc_van: z.number().int().min(0).default(0),
    prestige_gain: z.number().min(0).default(0),
    stipend_money_month: z.number().min(0).default(0),
    modifiers: z.array(modifierDefSchema).default([]),
  })
  .strict();
export type ExamDegreeDef = z.infer<typeof examDegreeDefSchema>;

/** Bậc thang địa vị: bậc cao nhất có điều kiện đúng là bậc hiện tại (bậc đầu là mặc định). */
export const statusRankSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    condition: conditionSchema.optional(),
    modifiers: z.array(modifierDefSchema).default([]),
  })
  .strict();
export type StatusRank = z.infer<typeof statusRankSchema>;

export const civilizationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    culture_set: z.string(),
    mourning_months: z.number().int().positive().default(27),
    exam_interval_years: z.number().int().positive().default(3),
    /** Thi Hội – Đình mở sau thi Hương chừng này năm (trong cùng chu kỳ). */
    metropolitan_exam_offset_years: z.number().int().min(1).default(1),
    /** Kỹ năng xét điều kiện min_hoc_van của học vị. */
    exam_skill: z.string(),
    /** Nhóm danh tiếng được cộng khi đỗ đạt. */
    reputation_group: z.string(),
    /** Chỉ số lúc bắt đầu (xuất thân có thể ghi đè bằng start_status). */
    start: z.object({ filial_piety: z.number(), scholarly_prestige: z.number() }).strict(),
    /** Đỗ đạt: danh tiếng làng tăng thêm = prestige_gain × hệ số này. */
    prestige_reputation_factor: z.number().min(0).default(0),
    cutscenes: z.object({ exam_passed: z.string().optional(), mourning: z.string().optional() }).strict().default({}),
    exam_degrees: z.array(examDegreeDefSchema).min(1),
    status_ranks: z.array(statusRankSchema).min(1),
  })
  .strict();
export type Civilization = z.infer<typeof civilizationSchema>;

export const settlementTypeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    population_band: z.tuple([z.number(), z.number()]),
    trade_factor: z.number().positive().default(1),
    /** Bộ lọc sự kiện theo nơi ở: nhân trọng số sự kiện/nhật ký có thẻ tương ứng. */
    event_weights: z.record(z.string(), z.number().min(0)).default({}),
    /** Địa điểm cảnh pixel (scene-layout.json › locations); bỏ trống thì dùng balance.scene.location. */
    scene_location: z.string().optional(),
  })
  .strict();
export const settlementTypeFileSchema = z.object({ settlement_types: z.array(settlementTypeSchema).min(1) }).strict();
export type SettlementType = z.infer<typeof settlementTypeSchema>;

/** [1] Biên niên vương triều (giả tưởng): biến cố thế giới chạy song song với đời nhân vật. */
export const chronicleEntrySchema = z
  .object({
    id: z.string(),
    /** Khoảng năm (tính từ năm bắt đầu ván) biến cố có thể xảy ra. */
    years: range.default([0, 9999]),
    /** Xác suất mỗi đầu năm khi đủ điều kiện. */
    chance_per_year: z.number().min(0).max(1),
    /** Mỗi ván chỉ xảy ra một lần; false thì xét cooldown_years. */
    once: z.boolean().default(true),
    cooldown_years: z.number().min(0).default(0),
    condition: conditionSchema.optional(),
    /** Lời kể (chọn ngẫu nhiên một), có token như mẫu nhật ký. */
    text: z.array(z.string()).min(1),
    importance: z.number().min(0).max(10).default(6),
    icon: z.string().default('tin_don'),
    tone: z.enum(ambientTones).default('trung_tinh'),
    /** Khóa động tĩnh quân sự (id trong balance/opportunity.yaml) trong chừng ấy năm. */
    military_alert: z.object({ id: z.string(), years: z.number().int().positive() }).strict().optional(),
    /** Ép trời định năm nay (id chất lượng mùa). */
    harvest_quality: z.string().optional(),
    /** Đổi niên hiệu (vua mới lên ngôi). */
    reign: z.string().optional(),
    effects: z.array(effectSchema).default([]),
  })
  .strict();
export type ChronicleEntry = z.infer<typeof chronicleEntrySchema>;
export const chronicleFileSchema = z
  .object({
    /** Niên hiệu lúc bắt đầu ván (file đầu tiên có trường này được dùng). */
    start_reign: z.string().optional(),
    entries: z.array(chronicleEntrySchema).min(1),
  })
  .strict();
