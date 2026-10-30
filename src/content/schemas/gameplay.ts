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
    /** [1.5] Lời theo vốn: tiền mặt của hộ (tối đa max) × rate_year / 12 mỗi tháng — tiền đẻ ra tiền. */
    capital: z.object({ rate_year: z.number().min(0), max: z.number().min(0) }).strict().optional(),
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
    /** Tên hiển thị tùy biến theo khuôn văn minh / thời đại (ví dụ: hien_dai, phong_kien_au, bo_lac_nguyen_thuy). */
    names_by_civ: z.record(z.string(), z.string()).default({}),
    category: z.enum(['land', 'livestock', 'house', 'other']),
    unit: z.string(),
    description: z.string().default(''),
    descriptions_by_civ: z.record(z.string(), z.string()).default({}),
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
    /** [6] Chuỗi nâng cấp nhà ở: nhà bậc trước và chi phí nâng cấp trực tiếp. */
    upgrade_from: z.string().optional(),
    upgrade_cost: z.number().min(0).optional(),
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
    /** Tên xuất thân tùy biến theo khuôn văn minh / thời đại. */
    names_by_civ: z.record(z.string(), z.string()).default({}),
    description: z.string(),
    descriptions_by_civ: z.record(z.string(), z.string()).default({}),
    culture: z.string(),
    start_age_options: z.array(z.number().int().min(0)).min(1),
    default_start_age: z.number().int().min(0),
    /** Bốc thăm số phận: trọng số được sinh vào xuất thân này (theo tỷ lệ dân số thời ấy). */
    birth_weight: z.number().min(0).default(1),
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

const lexiconSchema = z
  .object({
    currency: z.string(),
    food: z.string(),
    land: z.string(),
    staple_crop: z.string(),
  })
  .strict();

export const cultureEraVariantSchema = z
  .object({
    id: z.string().optional(),
    /** Áp dụng khi năm hiện tại >= min_year. */
    min_year: z.number().int().optional(),
    /** Áp dụng khi năm hiện tại <= max_year. */
    max_year: z.number().int().optional(),
    ethnicity_name: z.string().optional(),
    religion: z.string().optional(),
    default_religion: z.string().optional(),
    phenotype: z.string().optional(),
    name_order: z.enum(['family_first', 'given_first']).optional(),
    lexicon: lexiconSchema.optional(),
    family_names: z.array(z.object({ name: z.string(), weight: z.number().positive() }).strict()).min(1).optional(),
    given_names: z.object({ m: z.array(z.string()).min(1), f: z.array(z.string()).min(1) }).strict().optional(),
    village_names: z.array(z.string()).min(1).optional(),
    town_names: z.array(z.string()).optional(),
    prefecture_names: z.array(z.string()).optional(),
    village_roles: z.record(z.string(), z.object({ title: z.string(), call: z.string() }).strict()).optional(),
  })
  .strict();
export type CultureEraVariant = z.infer<typeof cultureEraVariantSchema>;

export const cultureSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    /** Tên dân tộc / tộc người mặc định (ví dụ: Người Kinh, Người Hán, Bộ tộc Hòa Bình...). */
    ethnicity_name: z.string().optional(),
    /** Mã nhóm nhân chủng / ngoại hình hiển thị trên cảnh pixel và chân dung. */
    phenotype: z.string().default('dong_a_bac'),
    /** Tôn giáo / tín ngưỡng mặc định của văn hóa này. */
    default_religion: z.string().default('tho_to_tien'),
    /** Biến thể văn hóa – ngôn ngữ – họ tên – địa danh theo từng thời kỳ lịch sử. */
    era_variants: z.array(cultureEraVariantSchema).default([]),
    family_names: z.array(z.object({ name: z.string(), weight: z.number().positive() }).strict()).min(1),
    given_names: z.object({ m: z.array(z.string()).min(1), f: z.array(z.string()).min(1) }).strict(),
    village_names: z.array(z.string()).min(1),
    /** [7] Tên thị trấn bến sông trong vùng. */
    town_names: z.array(z.string()).default([]),
    /** [7] Tên phủ thành / lỵ sở trong vùng. */
    prefecture_names: z.array(z.string()).default([]),
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
        adopted_son: z.string().default('{given}'),
        adopted_daughter: z.string().default('{given}'),
        grandchild: z.string().default('{given}'),
        nephew: z.string().default('{given}'),
        uncle: z.string().default('{given}'),
        aunt: z.string().default('{given}'),
        other: z.string(),
      })
      .strict(),
    /** Cách gọi người giữ vai trò trong làng: token {given}, {family}. */
    village_roles: z.record(z.string(), z.object({ title: z.string(), call: z.string() }).strict()),
    /** Kiểu lịch hiển thị năm: can_chi (Đông Á) hoặc bce_ce (TCN/CN quốc tế). */
    calendar_style: z.enum(['can_chi', 'bce_ce']).default('can_chi'),
    /** Thứ tự hiển thị họ tên: family_first (Họ Tên — Đông Á) hoặc given_first (Tên Họ — Âu/Mỹ/Cổ đại). */
    name_order: z.enum(['family_first', 'given_first']).default('family_first'),
    /** Từ vựng địa phương hóa cho đơn vị tiền, lương thực, đất đai. */
    lexicon: lexiconSchema,
  })
  .strict();
export type Culture = z.infer<typeof cultureSchema>;

export const religionGroups = ['nguyen_thuy', 'ban_dia', 'da_than', 'ton_giao_lon', 'the_tuc'] as const;
export type ReligionGroup = (typeof religionGroups)[number];

export const religionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    group: z.enum(religionGroups),
    description: z.string(),
    /** Năm sớm nhất tôn giáo/tín ngưỡng này xuất hiện trong lịch sử. */
    min_year: z.number().int().default(-10000),
    /** Tên không gian tâm linh / nơi thờ tự đặc trưng. */
    shrine_name: z.string(),
    modifiers: z.array(modifierDefSchema).default([]),
  })
  .strict();
export const religionFileSchema = z.object({ religions: z.array(religionSchema).min(1) }).strict();
export type Religion = z.infer<typeof religionSchema>;

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

/** [1] Hợp đồng nghề & Thành phần lắp ghép (GDD 04 §4–5) + [5] Nghề nghiệp v2 (ngành, độ sâu, thâm niên, nghề tay trái, lối ra). */
export const careerComponentTypes = ['farmland', 'trade_route', 'military_rank', 'outlaw_band', 'exam_ladder'] as const;
export type CareerComponentType = (typeof careerComponentTypes)[number];

export const careerSectors = [
  'nong_nghiep',
  'thu_cong',
  'thuong_mai',
  'y_dao',
  'quan_binh',
  'giang_ho',
  'quan_hoc',
  'dich_vu',
] as const;
export type CareerSector = (typeof careerSectors)[number];

export const careerDepths = ['nhe', 'vua', 'sau'] as const;
export type CareerDepth = (typeof careerDepths)[number];

export const careerRankSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    /** Tên bậc nghề tùy biến theo khuôn văn minh / thời đại. */
    names_by_civ: z.record(z.string(), z.string()).default({}),
    min_merit: z.number().min(0).default(0),
    /** [5] Số năm thâm niên nghề tối thiểu để lên bậc. */
    min_years: z.number().min(0).default(0),
    /** [5] Yêu cầu kỹ năng chính để lên bậc (nếu có). */
    min_skill: z.object({ skill: z.string(), level: z.number().int().min(1) }).strict().optional(),
    /** [5] Yêu cầu uy tín / danh tiếng làng xã tối thiểu để lên bậc (nếu có). */
    min_reputation: z.number().optional(),
    condition: conditionSchema.optional(),
    stipend_money_month: z.number().default(0),
    stipend_food_month: z.number().default(0),
    /** [5] Khoảng thu nhập ước tính/tháng ở bậc này [min, max] để hiển thị bảng việc làm. */
    income_range: range.default([0, 0]),
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

export const careerWorkEffectsSchema = z
  .object({
    health_month: z.number().default(0),
    stress_month: z.number().default(0),
    skill_xp: z.record(z.string(), z.number()).default({}),
  })
  .strict();
export type CareerWorkEffects = z.infer<typeof careerWorkEffectsSchema>;

export const careerExitSchema = z
  .object({
    to: z.string(),
    hint: z.string(),
    condition: conditionSchema.optional(),
  })
  .strict();
export type CareerExit = z.infer<typeof careerExitSchema>;

export const sideJobSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string().default('focus'),
    /** Các mùa nông nhàn có thể làm nghề tay trái này (vd: ['dong', 'xuan']). */
    seasons: z.array(z.string()).min(1),
    /** Khu định cư có việc này (rỗng = mọi nơi đều có). */
    settlement_types: z.array(z.string()).default([]),
    condition: conditionSchema.optional(),
    income_money_month: z.number().min(0),
    income_food_month: z.number().min(0).default(0),
    health_month: z.number().default(0),
    stress_month: z.number().default(0),
    skill_xp: z.record(z.string(), z.number()).default({}),
  })
  .strict();
export type SideJob = z.infer<typeof sideJobSchema>;

export const careerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    /** Tên nghề tùy biến theo khuôn văn minh / thời đại. */
    names_by_civ: z.record(z.string(), z.string()).default({}),
    description: z.string(),
    descriptions_by_civ: z.record(z.string(), z.string()).default({}),
    icon: z.string().default('focus'),
    /** [1] nghe: nghề thật (bậc, lương, hành động) · trang_thai: chưa có nghề riêng (phụ việc nhà, thất nghiệp). */
    kind: z.enum(['nghe', 'trang_thai']).default('nghe'),
    /** [5] Ngành nghề (nông ngư, thủ công, thương mại, quân sự, học thuật, cai trị, chuyên môn, ngoài vòng). */
    sector: z.enum(careerSectors).default('nong_nghiep'),
    /** [5] Cấp độ sâu của nghề (Nhẹ / Vừa / Sâu — GDD 04 §13). */
    depth: z.enum(careerDepths).default('nhe'),
    /** [5] Khu định cư có nghề này (rỗng = mọi khu định cư đều có). */
    settlement_types: z.array(z.string()).default([]),
    /** [5] Kỹ năng dùng chính trong nghề. */
    skills: z.array(z.string()).default([]),
    components: z.array(z.enum(careerComponentTypes)).default([]),
    /** [1] Kinh nghiệm (công trạng) tích mỗi tháng — phụ việc nhà thì mang theo khi tiếp quản nghề nhà. */
    merit_month: z.number().min(0).default(0.8),
    /** [1] Con cái nhà theo nghề này, đến tuổi trưởng thành thì bắt đầu bằng nghề riêng nào (mặc định: life.career_start.helper). */
    youth_career: z.string().optional(),
    entry_condition: conditionSchema.optional(),
    /** [1] Tự vào nghề (tìm việc / ra làm riêng): vốn bỏ ra và lời giải thích điều kiện hiện cho người chơi. */
    join: z.object({ cost_money: z.number().min(0).default(0), hint: z.string() }).strict().optional(),
    duties: z.array(z.string()).default([]),
    ranks: z.array(careerRankSchema).min(1),
    actions: z.array(careerActionSchema).default([]),
    /** [5] Tác động hàng tháng khi làm nghề (sức khỏe, stress, XP kỹ năng). */
    work_effects: careerWorkEffectsSchema.default({}),
    /** [5] Các lối ra / hướng chuyển nghề tự nhiên trên bản đồ chuyển nghề (GDD 04 §11). */
    exits: z.array(careerExitSchema).default([]),
    /** [5] Nhãn kho sự kiện riêng của nghề. */
    event_tags: z.array(z.string()).default([]),
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
export const careerFileSchema = z
  .object({
    careers: z.array(careerSchema).min(1),
    side_jobs: z.array(sideJobSchema).default([]),
  })
  .strict();
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

export const successionPriorityGroups = [
  'eldest_son',
  'other_son',
  'adopted_child',
  'daughter',
  'grandchild',
  'sibling_or_nephew',
] as const;
export type SuccessionPriorityGroup = (typeof successionPriorityGroups)[number];

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
    /** [2] Luật thừa kế theo khuôn văn minh (hương hỏa con trưởng, kế thừa nợ). */
    inheritance: z
      .object({
        ancestor_worship_share: z.number().min(0).max(1).default(0.5),
        debt_inheritance: z.boolean().default(true),
        will_eldest_bonus: z.number().min(0).max(0.5).default(0.15),
      })
      .strict()
      .default({}),
    /** [2] Luật kế vị truyền đời (Phase 3): thứ tự ưu tiên, giám hộ, nhận con nuôi & đón họ hàng xa. */
    succession: z
      .object({
        priority_order: z
          .array(z.enum(successionPriorityGroups))
          .default(['eldest_son', 'other_son', 'adopted_child', 'daughter', 'grandchild', 'sibling_or_nephew']),
        exclude_outlaws_from_main_share: z.boolean().default(true),
        reputation_carry_factor: z.number().min(0).max(1).default(0.6),
        scholarly_prestige_carry_factor: z.number().min(0).max(1).default(0.5),
        non_main_heir_start_money: z.number().min(0).default(4),
        non_main_heir_start_food: z.number().min(0).default(10),
        adoption: z
          .object({
            min_parent_age: z.number().int().min(20).default(32),
            child_age_range: range.default([2, 8]),
            child_health_range: range.default([65, 85]),
            cost_money: z.number().min(0).default(2),
          })
          .strict()
          .default({}),
        distant_relative: z
          .object({
            age_range: range.default([14, 22]),
            health_range: range.default([65, 85]),
            cost_money: z.number().min(0).default(3),
          })
          .strict()
          .default({}),
      })
      .strict()
      .default({}),
    exam_degrees: z.array(examDegreeDefSchema).min(1),
    status_ranks: z.array(statusRankSchema).min(1),
  })
  .strict();
export type Civilization = z.infer<typeof civilizationSchema>;

export const settlementRouteSchema = z
  .object({
    to: z.string(),
    travel_months: z.number().int().min(1),
    cost_money: z.number().min(0).default(1),
    risk_chance: z.number().min(0).max(1).default(0.1),
  })
  .strict();
export type SettlementRoute = z.infer<typeof settlementRouteSchema>;

export const settlementTypeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    /** Tên loại khu định cư tùy biến theo khuôn văn minh / thời đại. */
    names_by_civ: z.record(z.string(), z.string()).default({}),
    description: z.string(),
    descriptions_by_civ: z.record(z.string(), z.string()).default({}),
    population_band: z.tuple([z.number(), z.number()]),
    trade_factor: z.number().positive().default(1),
    /** [7] Có phải là một trong 3 điểm chính của bản đồ vùng (làng – thị trấn – phủ) không. */
    region_node: z.boolean().default(false),
    /** [7] Chi phí cơ bản để chuyển cả hộ tới định cư tại đây (quan). */
    relocate_cost: z.number().min(0).default(8),
    /** [1.8] Bậc trường học tại chỗ (0 = vùng sâu không có thầy, 1 = thầy đồ làng, 2 = trường thị trấn/huyện, 3 = học đường phủ/kinh thành). */
    school_tier: z.number().int().min(0).max(3).default(1),
    /** [1.8] Bậc y tế tại chỗ (0 = hẻo lánh tự hái lá, 1 = thầy lang làng, 2 = tiệm thuốc thị trấn, 3 = y quán phủ/kinh thành). */
    medical_tier: z.number().int().min(0).max(3).default(1),
    /** [1.8] Độ xa xôi hẻo lánh (0 = đô thị sầm uất, 0.5 = làng quê, 0.9 = vùng sâu biên viễn). */
    remoteness: z.number().min(0).max(1).default(0.4),
    /** [1.8] Tiền thuê trọ/nhà mỗi năm khi ở đô thị mà đang ở thuê (quan/năm). */
    housing_rent_year: z.number().min(0).default(0),
    /** [7] Xác suất cơ bản bùng phát dịch bệnh mỗi năm tại khu định cư này. */
    epidemic_base_chance_year: z.number().min(0).max(1).default(0.04),
    /** [7] Các tuyến đường nối từ khu định cư này sang khu định cư khác trong vùng. */
    routes: z.array(settlementRouteSchema).default([]),
    /** Bộ lọc sự kiện theo nơi ở: nhân trọng số sự kiện/nhật ký có thẻ tương ứng. */
    event_weights: z.record(z.string(), z.number().min(0)).default({}),
    /** Địa điểm cảnh pixel (scene-layout.json › locations); bỏ trống thì dùng balance.scene.location. */
    scene_location: z.string().optional(),
  })
  .strict();
export const settlementTypeFileSchema = z.object({ settlement_types: z.array(settlementTypeSchema).min(1) }).strict();
export type SettlementType = z.infer<typeof settlementTypeSchema>;

/** [6] Cơ nghiệp kinh doanh & sản xuất (sạp → cửa hiệu → hiệu buôn, lò gốm, xưởng mộc, thuyền buôn, quán rượu). */
export const ventureSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string().default('focus'),
    sector: z.enum(careerSectors).default('thuong_mai'),
    /** Nơi có thể mở cơ nghiệp (trống = mọi khu định cư). */
    settlement_types: z.array(z.string()).default([]),
    /** Vốn mở ban đầu (quan). */
    capital_cost: z.number().min(0),
    /** Cơ nghiệp bậc tiếp theo khi nâng cấp (ví dụ: sap_nho -> cua_hieu -> hieu_buon). */
    upgrade_to: z.string().optional(),
    /** Chi phí nâng cấp lên cơ nghiệp bậc tiếp theo. */
    upgrade_cost: z.number().min(0).optional(),
    /** Số bậc mở rộng quy mô nội bộ (1..3). */
    max_stage: z.number().int().min(1).max(3).default(3),
    /** Hệ số vốn để mở rộng thêm 1 bậc quy mô nội bộ (nhân với capital_cost × stage hiện tại). */
    expand_cost_factor: z.number().min(0.2).default(0.75),
    /** Số người làm cần thiết ở bậc 1 (tăng theo stage). */
    workers_needed: z.number().int().min(1).default(1),
    /** Tiền công thuê 1 thợ ngoài cả năm (quan/năm). */
    hire_wage_year: z.number().min(0).default(3),
    /** Kỹ năng chính ảnh hưởng doanh thu. */
    skill: z.string().default('thuong_mai'),
    skill_bonus_per_level: z.number().min(0).default(0.06),
    /** Doanh thu gốc mỗi năm ở bậc 1 (quan/năm). */
    base_revenue_year: z.number().min(0),
    /** Chi phí vận hành/nguyên liệu cố định mỗi năm ở bậc 1 (quan/năm). */
    upkeep_year: z.number().min(0).default(1),
    /** Độ nhạy với Thời cơ buôn bán (0 = không phụ thuộc, 1 = nhân thẳng trade_index × local_trade_factor). */
    trade_sensitivity: z.number().min(0).max(2).default(0.8),
    /** Hệ số thưởng doanh thu mỗi 10 điểm danh tiếng làng. */
    reputation_bonus_per_10: z.number().min(0).default(0.03),
    /** Rủi ro biến cố kinh doanh hằng năm (hàng ế, hỏng mẻ gốm, bão gió...). */
    risk: z
      .object({
        chance_year: z.number().min(0).max(1).default(0.15),
        loss_min: z.number().min(0).default(2),
        loss_max: z.number().min(0).default(8),
      })
      .strict()
      .default({}),
    condition: conditionSchema.optional(),
    modifiers: z.array(modifierDefSchema).default([]),
    scene_prop: z.string().optional(),
  })
  .strict();
export const ventureFileSchema = z.object({ ventures: z.array(ventureSchema).min(1) }).strict();
export type VentureDef = z.infer<typeof ventureSchema>;

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

/** [10] Hệ thống Tổ chức Fractal & Ủy quyền (Phase 10 — GDD 03 §10). */
export const organizationRankSchema = z
  .object({
    rank: z.number().int().min(0).max(3),
    name: z.string(),
    min_contribution: z.number().min(0).default(0),
    stipend_money_month: z.number().min(0).default(0),
  })
  .strict();

export const organizationDefSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(['village_council', 'merchant_guild', 'outlaw_stronghold', 'prefecture_office']),
    description: z.string(),
    settlement_id: z.string(),
    join_cost_money: z.number().min(0).default(0),
    entry_condition: conditionSchema.optional(),
    initial_factors: z
      .object({
        treasury: z.number().min(0),
        morale: z.number().min(0).max(100),
        security: z.number().min(0).max(100),
        investment: z.number().min(0).max(100),
        influence: z.number().min(0).max(100),
      })
      .strict(),
    ranks: z.array(organizationRankSchema).length(4),
  })
  .strict();

export const organizationFileSchema = z
  .object({
    organizations: z.array(organizationDefSchema).min(1),
  })
  .strict();
export type OrganizationDef = z.infer<typeof organizationDefSchema>;
