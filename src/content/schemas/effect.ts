// [0] Hậu quả (effect) dùng chung cho phương án sự kiện, nhật ký thường và gieo mầm
import { z } from 'zod';
import { modifierOps } from './modifier';

/** Giá trị số: hằng số hoặc lấy từ biến trạng thái (vd: trả hết nợ = household.debt × -1). */
export const numberExprSchema = z.union([
  z.number(),
  z
    .object({
      var: z.string(),
      factor: z.number().default(1),
      add: z.number().default(0),
      min: z.number().optional(),
      max: z.number().optional(),
      round: z.boolean().default(true),
    })
    .strict(),
]);
export type NumberExpr = z.infer<typeof numberExprSchema>;

/** Ai chịu tác động: 'player', id vai trò của sự kiện, hoặc 'household' (mọi thành viên). */
const who = z.string().default('player');

export const examDegreeIds = ['none', 'sinh_do', 'huong_cong', 'tien_si'] as const;
export type ExamDegreeId = (typeof examDegreeIds)[number];

export type Effect =
  | { type: 'money'; value: NumberExpr; ledger?: string }
  | { type: 'food'; value: NumberExpr; ledger?: string }
  | { type: 'debt'; value: NumberExpr; ledger?: string }
  | { type: 'health'; value: NumberExpr; who: string }
  | { type: 'stress'; value: NumberExpr; who: string }
  | { type: 'skill_xp'; skill: string; value: NumberExpr; who: string }
  | {
      type: 'modifier';
      target: string;
      value: number;
      op: (typeof modifierOps)[number];
      months: number;
      label: string;
      who: string;
    }
  | { type: 'set_flag'; flag: string; years?: number; label?: string }
  | { type: 'clear_flag'; flag: string }
  | { type: 'opinion'; role: string; value: number }
  | { type: 'sell_food'; share: number; keep_months: number; price_factor: number; ledger?: string }
  | { type: 'own_money'; value: NumberExpr; ledger?: string }
  | { type: 'property_add'; property: string; count: number }
  | { type: 'property_remove'; property: string; count: number }
  | { type: 'schedule_event'; event: string; months: number; keep_roles: boolean; label?: string }
  | { type: 'leave_household'; who: string }
  | { type: 'add_trait'; trait: string; who: string }
  | { type: 'marry'; role?: string }
  | { type: 'add_disease'; disease: string; who: string }
  | { type: 'cure_disease'; disease?: string; who: string }
  | { type: 'reputation'; group: string; value: number }
  | { type: 'favor'; role: string; value: number }
  | { type: 'set_career'; career: string; rank?: number; months?: number }
  | { type: 'set_side_job'; side_job: string }
  | { type: 'career_merit'; value: number }
  | { type: 'wanted'; value: number }
  | { type: 'filial_piety'; value: number }
  | { type: 'scholarly_prestige'; value: number }
  | { type: 'set_exam_degree'; degree: ExamDegreeId }
  | { type: 'cutscene'; id: string }
  | { type: 'set_ambition'; ambition: string }
  | { type: 'split_household'; share_factor?: number }
  | { type: 'trigger_inheritance'; share_factor?: number }
  | { type: 'adopt_child'; sex?: 'm' | 'f' }
  | { type: 'adopt_relative'; sex?: 'm' | 'f' }
  | { type: 'dynasty_prestige'; value: number }
  | { type: 'fulfill_wish'; wishId?: string }
  | { type: 'clan_relation'; clan?: string; value: number; tie?: 'none' | 'in_law' | 'ally' | 'feud'; reason?: string }
  | { type: 'arrange_child_marriage'; sex?: 'm' | 'f'; status?: string }
  | { type: 'log'; text: string[]; importance: number }
  | { type: 'chance'; p: number; then: Effect[]; else: Effect[] };

export const effectSchema: z.ZodType<Effect, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('money'), value: numberExprSchema, ledger: z.string().optional() }).strict(),
    z.object({ type: z.literal('food'), value: numberExprSchema, ledger: z.string().optional() }).strict(),
    z.object({ type: z.literal('debt'), value: numberExprSchema, ledger: z.string().optional() }).strict(),
    z.object({ type: z.literal('health'), value: numberExprSchema, who }).strict(),
    z.object({ type: z.literal('stress'), value: numberExprSchema, who }).strict(),
    z.object({ type: z.literal('skill_xp'), skill: z.string(), value: numberExprSchema, who }).strict(),
    z
      .object({
        type: z.literal('modifier'),
        target: z.string(),
        value: z.number(),
        op: z.enum(modifierOps).default('add'),
        months: z.number().int().positive(),
        label: z.string(),
        who,
      })
      .strict(),
    z
      .object({
        type: z.literal('set_flag'),
        flag: z.string(),
        years: z.number().positive().optional(),
        /** Có nhãn thì hiện ở mục "Việc dang dở". */
        label: z.string().optional(),
      })
      .strict(),
    z.object({ type: z.literal('clear_flag'), flag: z.string() }).strict(),
    z.object({ type: z.literal('opinion'), role: z.string(), value: z.number() }).strict(),
    /** [1.5] Tiền của riêng người chơi (lì xì, tiền công làm thêm, tiêu vặt...): chưa làm chủ hộ thì vào túi riêng, làm chủ rồi thì vào tiền nhà. */
    z.object({ type: z.literal('own_money'), value: numberExprSchema, ledger: z.string().optional() }).strict(),
    /** [1.5] Bán một phần kho thóc (phần vượt keep_months tháng ăn) theo giá chợ × price_factor. */
    z
      .object({
        type: z.literal('sell_food'),
        share: z.number().min(0).max(1),
        keep_months: z.number().min(0).default(0),
        price_factor: z.number().positive().default(1),
        ledger: z.string().optional(),
      })
      .strict(),
    z.object({ type: z.literal('property_add'), property: z.string(), count: z.number().int().positive() }).strict(),
    z.object({ type: z.literal('property_remove'), property: z.string(), count: z.number().int().positive() }).strict(),
    z
      .object({
        type: z.literal('schedule_event'),
        event: z.string(),
        months: z.number().int().positive(),
        keep_roles: z.boolean().default(true),
        label: z.string().optional(),
      })
      .strict(),
    z.object({ type: z.literal('leave_household'), who: z.string() }).strict(),
    z.object({ type: z.literal('add_trait'), trait: z.string(), who }).strict(),
    z.object({ type: z.literal('marry'), role: z.string().optional() }).strict(),
    z.object({ type: z.literal('add_disease'), disease: z.string(), who }).strict(),
    z.object({ type: z.literal('cure_disease'), disease: z.string().optional(), who }).strict(),
    z.object({ type: z.literal('reputation'), group: z.string().default('dan_lang'), value: z.number() }).strict(),
    z.object({ type: z.literal('favor'), role: z.string(), value: z.number() }).strict(),
    z
      .object({
        type: z.literal('set_career'),
        career: z.string(),
        rank: z.number().int().min(0).optional(),
        months: z.number().int().min(0).optional(),
      })
      .strict(),
    z.object({ type: z.literal('set_side_job'), side_job: z.string() }).strict(),
    z.object({ type: z.literal('career_merit'), value: z.number() }).strict(),
    z.object({ type: z.literal('wanted'), value: z.number() }).strict(),
    z.object({ type: z.literal('filial_piety'), value: z.number() }).strict(),
    z.object({ type: z.literal('scholarly_prestige'), value: z.number() }).strict(),
    z.object({ type: z.literal('set_exam_degree'), degree: z.enum(examDegreeIds) }).strict(),
    z.object({ type: z.literal('cutscene'), id: z.string() }).strict(),
    z.object({ type: z.literal('set_ambition'), ambition: z.string() }).strict(),
    z.object({ type: z.literal('split_household'), share_factor: z.number().min(0).max(2).optional() }).strict(),
    z.object({ type: z.literal('trigger_inheritance'), share_factor: z.number().min(0).max(2).optional() }).strict(),
    z.object({ type: z.literal('adopt_child'), sex: z.enum(['m', 'f']).optional() }).strict(),
    z.object({ type: z.literal('adopt_relative'), sex: z.enum(['m', 'f']).optional() }).strict(),
    z.object({ type: z.literal('dynasty_prestige'), value: z.number() }).strict(),
    z.object({ type: z.literal('fulfill_wish'), wishId: z.string().optional() }).strict(),
    z
      .object({
        type: z.literal('clan_relation'),
        clan: z.string().optional(),
        value: z.number(),
        tie: z.enum(['none', 'in_law', 'ally', 'feud']).optional(),
        reason: z.string().optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal('arrange_child_marriage'),
        sex: z.enum(['m', 'f']).optional(),
        status: z.string().optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal('log'),
        text: z.array(z.string()).min(1),
        importance: z.number().default(3),
      })
      .strict(),
    z
      .object({
        type: z.literal('chance'),
        p: z.number().min(0).max(1),
        then: z.array(effectSchema),
        else: z.array(effectSchema).default([]),
      })
      .strict(),
  ]),
);
