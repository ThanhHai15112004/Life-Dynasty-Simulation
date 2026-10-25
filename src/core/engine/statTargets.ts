// [0] Khóa các chỉ số mà modifier có thể tác động (khóa tham chiếu giữa data và code, không phải con số cân bằng)
export const StatTarget = {
  /** Thay đổi sức khỏe mỗi tháng (cộng). */
  HealthMonthly: 'health.monthly',
  /** Thay đổi stress mỗi tháng (cộng). */
  StressMonthly: 'stress.monthly',
  /** Hệ số XP mọi kỹ năng (nhân). */
  XpAll: 'xp.all',
  /** Hệ số sản lượng thu hoạch của hộ (nhân). */
  HarvestYield: 'harvest.yield',
  /** Hệ số rủi ro tử vong (nhân). */
  DeathRisk: 'death_risk',
  /** Hệ số chi tiêu tiền sinh hoạt của hộ (nhân). */
  LivingCost: 'living.cost',
  /** Hệ số lượng thóc ăn của hộ (nhân). */
  FoodConsumption: 'food.consumption',
} as const;

const XP_PREFIX = 'xp.';

/** Hệ số XP của một kỹ năng cụ thể (nhân), ví dụ 'xp.hoc_van'. */
export const xpTarget = (skillId: string): string => `${XP_PREFIX}${skillId}`;

export function isKnownTarget(target: string, skillIds: Iterable<string>): boolean {
  if ((Object.values(StatTarget) as string[]).includes(target)) return true;
  if (target.startsWith(XP_PREFIX)) return [...skillIds].includes(target.slice(XP_PREFIX.length));
  return false;
}
