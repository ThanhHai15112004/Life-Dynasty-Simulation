// Schema cho Mốc Thời Đại (Bookmarks) và Quốc gia / Vùng lãnh thổ Thế giới (Polities) theo chuẩn nhân khẩu học lịch sử (HYDE / Maddison / Coale-Demeny / UN WPP)
import { z } from 'zod';

export const bookmarkSchema = z
  .object({
    id: z.string(),
    era_name: z.string(),
    year: z.number().int(),
    year_label: z.string(),
    description: z.string(),
    world_population_millions: z.number().positive(),
    default_life_expectancy: z.number().positive(),
    default_child_mortality: z.number().min(0).max(1),
    lottery_weight: z.number().positive().default(1),
  })
  .strict();

export const bookmarkFileSchema = z
  .object({
    default_bookmark: z.string(),
    bookmarks: z.array(bookmarkSchema).min(1),
  })
  .strict();

export type Bookmark = z.infer<typeof bookmarkSchema>;
export type BookmarkFile = z.infer<typeof bookmarkFileSchema>;

export const polityDemographicsSchema = z
  .object({
    life_expectancy: z.number().positive(),
    child_mortality: z.number().min(0).max(1),
    urban_share: z.number().min(0).max(1),
    literacy_rate: z.number().min(0).max(1),
    mortality_factor: z.number().positive().default(1.0),
    wealth_factor: z.number().positive().default(1.0),
  })
  .strict();

export type PolityDemographics = z.infer<typeof polityDemographicsSchema>;

export const politySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    region_label: z.string(),
    description: z.string(),
    bookmarks: z.array(z.string()).min(1),
    civilization: z.string(),
    culture: z.string(),
    /** Tên dân tộc / cư dân đặc trưng tại vùng lãnh thổ này trong thời kỳ đó. */
    ethnicity_name: z.string().optional(),
    /** Mã nhóm nhân chủng / ngoại hình đặc trưng tại vùng này. */
    phenotype: z.string().optional(),
    /** Tôn giáo / tín ngưỡng chính hoặc phân bố tôn giáo tại vùng này. */
    religion: z.string().optional(),
    religions: z
      .array(z.union([z.string(), z.object({ id: z.string(), weight: z.number().positive() }).strict()]))
      .optional(),
    /** Trọng số dân số thực tế trong thời kỳ (dùng để quay xổ số nơi sinh kiểu 1in8b). */
    population_weight: z.number().positive(),
    demographics: polityDemographicsSchema,
    /** Tỷ lệ phân tầng xã hội thực tế tại vùng này (id xuất thân → trọng số). */
    origin_weights: z.record(z.string(), z.number().min(0)).default({}),
    /** Ghi chú sử liệu / thống kê thực tế hiển thị trên Giấy khai sinh. */
    historical_fact: z.string().default(''),
  })
  .strict();

export const polityFileSchema = z
  .object({
    polities: z.array(politySchema).min(1),
  })
  .strict();

export type Polity = z.infer<typeof politySchema>;
export type PolityFile = z.infer<typeof polityFileSchema>;

