// [2] Schema chế độ số phận & chế độ chơi (balance/fate_modes.yaml) — điều chỉnh độ khắc nghiệt và hình thức truyền đời
import { z } from 'zod';

export const playModeSchema = z
  .object({
    id: z.string().min(1),
    name_key: z.string().min(1),
    desc_key: z.string().min(1),
    succession: z.boolean(),
  })
  .strict();

export type PlayMode = z.infer<typeof playModeSchema>;

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
    default_play_mode: z.string().min(1).default('dynasty'),
    play_modes: z
      .array(playModeSchema)
      .min(1)
      .default([
        { id: 'dynasty', name_key: 'play_mode.dynasty.name', desc_key: 'play_mode.dynasty.desc', succession: true },
        { id: 'one_life', name_key: 'play_mode.one_life.name', desc_key: 'play_mode.one_life.desc', succession: false },
      ]),
    default_mode: z.string().min(1),
    modes: z.array(fateModeSchema).min(1),
  })
  .strict();

export type FateModesBalance = z.infer<typeof fateModesFileSchema>;
