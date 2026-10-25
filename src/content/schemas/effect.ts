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
  | { type: 'property_add'; property: string; count: number }
  | { type: 'property_remove'; property: string; count: number }
  | { type: 'schedule_event'; event: string; months: number; keep_roles: boolean; label?: string }
  | { type: 'leave_household'; who: string }
  | { type: 'add_trait'; trait: string; who: string }
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
