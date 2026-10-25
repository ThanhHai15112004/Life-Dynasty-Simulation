// [0] Khai báo modifier trong dữ liệu (tính cách, Focus, mức sống, tài sản, modifier có điều kiện)
import { z } from 'zod';
import { conditionSchema } from './condition';

export const modifierOps = ['add', 'mul'] as const;

/** Modifier tĩnh gắn vào một dòng dữ liệu; nhãn lấy từ tên của dòng đó. */
export const modifierDefSchema = z
  .object({
    target: z.string().min(1),
    value: z.number(),
    op: z.enum(modifierOps).default('add'),
    /** Với tài sản: nhân theo số lượng đang sở hữu. */
    per_unit: z.boolean().default(false),
  })
  .strict();
export type ModifierDef = z.infer<typeof modifierDefSchema>;

/** Modifier có điều kiện (data/balance/modifiers.yaml): mùa đông, nợ nặng, tuổi già... */
export const conditionalModifierSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    condition: conditionSchema,
    target: z.string().min(1),
    value: z.number(),
    op: z.enum(modifierOps).default('add'),
    /** Áp cho ai: người chơi hay mọi thành viên trong hộ. */
    applies_to: z.enum(['player', 'household']).default('household'),
  })
  .strict();
export type ConditionalModifier = z.infer<typeof conditionalModifierSchema>;
