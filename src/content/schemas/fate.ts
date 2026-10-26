// [2] Schema chế độ số phận (balance/fate_modes.yaml) — điều chỉnh độ khắc nghiệt của mô phỏng
import { z } from 'zod';

export const fateModeSchema = z
  .object({
    id: z.string().min(1),
    name_key: z.string().min(1),
    desc_key: z.string().min(1),
    mortality_factor: z.number().positive(),
    disease_factor: z.number().positive(),
    disaster_factor: z.number().positive(),
    bad_event_factor: z.number().positive(),
  })
  .strict();

export type FateMode = z.infer<typeof fateModeSchema>;

export const fateModesFileSchema = z
  .object({
    default_mode: z.string().min(1),
    modes: z.array(fateModeSchema).min(1),
  })
  .strict();

export type FateModesBalance = z.infer<typeof fateModesFileSchema>;
