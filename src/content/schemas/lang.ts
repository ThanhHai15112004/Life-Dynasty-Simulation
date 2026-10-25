// [0] Gói chữ hiển thị (data/lang/*.json): khóa phẳng → chuỗi, có thể chứa token {ten}
import { z } from 'zod';

export const langSchema = z.record(z.string(), z.string());
export type LangPack = z.infer<typeof langSchema>;
