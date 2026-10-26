// [1] Quy định cấu trúc kịch bản thử nghiệm (Phase 1)
import { z } from 'zod';
import { effectSchema } from './effect';

export const scenarioGroupSchema = z.enum([
  'khoi_dau',
  'kinh_te',
  'suc_khoe',
  'gia_dinh',
  'nghe_nghiep',
  'van_minh',
]);
export type ScenarioGroup = z.infer<typeof scenarioGroupSchema>;

export const scenarioSchema = z.object({
  id: z.string().min(1),
  group: scenarioGroupSchema,
  title_key: z.string().min(1),
  description_key: z.string().min(1),
  base: z.object({
    originId: z.string().min(1),
    age: z.number().int().min(0).max(100).optional(),
    sex: z.enum(['m', 'f']).optional(),
    seed: z.string().optional(),
    startYear: z.number().int().optional(),
    fateMode: z.string().optional(),
  }),
  /** Danh sách hiệu ứng có sẵn để thiết lập tiền, thóc, nợ, nghề, bệnh, tính cách, v.v. */
  setup: z.array(effectSchema).default([]),
  /** Can thiệp người nhà và các tình trạng đặc biệt mà hiệu ứng đơn thuần chưa đáp ứng */
  family_setup: z
    .object({
      /** Đặt tình trạng cha mẹ: cả hai mất hoặc chỉ một người */
      parents: z.enum(['both_alive', 'father_dead', 'mother_dead', 'both_dead']).optional(),
      father_age: z.number().int().min(20).max(100).optional(),
      father_health: z.number().int().min(1).max(100).optional(),
      mother_age: z.number().int().min(20).max(100).optional(),
      mother_health: z.number().int().min(1).max(100).optional(),
      /** Tuổi vợ/chồng nếu đã cưới */
      spouse_age: z.number().int().min(14).max(100).optional(),
      /** Vợ có thai hay không */
      spouse_pregnant: z.boolean().optional(),
      /** Số năm đã kết hôn */
      years_married: z.number().int().min(0).max(60).optional(),
      /** Tách hộ ngay khi vào kịch bản */
      split_household: z.boolean().optional(),
      /** Danh sách anh chị em thiết lập cụ thể */
      siblings: z
        .array(
          z.object({
            age: z.number().int().min(0).max(80),
            sex: z.enum(['m', 'f']),
            married: z.boolean().optional(),
            split: z.boolean().optional(),
          }),
        )
        .optional(),
      /** Danh sách con cái thêm vào: tuổi và giới tính */
      children: z.array(z.object({ age: z.number().int().min(0).max(50), sex: z.enum(['m', 'f']) })).optional(),
    })
    .optional(),
  /** Thiết lập trạng thái thế giới */
  world_setup: z
    .object({
      harvestQuality: z.string().optional(),
      foodPrice: z.number().optional(),
      weather: z.string().optional(),
    })
    .optional(),
  /** Kích hoạt ngay một sự kiện quyết định hoặc ambient khi vào ván */
  start_event: z.string().optional(),
  /** Tua trước N năm headless trước khi trao quyền cho người chơi */
  fast_forward_years: z.number().int().min(0).max(50).default(0),
  /** Tự động quyết định chuyện nhỏ */
  auto_minor: z.boolean().default(false),
});

export type Scenario = z.infer<typeof scenarioSchema>;

export const scenarioFileSchema = z.object({
  scenarios: z.array(scenarioSchema),
});

