// [0] Sự kiện quyết định (Storylet) và mẫu nhật ký thường (Ambient Life Log) — GDD 05
import { z } from 'zod';
import { conditionSchema, weightModifierSchema } from './condition';
import { effectSchema } from './effect';

/** Vai trò lấy từ nhân vật thật trong mô phỏng (GDD 05 §1). */
export const roleSpecSchema = z
  .object({
    id: z.string(),
    from: z.enum(['family', 'village']),
    /** Với 'family': quan hệ với người chơi. */
    relation: z.enum(['father', 'mother', 'sibling', 'parent', 'member']).optional(),
    /** Với 'village': vai trò trong làng (ba_ho, ly_truong...). */
    village_role: z.string().optional(),
    /** Lọc ứng viên; trong điều kiện dùng biến `self.*` cho ứng viên. */
    condition: conditionSchema.optional(),
    pick: z.enum(['random', 'oldest', 'youngest']).default('random'),
    optional: z.boolean().default(false),
  })
  .strict();
export type RoleSpec = z.infer<typeof roleSpecSchema>;

const chanceSchema = z
  .object({
    base: z.number().min(0).max(1),
    skill: z.string().optional(),
    per_level: z.number().default(0),
    min: z.number().min(0).max(1).default(0.05),
    max: z.number().min(0).max(1).default(0.95),
    modifiers: z.array(z.object({ condition: conditionSchema, add: z.number() }).strict()).default([]),
  })
  .strict();
export type ChanceSpec = z.infer<typeof chanceSchema>;

export const eventOptionSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    hint: z.string().optional(),
    condition: conditionSchema.optional(),
    /** Làm trái tính cách thì tăng stress (GDD 03 §4). */
    trait_stress: z.record(z.string(), z.number()).default({}),
    effects: z.array(effectSchema).default([]),
    chance: chanceSchema.optional(),
    success: z.array(effectSchema).default([]),
    failure: z.array(effectSchema).default([]),
    result: z.array(z.string()).default([]),
    success_result: z.array(z.string()).default([]),
    failure_result: z.array(z.string()).default([]),
    /** Phương án "Chưa phải lúc": hoãn, sự kiện quay lại sau N tháng với cùng vai trò. */
    defer: z.object({ months: z.number().int().positive() }).strict().optional(),
  })
  .strict();
export type EventOption = z.infer<typeof eventOptionSchema>;

export const decisionEventSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    text: z.array(z.string()).min(1),
    tags: z.array(z.string()).default([]),
    life_stages: z.array(z.string()).optional(),
    months: z.array(z.number().int().min(1).max(12)).optional(),
    condition: conditionSchema.optional(),
    roles: z.array(roleSpecSchema).default([]),
    weight: z.number().min(0),
    weight_modifiers: z.array(weightModifierSchema).default([]),
    cooldown_years: z.number().min(0).default(0),
    once_per_life: z.boolean().default(false),
    /** Chỉ xuất hiện khi được hẹn bởi effect schedule_event (chuỗi sự kiện). */
    scheduled_only: z.boolean().default(false),
    tension: z.number().min(0).default(3),
    importance: z.number().min(0).default(5),
    icon: z.string().default('su_kien'),
    options: z.array(eventOptionSchema).min(2).max(5),
  })
  .strict();
export type DecisionEvent = z.infer<typeof decisionEventSchema>;

export const ambientKinds = ['bao_cao', 'nguoi_quanh', 'tin_the_gioi', 'chuyen_vat', 'diem_bao', 'he_thong'] as const;
export const ambientTones = ['vui', 'buon', 'trung_tinh', 'an_ui'] as const;

export const ambientTemplateSchema = z
  .object({
    id: z.string(),
    kind: z.enum(ambientKinds),
    tags: z.array(z.string()).default([]),
    life_stages: z.array(z.string()).optional(),
    months: z.array(z.number().int().min(1).max(12)).optional(),
    condition: conditionSchema.optional(),
    roles: z.array(roleSpecSchema).default([]),
    weight: z.number().min(0).default(0),
    weight_modifiers: z.array(weightModifierSchema).default([]),
    cooldown_years: z.number().min(0).default(0),
    once_per_life: z.boolean().default(false),
    /** Điểm quan trọng: cao thì giữ, thấp thì bị gộp (R4). */
    importance: z.number().min(0).max(10).default(2),
    tone: z.enum(ambientTones).default('trung_tinh'),
    rumor: z.boolean().default(false),
    highlight: z.boolean().default(false),
    icon: z.string().default('dong'),
    variants: z.array(z.string()).min(1),
    /** Bản rút gọn để gộp vào câu tổng hợp năm (R4). */
    short: z.string().optional(),
    trait_reactions: z.record(z.string(), z.string()).default({}),
    effects: z.array(effectSchema).default([]),
  })
  .strict();
export type AmbientTemplate = z.infer<typeof ambientTemplateSchema>;

export const decisionEventFileSchema = z.object({ events: z.array(decisionEventSchema) }).strict();
export const ambientFileSchema = z.object({ templates: z.array(ambientTemplateSchema) }).strict();
