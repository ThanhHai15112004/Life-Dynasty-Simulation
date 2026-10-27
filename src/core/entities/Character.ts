// [0] Thực thể: Con người (GDD 02 §2.1) — GĐ0 dùng các nhóm Định danh, Trạng thái, Năng lực, Bản ngã, Quan hệ tối thiểu
import type { StoredModifier } from '../engine/ModifierSystem';

export type Sex = 'm' | 'f';

export interface SkillState {
  level: number;
  xp: number;
}

export interface ActiveDisease {
  id: string;
  remainingMonths: number;
  /** [1] Tháng chạy chữa gần nhất (chữa không khỏi thì phải chờ mới chữa lại). */
  treatedAt?: number;
}

export interface Character {
  id: string;
  familyName: string;
  givenName: string;
  /** Thứ tự hiển thị họ tên theo văn hóa (mặc định family_first). */
  nameOrder?: 'family_first' | 'given_first';
  sex: Sex;
  birthYear: number;
  birthMonth: number;
  alive: boolean;
  deathYear?: number;
  deathCauseId?: string;

  health: number;
  stress: number;
  skills: Record<string, SkillState>;
  traits: string[];
  modifiers: StoredModifier[];
  /** [1] Danh sách bệnh đang mắc và thời gian còn lại. */
  diseases: ActiveDisease[];

  householdId: string | null;
  fatherId?: string;
  motherId?: string;
  /** [1] ID vợ hoặc chồng. */
  spouseId?: string;
  /** [2] Năm kết hôn (để xét điều kiện tách hộ sau min_years_married năm). */
  marriedYear?: number;
  /** [1] Trạng thái mang thai (chỉ áp dụng với nữ). */
  pregnancy?: { monthsLeft: number; fatherId: string } | null;
  /** Vai trò trong làng (ba_ho, ly_truong...) nếu là NPC làng. */
  villageRole?: string;
  /** Thiện cảm tổng với người chơi (-100..100). */
  opinionOfPlayer: number;
  /** [1] Các nguồn thiện cảm có thời hạn để giải thích trong UI. */
  opinionModifiers?: StoredModifier[];
  /** [1] Ân tình với người chơi (>0: nợ ân tình người chơi; <0: người chơi nợ họ). */
  favorWithPlayer?: number;
  /** [2] Con nuôi được nhận về để nối dõi. */
  adopted?: boolean;
  /** [2] Cháu họ / họ hàng nhánh bên được đón về hoặc sinh ra từ chi phụ. */
  collateral?: boolean;
  /** [2] Đời thứ mấy trong dòng họ (1 = đời đầu tiên của người chơi, 0 = cha mẹ, -1 = ông bà). */
  generation?: number;
  /** [2] ID dòng họ NPC trong làng mà nhân vật trực thuộc (Phase 4). */
  clanId?: string;
  /** [2] Hướng nuôi dạy khi còn nhỏ 6–15 tuổi: 'di_hoc' | 'hoc_nghe' | 'phu_viec_nha' (Phase 4). */
  upbringing?: string;
  /** [5] Nghề riêng của thành viên người lớn trong hộ (Phase 5). */
  careerId?: string;
  /** [5] Bậc nghề hiện tại của thành viên trong hộ (Phase 5). */
  careerRankIndex?: number;
  /** [5] Số tháng thâm niên nghề của thành viên trong hộ (Phase 5). */
  careerMonths?: number;
  /** [5] Công trạng tích lũy trong nghề của thành viên trong hộ (Phase 5). */
  careerMerit?: number;
}

/** Tuổi tính theo tháng sinh: qua tháng sinh của năm nay mới tăng tuổi. */
export function ageOf(c: Character, year: number, month: number): number {
  const end = c.alive ? { year, month } : { year: c.deathYear ?? year, month };
  let age = end.year - c.birthYear;
  if (end.month < c.birthMonth) age -= 1;
  return Math.max(0, age);
}

export function fullName(c: Character): string {
  return c.nameOrder === 'given_first' ? `${c.givenName} ${c.familyName}` : `${c.familyName} ${c.givenName}`;
}
