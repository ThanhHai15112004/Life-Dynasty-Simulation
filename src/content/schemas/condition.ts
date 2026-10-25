// [0] Ngôn ngữ điều kiện (DSL) dùng chung cho sự kiện, Focus, modifier có điều kiện, luật cảnh...
// Viết dạng cấu trúc trong YAML để Zod kiểm được, không cần bộ parse chuỗi.
import { z } from 'zod';

export const compareOps = ['==', '!=', '>', '>=', '<', '<=', 'between', 'in'] as const;
export type CompareOp = (typeof compareOps)[number];

export type Primitive = number | string | boolean;

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { var: string; op: CompareOp; value: Primitive | Primitive[] }
  | { has_trait: string; who?: string }
  | { has_flag: string }
  | { has_property: string; min?: number }
  | { role: string; exists: boolean };

const primitive = z.union([z.number(), z.string(), z.boolean()]);

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema).min(1) }).strict(),
    z.object({ any: z.array(conditionSchema).min(1) }).strict(),
    z.object({ not: conditionSchema }).strict(),
    z
      .object({
        var: z.string().min(1),
        op: z.enum(compareOps),
        value: z.union([primitive, z.array(primitive)]),
      })
      .strict(),
    z.object({ has_trait: z.string(), who: z.string().optional() }).strict(),
    z.object({ has_flag: z.string() }).strict(),
    z.object({ has_property: z.string(), min: z.number().optional() }).strict(),
    z.object({ role: z.string(), exists: z.boolean() }).strict(),
  ]),
);

/** Hệ số nhân trọng số khi điều kiện đúng (dùng cho sự kiện, nguyên nhân tử vong...). */
export const weightModifierSchema = z
  .object({ condition: conditionSchema, factor: z.number().min(0) })
  .strict();
export type WeightModifier = z.infer<typeof weightModifierSchema>;
