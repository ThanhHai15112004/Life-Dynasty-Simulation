// Lớp câu chuyện của một đời: bạn cùng lứa sống song song, mốc dừng lại suy ngẫm, câu văn bia cuối đời
import { z } from 'zod';
import { conditionSchema } from './condition';

/** Một kết cục có thể xảy ra ở một mốc tuổi của bạn cùng lứa. Token: {name}, {label}, {age}. */
const peerOutcomeSchema = z
  .object({
    weight: z.number().positive(),
    text: z.string(),
  })
  .strict();

const peerMilestoneSchema = z
  .object({
    age: z.number().int().min(0),
    /** Xác suất mốc này có chuyện để kể (không có thì năm ấy lặng lẽ trôi). */
    chance: z.number().min(0).max(1).default(1),
    outcomes: z.array(peerOutcomeSchema).min(1),
  })
  .strict();

const peerArchetypeSchema = z
  .object({
    id: z.string(),
    /** Gọi theo gia cảnh: "con nhà bá hộ", "con nhà tá điền"... */
    label: z.string(),
    weight: z.number().positive(),
    /** Điều kiện bối cảnh văn minh / thời đại để xuất hiện gia cảnh bạn cùng lứa này. */
    condition: conditionSchema.optional(),
    /** Nhân rủi ro tử vong năm theo bảng life.mortality (nhà nghèo cao hơn, nhà giàu thấp hơn). */
    death_factor: z.number().positive(),
    milestones: z.array(peerMilestoneSchema).default([]),
  })
  .strict();

export const storySchema = z
  .object({
    peers: z
      .object({
        count: z.number().int().min(0),
        /** Icon nhật ký cho dòng về bạn cùng lứa. */
        icon: z.string(),
        /** Điểm quan trọng của dòng nhật ký: chuyện thường / tin mất. */
        milestone_importance: z.number(),
        death_importance: z.number(),
        /** Lời kể khi một người bạn cùng lứa qua đời. Token: {name}, {label}, {age}, {cause}. */
        death_text: z.array(z.string()).min(1),
        /** Nguyên nhân mất của bạn cùng lứa: id trong life.mortality.causes, lọc theo tuổi. */
        death_causes: z
          .array(
            z
              .object({
                cause: z.string(),
                weight: z.number().positive(),
                min_age: z.number().int().min(0).default(0),
                max_age: z.number().int().min(0).default(200),
              })
              .strict(),
          )
          .min(1),
        archetypes: z.array(peerArchetypeSchema).min(1),
      })
      .strict(),
    /** Mốc dừng lại suy ngẫm: đến tuổi này thì game dừng, hỏi một câu, người chơi viết một dòng. */
    reflections: z
      .array(
        z
          .object({
            age: z.number().int().min(0),
            question: z.string(),
          })
          .strict(),
      )
      .default([]),
    /** Câu văn bia cuối đời: chọn theo điều kiện + trọng số. Token văn bản như sự kiện ({player.name}...). */
    epitaphs: z
      .array(
        z
          .object({
            condition: conditionSchema.optional(),
            weight: z.number().positive().default(1),
            text: z.string(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type StoryContent = z.infer<typeof storySchema>;
