// [0] Các file cân bằng trong data/balance/ — mọi con số chỉnh được của GĐ0
import { z } from 'zod';
import { conditionSchema, weightModifierSchema } from './condition';
import { conditionalModifierSchema, modifierDefSchema } from './modifier';

const range = z.tuple([z.number(), z.number()]);
/** Bảng điểm nội suy tuyến tính: [{x, y}] sắp tăng dần theo x. */
function curve<X extends string, Y extends string>(x: X, y: Y) {
  const shape = { [x]: z.number(), [y]: z.number() } as Record<X | Y, z.ZodNumber>;
  return z
    .array(z.object(shape).strict())
    .min(1)
    .refine((pts) => pts.every((p, i) => i === 0 || p[x] >= pts[i - 1][x]), { message: `Phải sắp tăng dần theo ${x}` });
}

export const timeBalanceSchema = z
  .object({
    start_year: z.number().int(),
    start_month: z.number().int().min(1).max(12),
    ms_per_month_at_1x: z.number().positive(),
    speeds: z.array(z.number().positive()).min(1),
    default_speed_index: z.number().int().min(0),
    /** Tự lưu sau mỗi N năm (0 = tắt). */
    autosave_every_years: z.number().int().min(0),
  })
  .strict();

export const calendarBalanceSchema = z
  .object({
    months_per_year: z.number().int().positive(),
    seasons: z.array(z.object({ id: z.string(), name: z.string() }).strict()).min(1),
    months: z
      .array(
        z
          .object({
            month: z.number().int().min(1),
            season: z.string(),
            weather: z.array(z.object({ id: z.string(), weight: z.number().min(0) }).strict()).min(1),
          })
          .strict(),
      )
      .min(1),
    weathers: z.array(z.object({ id: z.string(), name: z.string() }).strict()).min(1),
  })
  .strict();

export const lifeBalanceSchema = z
  .object({
    life_stages: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            min_age: z.number().int().min(0),
            ambient_lines: range,
            decisions: z.boolean(),
            can_choose_focus: z.boolean(),
            can_have_secondary_focus: z.boolean(),
          })
          .strict(),
      )
      .min(1),
    health: z
      .object({
        max: z.number(),
        /** Trần sức khỏe theo tuổi (già thì không hồi phục đầy). */
        cap_by_age: curve('age', 'cap'),
        npc_default: z.number(),
      })
      .strict(),
    stress: z.object({ max: z.number(), start: z.number() }).strict(),
    mortality: z
      .object({
        /** Tỷ lệ chết mỗi NĂM theo tuổi (nội suy), engine tự quy ra tháng. */
        annual_by_age: curve('age', 'rate'),
        health_factor: curve('health', 'factor'),
        max_monthly: z.number().min(0).max(1),
        causes: z
          .array(
            z
              .object({
                id: z.string(),
                name: z.string(),
                weight: z.number().min(0),
                condition: conditionSchema.optional(),
                weight_modifiers: z.array(weightModifierSchema).default([]),
                /** Chết hoàn toàn bất ngờ (không dấu hiệu) — chịu bad-luck protection. */
                unexpected: z.boolean().default(false),
              })
              .strict(),
          )
          .min(1),
        max_unexpected_household_deaths_per_year: z.number().int().min(0),
      })
      .strict(),
    age_groups: z.array(z.object({ id: z.string(), max_age: z.number() }).strict()).min(1),
    adult_age: z.number().int(),
    /** Xác suất sinh con trai khi xuất thân không chỉ định giới tính. */
    male_ratio: z.number().min(0).max(1),
    /** Số tính cách của NPC (người nhà, người làng) khi sinh ra. */
    npc_trait_count: z.number().int().min(0),
    /** [1] Cấu hình hôn nhân & sinh con (GDD 03 §7). */
    marriage: z
      .object({
        min_age: z.number().int().min(14).default(16),
        fertility_age_f: range.default([17, 42]),
        base_conception_chance_month: z.number().min(0).max(1).default(0.03),
        pregnancy_months: z.number().int().positive().default(9),
        max_children_in_household: z.number().int().min(1).default(5),
        spouse_age_offset: range.default([-3, 3]),
        spouse_health: range.default([65, 85]),
        /** Sức khỏe trẻ sơ sinh = trung bình cha mẹ, kẹp trong khoảng này. */
        newborn_health: range.default([60, 88]),
        /** Hệ số thụ thai theo sức khỏe mẹ: health / ref, kẹp trong khoảng factor. */
        conception_health_ref: z.number().positive().default(75),
        conception_health_factor: range.default([0.4, 1.2]),
        /** Hoạt cảnh phát khi cưới / sinh con (id trong cutscenes.json, chữ ở lang: cutscene.<id>.*). */
        wedding_cutscene: z.string().optional(),
        birth_cutscene: z.string().optional(),
      })
      .strict()
      .default({}),
    /** Số bệnh tối đa một người mắc cùng lúc. */
    max_concurrent_diseases: z.number().int().min(1).default(2),
    /** [1] Cấu hình mô hình Hạnh phúc tâm lý 3 tầng (GDD 01 §7). */
    happiness: z
      .object({
        start: z.number().default(50),
        min: z.number().default(0),
        max: z.number().default(100),
        /** Tốc độ thích nghi (hedonic adaptation) mỗi năm với tài sản/mức sống (0..1). */
        adaptation_rate_year: z.number().min(0).max(1).default(0.3),
        wealth_factor: z.number().default(0.4),
        stress_penalty_factor: z.number().default(0.25),
        family_death_penalty: z.number().default(8),
        family_death_penalty_cap: z.number().default(24),
        marriage_bonus: z.number().default(6),
        child_bonus: z.number().default(4),
        child_bonus_cap: z.number().default(12),
        /** Tâm trạng: (sức khỏe - health_ref) * health_factor. */
        health_ref: z.number().default(60),
        health_factor: z.number().default(0.15),
        mood_wealth_clamp: range.default([-15, 15]),
        satisfaction_wealth_clamp: range.default([-18, 22]),
        /** Phần stress trừ vào mãn nguyện (so với phần trừ vào tâm trạng). */
        satisfaction_stress_share: z.number().min(0).default(0.6),
        /** Hệ giá trị theo tính cách (GDD 01 §7.2): mọi luật đúng đều cộng/trừ mãn nguyện. */
        value_rules: z.array(z.object({ condition: conditionSchema, value: z.number() }).strict()).default([]),
      })
      .strict()
      .default({}),
    /** Bản tổng kết đời (GDD 01 §7.3): mỗi trục = base + Σ(biến DSL × hệ số), kẹp 0..100. */
    summary_axes: z
      .array(
        z
          .object({
            id: z.string(),
            base: z.number().default(0),
            terms: z.array(z.object({ var: z.string(), factor: z.number(), min: z.number().optional(), max: z.number().optional() }).strict()).default([]),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const skillsBalanceSchema = z
  .object({
    max_level: z.number().int().positive(),
    xp_base: z.number().positive(),
    xp_growth: z.number().min(1),
    learning_by_age: curve('age', 'factor'),
    secondary_focus_factor: z.number().min(0).max(1),
  })
  .strict();

export const economyBalanceSchema = z
  .object({
    harvest: z
      .object({
        months: z.array(z.number().int().min(1)).min(1),
        yield_per_sao: z.number().min(0),
        skill: z.string(),
        skill_bonus_per_level: z.number(),
        worker_min_age: z.number().int(),
        worker_max_age: z.number().int(),
        /** Tỷ lệ công lao động: số người làm / số sào → hệ số sản lượng. */
        labor_factor: curve('workers_per_sao', 'factor'),
        /** Số người làm mỗi sào coi là đủ; người dư ra đi làm thuê. */
        full_workers_per_sao: z.number().positive(),
        /** Tiền công làm thuê mỗi tháng của một lao động dư. */
        spare_worker_wage_month: z.number().min(0),
      })
      .strict(),
    /** [1] Hộ không tự cày (nghề không có thành phần farmland): ruộng phát canh cho tá điền, thu tô bằng thóc. */
    tenancy: z
      .object({
        /** Phần sản lượng chủ ruộng được hưởng (trước hệ số trời định). */
        rent_share: z.number().min(0).max(1),
        /** Số người trong hộ lo việc nghề chính (không tính là lao động dư). */
        business_runners: z.number().int().min(0),
        /** Hộ không tự cày đi chợ mua thóc để luôn có dự trữ chừng này tháng (chỉ tiêu tiền mặt, không vay). */
        food_reserve_months: z.number().min(0),
        /** Làng chỉ có chừng ấy tá điền: hệ số tô mỗi sào theo tổng số sào phát canh (chống tích ruộng vô hạn). */
        rent_factor_by_sao: curve('sao', 'factor'),
      })
      .strict(),
    harvest_qualities: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            weight: z.number().min(0),
            yield_factor: z.number().min(0),
            price_factor: z.number().positive(),
            /** Thời tiết nghiêng về kiểu này trong năm (điềm báo thật — R1). */
            weather_bias: z.record(z.string(), z.number()).default({}),
            harvest_log: z.string(),
            quiet_year_log: z.string(),
            /** Hoạt cảnh phát khi gặt vụ năm này (vd. bội thu). */
            cutscene: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
    price: z
      .object({
        base: z.number().positive(),
        /** Hệ số giá theo tháng: rẻ sau gặt, đắt mùa giáp hạt. */
        monthly_factor: z.array(z.number().positive()).min(1),
        noise: z.number().min(0),
        sell_factor: z.number().positive(),
        buy_factor: z.number().positive(),
      })
      .strict(),
    consumption_by_age_group: z.record(z.string(), z.number().min(0)),
    tax: z
      .object({
        month: z.number().int().min(1),
        food_per_sao: z.number().min(0),
        money_per_adult: z.number().min(0),
      })
      .strict(),
    debt: z
      .object({
        annual_interest: z.number().min(0),
        /** Thiếu tiền thì tự vay nặng lãi (ghi vào sổ). */
        auto_borrow: z.boolean(),
        /** Không ai cho vay thêm khi nợ đã đến mức này — thiếu ăn thì đói thật. */
        borrow_limit: z.number().min(0),
        /** Lãi không đẩy tổng nợ vượt mức này (chủ nợ biết con nợ không trả nổi hơn). */
        interest_cap: z.number().min(0),
        /** Nợ vượt ngưỡng thì cuối năm chủ nợ xiết tài sản (mỗi năm một đơn vị). */
        seize: z
          .object({
            threshold: z.number().min(0),
            property: z.string(),
            /** Phần giá trị tài sản được trừ vào nợ (chủ nợ ép giá). */
            value_factor: z.number().min(0),
            keep_min: z.number().int().min(0),
          })
          .strict(),
      })
      .strict(),
    /** Thiếu tiền tiêu thì tự bán thóc dư, chỉ giữ lại đủ ăn chừng này tháng; còn thiếu mới đi vay. */
    auto_sell_keep_months: z.number().min(0),
    property_sell_factor: z.number().positive(),
    trade_amounts: z.array(z.number().positive()).min(1),
    ledger_history_years: z.number().int().positive(),
  })
  .strict();

export const livingStandardsSchema = z
  .object({
    default: z.string(),
    levels: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            food_per_member: z.number().min(0),
            money_per_member: z.number().min(0),
            modifiers: z.array(modifierDefSchema).default([]),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const directorBalanceSchema = z
  .object({
    max_decisions_per_year: z.number().int().min(0),
    base_monthly_chance: z.number().min(0).max(1),
    min_months_between: z.number().int().min(0),
    /** Mỗi lần đã gặp, trọng số sự kiện/mẫu nhật ký nhân thêm hệ số này (ưu tiên chuyện chưa gặp). */
    repeat_weight_factor: z.number().min(0).max(1).default(1),
    ambient_repeat_weight_factor: z.number().min(0).max(1).default(1),
    /** Bù khi cả năm chưa có quyết định nào: cộng thêm mỗi tháng trôi qua. */
    drought_bonus_per_month: z.number().min(0),
    tension: z
      .object({
        decay_per_month: z.number().min(0),
        high_threshold: z.number(),
        high_factor: z.number().min(0),
      })
      .strict(),
    ambient: z
      .object({
        /** Năm có tang: nhân trọng số theo tông (R6). */
        mourning_tone_factor: z.record(z.string(), z.number().min(0)),
        merge_importance_max: z.number(),
        digest_template: z.string(),
        digest_separator: z.string(),
        rare_kinds: z.array(z.string()).default([]),
      })
      .strict(),
    /** Mẫu ghi một quyết định vào nhật ký: token {title}, {result}. */
    decision_log_template: z.string(),
    chance_display: z
      .object({
        base_spread: z.number().min(0),
        spread_per_level: z.number().min(0),
        min_spread: z.number().min(0),
      })
      .strict(),
  })
  .strict();

/** [1] Thời cơ nghề nghiệp (GDD 03 §9): giá buôn, động tĩnh quân sự, tuần tra, truy nã. */
export const opportunityBalanceSchema = z
  .object({
    start_trade_index: z.number().positive(),
    start_patrol_level: z.number().min(0),
    military_alerts: z
      .array(z.object({ id: z.string(), weight: z.number().min(0), patrol_base: z.number() }).strict())
      .min(1),
    trade: z
      .object({
        /** Hệ số giá buôn theo tháng 1..12 (cao giáp Tết, thấp ngay sau gặt). */
        monthly_factor: z.array(z.number().positive()).min(1),
        /** Cộng thêm theo chất lượng mùa màng năm nay (mất mùa thì hàng khan). */
        harvest_bump: z.record(z.string(), z.number()).default({}),
        noise: z.number().min(0),
        clamp: range,
      })
      .strict(),
    patrol: z
      .object({
        /** Mỗi điểm truy nã đẩy mức tuần tra lên chừng này. */
        wanted_factor: z.number().min(0),
        noise: z.number().int().min(0),
        clamp: range,
      })
      .strict(),
    /** Mức truy nã tự giảm khi không phạm thêm tội. */
    wanted_decay: z.object({ every_months: z.number().int().positive(), amount: z.number().min(0) }).strict(),
    /** Độ quan trọng của dòng nhật ký khi làm hành động nghề. */
    career_action_log_importance: z.number(),
  })
  .strict();

export const modifiersBalanceSchema =z.object({ conditional: z.array(conditionalModifierSchema) }).strict();

export const displayBalanceSchema = z
  .object({
    health_bands: z.array(z.object({ min: z.number(), key: z.string() }).strict()).min(1),
    stress_bands: z.array(z.object({ min: z.number(), key: z.string() }).strict()).min(1),
    chance_bands: z.array(z.object({ min: z.number(), key: z.string() }).strict()).min(1),
    reputation_bands: z
      .array(z.object({ min: z.number(), key: z.string() }).strict())
      .default([
        { min: 40, key: 'reputation.revered' },
        { min: 15, key: 'reputation.respected' },
        { min: -10, key: 'reputation.normal' },
        { min: -30, key: 'reputation.disliked' },
        { min: -999, key: 'reputation.shunned' },
      ]),
    satisfaction_bands: z
      .array(z.object({ min: z.number(), key: z.string() }).strict())
      .default([
        { min: 80, key: 'satisfaction.fulfilled' },
        { min: 60, key: 'satisfaction.content' },
        { min: 40, key: 'satisfaction.ordinary' },
        { min: 20, key: 'satisfaction.unfulfilled' },
        { min: 0, key: 'satisfaction.bitter' },
      ]),
    summary_axis_bands: z
      .array(z.object({ min: z.number(), key: z.string() }).strict())
      .default([
        { min: 80, key: 'axis.band.very_high' },
        { min: 60, key: 'axis.band.high' },
        { min: 40, key: 'axis.band.mid' },
        { min: 20, key: 'axis.band.low' },
        { min: 0, key: 'axis.band.very_low' },
      ]),
    food_months_warning: z.number(),
    /** Việc dang dở suy ra từ trạng thái (GDD 01 §10.1): mọi luật đúng đều hiện, chữ có token. */
    open_loop_rules: z.array(z.object({ condition: conditionSchema, text: z.string() }).strict()),
    highlight_importance: z.number(),
    /** Bản đồ cuộc đời vẽ thêm chừng này hàng (10 ô/hàng) sau tuổi thọ kỳ vọng. */
    life_map_extra_rows: z.number().int().min(0).default(1),
    /** Số biến cố biên niên gần nhất hiện trên màn hình. */
    chronicle_shown: z.number().int().min(0).default(6),
    /** Số biểu tượng dấu mốc tối đa trên một ô Bản đồ cuộc đời. */
    life_map_marks_per_year: z.number().int().min(0).default(2),
    /** Gói ngôn ngữ mặc định (tên file trong src/data/lang). */
    default_language: z.string(),
    /** Số năm nhật ký hiển thị trên màn hình chính. */
    journal_years_shown: z.number().int().positive(),
  })
  .strict();

export const sceneBalanceSchema = z
  .object({
    /** Địa điểm mặc định khi loại khu định cư không chỉ định scene_location. */
    location: z.string(),
    culture_set: z.string(),
    default_condition: z.string(),
    /** Luật xét theo thứ tự, luật đầu tiên đúng quyết định "tình trạng" cảnh (lớp 6). */
    condition_rules: z.array(z.object({ condition: conditionSchema, value: z.string() }).strict()),
    /** Hiệu ứng hạt (lớp 7): mọi luật đúng đều thêm hạt. */
    particle_rules: z.array(z.object({ condition: conditionSchema, value: z.string() }).strict()),
  })
  .strict();

export const balanceSchemas = {
  time: timeBalanceSchema,
  calendar: calendarBalanceSchema,
  life: lifeBalanceSchema,
  skills: skillsBalanceSchema,
  economy: economyBalanceSchema,
  living_standards: livingStandardsSchema,
  director: directorBalanceSchema,
  opportunity: opportunityBalanceSchema,
  modifiers: modifiersBalanceSchema,
  display: displayBalanceSchema,
  scene: sceneBalanceSchema,
} as const;

export type Balance = { [K in keyof typeof balanceSchemas]: z.infer<(typeof balanceSchemas)[K]> };
